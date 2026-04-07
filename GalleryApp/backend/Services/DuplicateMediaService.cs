using GalleryApp.Api.Data.Repositories;
using GalleryApp.Api.Infrastructure.Pagination;
using GalleryApp.Api.Models.Domain;
using GalleryApp.Api.Models.Pagination;
using Microsoft.Data.Sqlite;

namespace GalleryApp.Api.Services;

public sealed class DuplicateMediaService(
    string connectionString,
    MediaRepository mediaRepository,
    MediaStorageOptions mediaStorageOptions)
{
    private sealed record DuplicateGroupSummary(string ImageHash, long MaxMediaId);
    private sealed record DuplicateMemberRow(long Id, string Path, string? Title, string? Description, string? Source, long? Parent, long? Child, bool IsFavorite, bool HasCollections, string ImageHash);
    private sealed record DuplicateGroupState(string GroupKey, List<DuplicateMemberRow> Members, HashSet<long> ExcludedMediaIds)
    {
        public List<DuplicateMemberRow> ActiveMembers =>
            Members.Where(member => !ExcludedMediaIds.Contains(member.Id)).OrderByDescending(member => member.Id).ToList();
    }

    public PagedResult<DuplicateMediaGroupListItem> GetPagedDuplicateGroups(PagedRequest request)
    {
        var normalizedPage = Math.Max(request.Page ?? PaginationHelper.DefaultPage, PaginationHelper.MinPage);
        var normalizedPageSize = Math.Clamp(request.PageSize ?? PaginationHelper.DefaultPageSize, PaginationHelper.MinPageSize, PaginationHelper.MaxPageSize);

        using var connection = new SqliteConnection(connectionString);
        connection.Open();

        var totalCount = GetDuplicateGroupCount(connection);
        var totalPages = totalCount == 0
            ? 0
            : (int)Math.Ceiling(totalCount / (double)normalizedPageSize);
        var effectivePage = totalPages == 0
            ? 1
            : Math.Min(normalizedPage, totalPages);
        var offset = totalPages == 0
            ? 0
            : (effectivePage - 1) * normalizedPageSize;

        var groupSummaries = GetDuplicateGroupSummaries(connection, normalizedPageSize, offset);
        var groupKeys = groupSummaries.Select(item => item.ImageHash).ToArray();
        var members = GetDuplicateMembers(connection, groupKeys);
        var exclusions = GetExcludedMediaIds(connection, groupKeys);
        var tagsByMediaId = mediaRepository.GetMediaTags(members.Select(member => member.Id).Distinct().ToArray());

        var items = groupSummaries
            .Select(summary => BuildGroupItem(summary.ImageHash, members, exclusions, tagsByMediaId))
            .Where(item => item is not null)
            .Select(item => item!)
            .ToArray();

        return new PagedResult<DuplicateMediaGroupListItem>(effectivePage, normalizedPageSize, totalCount, totalPages, items);
    }

    public void ExcludeMedia(string groupKey, long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        var state = LoadGroupState(connection, null, groupKey);
        ValidateMemberPresence(state, mediaId);
        if (state.ExcludedMediaIds.Contains(mediaId))
        {
            return;
        }

        if (state.ActiveMembers.Count <= 1)
        {
            throw new InvalidOperationException("At least one active media item must remain in the group.");
        }

        using var command = connection.CreateCommand();
        command.CommandText = """
            INSERT OR IGNORE INTO DuplicateGroupExclusions (GroupKey, MediaId)
            VALUES ($groupKey, $mediaId);
            """;
        command.Parameters.AddWithValue("$groupKey", groupKey);
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.ExecuteNonQuery();
    }

    public void RestoreMedia(string groupKey, long mediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        var state = LoadGroupState(connection, null, groupKey);
        ValidateMemberPresence(state, mediaId);

        using var command = connection.CreateCommand();
        command.CommandText = """
            DELETE FROM DuplicateGroupExclusions
            WHERE GroupKey = $groupKey AND MediaId = $mediaId;
            """;
        command.Parameters.AddWithValue("$groupKey", groupKey);
        command.Parameters.AddWithValue("$mediaId", mediaId);
        command.ExecuteNonQuery();
    }

    public void MergeGroup(string groupKey, long parentMediaId)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var state = LoadGroupState(connection, transaction, groupKey);
        var activeMembers = state.ActiveMembers;
        var parent = activeMembers.FirstOrDefault(member => member.Id == parentMediaId)
            ?? throw new InvalidOperationException("Selected parent media must belong to the active duplicate group.");
        var sourceMembers = activeMembers.Where(member => member.Id != parentMediaId).ToArray();
        if (sourceMembers.Length == 0)
        {
            throw new InvalidOperationException("At least one duplicate source media item is required for merge.");
        }

        var mergedTitle = string.IsNullOrWhiteSpace(parent.Title)
            ? sourceMembers.Select(member => NormalizeOptionalText(member.Title)).FirstOrDefault(value => value is not null)
            : parent.Title;
        var mergedDescription = string.IsNullOrWhiteSpace(parent.Description)
            ? sourceMembers.Select(member => NormalizeOptionalText(member.Description)).FirstOrDefault(value => value is not null)
            : parent.Description;
        var mergedSource = string.IsNullOrWhiteSpace(parent.Source)
            ? sourceMembers.Select(member => NormalizeOptionalText(member.Source)).FirstOrDefault(value => value is not null)
            : parent.Source;

        UpdateParentMetadata(connection, transaction, parentMediaId, mergedTitle, mergedDescription, mergedSource);

        var involvedIds = activeMembers.Select(member => member.Id).ToArray();
        var sourceIds = sourceMembers.Select(member => member.Id).ToArray();
        var collectionIds = GetCollectionIds(connection, transaction, involvedIds);
        var tagIds = GetTagIds(connection, transaction, involvedIds);

        EnsureCollectionsAssigned(connection, transaction, parentMediaId, collectionIds);
        EnsureTagsAssigned(connection, transaction, parentMediaId, tagIds);
        DeleteMediaRecords(connection, transaction, sourceIds);
        transaction.Commit();

        DeleteMediaFiles(sourceMembers);
    }

    public void DeleteDuplicates(string groupKey, long parentMediaId, IReadOnlyList<long>? mediaIds)
    {
        using var connection = new SqliteConnection(connectionString);
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var state = LoadGroupState(connection, transaction, groupKey);
        var activeMembers = state.ActiveMembers;
        _ = activeMembers.FirstOrDefault(member => member.Id == parentMediaId)
            ?? throw new InvalidOperationException("Selected parent media must belong to the active duplicate group.");

        var activeIds = activeMembers.Select(member => member.Id).ToHashSet();
        var requestedIds = mediaIds?.Where(id => id > 0).Distinct().ToArray();
        var targetIds = requestedIds is { Length: > 0 }
            ? requestedIds
            : activeMembers.Where(member => member.Id != parentMediaId).Select(member => member.Id).ToArray();

        if (targetIds.Length == 0)
        {
            throw new InvalidOperationException("No duplicate media items were selected for deletion.");
        }

        if (targetIds.Contains(parentMediaId))
        {
            throw new InvalidOperationException("Parent media cannot be deleted as part of duplicate removal.");
        }

        if (targetIds.Any(id => !activeIds.Contains(id)))
        {
            throw new InvalidOperationException("Only active duplicate media items can be deleted.");
        }

        var targetMembers = activeMembers.Where(member => targetIds.Contains(member.Id)).ToArray();
        DeleteMediaRecords(connection, transaction, targetIds);
        transaction.Commit();

        DeleteMediaFiles(targetMembers);
    }

    private DuplicateMediaGroupListItem? BuildGroupItem(
        string groupKey,
        IReadOnlyList<DuplicateMemberRow> members,
        IReadOnlyDictionary<string, HashSet<long>> exclusions,
        IReadOnlyDictionary<long, IReadOnlyList<MediaTagListItem>> tagsByMediaId)
    {
        var groupMembers = members
            .Where(member => string.Equals(member.ImageHash, groupKey, StringComparison.Ordinal))
            .OrderByDescending(member => member.Id)
            .ToArray();
        if (groupMembers.Length == 0)
        {
            return null;
        }

        var groupExclusions = exclusions.TryGetValue(groupKey, out var excludedMediaIds) ? excludedMediaIds : [];
        var activeItems = new List<MediaListItem>();
        var excludedItems = new List<MediaListItem>();

        foreach (var member in groupMembers)
        {
            var item = MediaListItemBuilder.TryBuild(ToMediaRow(member), tagsByMediaId, mediaStorageOptions);
            if (item is null)
            {
                continue;
            }

            if (groupExclusions.Contains(member.Id))
            {
                excludedItems.Add(item);
            }
            else
            {
                activeItems.Add(item);
            }
        }

        return new DuplicateMediaGroupListItem(groupKey, groupKey, activeItems.FirstOrDefault()?.Id, activeItems, excludedItems);
    }

    private static MediaRepository.MediaRow ToMediaRow(DuplicateMemberRow member) =>
        new(member.Id, member.Path, member.Title, member.Description, member.Source, member.Parent, member.Child, member.IsFavorite, member.HasCollections);

    private static int GetDuplicateGroupCount(SqliteConnection connection)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT COUNT(*)
            FROM (
                SELECT ImageHash
                FROM Media
                WHERE ImageHash IS NOT NULL
                  AND TRIM(ImageHash) <> ''
                GROUP BY ImageHash
                HAVING COUNT(*) > 1
            );
            """;
        return Convert.ToInt32(command.ExecuteScalar());
    }

    private static List<DuplicateGroupSummary> GetDuplicateGroupSummaries(SqliteConnection connection, int limit, int offset)
    {
        using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT
                ImageHash,
                MAX(Id) AS MaxMediaId
            FROM Media
            WHERE ImageHash IS NOT NULL
              AND TRIM(ImageHash) <> ''
            GROUP BY ImageHash
            HAVING COUNT(*) > 1
            ORDER BY MaxMediaId DESC
            LIMIT $limit OFFSET $offset;
            """;
        command.Parameters.AddWithValue("$limit", limit);
        command.Parameters.AddWithValue("$offset", offset);

        using var reader = command.ExecuteReader();
        var items = new List<DuplicateGroupSummary>();
        while (reader.Read())
        {
            items.Add(new DuplicateGroupSummary(
                reader.GetString(reader.GetOrdinal("ImageHash")),
                reader.GetInt64(reader.GetOrdinal("MaxMediaId"))));
        }

        return items;
    }

    private static List<DuplicateMemberRow> GetDuplicateMembers(SqliteConnection connection, IReadOnlyCollection<string> groupKeys)
    {
        if (groupKeys.Count == 0)
        {
            return [];
        }

        using var command = connection.CreateCommand();
        var groupKeyParameters = new List<string>();
        var index = 0;
        foreach (var groupKey in groupKeys.Distinct(StringComparer.Ordinal))
        {
            var parameterName = $"$groupKey{index++}";
            groupKeyParameters.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, groupKey);
        }

        command.CommandText = $"""
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections,
                m.ImageHash
            FROM Media m
            WHERE m.ImageHash IN ({string.Join(", ", groupKeyParameters)})
            ORDER BY m.Id DESC;
            """;

        using var reader = command.ExecuteReader();
        var items = new List<DuplicateMemberRow>();
        while (reader.Read())
        {
            items.Add(new DuplicateMemberRow(
                reader.GetInt64(reader.GetOrdinal("Id")),
                reader.GetString(reader.GetOrdinal("Path")),
                reader.IsDBNull(reader.GetOrdinal("Title")) ? null : reader.GetString(reader.GetOrdinal("Title")),
                reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                reader.IsDBNull(reader.GetOrdinal("Source")) ? null : reader.GetString(reader.GetOrdinal("Source")),
                reader.IsDBNull(reader.GetOrdinal("Parent")) ? null : reader.GetInt64(reader.GetOrdinal("Parent")),
                reader.IsDBNull(reader.GetOrdinal("Child")) ? null : reader.GetInt64(reader.GetOrdinal("Child")),
                reader.GetInt64(reader.GetOrdinal("IsFavorite")) == 1,
                reader.GetInt64(reader.GetOrdinal("HasCollections")) == 1,
                reader.GetString(reader.GetOrdinal("ImageHash"))));
        }

        return items;
    }

    private static IReadOnlyDictionary<string, HashSet<long>> GetExcludedMediaIds(SqliteConnection connection, IReadOnlyCollection<string> groupKeys)
    {
        if (groupKeys.Count == 0)
        {
            return new Dictionary<string, HashSet<long>>(StringComparer.Ordinal);
        }

        using var command = connection.CreateCommand();
        var groupKeyParameters = new List<string>();
        var index = 0;
        foreach (var groupKey in groupKeys.Distinct(StringComparer.Ordinal))
        {
            var parameterName = $"$groupKey{index++}";
            groupKeyParameters.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, groupKey);
        }

        command.CommandText = $"""
            SELECT GroupKey, MediaId
            FROM DuplicateGroupExclusions
            WHERE GroupKey IN ({string.Join(", ", groupKeyParameters)});
            """;

        using var reader = command.ExecuteReader();
        var items = new Dictionary<string, HashSet<long>>(StringComparer.Ordinal);
        while (reader.Read())
        {
            var groupKey = reader.GetString(reader.GetOrdinal("GroupKey"));
            if (!items.TryGetValue(groupKey, out var mediaIds))
            {
                mediaIds = [];
                items[groupKey] = mediaIds;
            }

            mediaIds.Add(reader.GetInt64(reader.GetOrdinal("MediaId")));
        }

        return items;
    }

    private static DuplicateGroupState LoadGroupState(SqliteConnection connection, SqliteTransaction? transaction, string groupKey)
    {
        if (string.IsNullOrWhiteSpace(groupKey))
        {
            throw new ArgumentException("Duplicate group key is required.", nameof(groupKey));
        }

        var members = GetGroupMembers(connection, transaction, groupKey);
        if (members.Count < 2)
        {
            throw new KeyNotFoundException("Duplicate group was not found.");
        }

        var excludedMediaIds = GetExcludedMediaIds(connection, transaction, groupKey);
        return new DuplicateGroupState(groupKey, members, excludedMediaIds);
    }

    private static List<DuplicateMemberRow> GetGroupMembers(SqliteConnection connection, SqliteTransaction? transaction, string groupKey)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT
                m.Id,
                m.Path,
                m.Title,
                m.Description,
                m.Source,
                m.Parent,
                m.Child,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cm
                    INNER JOIN Collections c ON c.Id = cm.CollectionId
                    WHERE cm.MediaId = m.Id AND c.Lable = 'Favorites'
                ) AS IsFavorite,
                EXISTS (
                    SELECT 1
                    FROM CollectionsMedia cmAny
                    WHERE cmAny.MediaId = m.Id
                ) AS HasCollections,
                m.ImageHash
            FROM Media m
            WHERE m.ImageHash = $groupKey
            ORDER BY m.Id DESC;
            """;
        command.Parameters.AddWithValue("$groupKey", groupKey);

        using var reader = command.ExecuteReader();
        var items = new List<DuplicateMemberRow>();
        while (reader.Read())
        {
            items.Add(new DuplicateMemberRow(
                reader.GetInt64(reader.GetOrdinal("Id")),
                reader.GetString(reader.GetOrdinal("Path")),
                reader.IsDBNull(reader.GetOrdinal("Title")) ? null : reader.GetString(reader.GetOrdinal("Title")),
                reader.IsDBNull(reader.GetOrdinal("Description")) ? null : reader.GetString(reader.GetOrdinal("Description")),
                reader.IsDBNull(reader.GetOrdinal("Source")) ? null : reader.GetString(reader.GetOrdinal("Source")),
                reader.IsDBNull(reader.GetOrdinal("Parent")) ? null : reader.GetInt64(reader.GetOrdinal("Parent")),
                reader.IsDBNull(reader.GetOrdinal("Child")) ? null : reader.GetInt64(reader.GetOrdinal("Child")),
                reader.GetInt64(reader.GetOrdinal("IsFavorite")) == 1,
                reader.GetInt64(reader.GetOrdinal("HasCollections")) == 1,
                reader.GetString(reader.GetOrdinal("ImageHash"))));
        }

        return items;
    }

    private static HashSet<long> GetExcludedMediaIds(SqliteConnection connection, SqliteTransaction? transaction, string groupKey)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT MediaId
            FROM DuplicateGroupExclusions
            WHERE GroupKey = $groupKey;
            """;
        command.Parameters.AddWithValue("$groupKey", groupKey);

        using var reader = command.ExecuteReader();
        var items = new HashSet<long>();
        while (reader.Read())
        {
            items.Add(reader.GetInt64(reader.GetOrdinal("MediaId")));
        }

        return items;
    }

    private static void ValidateMemberPresence(DuplicateGroupState state, long mediaId)
    {
        if (state.Members.All(member => member.Id != mediaId))
        {
            throw new InvalidOperationException("Media item does not belong to the duplicate group.");
        }
    }

    private static void UpdateParentMetadata(SqliteConnection connection, SqliteTransaction transaction, long parentMediaId, string? title, string? description, string? source)
    {
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE Media
            SET Title = $title,
                Description = $description,
                Source = $source
            WHERE Id = $mediaId;
            """;
        command.Parameters.AddWithValue("$title", title ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$description", description ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$source", source ?? (object)DBNull.Value);
        command.Parameters.AddWithValue("$mediaId", parentMediaId);
        command.ExecuteNonQuery();
    }

    private static long[] GetCollectionIds(SqliteConnection connection, SqliteTransaction transaction, IReadOnlyCollection<long> mediaIds)
    {
        if (mediaIds.Count == 0)
        {
            return [];
        }

        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        var parameters = AddIdParameters(command, "$mediaId", mediaIds);
        command.CommandText = $"""
            SELECT DISTINCT CollectionId
            FROM CollectionsMedia
            WHERE MediaId IN ({string.Join(", ", parameters)});
            """;
        return ReadLongValues(command);
    }

    private static long[] GetTagIds(SqliteConnection connection, SqliteTransaction transaction, IReadOnlyCollection<long> mediaIds)
    {
        if (mediaIds.Count == 0)
        {
            return [];
        }

        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        var parameters = AddIdParameters(command, "$mediaId", mediaIds);
        command.CommandText = $"""
            SELECT DISTINCT TagId
            FROM MediaTags
            WHERE MediaId IN ({string.Join(", ", parameters)});
            """;
        return ReadLongValues(command);
    }

    private static void EnsureCollectionsAssigned(SqliteConnection connection, SqliteTransaction transaction, long mediaId, IReadOnlyCollection<long> collectionIds)
    {
        foreach (var collectionId in collectionIds.Distinct())
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT OR IGNORE INTO CollectionsMedia (CollectionId, MediaId)
                VALUES ($collectionId, $mediaId);
                """;
            command.Parameters.AddWithValue("$collectionId", collectionId);
            command.Parameters.AddWithValue("$mediaId", mediaId);
            command.ExecuteNonQuery();
        }
    }

    private static void EnsureTagsAssigned(SqliteConnection connection, SqliteTransaction transaction, long mediaId, IReadOnlyCollection<long> tagIds)
    {
        foreach (var tagId in tagIds.Distinct())
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                INSERT OR IGNORE INTO MediaTags (MediaId, TagId)
                VALUES ($mediaId, $tagId);
                """;
            command.Parameters.AddWithValue("$mediaId", mediaId);
            command.Parameters.AddWithValue("$tagId", tagId);
            command.ExecuteNonQuery();
        }
    }

    private static void DeleteMediaRecords(SqliteConnection connection, SqliteTransaction transaction, IReadOnlyCollection<long> mediaIds)
    {
        if (mediaIds.Count == 0)
        {
            return;
        }

        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        var parameters = AddIdParameters(command, "$mediaId", mediaIds);
        var joinedIds = string.Join(", ", parameters);
        command.CommandText = $"""
            UPDATE Media
            SET Parent = NULL
            WHERE Parent IN ({joinedIds});

            UPDATE Media
            SET Child = NULL
            WHERE Child IN ({joinedIds});

            DELETE FROM Media
            WHERE Id IN ({joinedIds});
            """;
        command.ExecuteNonQuery();
    }

    private void DeleteMediaFiles(IReadOnlyCollection<DuplicateMemberRow> members)
    {
        foreach (var member in members)
        {
            var normalizedPath = member.Path.Replace("\\", "/");
            if (!MediaFileHelper.TryResolveMediaFilePath(mediaStorageOptions.RootPath, normalizedPath, out var absolutePath, out _))
            {
                continue;
            }

            if (!File.Exists(absolutePath))
            {
                continue;
            }

            try
            {
                File.Delete(absolutePath);
            }
            catch (IOException)
            {
            }
            catch (UnauthorizedAccessException)
            {
            }
        }
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static List<string> AddIdParameters(SqliteCommand command, string baseName, IEnumerable<long> ids)
    {
        var parameters = new List<string>();
        var index = 0;
        foreach (var id in ids.Distinct())
        {
            var parameterName = $"{baseName}{index++}";
            parameters.Add(parameterName);
            command.Parameters.AddWithValue(parameterName, id);
        }

        return parameters;
    }

    private static long[] ReadLongValues(SqliteCommand command)
    {
        using var reader = command.ExecuteReader();
        var items = new List<long>();
        while (reader.Read())
        {
            items.Add(reader.GetInt64(0));
        }

        return items.ToArray();
    }
}
