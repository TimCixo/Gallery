using GalleryApp.Api.Infrastructure.Diagnostics;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class RequestDiagnosticsLogTests
{
    [Fact]
    public void Classify_marks_success_as_info()
    {
        var severity = RequestDiagnosticsLog.Classify(StatusCodes.Status200OK);

        Assert.Equal(RequestDiagnosticsSeverity.Info, severity);
    }

    [Fact]
    public void Classify_marks_client_errors_as_warning()
    {
        var severity = RequestDiagnosticsLog.Classify(StatusCodes.Status404NotFound);

        Assert.Equal(RequestDiagnosticsSeverity.Warning, severity);
    }

    [Fact]
    public void Classify_marks_server_errors_and_exceptions_as_error()
    {
        Assert.Equal(
            RequestDiagnosticsSeverity.Error,
            RequestDiagnosticsLog.Classify(StatusCodes.Status500InternalServerError));
        Assert.Equal(
            RequestDiagnosticsSeverity.Error,
            RequestDiagnosticsLog.Classify(StatusCodes.Status200OK, new InvalidOperationException("boom")));
    }

    [Fact]
    public void BuildRequestTarget_appends_query_string_when_present()
    {
        var target = RequestDiagnosticsLog.BuildRequestTarget("/api/media", new QueryString("?page=1&pageSize=36"));

        Assert.Equal("/api/media?page=1&pageSize=36", target);
    }

    [Fact]
    public void ResolveClient_prefers_origin_then_referer_then_remote_ip()
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("127.0.0.1");
        context.Request.Headers.Origin = "http://localhost:5173";

        Assert.Equal("http://localhost:5173", RequestDiagnosticsLog.ResolveClient(context.Request));

        context.Request.Headers.Remove("Origin");
        context.Request.Headers.Referer = "http://localhost:5173/gallery";

        Assert.Equal("http://localhost:5173/gallery", RequestDiagnosticsLog.ResolveClient(context.Request));

        context.Request.Headers.Remove("Referer");

        Assert.Equal("127.0.0.1", RequestDiagnosticsLog.ResolveClient(context.Request));
    }

    [Fact]
    public void FormatMessage_includes_status_duration_and_metadata()
    {
        var message = RequestDiagnosticsLog.FormatMessage(
            new DateTime(2026, 3, 27, 15, 22, 33),
            RequestDiagnosticsSeverity.Warning,
            "GET",
            "/api/tags",
            StatusCodes.Status404NotFound,
            12,
            "application/json; charset=utf-8",
            "http://localhost:5173",
            null);

        Assert.Equal(
            "15:22:33 warning http GET /api/tags -> 404 application/json; charset=utf-8 in 12 ms client=http://localhost:5173",
            message);
    }

    [Fact]
    public void FormatMessage_includes_error_message_for_failures()
    {
        var message = RequestDiagnosticsLog.FormatMessage(
            new DateTime(2026, 3, 27, 15, 22, 33),
            RequestDiagnosticsSeverity.Error,
            "POST",
            "/api/upload",
            StatusCodes.Status500InternalServerError,
            45,
            null,
            null,
            "Upload failed");

        Assert.Equal(
            "15:22:33 error http POST /api/upload -> 500 in 45 ms message=Upload failed",
            message);
    }
}
