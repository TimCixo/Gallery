namespace GalleryApp.Api.Validation;

internal sealed record CollectionQueryInput(string? Search, long? MediaId);
internal sealed record CollectionMutationInput(string Label, string? Description, long? Cover);
internal sealed record CollectionMediaInput(long CollectionId, long MediaId);

internal static class CollectionValidator
{
    public static ValidationResult<CollectionQueryInput> ValidateQuery(string? search, long? mediaId)
    {
        if (!ReusableValidation.IsPositiveId(mediaId))
        {
            return ValidationResult<CollectionQueryInput>.Fail("Invalid media id.");
        }

        return ValidationResult<CollectionQueryInput>.Success(new(
            ReusableValidation.NormalizeOptionalText(search),
            mediaId));
    }

    public static ValidationResult<CollectionMutationInput> ValidateCreateOrUpdate(string? label, string? description, long? cover)
    {
        var normalizedLabel = ReusableValidation.NormalizeOptionalText(label);
        if (normalizedLabel is null)
        {
            return ValidationResult<CollectionMutationInput>.Fail("Collection name is required.");
        }

        if (!ReusableValidation.IsPositiveId(cover))
        {
            return ValidationResult<CollectionMutationInput>.Fail("Cover must be a positive media id.");
        }

        return ValidationResult<CollectionMutationInput>.Success(new(
            normalizedLabel,
            ReusableValidation.NormalizeOptionalText(description),
            cover));
    }

    public static ValidationResult<long> ValidateCollectionId(long id)
    {
        if (!ReusableValidation.IsPositiveId(id))
        {
            return ValidationResult<long>.Fail("Invalid collection id.");
        }

        return ValidationResult<long>.Success(id);
    }

    public static ValidationResult<CollectionMediaInput> ValidateCollectionMediaAdd(long collectionId, long mediaId)
    {
        if (!ReusableValidation.IsPositiveId(collectionId))
        {
            return ValidationResult<CollectionMediaInput>.Fail("Invalid collection id.");
        }

        if (!ReusableValidation.IsPositiveId(mediaId))
        {
            return ValidationResult<CollectionMediaInput>.Fail("Invalid media id.");
        }

        return ValidationResult<CollectionMediaInput>.Success(new(collectionId, mediaId));
    }
}
