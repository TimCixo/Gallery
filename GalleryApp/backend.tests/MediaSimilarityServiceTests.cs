using GalleryApp.Api.Data;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Webp;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class MediaSimilarityServiceTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly string _tempRoot;
    private readonly string _dbPath;
    private readonly string _mediaRoot;
    private readonly string _previewCachePath;
    private readonly string _connectionString;

    public MediaSimilarityServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"gallery-similarity-tests-{Guid.NewGuid():N}");
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
    public void ImageHashService_GetHammingDistance_counts_changed_bits()
    {
        var service = new ImageHashService();

        var distance = service.GetHammingDistance("0000000000000000", "000000000000000F");

        Assert.Equal(4, distance);
    }

    [Fact]
    public async Task GetSimilarMediaAsync_backfills_existing_hashes_and_returns_near_duplicate()
    {
        var originalId = SeedMediaRecord("2026-03-19/original.webp", CreateHorizontalGradientImage(64, 64, invert: false));
        var resizedDuplicateId = SeedMediaRecord("2026-03-19/duplicate.webp", CreateHorizontalGradientImage(128, 128, invert: false));
        var differentId = SeedMediaRecord("2026-03-19/different.webp", CreateHorizontalGradientImage(64, 64, invert: true));

        var repository = new MediaRepository(_connectionString);
        var service = new MediaSimilarityService(
            repository,
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            new ImageHashService());

        var results = await service.GetSimilarMediaAsync(originalId);

        var match = Assert.Single(results);
        Assert.Equal(resizedDuplicateId, match.Item.Id);
        Assert.True(match.Distance <= MediaSimilarityService.DefaultMaxDistance);
        Assert.DoesNotContain(results, item => item.Item.Id == differentId);

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM Media WHERE ImageHash IS NOT NULL AND TRIM(ImageHash) <> '';";
        var populatedHashes = Convert.ToInt32(command.ExecuteScalar());
        Assert.Equal(3, populatedHashes);
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

    private long SeedMediaRecord(string relativePath, Image<Rgba32> image)
    {
        var absolutePath = Path.Combine(_mediaRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);
        image.Save(absolutePath, new WebpEncoder { Quality = 95 });
        image.Dispose();

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

    private static Image<Rgba32> CreateHorizontalGradientImage(int width, int height, bool invert)
    {
        var image = new Image<Rgba32>(width, height);
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var intensity = (byte)((x * 255) / Math.Max(width - 1, 1));
                var value = invert ? (byte)(255 - intensity) : intensity;
                image[x, y] = new Rgba32(value, value, value);
            }
        }

        return image;
    }
}
