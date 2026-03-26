using GalleryApp.Api.Data;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Models.Pagination;
using GalleryApp.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.PixelFormats;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class DuplicateMediaServiceTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly string _tempRoot;
    private readonly string _dbPath;
    private readonly string _mediaRoot;
    private readonly string _previewCachePath;
    private readonly string _connectionString;
    private readonly MediaRepository _mediaRepository;
    private readonly DuplicateMediaService _duplicateMediaService;

    public DuplicateMediaServiceTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"gallery-duplicates-tests-{Guid.NewGuid():N}");
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

        var storageOptions = new MediaStorageOptions(_mediaRoot, _previewCachePath);
        _mediaRepository = new MediaRepository(_connectionString);
        _duplicateMediaService = new DuplicateMediaService(_connectionString, _mediaRepository, storageOptions);
    }

    [Fact]
    public void GetPagedDuplicateGroups_ReturnsGroupedActiveAndExcludedItems()
    {
        var firstId = SeedMediaRecord("2026-03-27/1.webp", title: "First");
        var secondId = SeedMediaRecord("2026-03-27/2.webp", title: "Second");
        var thirdId = SeedMediaRecord("2026-03-27/3.webp", title: "Third");
        SeedMediaRecord("2026-03-27/4.webp", title: "Unique");
        SetImageHash(firstId, "HASH-A");
        SetImageHash(secondId, "HASH-A");
        SetImageHash(thirdId, "HASH-A");

        _duplicateMediaService.ExcludeMedia("HASH-A", secondId);

        var result = _duplicateMediaService.GetPagedDuplicateGroups(new PagedRequest(1, 10));

        Assert.Equal(1, result.TotalCount);
        var group = Assert.Single(result.Items);
        Assert.Equal("HASH-A", group.GroupKey);
        Assert.Equal(thirdId, group.ParentMediaId);
        Assert.Equal(new[] { thirdId, firstId }, group.Items.Select(item => item.Id).ToArray());
        Assert.Equal(new[] { secondId }, group.ExcludedItems.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void RestoreMedia_ReturnsExcludedItemToActiveGroup()
    {
        var firstId = SeedMediaRecord("2026-03-27/restore-1.webp");
        var secondId = SeedMediaRecord("2026-03-27/restore-2.webp");
        SetImageHash(firstId, "HASH-RESTORE");
        SetImageHash(secondId, "HASH-RESTORE");
        _duplicateMediaService.ExcludeMedia("HASH-RESTORE", firstId);

        _duplicateMediaService.RestoreMedia("HASH-RESTORE", firstId);

        var group = Assert.Single(_duplicateMediaService.GetPagedDuplicateGroups(new PagedRequest(1, 10)).Items);
        Assert.Equal(new[] { secondId, firstId }, group.Items.Select(item => item.Id).ToArray());
        Assert.Empty(group.ExcludedItems);
    }

    [Fact]
    public void MergeGroup_FillsMissingMetadataAndTransfersTagsCollectionsAndFavorite()
    {
        var unrelatedParentId = SeedMediaRecord("2026-03-27/unrelated-parent.webp");
        var unrelatedChildId = SeedMediaRecord("2026-03-27/unrelated-child.webp");
        var parentId = SeedMediaRecord("2026-03-27/merge-parent.webp", title: "Keep", child: unrelatedChildId);
        var sourceId = SeedMediaRecord(
            "2026-03-27/merge-source.webp",
            description: "Merged description",
            source: "https://example.com/source",
            parent: unrelatedParentId,
            tagNames: ["SourceTag"],
            collectionNames: ["Album"],
            assignFavorite: true);

        AddTags(parentId, ["ParentTag"]);
        SetImageHash(parentId, "HASH-MERGE");
        SetImageHash(sourceId, "HASH-MERGE");

        _duplicateMediaService.MergeGroup("HASH-MERGE", parentId);

        var parent = _mediaRepository.GetMediaById(parentId);
        Assert.NotNull(parent);
        Assert.Equal("Keep", parent!.Title);
        Assert.Equal("Merged description", parent.Description);
        Assert.Equal("https://example.com/source", parent.Source);
        Assert.True(parent.IsFavorite);
        Assert.Null(parent.Parent);
        Assert.Equal(unrelatedChildId, parent.Child);
        Assert.Null(_mediaRepository.GetMediaById(sourceId));

        var parentTags = _mediaRepository.GetMediaTags([parentId])[parentId].Select(tag => tag.Name).ToArray();
        Assert.Contains("ParentTag", parentTags);
        Assert.Contains("SourceTag", parentTags);
        Assert.Contains("Album", GetCollectionNames(parentId));
    }

    [Fact]
    public void DeleteDuplicates_RemovesOnlyRequestedActiveNonParentItems()
    {
        var parentId = SeedMediaRecord("2026-03-27/delete-parent.webp");
        var sourceId = SeedMediaRecord("2026-03-27/delete-source.webp");
        var excludedId = SeedMediaRecord("2026-03-27/delete-excluded.webp");
        SetImageHash(parentId, "HASH-DELETE");
        SetImageHash(sourceId, "HASH-DELETE");
        SetImageHash(excludedId, "HASH-DELETE");
        _duplicateMediaService.ExcludeMedia("HASH-DELETE", excludedId);

        _duplicateMediaService.DeleteDuplicates("HASH-DELETE", parentId, [sourceId]);

        Assert.NotNull(_mediaRepository.GetMediaById(parentId));
        Assert.Null(_mediaRepository.GetMediaById(sourceId));
        Assert.NotNull(_mediaRepository.GetMediaById(excludedId));
        var group = Assert.Single(_duplicateMediaService.GetPagedDuplicateGroups(new PagedRequest(1, 10)).Items);
        Assert.Equal(new[] { parentId }, group.Items.Select(item => item.Id).ToArray());
        Assert.Equal(new[] { excludedId }, group.ExcludedItems.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void MergeGroup_RejectsExcludedParent()
    {
        var firstId = SeedMediaRecord("2026-03-27/invalid-parent-1.webp");
        var secondId = SeedMediaRecord("2026-03-27/invalid-parent-2.webp");
        SetImageHash(firstId, "HASH-INVALID");
        SetImageHash(secondId, "HASH-INVALID");
        _duplicateMediaService.ExcludeMedia("HASH-INVALID", secondId);

        var exception = Assert.Throws<InvalidOperationException>(() => _duplicateMediaService.MergeGroup("HASH-INVALID", secondId));

        Assert.Contains("parent", exception.Message, StringComparison.OrdinalIgnoreCase);
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

    private long SeedMediaRecord(
        string relativePath,
        string? title = null,
        string? description = null,
        string? source = null,
        long? parent = null,
        long? child = null,
        IReadOnlyList<string>? tagNames = null,
        IReadOnlyList<string>? collectionNames = null,
        bool assignFavorite = false)
    {
        CreateImageFile(relativePath);

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var insertMedia = connection.CreateCommand();
        insertMedia.CommandText = """
            INSERT INTO Media (Path, Title, Description, Source, Parent, Child)
            VALUES ($path, $title, $description, $source, $parent, $child);

            SELECT last_insert_rowid();
            """;
        insertMedia.Parameters.AddWithValue("$path", relativePath);
        insertMedia.Parameters.AddWithValue("$title", title ?? (object)DBNull.Value);
        insertMedia.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        insertMedia.Parameters.AddWithValue("$source", source ?? (object)DBNull.Value);
        insertMedia.Parameters.AddWithValue("$parent", parent ?? (object)DBNull.Value);
        insertMedia.Parameters.AddWithValue("$child", child ?? (object)DBNull.Value);
        var mediaId = Convert.ToInt64(insertMedia.ExecuteScalar());

        if (tagNames is { Count: > 0 })
        {
          AddTags(connection, mediaId, tagNames);
        }

        if (collectionNames is { Count: > 0 })
        {
            foreach (var collectionName in collectionNames)
            {
                var collectionId = EnsureCollection(connection, collectionName);
                using var addCollection = connection.CreateCommand();
                addCollection.CommandText = """
                    INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId)
                    VALUES ($collectionId, $mediaId);
                    """;
                addCollection.Parameters.AddWithValue("$collectionId", collectionId);
                addCollection.Parameters.AddWithValue("$mediaId", mediaId);
                addCollection.ExecuteNonQuery();
            }
        }

        if (assignFavorite)
        {
            using var favoritesCommand = connection.CreateCommand();
            favoritesCommand.CommandText = "SELECT Id FROM Collections WHERE Lable = 'Favorites' LIMIT 1;";
            var favoritesId = Convert.ToInt64(favoritesCommand.ExecuteScalar());

            using var addFavorite = connection.CreateCommand();
            addFavorite.CommandText = """
                INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId)
                VALUES ($collectionId, $mediaId);
                """;
            addFavorite.Parameters.AddWithValue("$collectionId", favoritesId);
            addFavorite.Parameters.AddWithValue("$mediaId", mediaId);
            addFavorite.ExecuteNonQuery();
        }

        return mediaId;
    }

    private void AddTags(long mediaId, IReadOnlyList<string> tagNames)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        AddTags(connection, mediaId, tagNames);
    }

    private static void AddTags(SqliteConnection connection, long mediaId, IReadOnlyList<string> tagNames)
    {
        var tagTypeId = EnsureTagType(connection);
        foreach (var tagName in tagNames)
        {
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
            insertMediaTag.CommandText = """
                INSERT INTO MediaTags (MediaId, TagId)
                VALUES ($mediaId, $tagId);
                """;
            insertMediaTag.Parameters.AddWithValue("$mediaId", mediaId);
            insertMediaTag.Parameters.AddWithValue("$tagId", tagId);
            insertMediaTag.ExecuteNonQuery();
        }
    }

    private void SetImageHash(long mediaId, string hash)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE Media SET ImageHash = $hash WHERE Id = $id;";
        command.Parameters.AddWithValue("$hash", hash);
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    private string[] GetCollectionNames(long mediaId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT c.Lable
            FROM CollectionsMedia cm
            INNER JOIN Collections c ON c.Id = cm.CollectionId
            WHERE cm.MediaId = $mediaId
            ORDER BY c.Lable ASC;
            """;
        command.Parameters.AddWithValue("$mediaId", mediaId);

        using var reader = command.ExecuteReader();
        var items = new List<string>();
        while (reader.Read())
        {
            items.Add(reader.GetString(0));
        }

        return items.ToArray();
    }

    private static long EnsureTagType(SqliteConnection connection)
    {
        using var findCommand = connection.CreateCommand();
        findCommand.CommandText = "SELECT Id FROM TagTypes WHERE Name = 'General' LIMIT 1;";
        var existingId = findCommand.ExecuteScalar();
        if (existingId is not null && existingId != DBNull.Value)
        {
            return Convert.ToInt64(existingId);
        }

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO TagTypes (Name, Color)
            VALUES ('General', '#94A3B8');

            SELECT last_insert_rowid();
            """;
        return Convert.ToInt64(insertCommand.ExecuteScalar());
    }

    private static long EnsureCollection(SqliteConnection connection, string name)
    {
        using var findCommand = connection.CreateCommand();
        findCommand.CommandText = "SELECT Id FROM Collections WHERE Lable = $name LIMIT 1;";
        findCommand.Parameters.AddWithValue("$name", name);
        var existingId = findCommand.ExecuteScalar();
        if (existingId is not null && existingId != DBNull.Value)
        {
            return Convert.ToInt64(existingId);
        }

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = """
            INSERT INTO Collections (Lable, Description, Cover)
            VALUES ($name, NULL, NULL);

            SELECT last_insert_rowid();
            """;
        insertCommand.Parameters.AddWithValue("$name", name);
        return Convert.ToInt64(insertCommand.ExecuteScalar());
    }

    private void CreateImageFile(string relativePath)
    {
        var absolutePath = Path.Combine(_mediaRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        Directory.CreateDirectory(Path.GetDirectoryName(absolutePath)!);

        using var image = new Image<Rgba32>(8, 8);
        image.Save(absolutePath, new WebpEncoder { Quality = 85 });
    }
}
