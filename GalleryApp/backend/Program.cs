using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using GalleryApp.Api.Data;
using GalleryApp.Api.Endpoints;
using GalleryApp.Api.Services;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Services.MediaProcessing;

namespace GalleryApp.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = null;
        });
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = long.MaxValue;
        });

        var dbPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "gallery.db");
        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);

        var mediaRootPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "Media");
        Directory.CreateDirectory(mediaRootPath);
        var previewCachePath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "PreviewCache");
        Directory.CreateDirectory(previewCachePath);

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath
        }.ToString();

        builder.Services.AddSingleton(connectionString);
        builder.Services.AddSingleton(new MediaStorageOptions(mediaRootPath, previewCachePath));
        builder.Services.AddSingleton<MediaRepository>();
        builder.Services.AddSingleton<ImageHashService>();
        builder.Services.AddSingleton<IMediaProcessingService, MediaProcessingService>();
        builder.Services.AddSingleton<MediaQueryService>();
        builder.Services.AddSingleton<DuplicateMediaService>();
        builder.Services.AddSingleton<MediaSimilarityService>();
        builder.Services.AddSingleton<PreviewCacheService>();

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
        DatabaseInitializer.EnsureDatabase(app.Services);
        app.Services.GetRequiredService<MediaSimilarityService>().BackfillMissingHashesAsync().GetAwaiter().GetResult();

        app.UseCors("Frontend");
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(mediaRootPath),
            RequestPath = "/media"
        });

        app.MapHealthEndpoints()
            .MapMediaEndpoints()
            .MapCollectionsEndpoints()
            .MapTagsEndpoints();

        app.Run();
    }
}
