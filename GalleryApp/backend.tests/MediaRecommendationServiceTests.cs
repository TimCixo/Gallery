using GalleryApp.Api.Data;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Services;
using GalleryApp.Api.Services.Embeddings;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class MediaRecommendationServiceTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly string _tempRoot;
    private readonly string _dbPath;
    private readonly string _mediaRoot;
    private readonly string _previewCachePath;
    private readonly string _connectionString;

    public MediaRecommendationServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"gallery-recommendation-tests-{Guid.NewGuid():N}");
        _dbPath = Path.Combine(_tempRoot, "gallery.db");
        _mediaRoot = Path.Combine(_tempRoot, "Media");
        _previewCachePath = Path.Combine(_tempRoot, "PreviewCache");
        Directory.CreateDirectory(_mediaRoot);
        Directory.CreateDirectory(_previewCachePath);

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath
        }.ToString();

        _serviceProvider = new ServiceCollection()
            .AddSingleton(_connectionString)
            .BuildServiceProvider();
        DatabaseInitializer.EnsureDatabase(_serviceProvider);
    }

    [Fact]
    public async Task GetRecommendedMediaAsync_backfills_embeddings_and_orders_by_similarity()
    {
        var originalId = SeedImage("2026-03-27/original.webp");
        var closeId = SeedImage("2026-03-27/close.webp");
        var farId = SeedImage("2026-03-27/far.webp");

        var service = CreateService(new FakeImageEmbeddingGenerator(new Dictionary<string, float[]>
        {
            ["original.webp"] = [1f, 0f],
            ["close.webp"] = [0.8f, 0.6f],
            ["far.webp"] = [0f, 1f]
        }));

        var results = await service.GetRecommendedMediaAsync(originalId, take: 2);

        Assert.Equal([closeId, farId], results.Select(item => item.Item.Id).ToArray());
        Assert.Equal(0.8f, results[0].Score, 3);
        Assert.Equal(0f, results[1].Score, 3);

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM MediaEmbeddings;";
        Assert.Equal(3, Convert.ToInt32(command.ExecuteScalar()));
    }

    [Fact]
    public async Task BackfillMissingEmbeddingsAsync_indexes_only_image_media()
    {
        SeedImage("2026-03-27/image.webp");
        SeedVideo("2026-03-27/video.mp4");
        var generator = new FakeImageEmbeddingGenerator(new Dictionary<string, float[]>
        {
            ["image.webp"] = [1f, 0f]
        });
        var service = CreateService(generator);

        await service.BackfillMissingEmbeddingsAsync();

        Assert.Equal(["image.webp"], generator.Calls);

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM MediaEmbeddings;";
        Assert.Equal(1, Convert.ToInt32(command.ExecuteScalar()));
    }

    public void Dispose()
    {
        _serviceProvider.Dispose();
        if (Directory.Exists(_tempRoot))
        {
            try
            {
                Directory.Delete(_tempRoot, recursive: true);
            }
            catch (IOException)
            {
            }
        }
    }

    private MediaRecommendationService CreateService(IImageEmbeddingGenerator imageEmbeddingGenerator)
    {
        return new MediaRecommendationService(
            new MediaRepository(_connectionString),
            new MediaEmbeddingRepository(_connectionString),
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            imageEmbeddingGenerator);
    }

    private long SeedImage(string relativePath)
    {
        var absolutePath = Path.Combine(_mediaRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
        using var image = new Image<Rgba32>(32, 32, new Rgba32(100, 120, 180));
        image.Save(absolutePath, new WebpEncoder { Quality = 95 });
        return InsertMediaRecord(relativePath);
    }

    private long SeedVideo(string relativePath)
    {
        var absolutePath = Path.Combine(_mediaRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
        File.WriteAllBytes(absolutePath, [0x00, 0x00, 0x00, 0x18]);
        return InsertMediaRecord(relativePath);
    }

    private long InsertMediaRecord(string relativePath)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO Media (Path, Title, Description, Source, Parent, Child, ImageHash)
            VALUES ($path, NULL, NULL, NULL, NULL, NULL, NULL);

            SELECT last_insert_rowid();
            """;
        command.Parameters.AddWithValue("$path", relativePath);
        return Convert.ToInt64(command.ExecuteScalar());
    }

    private sealed class FakeImageEmbeddingGenerator(IReadOnlyDictionary<string, float[]> embeddings) : IImageEmbeddingGenerator
    {
        public string ModelKey => "fake-model";

        public List<string> Calls { get; } = [];

        public Task<float[]?> GenerateEmbeddingAsync(string absolutePath, CancellationToken cancellationToken = default)
        {
            var key = Path.GetFileName(absolutePath);
            Calls.Add(key);
            return Task.FromResult(embeddings.TryGetValue(key, out var vector) ? vector : null);
        }
    }
}
