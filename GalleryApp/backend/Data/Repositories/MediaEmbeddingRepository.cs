using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Data.Repositories;

public sealed class MediaEmbeddingRepository(string connectionString)
{
    public sealed record MediaEmbeddingCandidate(long MediaId, string Path);
    public sealed record MediaEmbeddingRecord(long MediaId, string Path, string? ModelKey, float[] Vector);
    public sealed record StoredMediaEmbedding(long MediaId, float[] Vector);

    public List<MediaEmbeddingCandidate> GetMediaWithoutEmbedding(string modelKey)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT m.Id, m.Path
            FROM Media m
            LEFT JOIN MediaEmbeddings e ON e.MediaId = m.Id
            WHERE (
                LOWER(m.Path) LIKE '%.jpg' OR
                LOWER(m.Path) LIKE '%.jpeg' OR
                LOWER(m.Path) LIKE '%.jfif' OR
                LOWER(m.Path) LIKE '%.png' OR
                LOWER(m.Path) LIKE '%.gif' OR
                LOWER(m.Path) LIKE '%.webp' OR
                LOWER(m.Path) LIKE '%.bmp'
            )
            AND (
                e.MediaId IS NULL OR
                e.ModelKey IS NULL OR
                TRIM(e.ModelKey) = '' OR
                e.ModelKey <> $modelKey OR
                e.Vector IS NULL OR
                length(e.Vector) = 0
            )
            ORDER BY m.Id ASC;
            """;
        command.Parameters.AddWithValue("$modelKey", modelKey);

        using var reader = command.ExecuteReader();
        var items = new List<MediaEmbeddingCandidate>();
        while (reader.Read())
        {
            items.Add(new MediaEmbeddingCandidate(
                reader.GetInt64(reader.GetOrdinal("Id")),
                reader.GetString(reader.GetOrdinal("Path"))));
        }

        return items;
    }

    public MediaEmbeddingRecord? GetMediaEmbedding(long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                m.Id,
                m.Path,
                e.ModelKey,
                e.Vector
            FROM Media m
            LEFT JOIN MediaEmbeddings e ON e.MediaId = m.Id
            WHERE m.Id = $mediaId
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$mediaId", mediaId);

        using var reader = command.ExecuteReader();
        if (!reader.Read())
        {
            return null;
        }

        return new MediaEmbeddingRecord(
            reader.GetInt64(reader.GetOrdinal("Id")),
            reader.GetString(reader.GetOrdinal("Path")),
            reader.IsDBNull(reader.GetOrdinal("ModelKey")) ? null : reader.GetString(reader.GetOrdinal("ModelKey")),
            reader.IsDBNull(reader.GetOrdinal("Vector"))
                ? []
                : DeserializeVector((byte[])reader["Vector"]));
    }

    public List<StoredMediaEmbedding> GetEmbeddingsExcluding(long excludedMediaId, string modelKey)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT e.MediaId, e.Vector
            FROM MediaEmbeddings e
            INNER JOIN Media m ON m.Id = e.MediaId
            WHERE e.MediaId <> $excludedMediaId
              AND e.ModelKey = $modelKey
              AND e.Vector IS NOT NULL
              AND length(e.Vector) > 0
            ORDER BY e.MediaId DESC;
            """;
        command.Parameters.AddWithValue("$excludedMediaId", excludedMediaId);
        command.Parameters.AddWithValue("$modelKey", modelKey);

        using var reader = command.ExecuteReader();
        var items = new List<StoredMediaEmbedding>();
        while (reader.Read())
        {
            items.Add(new StoredMediaEmbedding(
                reader.GetInt64(reader.GetOrdinal("MediaId")),
                DeserializeVector((byte[])reader["Vector"])));
        }

        return items;
    }

    public void UpsertEmbedding(long mediaId, string modelKey, float[] vector)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO MediaEmbeddings (MediaId, ModelKey, Vector, UpdatedAtUtc)
            VALUES ($mediaId, $modelKey, $vector, CURRENT_TIMESTAMP)
            ON CONFLICT(MediaId) DO UPDATE SET
                ModelKey = excluded.ModelKey,
                Vector = excluded.Vector,
                UpdatedAtUtc = CURRENT_TIMESTAMP;
            """;
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.Parameters.AddWithValue("$modelKey", modelKey);
        command.Parameters.AddWithValue("$vector", SerializeVector(vector));
        command.ExecuteNonQuery();
    }

    public void DeleteEmbedding(long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM MediaEmbeddings WHERE MediaId = $mediaId;";
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.ExecuteNonQuery();
    }

    private static byte[] SerializeVector(float[] vector)
    {
        var buffer = new byte[vector.Length * sizeof(float)];
        Buffer.BlockCopy(vector, 0, buffer, 0, buffer.Length);
        return buffer;
    }

    private static float[] DeserializeVector(byte[] buffer)
    {
        if (buffer.Length == 0)
        {
            return [];
        }

        var vector = new float[buffer.Length / sizeof(float)];
        Buffer.BlockCopy(buffer, 0, vector, 0, buffer.Length);
        return vector;
    }
}
