namespace GalleryApp.Api.Infrastructure.Diagnostics;

public enum RequestDiagnosticsSeverity
{
    Info,
    Warning,
    Error
}

public static class RequestDiagnosticsLog
{
    public static RequestDiagnosticsSeverity Classify(int statusCode, Exception? exception = null)
    {
        if (exception is not null || statusCode >= StatusCodes.Status500InternalServerError)
        {
            return RequestDiagnosticsSeverity.Error;
        }

        if (statusCode >= StatusCodes.Status400BadRequest)
        {
            return RequestDiagnosticsSeverity.Warning;
        }

        return RequestDiagnosticsSeverity.Info;
    }

    public static string BuildRequestTarget(PathString path, QueryString queryString)
    {
        return queryString.HasValue ? $"{path}{queryString}" : path.Value ?? "/";
    }

    public static string? ResolveClient(HttpRequest request)
    {
        if (request.Headers.TryGetValue("Origin", out var origin) && !string.IsNullOrWhiteSpace(origin))
        {
            return origin.ToString();
        }

        if (request.Headers.TryGetValue("Referer", out var referer) && !string.IsNullOrWhiteSpace(referer))
        {
            return referer.ToString();
        }

        return request.HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    public static string FormatMessage(
        DateTime timestamp,
        RequestDiagnosticsSeverity severity,
        string method,
        string target,
        int statusCode,
        long elapsedMilliseconds,
        string? responseContentType = null,
        string? client = null,
        string? errorMessage = null)
    {
        var prefix = severity switch
        {
            RequestDiagnosticsSeverity.Warning => "warning http",
            RequestDiagnosticsSeverity.Error => "error http",
            _ => "http"
        };

        var parts = new List<string>
        {
            $"{timestamp:HH:mm:ss} {prefix} {method} {target} -> {statusCode}"
        };

        if (!string.IsNullOrWhiteSpace(responseContentType))
        {
            parts.Add(responseContentType);
        }

        parts.Add($"in {elapsedMilliseconds} ms");

        if (!string.IsNullOrWhiteSpace(client))
        {
            parts.Add($"client={client}");
        }

        if (!string.IsNullOrWhiteSpace(errorMessage))
        {
            parts.Add($"message={errorMessage}");
        }

        return string.Join(" ", parts);
    }
}
