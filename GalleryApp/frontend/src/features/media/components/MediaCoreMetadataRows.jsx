function renderSource(source) {
  if (!source) {
    return "-";
  }

  return (
    <a href={source} target="_blank" rel="noreferrer">
      {source}
    </a>
  );
}

export default function MediaCoreMetadataRows({
  isEditing,
  file,
  draft,
  onDraftChange,
  isEditingDisabled = false,
  showRelations = true,
  renderParentCell,
  renderChildCell
}) {
  const parentCell = renderParentCell
    ? renderParentCell({ isEditing, file, draft, onDraftChange })
    : (isEditing ? (
      <input
        type="text"
        className="media-edit-input"
        value={draft?.parent ?? ""}
        onChange={(event) => onDraftChange?.({ parent: event.target.value })}
        placeholder="Media id"
        disabled={isEditingDisabled}
      />
    ) : (file?.parent ?? "-"));

  const childCell = renderChildCell
    ? renderChildCell({ isEditing, file, draft, onDraftChange })
    : (isEditing ? (
      <input
        type="text"
        className="media-edit-input"
        value={draft?.child ?? ""}
        onChange={(event) => onDraftChange?.({ child: event.target.value })}
        placeholder="Media id"
        disabled={isEditingDisabled}
      />
    ) : (file?.child ?? "-"));

  return (
    <>
      <tr>
        <th scope="row">Source</th>
        <td>
          {isEditing ? (
            <input
              type="url"
              className="media-edit-input"
              value={draft?.source ?? ""}
              onChange={(event) => onDraftChange?.({ source: event.target.value })}
              placeholder="https://example.com"
              disabled={isEditingDisabled}
            />
          ) : renderSource(file?.source)}
        </td>
      </tr>
      <tr>
        <th scope="row">Title</th>
        <td>
          {isEditing ? (
            <input
              type="text"
              className="media-edit-input"
              value={draft?.title ?? ""}
              onChange={(event) => onDraftChange?.({ title: event.target.value })}
              disabled={isEditingDisabled}
            />
          ) : (file?.title || "-")}
        </td>
      </tr>
      <tr>
        <th scope="row">Description</th>
        <td>
          {isEditing ? (
            <textarea
              className="media-edit-input media-edit-textarea"
              value={draft?.description ?? ""}
              onChange={(event) => onDraftChange?.({ description: event.target.value })}
              disabled={isEditingDisabled}
            />
          ) : (file?.description || "-")}
        </td>
      </tr>
      {showRelations ? (
        <>
          <tr>
            <th scope="row">Parent</th>
            <td>{parentCell}</td>
          </tr>
          <tr>
            <th scope="row">Child</th>
            <td>{childCell}</td>
          </tr>
        </>
      ) : null}
    </>
  );
}
