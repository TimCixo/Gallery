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
    public void ParseMediaSearchCriteria_marks_negative_base_filters_as_exclusions()
    {
        var criteria = MediaSearchParser.ParseMediaSearchCriteria("-title:cat -filetype:gif -id:42 -source:pixiv");

        Assert.Single(criteria.ExcludedTitleTerms);
        Assert.Equal("cat", criteria.ExcludedTitleTerms[0]);
        Assert.Single(criteria.ExcludedFileTypes);
        Assert.Equal("gif", criteria.ExcludedFileTypes[0]);
        Assert.Single(criteria.ExcludedIds);
        Assert.Equal(42, criteria.ExcludedIds[0]);
        Assert.Single(criteria.ExcludedSourceTerms);
        Assert.Equal("pixiv", criteria.ExcludedSourceTerms[0]);
    }

    [Fact]
    public void ParseMediaSearchCriteria_includes_filetype_filters()
    {
        var criteria = MediaSearchParser.ParseMediaSearchCriteria("filetype:image filetype:gif");

        Assert.Equal(["image", "gif"], criteria.FileTypes);
    }

    [Fact]
    public void ParseMediaSearchCriteria_includes_tagtype_filters()
    {
        var criteria = MediaSearchParser.ParseMediaSearchCriteria("tagtype:artist -tagtype:series artist:cat");

        Assert.Equal(["artist"], criteria.TagTypes);
        Assert.Equal(["series"], criteria.ExcludedTagTypes);
        Assert.Single(criteria.TagFilters);
        Assert.Equal("artist", criteria.TagFilters[0].TagTypeName);
        Assert.Equal("cat", criteria.TagFilters[0].TagName);
        Assert.False(criteria.TagFilters[0].Exclude);
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
    public void BuildMediaSearchWhereClauses_uses_exists_for_tagtype_filters()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();

        var criteria = new MediaSearchCriteria();
        criteria.TagTypes.Add("artist");

        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria);

        Assert.Single(whereClauses);
        Assert.Contains("EXISTS", whereClauses[0]);
        Assert.DoesNotContain("LIKE", whereClauses[0]);
        Assert.Single(command.Parameters);
        Assert.Equal("artist", command.Parameters[0].Value);
    }

    [Fact]
    public void BuildMediaSearchWhereClauses_uses_not_exists_for_negative_tagtype_filters()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();

        var criteria = new MediaSearchCriteria();
        criteria.ExcludedTagTypes.Add("artist");

        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria);

        Assert.Single(whereClauses);
        Assert.Contains("NOT EXISTS", whereClauses[0]);
        Assert.Single(command.Parameters);
        Assert.Equal("artist", command.Parameters[0].Value);
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

    [Fact]
    public void BuildMediaSearchWhereClauses_uses_negative_clauses_for_negative_base_filters()
    {
        using var connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        using var command = connection.CreateCommand();

        var criteria = new MediaSearchCriteria();
        criteria.ExcludedTitleTerms.Add("cat");
        criteria.ExcludedFileTypes.Add("gif");
        criteria.ExcludedIds.Add(42);

        var whereClauses = MediaSearchSqlBuilder.BuildMediaSearchWhereClauses(command, criteria);

        Assert.Equal(3, whereClauses.Count);
        Assert.Contains("NOT LIKE", whereClauses[0]);
        Assert.Contains("NOT LOWER(m.Path) LIKE", whereClauses[1]);
        Assert.Contains("m.Id <>", whereClauses[2]);
    }
}
