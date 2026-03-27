using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;

namespace GalleryApp.Api.Data;

public static class DatabaseInitializer
{
    public static void EnsureDatabase(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var connectionString = scope.ServiceProvider.GetRequiredService<string>();

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS AppInfo (
                Id INTEGER PRIMARY KEY CHECK (Id = 1),
                Name TEXT NOT NULL,
                CreatedAtUtc TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Media (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Path TEXT NOT NULL,
                Title TEXT NULL,
                Description TEXT NULL,
                Source TEXT NULL,
                Parent INTEGER NULL,
                Child INTEGER NULL,
                FOREIGN KEY (Parent) REFERENCES Media(Id),
                FOREIGN KEY (Child) REFERENCES Media(Id)
            );

            CREATE TABLE IF NOT EXISTS Collections (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Lable TEXT NOT NULL,
                Description TEXT NULL,
                Cover INTEGER NULL,
                FOREIGN KEY (Cover) REFERENCES Media(Id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS CollectionsMedia (
                CollectionId INTEGER NOT NULL,
                MediaId INTEGER NOT NULL,
                PRIMARY KEY (CollectionId, MediaId),
                FOREIGN KEY (CollectionId) REFERENCES Collections(Id) ON DELETE CASCADE,
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS TagTypes (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Color TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Tags (
                Id INTEGER PRIMARY KEY AUTOINCREMENT,
                Name TEXT NOT NULL,
                Description TEXT NULL,
                TagTypeId INTEGER NOT NULL,
                FOREIGN KEY (TagTypeId) REFERENCES TagTypes(Id) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS MediaTags (
                MediaId INTEGER NOT NULL,
                TagId INTEGER NOT NULL,
                PRIMARY KEY (MediaId, TagId),
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE,
                FOREIGN KEY (TagId) REFERENCES Tags(Id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS DuplicateGroupExclusions (
                GroupKey TEXT NOT NULL,
                MediaId INTEGER NOT NULL,
                PRIMARY KEY (GroupKey, MediaId),
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS MediaEmbeddings (
                MediaId INTEGER PRIMARY KEY,
                ModelKey TEXT NOT NULL,
                Vector BLOB NOT NULL,
                UpdatedAtUtc TEXT NOT NULL,
                FOREIGN KEY (MediaId) REFERENCES Media(Id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS IX_Media_Parent ON Media(Parent);
            CREATE INDEX IF NOT EXISTS IX_Media_Child ON Media(Child);
            CREATE INDEX IF NOT EXISTS IX_Collections_Cover ON Collections(Cover);
            CREATE INDEX IF NOT EXISTS IX_Collections_Lable ON Collections(Lable);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_CollectionId ON CollectionsMedia(CollectionId);
            CREATE INDEX IF NOT EXISTS IX_CollectionsMedia_MediaId ON CollectionsMedia(MediaId);
            CREATE INDEX IF NOT EXISTS IX_Tags_TagTypeId ON Tags(TagTypeId);

            CREATE UNIQUE INDEX IF NOT EXISTS UX_Tags_TagTypeId_Name_NoCase
                ON Tags(TagTypeId, Name COLLATE NOCASE);

            CREATE INDEX IF NOT EXISTS IX_MediaTags_MediaId ON MediaTags(MediaId);
            CREATE INDEX IF NOT EXISTS IX_MediaTags_TagId ON MediaTags(TagId);
            CREATE INDEX IF NOT EXISTS IX_DuplicateGroupExclusions_MediaId ON DuplicateGroupExclusions(MediaId);
            CREATE INDEX IF NOT EXISTS IX_MediaEmbeddings_ModelKey ON MediaEmbeddings(ModelKey);

            INSERT INTO Collections (Lable, Description, Cover)
            SELECT 'Favorites', NULL, NULL
            WHERE NOT EXISTS (
                SELECT 1
                FROM Collections
                WHERE Lable = 'Favorites'
            );

            INSERT INTO AppInfo (Id, Name, CreatedAtUtc)
            VALUES (1, 'GalleryApp', CURRENT_TIMESTAMP)
            ON CONFLICT(Id) DO NOTHING;
            """;
        command.ExecuteNonQuery();

        EnsureColumnExists(connection, "Media", "ImageHash", "TEXT NULL");

        using var indexCommand = connection.CreateCommand();
        indexCommand.CommandText = "CREATE INDEX IF NOT EXISTS IX_Media_ImageHash ON Media(ImageHash);";
        indexCommand.ExecuteNonQuery();
    }

    private static void EnsureColumnExists(SqliteConnection connection, string tableName, string columnName, string columnDefinition)
    {
        using var pragmaCommand = connection.CreateCommand();
        pragmaCommand.CommandText = $"PRAGMA table_info({tableName});";
        using var reader = pragmaCommand.ExecuteReader();
        while (reader.Read())
        {
            var existingColumnName = reader.GetString(reader.GetOrdinal("name"));
            if (string.Equals(existingColumnName, columnName, StringComparison.OrdinalIgnoreCase))
            {
                return;
            }
        }

        using var alterCommand = connection.CreateCommand();
        alterCommand.CommandText = $"ALTER TABLE {tableName} ADD COLUMN {columnName} {columnDefinition};";
        alterCommand.ExecuteNonQuery();
    }
}
