import DuplicateGroupCard from "./components/DuplicateGroupCard";

export default function DuplicatesPage({
  errorMessage,
  isLoading,
  totalCount,
  groups,
  hiddenGroupsCount,
  showHiddenDuplicateGroups,
  renderPagination,
  getSelectedParentId,
  actionGroupKey,
  onParentChange,
  onOpenMedia,
  onExclude,
  onRestore,
  onMergeRequest,
  onDeleteRequest
}) {
  return (
    <section className="duplicates-page">
      {errorMessage ? <p className="media-state error">{errorMessage}</p> : null}
      {!errorMessage && isLoading && totalCount === 0 ? <p className="media-state">Loading duplicate groups...</p> : null}
      {!errorMessage && !isLoading && totalCount === 0 ? <p className="media-state">No duplicate groups found.</p> : null}
      {!errorMessage && !isLoading && totalCount > 0 && groups.length === 0 && !showHiddenDuplicateGroups ? (
        <p className="media-state">All duplicate groups on this page are hidden. Hidden groups: {hiddenGroupsCount}.</p>
      ) : null}
      {!errorMessage && totalCount > 0 ? <div className="media-pagination-toolbar">{renderPagination()}</div> : null}
      {!errorMessage && totalCount > 0 ? (
        <>
          <div className="duplicate-groups">
            {groups.map((group) => (
              <DuplicateGroupCard
                key={group.groupKey}
                group={group}
                selectedParentId={getSelectedParentId(group)}
                isBusy={actionGroupKey === group.groupKey}
                onParentChange={(mediaId) => onParentChange(group.groupKey, mediaId)}
                onOpenMedia={onOpenMedia}
                onExclude={(item) => onExclude(group.groupKey, item.id)}
                onRestore={(item) => onRestore(group.groupKey, item.id)}
                onMergeRequest={onMergeRequest}
                onDeleteRequest={onDeleteRequest}
              />
            ))}
          </div>
          {renderPagination()}
        </>
      ) : null}
    </section>
  );
}
