using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Data.Repositories;

public sealed class TagRepository(string connectionString)
{
    public sealed record TagTypeItem(long Id, string Name, string Color);
    public sealed record TagItem(long Id, string Name, string? Description, long TagTypeId, string? TagTypeName, string? TagTypeColor);

    public List<TagTypeItem> GetTagTypes()
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, Name, Color FROM TagTypes ORDER BY Id DESC;";
        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var nameOrdinal = reader.GetOrdinal("Name");
        var colorOrdinal = reader.GetOrdinal("Color");
        var items = new List<TagTypeItem>();
        while (reader.Read())
        {
            items.Add(new TagTypeItem(reader.GetInt64(idOrdinal), reader.GetString(nameOrdinal), reader.GetString(colorOrdinal)));
        }

        return items;
    }

    public long CreateTagType(string name, string color)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO TagTypes (Name, Color) VALUES ($name, $color); SELECT last_insert_rowid();";
        command.Parameters.AddWithValue("$name", name);
        command.Parameters.AddWithValue("$color", color);
        return Convert.ToInt64(command.ExecuteScalar());
    }

    public bool UpdateTagType(long id, string name, string color)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE TagTypes SET Name = $name, Color = $color WHERE Id = $id;";
        command.Parameters.AddWithValue("$name", name);
        command.Parameters.AddWithValue("$color", color);
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteNonQuery() > 0;
    }

    public List<TagItem> GetTagsByType(long tagTypeId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, Name, Description FROM Tags WHERE TagTypeId = $tagTypeId ORDER BY Name COLLATE NOCASE ASC, Id ASC;";
        command.Parameters.AddWithValue("$tagTypeId", tagTypeId);
        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var nameOrdinal = reader.GetOrdinal("Name");
        var descriptionOrdinal = reader.GetOrdinal("Description");
        var items = new List<TagItem>();
        while (reader.Read())
        {
            items.Add(new TagItem(
                reader.GetInt64(idOrdinal),
                reader.GetString(nameOrdinal),
                reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
                0,
                null,
                null));
        }

        return items;
    }

    public List<TagItem> GetAllTags()
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                t.Id,
                t.Name,
                t.Description,
                tt.Id AS TagTypeId,
                tt.Name AS TagTypeName,
                tt.Color AS TagTypeColor
            FROM Tags t
            INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
            ORDER BY tt.Name COLLATE NOCASE ASC, t.Name COLLATE NOCASE ASC, t.Id ASC;
            """;
        using var reader = command.ExecuteReader();
        var idOrdinal = reader.GetOrdinal("Id");
        var nameOrdinal = reader.GetOrdinal("Name");
        var descriptionOrdinal = reader.GetOrdinal("Description");
        var tagTypeIdOrdinal = reader.GetOrdinal("TagTypeId");
        var tagTypeNameOrdinal = reader.GetOrdinal("TagTypeName");
        var tagTypeColorOrdinal = reader.GetOrdinal("TagTypeColor");
        var items = new List<TagItem>();
        while (reader.Read())
        {
            items.Add(new TagItem(
                reader.GetInt64(idOrdinal),
                reader.GetString(nameOrdinal),
                reader.IsDBNull(descriptionOrdinal) ? null : reader.GetString(descriptionOrdinal),
                reader.GetInt64(tagTypeIdOrdinal),
                reader.GetString(tagTypeNameOrdinal),
                reader.GetString(tagTypeColorOrdinal)));
        }

        return items;
    }

    public bool TagTypeExists(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT EXISTS (SELECT 1 FROM TagTypes WHERE Id = $tagTypeId);";
        command.Parameters.AddWithValue("$tagTypeId", id);
        return Convert.ToInt64(command.ExecuteScalar()) == 1;
    }

    public bool TagNameExists(string name, long? excludeId = null)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = excludeId.HasValue
            ? "SELECT EXISTS (SELECT 1 FROM Tags WHERE Name = $name COLLATE NOCASE AND Id <> $id);"
            : "SELECT EXISTS (SELECT 1 FROM Tags WHERE Name = $name COLLATE NOCASE);";
        command.Parameters.AddWithValue("$name", name);
        if (excludeId.HasValue)
        {
            command.Parameters.AddWithValue("$id", excludeId.Value);
        }

        return Convert.ToInt64(command.ExecuteScalar()) == 1;
    }

    public long CreateTag(string name, string? description, long tagTypeId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "INSERT INTO Tags (Name, Description, TagTypeId) VALUES ($name, $description, $tagTypeId); SELECT last_insert_rowid();";
        command.Parameters.AddWithValue("$name", name);
        command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$tagTypeId", tagTypeId);
        return Convert.ToInt64(command.ExecuteScalar());
    }

    public bool UpdateTag(long id, string name, string? description)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE Tags SET Name = $name, Description = $description WHERE Id = $id;";
        command.Parameters.AddWithValue("$name", name);
        command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteNonQuery() > 0;
    }

    public bool DeleteTag(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM Tags WHERE Id = $id;";
        command.Parameters.AddWithValue("$id", id);
        return command.ExecuteNonQuery() > 0;
    }

    public bool DeleteTagType(long id)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            DELETE FROM MediaTags
            WHERE TagId IN (
                SELECT Id FROM Tags WHERE TagTypeId = $id
            );
            DELETE FROM Tags WHERE TagTypeId = $id;
            DELETE FROM TagTypes WHERE Id = $id;
            """;
        command.Parameters.AddWithValue("$id", id);
        var affectedRows = command.ExecuteNonQuery();
        if (affectedRows == 0)
        {
            transaction.Rollback();
            return false;
        }

        transaction.Commit();
        return true;
    }
}
