using GalleryApp.Api;
using GalleryApp.Api.Models.Requests;
using GalleryApp.Api.Services;
using Microsoft.Data.Sqlite;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using static GalleryApp.Api.Services.LegacyHelpers;

namespace GalleryApp.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder app)
    {
        var connectionString = app.ServiceProvider.GetRequiredService<string>();
        var mediaRootPath = app.ServiceProvider.GetRequiredService<MediaStorageOptions>().RootPath;

app.MapGet("/api/health", () =>
    Results.Ok(new
    {
        status = "ok",
        timestampUtc = DateTime.UtcNow
    }));


        return app;
    }
}
