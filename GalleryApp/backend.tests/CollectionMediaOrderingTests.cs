using GalleryApp.Api.Data;
using GalleryApp.Api.Data.Repositories;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class CollectionMediaOrderingTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly string _tempRoot;
    private readonly string _dbPath;
    private readonly string _connectionString;
    private readonly MediaRepository _mediaRepository;

    public CollectionMediaOrderingTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), $"gallery-collection-order-tests-{Guid.NewGuid():N}");
        _dbPath = Path.Combine(_tempRoot, "gallery.db");
        Directory.CreateDirectory(_tempRoot);

        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath
        }.ToString();

        _serviceProvider = new ServiceCollection()
            .AddSingleton(_connectionString)
            .BuildServiceProvider();
        DatabaseInitializer.EnsureDatabase(_serviceProvider);

        _mediaRepository = new MediaRepository(_connectionString);
    }

    [Fact]
    public void GetCollectionMedia_OrdersSimpleChainFromParentToChildren()
    {
        var child2Id = SeedCollectionMedia("simple-3.webp", parent: null, child: null);
        var child1Id = SeedCollectionMedia("simple-2.webp", parent: null, child: child2Id);
        var parentId = SeedCollectionMedia("simple-1.webp", parent: null, child: child1Id);
        SetParent(child1Id, parentId);
        SetParent(child2Id, child1Id);

        var result = _mediaRepository.GetCollectionMedia(GetAlbumCollectionId());

        Assert.Equal(new[] { parentId, child1Id, child2Id }, result.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void GetCollectionMedia_KeepsBaseOrderBetweenChainsAndStandaloneItems()
    {
        var standaloneId = SeedCollectionMedia("base-standalone.webp");
        var secondChildId = SeedCollectionMedia("base-second-child.webp");
        var secondParentId = SeedCollectionMedia("base-second-parent.webp", child: secondChildId);
        SetParent(secondChildId, secondParentId);
        var firstChildId = SeedCollectionMedia("base-first-child.webp");
        var firstParentId = SeedCollectionMedia("base-first-parent.webp", child: firstChildId);
        SetParent(firstChildId, firstParentId);

        var result = _mediaRepository.GetCollectionMedia(GetAlbumCollectionId());

        Assert.Equal(
            new[] { firstParentId, firstChildId, secondParentId, secondChildId, standaloneId },
            result.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void GetCollectionMedia_ReturnsRootParentFirstWhenChildIdsAreNewer()
    {
        var parentId = SeedCollectionMedia("root-parent.webp");
        var childId = SeedCollectionMedia("root-child.webp", parent: parentId);
        var grandChildId = SeedCollectionMedia("root-grand-child.webp", parent: childId);
        SetChild(parentId, childId);
        SetChild(childId, grandChildId);

        var result = _mediaRepository.GetCollectionMedia(GetAlbumCollectionId());

        Assert.Equal(new[] { parentId, childId, grandChildId }, result.Take(3).Select(item => item.Id).ToArray());
    }

    [Fact]
    public void GetCollectionMedia_IgnoresLinksToItemsOutsideCollection()
    {
        var outsideChildId = SeedMedia("outside-child.webp");
        var parentId = SeedCollectionMedia("inside-parent.webp", child: outsideChildId);
        var standaloneId = SeedCollectionMedia("inside-standalone.webp");

        var result = _mediaRepository.GetCollectionMedia(GetAlbumCollectionId());

        Assert.Equal(new[] { standaloneId, parentId }, result.Select(item => item.Id).ToArray());
    }

    [Fact]
    public void GetCollectionMedia_FallsBackToBaseOrderForCyclesWithoutDuplicates()
    {
        var firstId = SeedCollectionMedia("cycle-1.webp");
        var secondId = SeedCollectionMedia("cycle-2.webp", parent: firstId);
        SetParent(firstId, secondId);
        SetChild(firstId, secondId);
        SetChild(secondId, firstId);

        var result = _mediaRepository.GetCollectionMedia(GetAlbumCollectionId());

        Assert.Equal(new[] { secondId, firstId }, result.Select(item => item.Id).ToArray());
        Assert.Equal(2, result.Select(item => item.Id).Distinct().Count());
    }

    [Fact]
    public void GetPagedCollectionMedia_AppliesPaginationAfterChainOrdering()
    {
        var standaloneId = SeedCollectionMedia("page-standalone.webp");
        var child2Id = SeedCollectionMedia("page-child-2.webp");
        var child1Id = SeedCollectionMedia("page-child-1.webp", child: child2Id);
        var parentId = SeedCollectionMedia("page-parent.webp", child: child1Id);
        SetParent(child1Id, parentId);
        SetParent(child2Id, child1Id);

        var result = _mediaRepository.GetPagedCollectionMedia(GetAlbumCollectionId(), page: 2, pageSize: 2);

        Assert.Equal(2, result.Page);
        Assert.Equal(4, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(new[] { child2Id, standaloneId }, result.Rows.Select(item => item.Id).ToArray());
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

    private long SeedCollectionMedia(string relativePath, long? parent = null, long? child = null)
    {
        var mediaId = SeedMedia(relativePath, parent, child);
        AddToAlbum(mediaId);
        return mediaId;
    }

    private long SeedMedia(string relativePath, long? parent = null, long? child = null)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO Media (Path, Title, Description, Source, Parent, Child)
            VALUES ($path, NULL, NULL, NULL, $parent, $child);

            SELECT last_insert_rowid();
            """;
        command.Parameters.AddWithValue("$path", relativePath);
        command.Parameters.AddWithValue("$parent", parent ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$child", child ?? (object)DBNull.Value);
        return Convert.ToInt64(command.ExecuteScalar());
    }

    private void AddToAlbum(long mediaId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId)
            VALUES ($collectionId, $mediaId);
            """;
        command.Parameters.AddWithValue("$collectionId", GetAlbumCollectionId(connection));
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.ExecuteNonQuery();
    }

    private void SetParent(long mediaId, long? parentId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE Media SET Parent = $parent WHERE Id = $id;";
        command.Parameters.AddWithValue("$parent", parentId ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    private void SetChild(long mediaId, long? childId)
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE Media SET Child = $child WHERE Id = $id;";
        command.Parameters.AddWithValue("$child", childId ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    private long GetAlbumCollectionId()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return GetAlbumCollectionId(connection);
    }

    private static long GetAlbumCollectionId(SqliteConnection connection)
    {
        using var createCommand = connection.CreateCommand();
        createCommand.CommandText = """
            INSERT INTO Collections (Lable, Description, Cover)
            SELECT 'Album', NULL, NULL
            WHERE NOT EXISTS (
                SELECT 1
                FROM Collections
                WHERE Lable = 'Album'
            );
            """;
        createCommand.ExecuteNonQuery();

        using var selectCommand = connection.CreateCommand();
        selectCommand.CommandText = "SELECT Id FROM Collections WHERE Lable = 'Album' LIMIT 1;";
        return Convert.ToInt64(selectCommand.ExecuteScalar());
    }
}
