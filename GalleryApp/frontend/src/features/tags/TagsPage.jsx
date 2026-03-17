import AppIcon from "../shared/components/AppIcon";

const getCountLabel = (count) => `${count} tag${count === 1 ? "" : "s"}`;

export default function TagsPage({
  tagTypeForm,
  tagEditState,
  isTagTypesLoading,
  activeTagTypeId,
  tagTypes,
  tagItemsByTypeId,
  tagItemsStateByTypeId,
  searchQueryByTagTypeId,
  onTagTypeNameChange,
  onTagTypeColorChange,
  onSubmitTagType,
  onClearTagTypeForm,
  onToggleTagType,
  onStartEditTagType,
  onEditTagTypeNameChange,
  onEditTagTypeColorChange,
  onSaveTagType,
  onCancelEditTagType,
  onOpenDeleteConfirm,
  onTagSearchChange,
  onNewTagDraftChange,
  onCreateTag,
  onClearNewTagDraft,
  onStartEditTag,
  onEditTagDraftChange,
  onSaveTag,
  onCancelEditTag,
  onDeleteTag,
  onTagDragStart,
  onTagDragEnter,
  onTagDragLeave,
  onTagDrop,
  onTagDragEnd
}) {
  const createDisabled = !tagTypeForm.name.trim() || tagTypeForm.isSaving;

  return (
    <section className="tags-page">
      <div className="tags-callout">
        <h2>Tag types</h2>
        <p>Create a tag group, then open it to manage its tags.</p>
        <form className="tags-callout-form" onSubmit={onSubmitTagType}>
          <input
            type="color"
            className="tags-color-input"
            value={tagTypeForm.color}
            onChange={(event) => onTagTypeColorChange(event.target.value.toUpperCase())}
            aria-label="Tag type color"
          />
          <input
            type="text"
            className="tags-name-input"
            value={tagTypeForm.name}
            onChange={(event) => onTagTypeNameChange(event.target.value)}
            placeholder="Tag type name"
            aria-label="Tag type name"
          />
          <div className="tags-callout-actions">
            <button
              type="submit"
              className="tags-action-btn tags-action-create"
              disabled={createDisabled}
              aria-label="Create tag type"
              title="Create tag type"
            >
              <AppIcon name="create" alt="" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="tags-action-btn tags-action-clear"
              onClick={onClearTagTypeForm}
              aria-label="Clear tag type form"
              title="Clear tag type form"
            >
              <AppIcon name="cancel" alt="" aria-hidden="true" />
            </button>
          </div>
        </form>
        {tagEditState.pageError ? <p className="tags-error">{tagEditState.pageError}</p> : null}
      </div>

      {isTagTypesLoading ? <p className="tags-state">Loading TagTypes...</p> : null}
      {!isTagTypesLoading && tagTypes.length === 0 ? <p className="tags-state">No TagTypes yet.</p> : null}

      {!isTagTypesLoading && tagTypes.length > 0 ? (
        <ul className="tag-type-card-list">
          {tagTypes.map((item) => {
            const isActive = activeTagTypeId === item.id;
            const isEditingTagType = tagEditState.editingTagTypeId === item.id;
            const searchQuery = String(searchQueryByTagTypeId[item.id] || "");
            const normalizedSearch = searchQuery.trim().toLowerCase();
            const tagItems = tagItemsByTypeId[item.id] || [];
            const filteredTags = tagItems.filter((tagItem) => {
              if (!normalizedSearch) {
                return true;
              }

              const name = String(tagItem?.name || "").toLowerCase();
              const description = String(tagItem?.description || "").toLowerCase();
              return name.includes(normalizedSearch) || description.includes(normalizedSearch);
            });
            const itemState = tagItemsStateByTypeId[item.id] || { loading: false, error: "", hasLoaded: false };
            const draft = tagEditState.newTagDraftByTypeId[item.id] || { name: "", description: "" };
            const isDropTarget = tagEditState.dragState.targetTagTypeId === item.id;
            const isDropping = tagEditState.dragState.status === "dropping";
            const cardClassName = [
              "tag-type-card",
              isActive ? "is-active" : "",
              isDropTarget ? "tag-type-card-drop-target" : ""
            ].filter(Boolean).join(" ");
            const countLabel = itemState.hasLoaded ? getCountLabel(tagItems.length) : "Open to load tags";
            const summaryStyle = item.color ? { "--tag-type-accent": String(item.color).toUpperCase() } : undefined;
            const itemClassName = `tag-type-card-item${isActive ? " is-expanded" : ""}`;

            return (
              <li key={item.id} className={itemClassName}>
                <article
                  className={cardClassName}
                  style={summaryStyle}
                  onDragEnter={() => onTagDragEnter(item.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => onTagDragLeave(item.id)}
                  onDrop={(event) => {
                    event.preventDefault();
                    void onTagDrop(item.id);
                  }}
                >
                  <div className="tag-type-card-header">
                    {isEditingTagType ? (
                      <div className="tag-type-card-trigger is-static">
                        <span className="tag-type-card-trigger-main">
                          <span className="tag-type-color-chip" aria-hidden="true" />
                          <span className="tag-type-edit-row">
                            <input
                              type="text"
                              className="tags-name-input tag-type-edit-name"
                              value={tagEditState.editingTagTypeName}
                              onChange={(event) => onEditTagTypeNameChange(event.target.value)}
                              aria-label="Edit tag type name"
                            />
                            <input
                              type="color"
                              className="tags-color-input tag-type-edit-color"
                              value={tagEditState.editingTagTypeColor}
                              onChange={(event) => onEditTagTypeColorChange(event.target.value.toUpperCase())}
                              aria-label="Edit tag type color"
                            />
                          </span>
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="tag-type-card-trigger"
                        onClick={() => onToggleTagType(isActive ? null : item.id)}
                        aria-expanded={isActive}
                      >
                        <span className="tag-type-card-trigger-main">
                          <span className="tag-type-color-chip" aria-hidden="true" />
                          <span className="tag-type-card-title-group">
                            <span className="tag-type-card-title">{item.name}</span>
                            <span className="tag-type-card-meta">{countLabel}</span>
                          </span>
                        </span>
                        <span className={`tag-type-card-chevron${isActive ? " is-open" : ""}`} aria-hidden="true">
                          <AppIcon name="arrowRight" alt="" />
                        </span>
                      </button>
                    )}
                    <div className="tag-type-card-actions">
                      {isEditingTagType ? (
                        <>
                          <button
                            type="button"
                            className="tags-action-btn tags-action-create"
                            onClick={() => void onSaveTagType(item.id)}
                            disabled={!tagEditState.editingTagTypeName.trim() || tagEditState.isTagTypeUpdating}
                            aria-label={`Save ${item.name}`}
                            title="Save tag type"
                          >
                            <AppIcon name="confirm" alt="" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="tags-action-btn tags-action-clear"
                            onClick={onCancelEditTagType}
                            disabled={tagEditState.isTagTypeUpdating}
                            aria-label={`Cancel editing ${item.name}`}
                            title="Cancel edit"
                          >
                            <AppIcon name="cancel" alt="" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="tags-action-btn"
                            onClick={() => onStartEditTagType(item)}
                            aria-label={`Edit ${item.name}`}
                            title="Edit tag type"
                          >
                            <AppIcon name="edit" alt="" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="tags-action-btn tags-action-delete"
                            onClick={() => onOpenDeleteConfirm({ kind: "tagType", id: item.id, name: item.name })}
                            disabled={tagEditState.isTagTypeUpdating}
                            aria-label={`Delete ${item.name}`}
                            title="Delete tag type"
                          >
                            <AppIcon name="delete" alt="" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isActive ? (
                    <div className="tag-type-card-body">
                      <input
                        type="text"
                        className="tag-callout-search-input"
                        value={searchQuery}
                        onChange={(event) => onTagSearchChange(item.id, event.target.value)}
                        placeholder="Search tags by name or description"
                        aria-label={`Search tags in ${item.name}`}
                      />

                      <div className="tag-table-wrap">
                        <table className="tag-table">
                          <tbody>
                            <tr>
                              <td>
                                <input
                                  type="text"
                                  className="tag-table-input"
                                  value={draft.name}
                                  onChange={(event) => onNewTagDraftChange(item.id, { name: event.target.value })}
                                  placeholder="New tag name"
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  className="tag-table-input"
                                  value={draft.description}
                                  onChange={(event) => onNewTagDraftChange(item.id, { description: event.target.value })}
                                  placeholder="Description"
                                />
                              </td>
                              <td>
                                <div className="tag-table-actions">
                                  <button
                                    type="button"
                                    className="tags-action-btn tags-action-create"
                                    onClick={() => void onCreateTag(item.id)}
                                    disabled={!draft.name.trim() || !!tagEditState.savingTagByTypeId[item.id] || isDropping}
                                    aria-label={`Create tag in ${item.name}`}
                                    title="Create tag"
                                  >
                                    <AppIcon name="confirm" alt="" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="tags-action-btn tags-action-clear"
                                    onClick={() => onClearNewTagDraft(item.id)}
                                    disabled={!!tagEditState.savingTagByTypeId[item.id]}
                                    aria-label={`Clear new tag in ${item.name}`}
                                    title="Clear new tag"
                                  >
                                    <AppIcon name="cancel" alt="" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {filteredTags.map((tagItem) => {
                              const isEditingTag = tagEditState.editingTagByTypeId[item.id] === tagItem.id;
                              const editingDraft = tagEditState.editingTagDraftById[tagItem.id] || {
                                name: String(tagItem.name || ""),
                                description: String(tagItem.description || "")
                              };
                              const rowClassName = [
                                "tag-table-row",
                                tagEditState.dragState.draggedTag?.id === tagItem.id ? "tag-table-row-dragging" : ""
                              ].filter(Boolean).join(" ");

                              return (
                                <tr
                                  key={tagItem.id}
                                  className={rowClassName}
                                  draggable={!isEditingTag && !isDropping}
                                  onDragStart={(event) => onTagDragStart(event, item.id, tagItem)}
                                  onDragEnd={onTagDragEnd}
                                >
                                  <td>
                                    {isEditingTag ? (
                                      <input
                                        type="text"
                                        className="tag-table-input"
                                        value={editingDraft.name}
                                        onChange={(event) => onEditTagDraftChange(tagItem.id, { name: event.target.value })}
                                      />
                                    ) : tagItem.name}
                                  </td>
                                  <td>
                                    {isEditingTag ? (
                                      <input
                                        type="text"
                                        className="tag-table-input"
                                        value={editingDraft.description}
                                        onChange={(event) => onEditTagDraftChange(tagItem.id, { description: event.target.value })}
                                      />
                                    ) : (tagItem.description || "-")}
                                  </td>
                                  <td>
                                    <div className="tag-table-actions">
                                      {isEditingTag ? (
                                        <>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-create"
                                            onClick={() => void onSaveTag(item.id, tagItem.id)}
                                            disabled={!editingDraft.name.trim() || !!tagEditState.savingTagByTypeId[item.id]}
                                            aria-label={`Save ${tagItem.name}`}
                                            title="Save tag"
                                          >
                                            <AppIcon name="confirm" alt="" aria-hidden="true" />
                                          </button>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-clear"
                                            onClick={() => onCancelEditTag(item.id)}
                                            disabled={!!tagEditState.savingTagByTypeId[item.id]}
                                            aria-label={`Cancel editing ${tagItem.name}`}
                                            title="Cancel edit"
                                          >
                                            <AppIcon name="cancel" alt="" aria-hidden="true" />
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            className="tags-action-btn"
                                            onClick={() => onStartEditTag(item.id, tagItem)}
                                            aria-label={`Edit ${tagItem.name}`}
                                            title="Edit tag"
                                          >
                                            <AppIcon name="edit" alt="" aria-hidden="true" />
                                          </button>
                                          <button
                                            type="button"
                                            className="tags-action-btn tags-action-delete"
                                            onClick={() => onDeleteTag(item.id, tagItem.id, tagItem.name)}
                                            disabled={!!tagEditState.savingTagByTypeId[item.id]}
                                            aria-label={`Delete ${tagItem.name}`}
                                            title="Delete tag"
                                          >
                                            <AppIcon name="delete" alt="" aria-hidden="true" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {itemState.loading ? <p className="tags-state tag-table-state">Loading tags...</p> : null}
                      {!itemState.loading && itemState.hasLoaded && filteredTags.length === 0 ? (
                        <p className="tags-state tag-table-state">No tags found.</p>
                      ) : null}
                      {itemState.error ? <p className="tags-error">{itemState.error}</p> : null}
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : null}

    </section>
  );
}
