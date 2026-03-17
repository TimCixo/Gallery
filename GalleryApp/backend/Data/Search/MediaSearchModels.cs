namespace GalleryApp.Api.Data.Search;

public sealed class MediaSearchCriteria
{
    public List<string> PathTerms { get; } = [];
    public List<string> TitleTerms { get; } = [];
    public List<string> DescriptionTerms { get; } = [];
    public List<string> SourceTerms { get; } = [];
    public List<long> Ids { get; } = [];
    public List<MediaSearchTagFilter> TagFilters { get; } = [];

    public bool HasFilters =>
        PathTerms.Count > 0
        || TitleTerms.Count > 0
        || DescriptionTerms.Count > 0
        || SourceTerms.Count > 0
        || Ids.Count > 0
        || TagFilters.Count > 0;
}

public sealed record MediaSearchTagFilter(string TagTypeName, string TagName, bool Exclude = false);
