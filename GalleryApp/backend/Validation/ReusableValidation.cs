using System.Text.RegularExpressions;

namespace GalleryApp.Api.Validation;

internal static class ReusableValidation
{
    private static readonly Regex HexColorRegex = new("^#[0-9A-Fa-f]{6}$", RegexOptions.Compiled);

    public static string? NormalizeOptionalText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    public static bool IsValidHttpUrl(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.Scheme.Equals(Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            || uri.Scheme.Equals(Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase);
    }

    public static bool IsValidHexColor(string value) => HexColorRegex.IsMatch(value);

    public static bool IsPositiveId(long value) => value > 0;

    public static bool IsPositiveId(long? value) => !value.HasValue || IsPositiveId(value.Value);
}
