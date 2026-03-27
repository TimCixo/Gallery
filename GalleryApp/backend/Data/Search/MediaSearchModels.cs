namespace GalleryApp.Api.Data.Search;

public sealed class MediaSearchCriteria
{
    public List<string> PathTerms { get; } = [];
    public List<string> ExcludedPathTerms { get; } = [];
    public List<string> TitleTerms { get; } = [];
    public List<string> ExcludedTitleTerms { get; } = [];
    public List<string> DescriptionTerms { get; } = [];
    public List<string> ExcludedDescriptionTerms { get; } = [];
    public List<string> SourceTerms { get; } = [];
    public List<string> ExcludedSourceTerms { get; } = [];
    public List<string> FileTypes { get; } = [];
    public List<string> ExcludedFileTypes { get; } = [];
    public List<string> TagTypes { get; } = [];
    public List<string> ExcludedTagTypes { get; } = [];
    public List<long> Ids { get; } = [];
    public List<long> ExcludedIds { get; } = [];
    public List<MediaSearchTagFilter> TagFilters { get; } = [];

    public bool HasFilters =>
        PathTerms.Count > 0
        || ExcludedPathTerms.Count > 0
        || TitleTerms.Count > 0
        || ExcludedTitleTerms.Count > 0
        || DescriptionTerms.Count > 0
        || ExcludedDescriptionTerms.Count > 0
        || SourceTerms.Count > 0
        || ExcludedSourceTerms.Count > 0
        || FileTypes.Count > 0
        || ExcludedFileTypes.Count > 0
        || TagTypes.Count > 0
        || ExcludedTagTypes.Count > 0
        || Ids.Count > 0
        || ExcludedIds.Count > 0
        || TagFilters.Count > 0;
}

public sealed record MediaSearchTagFilter(string TagTypeName, string TagName, bool Exclude = false);
