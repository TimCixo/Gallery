using System.Diagnostics;

namespace GalleryApp.Api.Infrastructure.Diagnostics;

public sealed class RequestDiagnosticsMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        Exception? exception = null;

        try
        {
            await next(context);
        }
        catch (Exception caughtException)
        {
            exception = caughtException;
            throw;
        }
        finally
        {
            stopwatch.Stop();

            var resolvedStatusCode = exception is null
                ? context.Response.StatusCode
                : StatusCodes.Status500InternalServerError;
            var severity = RequestDiagnosticsLog.Classify(resolvedStatusCode, exception);
            var target = RequestDiagnosticsLog.BuildRequestTarget(context.Request.Path, context.Request.QueryString);
            var client = RequestDiagnosticsLog.ResolveClient(context.Request);
            var message = RequestDiagnosticsLog.FormatMessage(
                DateTime.Now,
                severity,
                context.Request.Method,
                target,
                resolvedStatusCode,
                stopwatch.ElapsedMilliseconds,
                context.Response.ContentType,
                client,
                exception?.Message);

            Console.Out.WriteLine(message);
        }
    }
}
