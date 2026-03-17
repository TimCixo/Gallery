using GalleryApp.Api;
using GalleryApp.Api.Data;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Data.Search;
using GalleryApp.Api.Models.Pagination;
using GalleryApp.Api.Services;
using GalleryApp.Api.Services.MediaProcessing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Formats.Webp;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class PerformanceOptimizationTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly string _tempRoot;
    private readonly string _dbPath;
    private readonly string _mediaRoot;
    private readonly string _previewCachePath;
    private readonly string _connectionString;

    public PerformanceOptimizationTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"gallery-tests-{Guid.NewGuid():N}");
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
    public void GetPagedMedia_UsesSqlPaginationAndBatchesTags()
    {
        SeedMediaRecord("2026-03-17/1.webp", "#FF0000", "Warm", assignFavorite: false);
        SeedMediaRecord("2026-03-17/2.webp", "#00FF00", "Portrait", assignFavorite: false);
        SeedMediaRecord("2026-03-17/3.webp", "#0000FF", "Night", assignFavorite: true);

        var service = CreateMediaQueryService();

        var result = service.GetPagedMedia(criteria: null, favoritesOnly: false, new PagedRequest(2, 1));

        Assert.Equal(2, result.Page);
        Assert.Equal(1, result.PageSize);
        Assert.Equal(3, result.TotalCount);
        Assert.Equal(3, result.TotalPages);
        var item = Assert.Single(result.Items);
        Assert.Equal("2.webp", item.Name);
        Assert.Single(item.Tags);
        Assert.Equal("Portrait", item.Tags[0].Name);
    }

    [Fact]
    public void GetPagedMedia_PreservesFavoritesAndTagSearch()
    {
        SeedMediaRecord("2026-03-17/1.webp", "#FF0000", "Warm", assignFavorite: false);
        SeedMediaRecord("2026-03-17/2.webp", "#00FF00", "Portrait", assignFavorite: false);
        SeedMediaRecord("2026-03-17/3.webp", "#0000FF", "Night", assignFavorite: true);

        var service = CreateMediaQueryService();

        var searchResult = service.GetPagedMedia(
            MediaSearchParser.ParseMediaSearchCriteria("color:portrait"),
            favoritesOnly: false,
            new PagedRequest(1, 10));
        var favoritesResult = service.GetPagedMedia(criteria: null, favoritesOnly: true, new PagedRequest(1, 10));

        Assert.Single(searchResult.Items);
        Assert.Equal("2.webp", searchResult.Items[0].Name);
        Assert.Single(favoritesResult.Items);
        Assert.Equal("3.webp", favoritesResult.Items[0].Name);
    }

    [Fact]
    public async Task PreviewCache_ReusesExistingPreviewFile()
    {
        const string relativePath = "2026-03-17/preview-source.jpg";
        var absolutePath = CreateImageFile(relativePath, saveAsJpeg: true);
        var modifiedTicks = File.GetLastWriteTimeUtc(absolutePath).Ticks;
        var previewCache = new PreviewCacheService(
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            new MediaProcessingService(NullLogger<MediaProcessingService>.Instance));

        var firstResult = await previewCache.GetOrCreateAsync(relativePath, absolutePath, ".jpg", modifiedTicks);
        var firstWriteTime = File.GetLastWriteTimeUtc(firstResult.Path);
        await Task.Delay(25);
        var secondResult = await previewCache.GetOrCreateAsync(relativePath, absolutePath, ".jpg", modifiedTicks);
        var secondWriteTime = File.GetLastWriteTimeUtc(secondResult.Path);

        Assert.Equal(firstResult.Path, secondResult.Path);
        Assert.True(File.Exists(firstResult.Path));
        Assert.Equal(firstWriteTime, secondWriteTime);
    }

    [Fact]
    public async Task PreviewCache_WarmExistingAsync_CreatesCachedPreviewForExistingMedia()
    {
        const string relativePath = "2026-03-17/warm-source.webp";
        CreateImageFile(relativePath, saveAsJpeg: false);
        var previewCache = new PreviewCacheService(
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            new MediaProcessingService(NullLogger<MediaProcessingService>.Instance));

        await previewCache.WarmExistingAsync(relativePath);

        Assert.Single(Directory.GetFiles(_previewCachePath, "*.jpg"));
    }

    [Fact]
    public async Task PreviewCache_GetOrCreateAsync_IsSafeForConcurrentCalls()
    {
        const string relativePath = "2026-03-17/concurrent-source.jpg";
        var absolutePath = CreateImageFile(relativePath, saveAsJpeg: true);
        var modifiedTicks = File.GetLastWriteTimeUtc(absolutePath).Ticks;
        var previewCache = new PreviewCacheService(
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            new MediaProcessingService(NullLogger<MediaProcessingService>.Instance));

        var results = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => previewCache.GetOrCreateAsync(relativePath, absolutePath, ".jpg", modifiedTicks)));

        Assert.Single(results.Select(result => result.Path).Distinct(StringComparer.OrdinalIgnoreCase));
        var cacheFile = Assert.Single(Directory.GetFiles(_previewCachePath, "*.jpg"));
        Assert.True(new FileInfo(cacheFile).Length > 0);
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

    private MediaQueryService CreateMediaQueryService()
    {
        var previewCache = new PreviewCacheService(
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            new MediaProcessingService(NullLogger<MediaProcessingService>.Instance));

        return new MediaQueryService(
            new MediaRepository(_connectionString),
            new MediaStorageOptions(_mediaRoot, _previewCachePath),
            previewCache);
    }

    private void SeedMediaRecord(string relativePath, string colorHex, string tagName, bool assignFavorite)
    {
        var absolutePath = CreateImageFile(relativePath, saveAsJpeg: false);

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var insertMedia = connection.CreateCommand();
        insertMedia.CommandText = """
            INSERT INTO Media (Path, Title, Description, Source, Parent, Child)
            VALUES ($path, NULL, NULL, NULL, NULL, NULL);

            SELECT last_insert_rowid();
            """;
        insertMedia.Parameters.AddWithValue("$path", relativePath);
        var mediaId = Convert.ToInt64(insertMedia.ExecuteScalar());

        using var insertTagType = connection.CreateCommand();
        insertTagType.CommandText = """
            INSERT INTO TagTypes (Name, Color)
            VALUES ('Color', $color);

            SELECT last_insert_rowid();
            """;
        insertTagType.Parameters.AddWithValue("$color", colorHex);
        var tagTypeId = Convert.ToInt64(insertTagType.ExecuteScalar());

        using var insertTag = connection.CreateCommand();
        insertTag.CommandText = """
            INSERT INTO Tags (Name, Description, TagTypeId)
            VALUES ($name, NULL, $tagTypeId);

            SELECT last_insert_rowid();
            """;
        insertTag.Parameters.AddWithValue("$name", tagName);
        insertTag.Parameters.AddWithValue("$tagTypeId", tagTypeId);
        var tagId = Convert.ToInt64(insertTag.ExecuteScalar());

        using var insertMediaTag = connection.CreateCommand();
        insertMediaTag.CommandText = "INSERT INTO MediaTags (MediaId, TagId) VALUES ($mediaId, $tagId);";
        insertMediaTag.Parameters.AddWithValue("$mediaId", mediaId);
        insertMediaTag.Parameters.AddWithValue("$tagId", tagId);
        insertMediaTag.ExecuteNonQuery();

        if (!assignFavorite)
        {
            return;
        }

        using var selectFavorites = connection.CreateCommand();
        selectFavorites.CommandText = "SELECT Id FROM Collections WHERE Lable = 'Favorites' LIMIT 1;";
        var favoritesId = Convert.ToInt64(selectFavorites.ExecuteScalar());

        using var insertFavorite = connection.CreateCommand();
        insertFavorite.CommandText = "INSERT INTO CollectionsMedia (CollectionId, MediaId) VALUES ($collectionId, $mediaId);";
        insertFavorite.Parameters.AddWithValue("$collectionId", favoritesId);
        insertFavorite.Parameters.AddWithValue("$mediaId", mediaId);
        insertFavorite.ExecuteNonQuery();
    }

    private string CreateImageFile(string relativePath, bool saveAsJpeg)
    {
        var absolutePath = Path.Combine(_mediaRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        using var image = new Image<Rgba32>(8, 8);
        if (saveAsJpeg)
        {
            image.Save(absolutePath, new JpegEncoder { Quality = 85 });
        }
        else
        {
            image.Save(absolutePath, new WebpEncoder { Quality = 85 });
        }

        return absolutePath;
    }
}
