namespace GalleryApp.Api.Validation;

internal sealed record TagTypeInput(string Name, string Color);

internal static class TagTypeValidator
{
    public static ValidationResult<TagTypeInput> ValidateCreateOrUpdate(string? name, string? color)
    {
        var normalizedName = ReusableValidation.NormalizeOptionalText(name);
        if (normalizedName is null)
        {
            return ValidationResult<TagTypeInput>.Fail("Name is required.");
        }

        var normalizedColor = ReusableValidation.NormalizeOptionalText(color)?.ToUpperInvariant();
        if (normalizedColor is null || !ReusableValidation.IsValidHexColor(normalizedColor))
        {
            return ValidationResult<TagTypeInput>.Fail("Color must be a valid hex code (#RRGGBB).");
        }

        return ValidationResult<TagTypeInput>.Success(new(normalizedName, normalizedColor));
    }

    public static ValidationResult<long> ValidateTagTypeId(long id)
    {
        if (!ReusableValidation.IsPositiveId(id))
        {
            return ValidationResult<long>.Fail("Invalid tag type id.");
        }

        return ValidationResult<long>.Success(id);
    }
}
