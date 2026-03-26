import AppIcon from "../../shared/components/AppIcon";
import { resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";

const getMediaLabel = (item) => {
  const title = String(item?.title || "").trim();
  if (title) {
    return title;
  }

  const name = String(item?.name || "").trim();
  if (name) {
    return name;
  }

  return `#${item?.id ?? "?"}`;
};

function DuplicateMediaCard({
  item,
  isParentSelectable,
  isParent,
  isBusy,
  onSelectParent,
  onOpen,
  actionIconName,
  actionTitle,
  onAction
}) {
  const previewUrl = resolvePreviewMediaUrl(item);

  return (
    <article className="duplicate-group-media-card">
      <div className="duplicate-group-media-preview-wrap">
        <button type="button" className="duplicate-group-media-preview" onClick={() => onOpen?.(item)} title={getMediaLabel(item)}>
          {previewUrl ? <img src={previewUrl} alt={getMediaLabel(item)} loading="lazy" /> : <span>{getMediaLabel(item)}</span>}
        </button>
        <button
          type="button"
          className="duplicate-group-overlay-action media-action-btn app-button-icon-only"
          onClick={() => onAction?.(item)}
          disabled={isBusy}
          aria-label={actionTitle}
          title={actionTitle}
        >
          <AppIcon name={actionIconName} alt="" aria-hidden="true" />
        </button>
      </div>
      <div className="duplicate-group-media-body">
        <div className="duplicate-group-media-meta">
          <p className="duplicate-group-media-id">#{item?.id ?? "?"}</p>
        </div>
        {isParentSelectable ? (
          <label className="duplicate-group-parent-choice">
            <input
              type="radio"
              name={`duplicate-parent-${item.groupKey}`}
              checked={isParent}
              onChange={() => onSelectParent?.(item.id)}
              disabled={isBusy}
            />
            <span>Parent</span>
          </label>
        ) : null}
      </div>
    </article>
  );
}

export default function DuplicateGroupCard({
  group,
  selectedParentId,
  isBusy,
  onParentChange,
  onOpenMedia,
  onExclude,
  onRestore,
  onMergeRequest,
  onDeleteRequest
}) {
  const activeItems = Array.isArray(group?.items) ? group.items : [];
  const excludedItems = Array.isArray(group?.excludedItems) ? group.excludedItems : [];
  const deleteTargets = activeItems.filter((item) => item.id !== selectedParentId);
  const parentItem = activeItems.find((item) => item.id === selectedParentId) || activeItems[0] || null;

  return (
    <section className="duplicate-group-card">
      <div className="duplicate-group-header">
        <div>
          <h2>Hash {group.groupKey}</h2>
          <p>Active: {activeItems.length} | Excluded: {excludedItems.length}</p>
        </div>
        <div className="duplicate-group-actions">
          <button
            type="button"
            className="media-action-btn media-action-primary"
            onClick={() => onMergeRequest?.(group, parentItem, deleteTargets)}
            disabled={isBusy || activeItems.length < 2 || !parentItem}
          >
            Merge
          </button>
          <button
            type="button"
            className="media-action-btn"
            onClick={() => onDeleteRequest?.(group, parentItem, deleteTargets)}
            disabled={isBusy || deleteTargets.length === 0 || !parentItem}
          >
            Delete duplicates
          </button>
        </div>
      </div>

      <div className="duplicate-group-grid">
        {activeItems.map((item) => (
          <DuplicateMediaCard
            key={item.id}
            item={{ ...item, groupKey: group.groupKey }}
            isParentSelectable
            isParent={item.id === selectedParentId}
            isBusy={isBusy}
            onSelectParent={onParentChange}
            onOpen={onOpenMedia}
            actionIconName="minus"
            actionTitle="Exclude"
            onAction={onExclude}
          />
        ))}
      </div>

      {excludedItems.length > 0 ? (
        <details className="duplicate-group-excluded">
          <summary>Excluded ({excludedItems.length})</summary>
          <div className="duplicate-group-grid duplicate-group-grid-excluded">
            {excludedItems.map((item) => (
              <DuplicateMediaCard
                key={item.id}
                item={{ ...item, groupKey: group.groupKey }}
                isParentSelectable={false}
                isParent={false}
                isBusy={isBusy}
                onOpen={onOpenMedia}
                actionIconName="plus"
                actionTitle="Restore"
                onAction={onRestore}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
