using System.Diagnostics;

namespace GalleryApp.Api.Infrastructure.Startup;

public static class StartupProgressLog
{
    public static string FormatMessage(DateTime timestamp, string message)
    {
        return $"{timestamp:HH:mm:ss} [startup] {message}";
    }

    public static Action<string> CreateWriter(TextWriter writer, Func<DateTime>? nowProvider = null)
    {
        var resolvedNowProvider = nowProvider ?? (() => DateTime.Now);
        return (message) => writer.WriteLine(FormatMessage(resolvedNowProvider(), message));
    }

    public static void WriteInfo(Action<string> write, string message)
    {
        write(message);
    }

    public static void RunStep(Action<string> write, string description, Action action)
    {
        write($"{description}...");
        var stopwatch = Stopwatch.StartNew();

        try
        {
            action();
            stopwatch.Stop();
            write($"{description} completed in {stopwatch.Elapsed:mm\\:ss\\.fff}.");
        }
        catch (Exception exception)
        {
            stopwatch.Stop();
            write($"{description} failed after {stopwatch.Elapsed:mm\\:ss\\.fff}: {exception.Message}");
            throw;
        }
    }
}
