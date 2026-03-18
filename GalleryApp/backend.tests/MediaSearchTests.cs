using GalleryApp.Api.Data.Search;
using Microsoft.Data.Sqlite;
using Xunit;

namespace GalleryApp.Api.Tests;

public class MediaSearchTests
{
    [Fact]
    public void ParseMediaSearchCriteria_marks_negative_tag_filters_as_exclusions()
    {
        var criteria = MediaSearchParser.ParseMediaSearchCriteria("-artist:artist1 title:cat");

        Assert.Single(criteria.TitleTerms);
        Assert.Single(criteria.TagFilters);
        Assert.Equal("artist", criteria.TagFilters[0].TagTypeName);
        Assert.Equal("artist1", criteria.TagFilters[0].TagName);
        Assert.True(criteria.TagFilters[0].Exclude);
    }

    [Fact]
    public void ParseMediaSearchCriteria_includes_filetype_filters()
    {
        var criteria = MediaSearchParser.ParseMediaSearchCriteria("filetype:image filetype:gif");

        Assert.Equal(["image", "gif"], criteria.FileTypes);
    }

    [Fact]
    public void BuildMediaSearchWhereClauses_uses_not_exists_for_negative_tag_filters()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();

        var criteria = new MediaSearchCriteria();
        criteria.TagFilters.Add(new MediaSearchTagFilter("artist", "artist1", true));

        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria);

        Assert.Single(whereClauses);
        Assert.Contains("NOT EXISTS", whereClauses[0]);
        Assert.Equal(2, command.Parameters.Count);
    }

    [Fact]
    public void BuildMediaSearchWhereClauses_maps_filetype_to_path_extension_clause()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();

        var criteria = new MediaSearchCriteria();
        criteria.FileTypes.Add("gif");

        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria);

        Assert.Single(whereClauses);
        Assert.Contains("LOWER(m.Path) LIKE", whereClauses[0]);
        Assert.Single(command.Parameters);
        Assert.Equal("%.gif", command.Parameters[0].Value);
    }
}
