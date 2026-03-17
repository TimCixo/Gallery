import AppIcon from "../../shared/components/AppIcon";

export function TagTypesBoard({ tagTypesState, tagItemsState, onDeleteTagType }) {
  const {
    tagTypes,
    isTagTypesLoading,
    tagTypeNameInput,
    setTagTypeNameInput,
    tagTypeColorInput,
    setTagTypeColorInput,
    editingTagTypeId,
    editingTagTypeName,
    setEditingTagTypeName,
    editingTagTypeColor,
    setEditingTagTypeColor,
    isTagTypeSaving,
    isTagTypeUpdating,
    tagTypesError,
    handleCreateTagType,
    handleSaveTagType,
    handleClearTagTypeForm,
    handleStartEditTagType,
    handleCancelEditTagType
  } = tagTypesState;

  const {
    tagsByTagTypeId,
    newTagDraftByTagTypeId,
    setNewTagDraftByTagTypeId,
    editingTagByTagTypeId,
    setEditingTagByTagTypeId,
    editingTagDraftById,
    setEditingTagDraftById,
    savingTagByTagTypeId,
    tagTableStateByTagTypeId,
    dragState,
    ensureNewTagDraft,
    loadTagsForTagType,
    handleCreateTag,
    handleSaveTag,
    handleDeleteTag,
    handleTagDragStart,
    handleTagDragEnter,
    handleTagDragLeave,
    handleTagDrop,
    clearDragState
  } = tagItemsState;

  return (
    <section className="tags-page">
      <div className="tags-callout">
        <form className="tags-callout-form" onSubmit={handleCreateTagType}>
          <input type="color" className="tags-color-input" value={tagTypeColorInput} onChange={(e) => setTagTypeColorInput(e.target.value.toUpperCase())} />
          <input type="text" className="tags-name-input" value={tagTypeNameInput} onChange={(e) => setTagTypeNameInput(e.target.value)} placeholder="TagType name" />
          <div className="tags-callout-actions">
            <button type="submit" className="tags-action-btn tags-action-create" disabled={!tagTypeNameInput.trim() || isTagTypeSaving} aria-label="Create tag type" title="Create tag type"><AppIcon name="create" alt="" aria-hidden="true" /></button>
            <button type="button" className="tags-action-btn tags-action-clear" onClick={handleClearTagTypeForm} aria-label="Clear tag type form" title="Clear tag type form"><AppIcon name="cancel" alt="" aria-hidden="true" /></button>
          </div>
        </form>
        {tagTypesError ? <p className="tags-error">{tagTypesError}</p> : null}
      </div>

      {isTagTypesLoading ? <p className="tags-state">Loading TagTypes...</p> : null}
      {!isTagTypesLoading && tagTypes.length === 0 ? <p className="tags-state">No TagTypes yet.</p> : null}

      <ul className="tag-type-list">
        {tagTypes.map((item) => {
          const isEditing = editingTagTypeId === item.id;
          const draft = newTagDraftByTagTypeId[item.id] ?? { name: "", description: "" };
          const isDropTarget = dragState.targetTagTypeId === item.id;
          const isDropping = dragState.status === "dropping";

          return (
            <li key={item.id} className="tag-type-item">
              <details className={`tag-type-callout${isDropTarget ? " tag-type-callout-drop-target" : ""}`} onToggle={(e) => {
                if (e.currentTarget.open) {
                  ensureNewTagDraft(item.id);
                  void loadTagsForTagType(item.id);
                }
              }}>
                <summary
                  className="tag-type-summary"
                  onClick={(e) => {
                    if (e.target instanceof HTMLElement && e.target.closest("button, input")) {
                      e.preventDefault();
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    handleTagDragEnter(item.id);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragLeave={() => handleTagDragLeave(item.id)}
                  onDrop={(e) => {
                    e.preventDefault();
                    void handleTagDrop(item.id);
                  }}
                >
                  {isEditing ? (
                    <>
                      <div className="tag-type-edit-row">
                        <input className="tag-type-edit-name" value={editingTagTypeName} onChange={(e) => setEditingTagTypeName(e.target.value)} />
                        <input className="tags-color-input tag-type-edit-color" type="color" value={editingTagTypeColor} onChange={(e) => setEditingTagTypeColor(e.target.value.toUpperCase())} />
                      </div>
                      <div className="tag-type-summary-actions">
                        <button type="button" className="tags-action-btn tags-action-create" onClick={() => void handleSaveTagType(item.id)} disabled={isTagTypeUpdating} aria-label={`Save ${item.name}`} title="Save tag type"><AppIcon name="confirm" alt="" aria-hidden="true" /></button>
                        <button type="button" className="tags-action-btn tags-action-clear" onClick={handleCancelEditTagType} disabled={isTagTypeUpdating} aria-label={`Cancel editing ${item.name}`} title="Cancel edit"><AppIcon name="cancel" alt="" aria-hidden="true" /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="tag-type-summary-name">{item.name}</span>
                      <div className="tag-type-summary-actions">
                        <button type="button" className="tags-action-btn" onClick={() => handleStartEditTagType(item)} aria-label={`Edit ${item.name}`} title="Edit tag type"><AppIcon name="edit" alt="" aria-hidden="true" /></button>
                        <button type="button" className="tags-action-btn tags-action-delete" onClick={() => void onDeleteTagType(item.id)} aria-label={`Delete ${item.name}`} title="Delete tag type"><AppIcon name="delete" alt="" aria-hidden="true" /></button>
                      </div>
                    </>
                  )}
                </summary>

                <table className="tag-table">
                  <tbody>
                    <tr>
                      <td><input value={draft.name} onChange={(e) => setNewTagDraftByTagTypeId((c) => ({ ...c, [item.id]: { ...draft, name: e.target.value } }))} placeholder="Tag name" /></td>
                      <td><input value={draft.description} onChange={(e) => setNewTagDraftByTagTypeId((c) => ({ ...c, [item.id]: { ...draft, description: e.target.value } }))} placeholder="Description" /></td>
                      <td><button type="button" className="tags-action-btn tags-action-create" onClick={() => void handleCreateTag(item.id)} disabled={isDropping || savingTagByTagTypeId[item.id]} aria-label={`Create tag in ${item.name}`} title="Create tag"><AppIcon name="confirm" alt="" aria-hidden="true" /></button></td>
                    </tr>
                    {(tagsByTagTypeId[item.id] ?? []).map((tag) => {
                      const isEditingTag = editingTagByTagTypeId[item.id] === tag.id;
                      const editDraft = editingTagDraftById[tag.id] ?? { name: tag.name || "", description: tag.description || "" };
                      return (
                        <tr key={tag.id} draggable={!isEditingTag && !isDropping} onDragStart={(e) => handleTagDragStart(e, item.id, tag)} onDragEnd={clearDragState}>
                          <td>{isEditingTag ? <input value={editDraft.name} onChange={(e) => setEditingTagDraftById((c) => ({ ...c, [tag.id]: { ...editDraft, name: e.target.value } }))} /> : tag.name}</td>
                          <td>{isEditingTag ? <input value={editDraft.description} onChange={(e) => setEditingTagDraftById((c) => ({ ...c, [tag.id]: { ...editDraft, description: e.target.value } }))} /> : (tag.description || "-")}</td>
                          <td>
                            {isEditingTag ? (
                              <>
                                <button type="button" className="tags-action-btn tags-action-create" onClick={() => void handleSaveTag(item.id, tag.id)} aria-label={`Save ${tag.name}`} title="Save tag"><AppIcon name="confirm" alt="" aria-hidden="true" /></button>
                                <button type="button" className="tags-action-btn tags-action-clear" onClick={() => setEditingTagByTagTypeId((c) => ({ ...c, [item.id]: null }))} aria-label={`Cancel editing ${tag.name}`} title="Cancel edit"><AppIcon name="cancel" alt="" aria-hidden="true" /></button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="tags-action-btn" onClick={() => {
                                  setEditingTagByTagTypeId((c) => ({ ...c, [item.id]: tag.id }));
                                  setEditingTagDraftById((c) => ({ ...c, [tag.id]: { name: tag.name || "", description: tag.description || "" } }));
                                }} aria-label={`Edit ${tag.name}`} title="Edit tag"><AppIcon name="edit" alt="" aria-hidden="true" /></button>
                                <button type="button" className="tags-action-btn tags-action-delete" onClick={() => void handleDeleteTag(item.id, tag.id)} aria-label={`Delete ${tag.name}`} title="Delete tag"><AppIcon name="delete" alt="" aria-hidden="true" /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {tagTableStateByTagTypeId[item.id]?.loading ? <p>Loading tags...</p> : null}
                {tagTableStateByTagTypeId[item.id]?.error ? <p className="tags-error">{tagTableStateByTagTypeId[item.id].error}</p> : null}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
