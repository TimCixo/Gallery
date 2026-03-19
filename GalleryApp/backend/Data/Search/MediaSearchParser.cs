namespace GalleryApp.Api.Data.Search;

public static class MediaSearchParser
{
    public static MediaSearchCriteria ParseMediaSearchCriteria(string? search)
    {
        var criteria = new MediaSearchCriteria();
        if (string.IsNullOrWhiteSpace(search))
        {
            return criteria;
        }

        var text = search.Trim();
        var index = 0;

        while (index < text.Length)
        {
            while (index < text.Length && char.IsWhiteSpace(text[index]))
            {
                index++;
            }

            if (index >= text.Length)
            {
                break;
            }

            var isExcluded = text[index] == '-';
            if (isExcluded)
            {
                index++;
            }

            if (index >= text.Length)
            {
                break;
            }

            var hasAtPrefix = text[index] == '@';
            var tagStart = hasAtPrefix ? index + 1 : index;
            var separatorIndex = text.IndexOf(':', tagStart);
            if (separatorIndex < 0)
            {
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }

                continue;
            }

            var hasWhitespaceBeforeSeparator = false;
            for (var i = tagStart; i < separatorIndex; i++)
            {
                if (char.IsWhiteSpace(text[i]))
                {
                    hasWhitespaceBeforeSeparator = true;
                    break;
                }
            }

            if (hasWhitespaceBeforeSeparator || separatorIndex == tagStart)
            {
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }
                continue;
            }

            var tag = text.Substring(tagStart, separatorIndex - tagStart).Trim().ToLowerInvariant();
            index = separatorIndex + 1;

            while (index < text.Length && char.IsWhiteSpace(text[index]))
            {
                index++;
            }

            if (index >= text.Length)
            {
                break;
            }

            string rawValue;
            if (text[index] == '"' || text[index] == '“' || text[index] == '”')
            {
                var openingQuote = text[index];
                var closingQuote = openingQuote == '“' ? '”' : '"';
                var valueStart = index + 1;
                var closingQuoteIndex = text.IndexOf(closingQuote, valueStart);
                if (closingQuoteIndex < 0 && closingQuote != '"')
                {
                    closingQuoteIndex = text.IndexOf('"', valueStart);
                }

                if (closingQuoteIndex < 0)
                {
                    rawValue = text[valueStart..];
                    index = text.Length;
                }
                else
                {
                    rawValue = text.Substring(valueStart, closingQuoteIndex - valueStart);
                    index = closingQuoteIndex + 1;
                }

                if (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    while (index < text.Length && !char.IsWhiteSpace(text[index]))
                    {
                        index++;
                    }

                    continue;
                }
            }
            else
            {
                var valueStart = index;
                while (index < text.Length && !char.IsWhiteSpace(text[index]))
                {
                    index++;
                }

                rawValue = text.Substring(valueStart, index - valueStart);
            }

            var value = rawValue.Trim();
            if (string.IsNullOrWhiteSpace(value))
            {
                continue;
            }

            switch (tag)
            {
                case "path":
                    (isExcluded ? criteria.ExcludedPathTerms : criteria.PathTerms).Add(value);
                    break;
                case "title":
                    (isExcluded ? criteria.ExcludedTitleTerms : criteria.TitleTerms).Add(value);
                    break;
                case "description":
                    (isExcluded ? criteria.ExcludedDescriptionTerms : criteria.DescriptionTerms).Add(value);
                    break;
                case "source":
                    (isExcluded ? criteria.ExcludedSourceTerms : criteria.SourceTerms).Add(value);
                    break;
                case "filetype":
                    (isExcluded ? criteria.ExcludedFileTypes : criteria.FileTypes).Add(value);
                    break;
                case "id":
                    if (long.TryParse(value, out var parsedId) && parsedId > 0)
                    {
                        (isExcluded ? criteria.ExcludedIds : criteria.Ids).Add(parsedId);
                    }
                    break;
                default:
                    criteria.TagFilters.Add(new MediaSearchTagFilter(tag, value, isExcluded));
                    break;
            }
        }

        return criteria;
    }
}
