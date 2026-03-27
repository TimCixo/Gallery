using GalleryApp.Api.Infrastructure.Startup;
using Xunit;

namespace GalleryApp.Api.Tests;

public sealed class StartupProgressLogTests
{
    [Fact]
    public void FormatMessage_prefixes_time_and_startup_tag()
    {
        var timestamp = new DateTime(2026, 3, 27, 8, 42, 19);

        var formatted = StartupProgressLog.FormatMessage(timestamp, "Backend startup started.");

        Assert.Equal("08:42:19 [startup] Backend startup started.", formatted);
    }

    [Fact]
    public void RunStep_writes_start_and_completion_messages()
    {
        var messages = new List<string>();

        StartupProgressLog.RunStep(messages.Add, "Ensuring database schema", () => { });

        Assert.Equal("Ensuring database schema...", messages[0]);
        Assert.StartsWith("Ensuring database schema completed in ", messages[1]);
    }
}
