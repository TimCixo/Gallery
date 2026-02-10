namespace GalleryApp.Api.Validation;

internal sealed record MediaUpdateInput(
    long MediaId,
    string? Title,
    string? Description,
    string? Source,
    long? Parent,
    long? Child,
    long[]? TagIds);

internal static class MediaValidator
{
    public static ValidationResult<MediaUpdateInput> ValidateUpdate(
        long mediaId,
        string? title,
        string? description,
        string? source,
        long? parent,
        long? child,
        IEnumerable<long>? tagIds)
    {
        if (!ReusableValidation.IsPositiveId(mediaId))
        {
            return ValidationResult<MediaUpdateInput>.Fail("Invalid media id.");
        }

        var normalizedSource = ReusableValidation.NormalizeOptionalText(source);
        if (normalizedSource is not null && !ReusableValidation.IsValidHttpUrl(normalizedSource))
        {
            return ValidationResult<MediaUpdateInput>.Fail("Source must be a valid absolute http/https URL.");
        }

        if (!ReusableValidation.IsPositiveId(parent))
        {
            return ValidationResult<MediaUpdateInput>.Fail("Parent must be a positive id.");
        }

        if (!ReusableValidation.IsPositiveId(child))
        {
            return ValidationResult<MediaUpdateInput>.Fail("Child must be a positive id.");
        }

        if (parent == mediaId || child == mediaId)
        {
            return ValidationResult<MediaUpdateInput>.Fail("Parent and Child cannot reference the same media item.");
        }

        var normalizedTagIds = tagIds?
            .Where(tagId => tagId > 0)
            .Distinct()
            .ToArray();

        return ValidationResult<MediaUpdateInput>.Success(new(
            mediaId,
            ReusableValidation.NormalizeOptionalText(title),
            ReusableValidation.NormalizeOptionalText(description),
            normalizedSource,
            parent,
            child,
            normalizedTagIds));
    }

    public static ValidationResult<long> ValidateMediaId(long id)
    {
        if (!ReusableValidation.IsPositiveId(id))
        {
            return ValidationResult<long>.Fail("Invalid media id.");
        }

        return ValidationResult<long>.Success(id);
    }
}
