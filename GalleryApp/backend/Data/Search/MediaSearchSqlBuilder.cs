using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Data.Search;

public static class MediaSearchSqlBuilder
{
    public static List<string> BuildMediaSearchWhereClauses(
        SqliteCommand command,
        MediaSearchCriteria? criteria,
        bool favoritesOnly = false)
    {
        var whereClauses = new List<string>();
        if (favoritesOnly)
        {
            whereClauses.Add("""
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                )
                """);
        }

        if (criteria is null || !criteria.HasFilters)
        {
            return whereClauses;
        }

        var parameterIndex = 0;

        AddContainsClauses(criteria.PathTerms, "m.Path");
        AddContainsClauses(criteria.TitleTerms, "IFNULL(m.Title, '')");
        AddContainsClauses(criteria.DescriptionTerms, "IFNULL(m.Description, '')");
        AddContainsClauses(criteria.SourceTerms, "IFNULL(m.Source, '')");
        AddTagClauses(criteria.TagFilters);

        if (criteria.Ids.Count > 0)
        {
            var idParams = new List<string>();
            foreach (var id in criteria.Ids.Distinct())
            {
                var paramName = $"$p{parameterIndex++}";
                idParams.Add(paramName);
                command.Parameters.AddWithValue(paramName, id);
            }

            whereClauses.Add(idParams.Count == 1
                ? $"m.Id = {idParams[0]}"
                : $"m.Id IN ({string.Join(", ", idParams)})");
        }

        return whereClauses;

        void AddContainsClauses(IEnumerable<string> terms, string sqlField)
        {
            foreach (var term in terms.Where(value => !string.IsNullOrWhiteSpace(value)))
            {
                var paramName = $"$p{parameterIndex++}";
                command.Parameters.AddWithValue(paramName, $"%{term.Trim().ToLowerInvariant()}%");
                whereClauses.Add($"LOWER({sqlField}) LIKE {paramName}");
            }
        }

        void AddTagClauses(IEnumerable<MediaSearchTagFilter> filters)
        {
            foreach (var filter in filters)
            {
                if (string.IsNullOrWhiteSpace(filter.TagTypeName) || string.IsNullOrWhiteSpace(filter.TagName))
                {
                    continue;
                }

                var typeParamName = $"$p{parameterIndex++}";
                var tagParamName = $"$p{parameterIndex++}";
                command.Parameters.AddWithValue(typeParamName, filter.TagTypeName.Trim().ToLowerInvariant());
                command.Parameters.AddWithValue(tagParamName, $"%{filter.TagName.Trim().ToLowerInvariant()}%");
                whereClauses.Add($"""
                    EXISTS (
                        SELECT 1
                        FROM MediaTags mt
                        INNER JOIN Tags t ON t.Id = mt.TagId
                        INNER JOIN TagTypes tt ON tt.Id = t.TagTypeId
                        WHERE mt.MediaId = m.Id
                          AND LOWER(tt.Name) = {typeParamName}
                          AND LOWER(t.Name) LIKE {tagParamName}
                    )
                    """);
            }
        }
    }
}
