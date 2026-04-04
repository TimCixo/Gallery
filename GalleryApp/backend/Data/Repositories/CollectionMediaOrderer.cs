namespace GalleryApp.Api.Data.Repositories;

internal static class CollectionMediaOrderer
{
    public static List<MediaRepository.MediaRow> Order(IReadOnlyList<MediaRepository.MediaRow> items)
    {
        if (items.Count <= 1)
        {
            return items.ToList();
        }

        var itemsById = items.ToDictionary(item => item.Id);
        var visitedIds = new HashSet<long>();
        var ordered = new List<MediaRepository.MediaRow>(items.Count);

        foreach (var item in items)
        {
            if (visitedIds.Contains(item.Id) || !IsRoot(item, itemsById))
            {
                continue;
            }

            AppendChain(item, itemsById, visitedIds, ordered);
        }

        foreach (var item in items)
        {
            if (visitedIds.Add(item.Id))
            {
                ordered.Add(item);
            }
        }

        return ordered;
    }

    private static bool IsRoot(MediaRepository.MediaRow item, IReadOnlyDictionary<long, MediaRepository.MediaRow> itemsById)
    {
        return !item.Parent.HasValue || !itemsById.ContainsKey(item.Parent.Value);
    }

    private static void AppendChain(
        MediaRepository.MediaRow start,
        IReadOnlyDictionary<long, MediaRepository.MediaRow> itemsById,
        ISet<long> visitedIds,
        ICollection<MediaRepository.MediaRow> ordered)
    {
        var current = start;
        while (visitedIds.Add(current.Id))
        {
            ordered.Add(current);

            if (!current.Child.HasValue || !itemsById.TryGetValue(current.Child.Value, out var child))
            {
                break;
            }

            current = child;
        }
    }
}
