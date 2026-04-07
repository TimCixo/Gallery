using GalleryApp.Api.Data.Search;
using GalleryApp.Api.Models.Domain;
using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Data.Repositories;

public sealed class MediaRepository(string connectionString)
{
    public sealed record MediaRow(long Id, string Path, string? Title, string? Description, string? Source, long? Parent, long? Child, bool IsFavorite, bool HasCollections);
    public sealed record MediaHashRow(long Id, string Path, string? ImageHash);
    public sealed record PagedMediaRows(int Page, int PageSize, int TotalCount, int TotalPages, List<MediaRow> Rows);

    public List<MediaRow> GetMedia(MediaSearchCriteria? criteria, bool favoritesOnly)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria, favoritesOnly);
        var whereSql = whereClauses.Count == 0
            ? string.Empty
            : $"{Environment.NewLine}WHERE {string.Join($"{Environment.NewLine}  AND ", whereClauses)}";

        command.CommandText = $"""
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections
            FROM Media m
            {whereSql}
            ORDER BY m.Id DESC;
            """;

        return ReadMediaRows(command);
    }

    public PagedMediaRows GetPagedMedia(MediaSearchCriteria? criteria, bool favoritesOnly, int page, int pageSize)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var countCommand = connection.CreateCommand();
        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(countCommand, criteria, favoritesOnly);
        var whereSql = whereClauses.Count == 0
            ? string.Empty
            : $"{Environment.NewLine}WHERE {string.Join($"{Environment.NewLine}  AND ", whereClauses)}";
        countCommand.CommandText = $"""
            SELECT COUNT(*)
            FROM Media m
            {whereSql};
            """;

        var totalCount = Convert.ToInt32(countCommand.ExecuteScalar());
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);
        var effectivePage = totalPages == 0
            ? 1
            : Math.Min(page, totalPages);
        var offset = totalPages == 0
            ? 0
            : (effectivePage - 1) * pageSize;

        using var selectCommand = connection.CreateCommand();
        whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(selectCommand, criteria, favoritesOnly);
        whereSql = whereClauses.Count == 0
            ? string.Empty
            : $"{Environment.NewLine}WHERE {string.Join($"{Environment.NewLine}  AND ", whereClauses)}";
        selectCommand.CommandText = $"""
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections
            FROM Media m
            {whereSql}
            ORDER BY m.Id DESC
            LIMIT $limit OFFSET $offset;
            """;
        selectCommand.Parameters.AddWithValue("$limit", pageSize);
        selectCommand.Parameters.AddWithValue("$offset", offset);

        return new PagedMediaRows(effectivePage, pageSize, totalCount, totalPages, ReadMediaRows(selectCommand));
    }

    public List<MediaRow> GetCollectionMedia(long collectionId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        return GetOrderedCollectionMedia(connection, collectionId);
    }

    public PagedMediaRows GetPagedCollectionMedia(long collectionId, int page, int pageSize)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        var orderedRows = GetOrderedCollectionMedia(connection, collectionId);
        var totalCount = orderedRows.Count;
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)pageSize);
        var effectivePage = totalPages == 0
            ? 1
            : Math.Min(page, totalPages);
        var offset = totalPages == 0
            ? 0
            : (effectivePage - 1) * pageSize;
        var rows = totalCount == 0
            ? []
            : orderedRows.Skip(offset).Take(pageSize).ToList();

        return new PagedMediaRows(effectivePage, pageSize, totalCount, totalPages, rows);
    }

    public IReadOnlyDictionary<long, IReadOnlyList<MediaTagListItem>> GetMediaTags(IReadOnlyCollection<long> mediaIds)
    {
        if (mediaIds.Count == 0)
        {
            return new Dictionary<long, IReadOnlyList<MediaTagListItem>>();
        }

        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();

        var mediaIdParams = new List<string>();
        var index = 0;
        foreach (var mediaId in mediaIds.Distinct())
        {
            var parameterName = $"$mediaId{index++}";
            mediaIdParams.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, mediaId);
        }

        command.CommandText = $"""
            SELECT
                mt.MediaId,
                t.Id,
                t.Name,
                t.Description,
                tt.Id AS TagTypeId,
                tt.Name AS TagTypeName,
                tt.Color AS TagTypeColor
            FROM MediaTags mt
            INNER JOIN Tags t ON t.Id = mt.TagId
            INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
            WHERE mt.MediaId IN ({string.Join(", ", mediaIdParams)})
            ORDER BY tt.Name COLLATE NOCASE ASC, t.Name COLLATE NOCASE ASC, t.Id ASC;
            """;

        using var reader = command.ExecuteReader();
        var mediaIdOrdinal = reader.GetOrdinal("MediaId");
        var idOrdinal = reader.GetOrdinal("Id");
        var nameOrdinal = reader.GetOrdinal("Name");
        var descriptionOrdinal = reader.GetOrdinal("Description");
        var tagTypeIdOrdinal = reader.GetOrdinal("TagTypeId");
        var tagTypeNameOrdinal = reader.GetOrdinal("TagTypeName");
        var tagTypeColorOrdinal = reader.GetOrdinal("TagTypeColor");
        var items = new Dictionary<long, List<MediaTagListItem>>();
        while (reader.Read())
        {
            var mediaId = reader.GetInt64(mediaIdOrdinal);
            if (!items.TryGetValue(mediaId, out var mediaTags))
            {
                mediaTags = [];
                items[mediaId] = mediaTags;
            }

            mediaTags.Add(new MediaTagListItem(
                reader.GetInt64(idOrdinal),
                reader.GetString(nameOrdinal),
                reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
                reader.GetInt64(tagTypeIdOrdinal),
                reader.GetString(tagTypeNameOrdinal),
                reader.GetString(tagTypeColorOrdinal)));
        }

        return items.ToDictionary(pair => pair.Key, pair => (IReadOnlyList<MediaTagListItem>)pair.Value);
    }

    public bool MediaRecordExists(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM Media WHERE Id = $id);";
        command.Parameters.AddWithValue("$id", id);
        return Convert.ToInt64(command.ExecuteScalar()) == 1;
    }

    public bool AreAllTagsExist(long[] tagIds)
    {
        if (tagIds.Length == 0)
        {
            return true;
        }

        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        var tagIdParams = new List<string>();
        for (var i = 0; i < tagIds.Length; i++)
        {
            var parameterName = $"$tagId{i}";
            tagIdParams.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, tagIds[i]);
        }

        command.CommandText = $"SELECT COUNT(*) FROM Tags WHERE Id IN ({string.Join(", ", tagIdParams)});";
        var existingTagCount = Convert.ToInt32(command.ExecuteScalar());
        return existingTagCount == tagIds.Length;
    }

    public (long? Parent, long? Child)? GetMediaLinks(long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Parent, Child FROM Media WHERE Id = $id;";
        command.Parameters.AddWithValue("$id", mediaId);
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        var parentOrdinal = reader.GetOrdinal("Parent");
        var childOrdinal = reader.GetOrdinal("Child");
        var parent = reader.IsDBNull(parentOrdinal) ? (long?)null : reader.GetInt64(parentOrdinal);
        var child = reader.IsDBNull(childOrdinal) ? (long?)null : reader.GetInt64(childOrdinal);
        return (parent, child);
    }

    public void UpdateMedia(long id, string? title, string? description, string? source, long? parent, long? child, long? previousParent, long? previousChild, long[]? tagIds)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();

        using (var command = connection.CreateCommand())
        {
            command.Transaction = transaction;
            command.CommandText = """
                UPDATE Media
                SET Title = $title, Description = $description, Source = $source, Parent = $parent, Child = $child
                WHERE Id = $id;
                """;
            command.Parameters.AddWithValue("$title", title ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("$source", source ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("$parent", parent ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("$child", child ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("$id", id);
            command.ExecuteNonQuery();
        }

        if (previousParent.HasValue && previousParent.Value != parent)
        {
            using var clearOldParentReverse = connection.CreateCommand();
            clearOldParentReverse.Transaction = transaction;
            clearOldParentReverse.CommandText = "UPDATE Media SET Child = NULL WHERE Id = $oldParentId AND Child = $mediaId;";
            clearOldParentReverse.Parameters.AddWithValue("$oldParentId", previousParent.Value);
            clearOldParentReverse.Parameters.AddWithValue("$mediaId", id);
            clearOldParentReverse.ExecuteNonQuery();
        }

        if (previousChild.HasValue && previousChild.Value != child)
        {
            using var clearOldChildReverse = connection.CreateCommand();
            clearOldChildReverse.Transaction = transaction;
            clearOldChildReverse.CommandText = "UPDATE Media SET Parent = NULL WHERE Id = $oldChildId AND Parent = $mediaId;";
            clearOldChildReverse.Parameters.AddWithValue("$oldChildId", previousChild.Value);
            clearOldChildReverse.Parameters.AddWithValue("$mediaId", id);
            clearOldChildReverse.ExecuteNonQuery();
        }

        if (parent.HasValue)
        {
            using var setParentReverse = connection.CreateCommand();
            setParentReverse.Transaction = transaction;
            setParentReverse.CommandText = "UPDATE Media SET Child = $mediaId WHERE Id = $parentId;";
            setParentReverse.Parameters.AddWithValue("$mediaId", id);
            setParentReverse.Parameters.AddWithValue("$parentId", parent.Value);
            setParentReverse.ExecuteNonQuery();

            var parentPreviousChild = GetMediaLinksForTransaction(connection, parent.Value, transaction)?.Child;
            if (parentPreviousChild.HasValue && parentPreviousChild.Value != id)
            {
                using var clearConflictedChildParent = connection.CreateCommand();
                clearConflictedChildParent.Transaction = transaction;
                clearConflictedChildParent.CommandText = "UPDATE Media SET Parent = NULL WHERE Id = $oldChildId AND Parent = $parentId;";
                clearConflictedChildParent.Parameters.AddWithValue("$oldChildId", parentPreviousChild.Value);
                clearConflictedChildParent.Parameters.AddWithValue("$parentId", parent.Value);
                clearConflictedChildParent.ExecuteNonQuery();
            }
        }

        if (child.HasValue)
        {
            using var setChildReverse = connection.CreateCommand();
            setChildReverse.Transaction = transaction;
            setChildReverse.CommandText = "UPDATE Media SET Parent = $mediaId WHERE Id = $childId;";
            setChildReverse.Parameters.AddWithValue("$mediaId", id);
            setChildReverse.Parameters.AddWithValue("$childId", child.Value);
            setChildReverse.ExecuteNonQuery();

            var childPreviousParent = GetMediaLinksForTransaction(connection, child.Value, transaction)?.Parent;
            if (childPreviousParent.HasValue && childPreviousParent.Value != id)
            {
                using var clearConflictedParentChild = connection.CreateCommand();
                clearConflictedParentChild.Transaction = transaction;
                clearConflictedParentChild.CommandText = "UPDATE Media SET Child = NULL WHERE Id = $oldParentId AND Child = $childId;";
                clearConflictedParentChild.Parameters.AddWithValue("$oldParentId", childPreviousParent.Value);
                clearConflictedParentChild.Parameters.AddWithValue("$childId", child.Value);
                clearConflictedParentChild.ExecuteNonQuery();
            }
        }

        if (tagIds is not null)
        {
            using (var deleteTagsCommand = connection.CreateCommand())
            {
                deleteTagsCommand.Transaction = transaction;
                deleteTagsCommand.CommandText = "DELETE FROM MediaTags WHERE MediaId = $mediaId;";
                deleteTagsCommand.Parameters.AddWithValue("$mediaId", id);
                deleteTagsCommand.ExecuteNonQuery();
            }

            foreach (var tagId in tagIds)
            {
                using var insertTagCommand = connection.CreateCommand();
                insertTagCommand.Transaction = transaction;
                insertTagCommand.CommandText = "INSERT INTO MediaTags (MediaId, TagId) VALUES ($mediaId, $tagId);";
                insertTagCommand.Parameters.AddWithValue("$mediaId", id);
                insertTagCommand.Parameters.AddWithValue("$tagId", tagId);
                insertTagCommand.ExecuteNonQuery();
            }
        }

        transaction.Commit();
    }

    public void UpdateFavorite(long id, bool isFavorite)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        var favoritesCollectionId = EnsureFavoritesCollection(connection);
        using var command = connection.CreateCommand();
        command.CommandText = isFavorite
            ? "INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId) VALUES ($collectionId, $mediaId);"
            : "DELETE FROM CollectionsMedia WHERE CollectionId = $collectionId AND MediaId = $mediaId;";
        command.Parameters.AddWithValue("$collectionId", favoritesCollectionId);
        command.Parameters.AddWithValue("$mediaId", id);
        command.ExecuteNonQuery();
    }

    public string? GetMediaPath(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var pathCommand = connection.CreateCommand();
        pathCommand.CommandText = "SELECT Path FROM Media WHERE Id = $id;";
        pathCommand.Parameters.AddWithValue("$id", id);
        return pathCommand.ExecuteScalar() as string;
    }

    public MediaRow? GetMediaById(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections
            FROM Media m
            WHERE m.Id = $id
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$id", id);
        return ReadMediaRows(command).FirstOrDefault();
    }

    public List<MediaRow> GetMediaByIds(IReadOnlyCollection<long> mediaIds)
    {
        if (mediaIds.Count == 0)
        {
            return [];
        }

        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();

        var idParameters = new List<string>();
        var index = 0;
        foreach (var mediaId in mediaIds.Distinct())
        {
            var parameterName = $"$mediaId{index++}";
            idParameters.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, mediaId);
        }

        command.CommandText = $"""
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections
            FROM Media m
            WHERE m.Id IN ({string.Join(", ", idParameters)});
            """;

        return ReadMediaRows(command);
    }

    public MediaHashRow? GetMediaImageHashRecord(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Path, ImageHash
            FROM Media
            WHERE Id = $id
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$id", id);
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new MediaHashRow(
            reader.GetInt64(reader.GetOrdinal("Id")),
            reader.GetString(reader.GetOrdinal("Path")),
            reader.IsDBNull(reader.GetOrdinal("ImageHash")) ? null : reader.GetString(reader.GetOrdinal("ImageHash")));
    }

    public List<MediaHashRow> GetMediaWithoutImageHash()
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Path, ImageHash
            FROM Media
            WHERE (ImageHash IS NULL OR TRIM(ImageHash) = '')
              AND (
                  LOWER(Path) LIKE '%.jpg' OR
                  LOWER(Path) LIKE '%.jpeg' OR
                  LOWER(Path) LIKE '%.jfif' OR
                  LOWER(Path) LIKE '%.png' OR
                  LOWER(Path) LIKE '%.gif' OR
                  LOWER(Path) LIKE '%.webp' OR
                  LOWER(Path) LIKE '%.bmp'
              )
            ORDER BY Id ASC;
            """;
        return ReadMediaHashRows(command);
    }

    public List<MediaHashRow> GetMediaWithImageHashExcluding(long excludedMediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT Id, Path, ImageHash
            FROM Media
            WHERE Id <> $excludedMediaId
              AND ImageHash IS NOT NULL
              AND TRIM(ImageHash) <> ''
            ORDER BY Id DESC;
            """;
        command.Parameters.AddWithValue("$excludedMediaId", excludedMediaId);
        return ReadMediaHashRows(command);
    }

    public void UpdateImageHash(long mediaId, string? imageHash)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Media
            SET ImageHash = $imageHash
            WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$imageHash", imageHash ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$id", mediaId);
        command.ExecuteNonQuery();
    }

    public void DeleteMediaRecordAndRelations(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();
        using var deleteCommand = connection.CreateCommand();
        deleteCommand.Transaction = transaction;
        deleteCommand.CommandText = """
            UPDATE Media SET Parent = NULL WHERE Parent = $id;
            UPDATE Media SET Child = NULL WHERE Child = $id;
            DELETE FROM CollectionsMedia WHERE MediaId = $id;
            DELETE FROM Media WHERE Id = $id;
            """;
        deleteCommand.Parameters.AddWithValue("$id", id);
        deleteCommand.ExecuteNonQuery();
        transaction.Commit();
    }

    private static List<MediaRow> GetOrderedCollectionMedia(SqliteConnection connection, long collectionId)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmFav
                    INNER JOIN Collections cFav ON cFav.Id = cmFav.CollectionId
                    WHERE cmFav.MediaId = m.Id AND cFav.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections
            FROM CollectionsMedia cm
            INNER JOIN Media m ON m.Id = cm.MediaId
            WHERE cm.CollectionId = $collectionId
            ORDER BY m.Id DESC;
            """;
        command.Parameters.AddWithValue("$collectionId", collectionId);

        return CollectionMediaOrderer.Order(ReadMediaRows(command));
    }

    private static List<MediaRow> ReadMediaRows(SqliteCommand command)
    {
        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var pathOrdinal = reader.GetOrdinal("Path");
        var titleOrdinal = reader.GetOrdinal("Title");
        var descriptionOrdinal = reader.GetOrdinal("Description");
        var sourceOrdinal = reader.GetOrdinal("Source");
        var parentOrdinal = reader.GetOrdinal("Parent");
        var childOrdinal = reader.GetOrdinal("Child");
        var favoriteOrdinal = reader.GetOrdinal("IsFavorite");
        var hasCollectionsOrdinal = reader.GetOrdinal("HasCollections");

        var result = new List<MediaRow>();
        while (reader.Read())
        {
            result.Add(new MediaRow(
                reader.GetInt64(idOrdinal),
                reader.IsDBNull(pathOrdinal) ? string.Empty : reader.GetString(pathOrdinal),
                reader.IsDBNull(titleOrdinal) ? null : reader.GetString(titleOrdinal),
                reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
                reader.IsDBNull(sourceOrdinal) ? null : reader.GetString(sourceOrdinal),
                reader.IsDBNull(parentOrdinal) ? null : reader.GetInt64(parentOrdinal),
                reader.IsDBNull(childOrdinal) ? null : reader.GetInt64(childOrdinal),
                !reader.IsDBNull(favoriteOrdinal) && reader.GetInt64(favoriteOrdinal) == 1,
                !reader.IsDBNull(hasCollectionsOrdinal) && reader.GetInt64(hasCollectionsOrdinal) == 1));
        }

        return result;
    }

    private static List<MediaHashRow> ReadMediaHashRows(SqliteCommand command)
    {
        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var pathOrdinal = reader.GetOrdinal("Path");
        var hashOrdinal = reader.GetOrdinal("ImageHash");
        var result = new List<MediaHashRow>();
        while (reader.Read())
        {
            result.Add(new MediaHashRow(
                reader.GetInt64(idOrdinal),
                reader.IsDBNull(pathOrdinal) ? string.Empty : reader.GetString(pathOrdinal),
                reader.IsDBNull(hashOrdinal) ? null : reader.GetString(hashOrdinal)));
        }

        return result;
    }

    private static (long? Parent, long? Child)? GetMediaLinksForTransaction(SqliteConnection connection, long mediaId, SqliteTransaction transaction)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT Parent, Child FROM Media WHERE Id = $id;";
        command.Parameters.AddWithValue("$id", mediaId);
        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        var parentOrdinal = reader.GetOrdinal("Parent");
        var childOrdinal = reader.GetOrdinal("Child");
        var parent = reader.IsDBNull(parentOrdinal) ? (long?)null : reader.GetInt64(parentOrdinal);
        var child = reader.IsDBNull(childOrdinal) ? (long?)null : reader.GetInt64(childOrdinal);
        return (parent, child);
    }

    private static long EnsureFavoritesCollection(SqliteConnection connection)
    {
        using var findCommand = connection.CreateCommand();
        findCommand.CommandText = "SELECT Id FROM Collections WHERE Lable = 'Favorites' ORDER BY Id LIMIT 1;";
        var existingId = findCommand.ExecuteScalar();
        if (existingId is not null && existingId != DBNull.Value)
        {
            return Convert.ToInt64(existingId);
        }

        using var insertCommand = connection.CreateCommand();
        insertCommand.CommandText = "INSERT INTO Collections (Lable, Description, Cover) VALUES ('Favorites', NULL, NULL); SELECT last_insert_rowid();";
        return Convert.ToInt64(insertCommand.ExecuteScalar());
    }
}
