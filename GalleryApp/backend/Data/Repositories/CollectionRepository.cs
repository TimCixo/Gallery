using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Data.Repositories;

public sealed class CollectionRepository(string connectionString)
{
    public sealed record CollectionItem(long Id, string Label, string? Description, long? Cover, string? CoverPath, bool ContainsMedia);

    public List<CollectionItem> GetCollections(string? normalizedSearch, long? mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                c.Id,
                c.Lable,
                c.Description,
                c.Cover,
                m.Path,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    WHERE cm.CollectionId = c.Id
                      AND ($mediaId IS NOT NULL AND cm.MediaId = $mediaId)
                ) AS ContainsMedia
            FROM Collections c
            LEFT JOIN Media m ON m.Id = c.Cover
            WHERE c.Lable <> 'Favorites'
              AND ($search IS NULL OR LOWER(c.Lable) LIKE $search)
            ORDER BY c.Id DESC;
            """;
        command.Parameters.AddWithValue("$search", normalizedSearch is null ? DBNull.Value : $"%{normalizedSearch.ToLowerInvariant()}%");
        command.Parameters.AddWithValue("$mediaId", mediaId ?? (object)DBNull.Value);

        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var labelOrdinal = reader.GetOrdinal("Lable");
        var descriptionOrdinal = reader.GetOrdinal("Description");
        var coverOrdinal = reader.GetOrdinal("Cover");
        var pathOrdinal = reader.GetOrdinal("Path");
        var containsMediaOrdinal = reader.GetOrdinal("ContainsMedia");

        var items = new List<CollectionItem>();
        while (reader.Read())
        {
            items.Add(new CollectionItem(
                Id: reader.GetInt64(idOrdinal),
                Label: reader.GetString(labelOrdinal),
                Description: reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
                Cover: reader.IsDBNull(coverOrdinal) ? null : reader.GetInt64(coverOrdinal),
                CoverPath: reader.IsDBNull(pathOrdinal) ? null : reader.GetString(pathOrdinal),
                ContainsMedia: !reader.IsDBNull(containsMediaOrdinal) && reader.GetInt64(containsMediaOrdinal) == 1));
        }

        return items;
    }

    public bool CollectionNameExists(string label, long? excludeId = null)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = excludeId.HasValue
            ? """
                SELECT EXISTS (
                    SELECT 1 FROM Collections WHERE Lable = $label COLLATE NOCASE AND Id <> $id
                );
                """
            : """
                SELECT EXISTS (
                    SELECT 1 FROM Collections WHERE Lable = $label COLLATE NOCASE
                );
                """;
        command.Parameters.AddWithValue("$label", label);
        if (excludeId.HasValue)
        {
            command.Parameters.AddWithValue("$id", excludeId.Value);
        }

        return Convert.ToInt64(command.ExecuteScalar()) == 1;
    }

    public long CreateCollection(string label, string? description, long? cover)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO Collections (Lable, Description, Cover)
            VALUES ($label, $description, $cover);

            SELECT last_insert_rowid();
            """;
        command.Parameters.AddWithValue("$label", label);
        command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$cover", cover ?? (object)DBNull.Value);
        return Convert.ToInt64(command.ExecuteScalar());
    }

    public bool UpdateCollection(long id, string label, string? description, long? cover)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE Collections
            SET Lable = $label, Description = $description, Cover = $cover
            WHERE Id = $id
              AND Lable <> 'Favorites';
            """;
        command.Parameters.AddWithValue("$label", label);
        command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$cover", cover ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteNonQuery() > 0;
    }

    public bool DeleteCollection(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            DELETE FROM Collections
            WHERE Id = $id
              AND Lable <> 'Favorites';
            """;
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteNonQuery() > 0;
    }

    public bool CollectionExists(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (SELECT 1 FROM Collections WHERE Id = $collectionId);
            """;
        command.Parameters.AddWithValue("$collectionId", id);
        return Convert.ToInt64(command.ExecuteScalar()) == 1;
    }

    public bool ToggleCollectionMedia(long collectionId, long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var existsCommand = connection.CreateCommand();
        existsCommand.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM CollectionsMedia
                WHERE CollectionId = $collectionId AND MediaId = $mediaId
            );
            """;
        existsCommand.Parameters.AddWithValue("$collectionId", collectionId);
        existsCommand.Parameters.AddWithValue("$mediaId", mediaId);
        var alreadyIncluded = Convert.ToInt64(existsCommand.ExecuteScalar()) == 1;

        using var command = connection.CreateCommand();
        command.CommandText = alreadyIncluded
            ? "DELETE FROM CollectionsMedia WHERE CollectionId = $collectionId AND MediaId = $mediaId;"
            : "INSERT INTO CollectionsMedia (CollectionId, MediaId) VALUES ($collectionId, $mediaId);";
        command.Parameters.AddWithValue("$collectionId", collectionId);
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.ExecuteNonQuery();

        return !alreadyIncluded;
    }
}
