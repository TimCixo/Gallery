import { useTagsContext } from "./context/TagsContext";

const hexToRgba = (hexColor, alpha) => {
  const value = String(hexColor || "").trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  const red = Number.parseInt(value.slice(1, 3), 16);
  const green = Number.parseInt(value.slice(3, 5), 16);
  const blue = Number.parseInt(value.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

export default function TagsPage(props) {
  const {
    tagTypes,
    tagsByTagTypeId,
    tagTableStateByTagTypeId,
    isTagTypesLoading,
    tagTypesError
  } = props;

  const {
    handleCreateTagType,
    tagTypeColorInput,
    setTagTypeColorInput,
    tagTypeNameInput,
    setTagTypeNameInput,
    isTagTypeSaving,
    handleClearTagTypeForm,
    editingTagTypeId,
    dragTargetTagTypeId,
    draggedTag,
    tagTypeCalloutOpenById,
    handleTagTypeCalloutToggle,
    handleTagTypeDragOver,
    handleTagTypeDragLeave,
    handleTagTypeDrop,
    handleTagDragStart,
    handleTagDragEnd,
    editingTagTypeColor,
    setEditingTagTypeColor,
    editingTagTypeName,
    setEditingTagTypeName,
    isTagTypeUpdating,
    handleSaveTagType,
    handleCancelEditTagType,
    handleStartEditTagType,
    openTagDeleteConfirm,
    tagSearchQueryByTagTypeId,
    setTagSearchQueryByTagTypeId,
    newTagDraftByTagTypeId,
    handleNewTagDraftChange,
    handleCreateTag,
    savingTagByTagTypeId,
    handleClearNewTagDraft,
    editingTagByTagTypeId,
    editingTagDraftById,
    handleEditTagDraftChange,
    handleSaveTag,
    handleCancelEditTag,
    handleStartEditTag
  } = useTagsContext();

  return (
    <section className="tags-page">
      <div className="tags-callout">
        <form className="tags-callout-form" onSubmit={handleCreateTagType}>
          <input type="color" className="tags-color-input" value={tagTypeColorInput} onChange={(event) => setTagTypeColorInput(event.target.value.toUpperCase())} aria-label="TagType color" />
          <input type="text" className="tags-name-input" value={tagTypeNameInput} onChange={(event) => setTagTypeNameInput(event.target.value)} placeholder="TagType name" aria-label="TagType name" />
          <div className="tags-callout-actions">
            <button type="submit" className="tags-action-btn tags-action-create" disabled={!tagTypeNameInput.trim() || isTagTypeSaving} aria-label="Create TagType" title="Create TagType">{"\u2714"}</button>
            <button type="button" className="tags-action-btn tags-action-clear" onClick={handleClearTagTypeForm} aria-label="Clear TagType form" title="Clear TagType form">{"\u274C"}</button>
          </div>
        </form>
        {tagTypesError ? <p className="tags-error">{tagTypesError}</p> : null}
      </div>
      {isTagTypesLoading ? <p className="tags-state">Loading TagTypes...</p> : null}
      {!isTagTypesLoading && tagTypes.length === 0 ? <p className="tags-state">No TagTypes yet.</p> : null}
      {!isTagTypesLoading && tagTypes.length > 0 ? (
        <ul className="tag-type-list">
          {tagTypes.map((item) => {
            const color = /^#[0-9A-Fa-f]{6}$/.test(String(item.color || "")) ? String(item.color).toUpperCase() : "#64748B";
            const isEditing = editingTagTypeId === item.id;
            const summaryStyle = { borderColor: hexToRgba(color, 0.45), backgroundColor: hexToRgba(color, 0.2), color };
            const bodyStyle = { borderTopColor: hexToRgba(color, 0.24), backgroundColor: hexToRgba(color, 0.08) };
            const rawTagSearchQuery = String(tagSearchQueryByTagTypeId[item.id] || "");
            const normalizedTagSearchQuery = rawTagSearchQuery.trim().toLowerCase();
            const filteredTags = (tagsByTagTypeId[item.id] ?? []).filter((tagItem) => {
              if (!normalizedTagSearchQuery) return true;
              const name = String(tagItem?.name || "").toLowerCase();
              const description = String(tagItem?.description || "").toLowerCase();
              return name.includes(normalizedTagSearchQuery) || description.includes(normalizedTagSearchQuery);
            });

            return (
              <li key={item.id} className="tag-type-item">
                <details
                  className={`tag-type-callout${dragTargetTagTypeId === item.id ? " tag-type-callout-drop-target" : ""}`}
                  open={!!tagTypeCalloutOpenById[item.id]}
                  onToggle={(event) => handleTagTypeCalloutToggle(item.id, event.currentTarget.open)}
                  onDragOver={(event) => handleTagTypeDragOver(event, item.id)}
                  onDragLeave={() => handleTagTypeDragLeave(item.id)}
                  onDrop={(event) => void handleTagTypeDrop(event, item.id)}
                >
                  <summary className="tag-type-summary" style={summaryStyle}>
                    {isEditing ? (
                      <div className="tag-type-edit-row" onClick={(event) => event.stopPropagation()}>
                        <input type="color" className="tags-color-input tag-type-edit-color" value={editingTagTypeColor} onChange={(event) => setEditingTagTypeColor(event.target.value.toUpperCase())} aria-label="Edit TagType color" />
                        <input type="text" className="tags-name-input tag-type-edit-name" value={editingTagTypeName} onChange={(event) => setEditingTagTypeName(event.target.value)} aria-label="Edit TagType name" />
                      </div>
                    ) : (<span className="tag-type-summary-name">{item.name}</span>)}
                    <div className="tag-type-summary-actions">
                      {isEditing ? (
                        <>
                          <button type="button" className="tags-action-btn tags-action-create" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void handleSaveTagType(item.id); }} disabled={!editingTagTypeName.trim() || isTagTypeUpdating} aria-label="Update TagType" title="Update TagType">{"\u2714"}</button>
                          <button type="button" className="tags-action-btn tags-action-clear" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleCancelEditTagType(); }} disabled={isTagTypeUpdating} aria-label="Cancel edit TagType" title="Cancel edit TagType">{"\u274C"}</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="tags-action-btn tag-type-edit-btn" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleStartEditTagType(item); }} aria-label="Edit TagType" title="Edit TagType">{"\uD83D\uDEE0"}</button>
                          <button type="button" className="tags-action-btn tags-action-delete" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openTagDeleteConfirm({ kind: "tagType", id: item.id, name: item.name }); }} disabled={isTagTypeUpdating} aria-label="Delete TagType" title="Delete TagType">{"\uD83D\uDDD1"}</button>
                        </>
                      )}
                    </div>
                  </summary>
                  <div className="tag-type-body" style={bodyStyle}>
                    <input type="text" className="tag-callout-search-input" value={rawTagSearchQuery} onChange={(event) => setTagSearchQueryByTagTypeId((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Search tags by name or description" />
                    <table className="tag-table">
                      <tbody>
                        <tr>
                          <td><input type="text" className="tag-table-input" value={newTagDraftByTagTypeId[item.id]?.name ?? ""} onChange={(event) => handleNewTagDraftChange(item.id, { name: event.target.value })} placeholder="New tag name" /></td>
                          <td><input type="text" className="tag-table-input" value={newTagDraftByTagTypeId[item.id]?.description ?? ""} onChange={(event) => handleNewTagDraftChange(item.id, { description: event.target.value })} placeholder="Description" /></td>
                          <td><div className="tag-table-actions"><button type="button" className="tags-action-btn tags-action-create" onClick={() => void handleCreateTag(item.id)} disabled={!String(newTagDraftByTagTypeId[item.id]?.name || "").trim() || !!savingTagByTagTypeId[item.id]} title="Create tag">{"\u2714"}</button><button type="button" className="tags-action-btn tags-action-clear" onClick={() => handleClearNewTagDraft(item.id)} disabled={!!savingTagByTagTypeId[item.id]} title="Clear new tag">{"\u274C"}</button></div></td>
                        </tr>
                        {filteredTags.map((tagItem) => {
                          const isEditingTag = editingTagByTagTypeId[item.id] === tagItem.id;
                          const editingDraft = editingTagDraftById[tagItem.id] ?? { name: String(tagItem.name || ""), description: String(tagItem.description || "") };
                          const isDraggedTag = draggedTag?.id === tagItem.id && draggedTag?.sourceTagTypeId === item.id;
                          return (
                            <tr key={tagItem.id} className={`tag-table-row${isDraggedTag ? " tag-table-row-dragging" : ""}`} draggable={!isEditingTag} onDragStart={(event) => handleTagDragStart(event, item.id, tagItem)} onDragEnd={handleTagDragEnd}>
                              <td>{isEditingTag ? <input type="text" className="tag-table-input" value={editingDraft.name} onChange={(event) => handleEditTagDraftChange(tagItem.id, { name: event.target.value })} /> : tagItem.name}</td>
                              <td>{isEditingTag ? <input type="text" className="tag-table-input" value={editingDraft.description} onChange={(event) => handleEditTagDraftChange(tagItem.id, { description: event.target.value })} /> : (tagItem.description || "-")}</td>
                              <td><div className="tag-table-actions">{isEditingTag ? (<><button type="button" className="tags-action-btn tags-action-create" onClick={() => void handleSaveTag(item.id, tagItem.id)} disabled={!String(editingDraft.name || "").trim() || !!savingTagByTagTypeId[item.id]} title="Save tag">{"\u2714"}</button><button type="button" className="tags-action-btn tags-action-clear" onClick={() => handleCancelEditTag(item.id)} disabled={!!savingTagByTagTypeId[item.id]} title="Cancel edit">{"\u274C"}</button></>) : (<><button type="button" className="tags-action-btn tag-table-edit-btn" onClick={() => handleStartEditTag(item.id, tagItem)} title="Edit tag">{"\u2699"}</button><button type="button" className="tags-action-btn tags-action-delete" onClick={() => openTagDeleteConfirm({ kind: "tag", id: tagItem.id, tagTypeId: item.id, name: tagItem.name })} disabled={!!savingTagByTagTypeId[item.id]} title="Delete tag">{"\uD83D\uDDD1"}</button></>)}</div></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {tagTableStateByTagTypeId[item.id]?.error ? <p className="tags-error">{tagTableStateByTagTypeId[item.id].error}</p> : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
