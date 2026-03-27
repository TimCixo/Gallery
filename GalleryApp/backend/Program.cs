using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using GalleryApp.Api.Data;
using GalleryApp.Api.Endpoints;
using GalleryApp.Api.Infrastructure.Embeddings;
using GalleryApp.Api.Services;
using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Services.MediaProcessing;
using GalleryApp.Api.Services.Embeddings;
using GalleryApp.Api.Infrastructure.Diagnostics;
using GalleryApp.Api.Infrastructure.Startup;

namespace GalleryApp.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var startupLog = StartupProgressLog.CreateWriter(Console.Out);
        StartupProgressLog.WriteInfo(startupLog, "Backend startup started.");

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
        StartupProgressLog.WriteInfo(startupLog, $"Content root: {builder.Environment.ContentRootPath}");
        StartupProgressLog.WriteInfo(startupLog, $"SQLite database: {dbPath}");

        var mediaRootPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "Media");
        Directory.CreateDirectory(mediaRootPath);
        var previewCachePath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "PreviewCache");
        Directory.CreateDirectory(previewCachePath);
        var modelsRootPath = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "Models");
        Directory.CreateDirectory(modelsRootPath);
        StartupProgressLog.WriteInfo(startupLog, $"Media root: {mediaRootPath}");
        StartupProgressLog.WriteInfo(startupLog, $"Preview cache: {previewCachePath}");
        StartupProgressLog.WriteInfo(startupLog, $"Embedding models: {modelsRootPath}");

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbPath
        }.ToString();

        builder.Services.AddSingleton(connectionString);
        builder.Services.AddSingleton(new MediaStorageOptions(mediaRootPath, previewCachePath));
        builder.Services.AddSingleton(new MediaEmbeddingOptions(
            modelsRootPath,
            Path.Combine(modelsRootPath, "clip-vit-base-patch32-vision-quantized.onnx"),
            "https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model_quantized.onnx?download=true"));
        builder.Services.AddSingleton<HttpClient>();
        builder.Services.AddSingleton<MediaRepository>();
        builder.Services.AddSingleton<MediaEmbeddingRepository>();
        builder.Services.AddSingleton<ImageHashService>();
        builder.Services.AddSingleton<IImageEmbeddingGenerator, OnnxImageEmbeddingGenerator>();
        builder.Services.AddSingleton<IMediaProcessingService, MediaProcessingService>();
        builder.Services.AddSingleton<MediaQueryService>();
        builder.Services.AddSingleton<DuplicateMediaService>();
        builder.Services.AddSingleton<MediaSimilarityService>();
        builder.Services.AddSingleton<MediaRecommendationService>();
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

        StartupProgressLog.WriteInfo(startupLog, "Building web application...");
        var app = builder.Build();
        StartupProgressLog.WriteInfo(startupLog, "Web application build completed.");

        StartupProgressLog.RunStep(startupLog, "Ensuring database schema", () =>
        {
            DatabaseInitializer.EnsureDatabase(app.Services);
        });
        StartupProgressLog.RunStep(startupLog, "Backfilling missing image hashes", () =>
        {
            app.Services.GetRequiredService<MediaSimilarityService>().BackfillMissingHashesAsync().GetAwaiter().GetResult();
        });
        StartupProgressLog.RunStep(startupLog, "Backfilling missing image embeddings", () =>
        {
            app.Services.GetRequiredService<MediaRecommendationService>().BackfillMissingEmbeddingsAsync().GetAwaiter().GetResult();
        });
        StartupProgressLog.RunStep(startupLog, "Configuring middleware and endpoints", () =>
        {
            app.UseCors("Frontend");
            app.UseMiddleware<RequestDiagnosticsMiddleware>();
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(mediaRootPath),
                RequestPath = "/media"
            });

            app.MapHealthEndpoints()
                .MapMediaEndpoints()
                .MapCollectionsEndpoints()
                .MapTagsEndpoints();
        });

        StartupProgressLog.WriteInfo(startupLog, "Initialization complete. Starting HTTP listener.");
        app.Run();
    }
}
