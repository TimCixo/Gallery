namespace GalleryApp.Api.Validation;

internal sealed record ValidationResult<T>(T? Value, string? Error)
{
    public bool IsValid => Error is null;

    public static ValidationResult<T> Success(T value) => new(value, null);

    public static ValidationResult<T> Fail(string error) => new(default, error);
}
