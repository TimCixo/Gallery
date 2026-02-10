using Microsoft.AspNetCore.Http.HttpResults;

namespace GalleryApp.Api.Validation;

internal sealed record ApiError(string Error);

internal static class ApiResults
{
    public static BadRequest<ApiError> BadRequest(string error) => TypedResults.BadRequest(new ApiError(error));
}
