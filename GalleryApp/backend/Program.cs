using Microsoft.Data.Sqlite;

namespace GalleryApp.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        var dbPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "gallery.db");
        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath
        }.ToString();

        builder.Services.AddSingleton(connectionString);
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy
                    .WithOrigins("http://localhost:5173")
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        var app = builder.Build();

        EnsureDatabase(app.Services);

        app.UseCors("Frontend");

        app.MapGet("/api/health", () =>
            Results.Ok(new
            {
                status = "ok",
                timestampUtc = DateTime.UtcNow
            }));

        app.Run();
    }

    private static void EnsureDatabase(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var connectionString = scope.ServiceProvider.GetRequiredService<string>();

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS AppInfo (
                Id INTEGER PRIMARY KEY CHECK (Id = 1),
                Name TEXT NOT NULL,
                CreatedAtUtc TEXT NOT NULL
            );

            INSERT INTO AppInfo (Id, Name, CreatedAtUtc)
            VALUES (1, 'GalleryApp', CURRENT_TIMESTAMP)
            ON CONFLICT(Id) DO NOTHING;
            """;
        command.ExecuteNonQuery();
    }
}
