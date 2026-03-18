import MediaEditorPanel from "../../media/components/MediaEditorPanel";

export default function UploadEditorStep({
  activeUploadItem,
  visibleDraft,
  isUploading,
  collections,
  settings,
  state,
  onDraftChange,
  onOpenCollectionPicker,
  onToggleGroupUpload,
  isGroupSelectionChainEnabled,
  onToggleGroupSelectionChain,
  onBack,
  onUpload,
  previewNode,
  previewTitle,
  editorData
}) {
  const activeDraft = visibleDraft || {};

  return (
    <>
      <MediaEditorPanel
        mode="upload"
        file={{
          id: null,
          relativePath: "",
          name: activeUploadItem?.file?.name || "",
          sizeBytes: activeUploadItem?.file?.size || 0
        }}
        draft={activeDraft}
        onDraftChange={onDraftChange}
        errorMessage={collections.error || editorData.tagCatalogError || (state.type === "error" ? state.message : "")}
        isSavingMedia={isUploading}
        isDeletingMedia={false}
        onOpenCollectionPicker={onOpenCollectionPicker}
        isCollectionPickerLoading={collections.loading}
        isAddingMediaToCollection={false}
        showCollectionButton={false}
        showFavoriteButton={false}
        showCloseButton={false}
        allowOpenRelatedMedia={false}
        showRelations={!settings.isGroupUploadEnabled}
        tagCatalog={editorData.tagCatalog}
        tagTypes={editorData.tagTypesCatalog}
        isTagCatalogLoading={editorData.isTagCatalogLoading}
        selectedTagIds={Array.isArray(activeDraft.tagIds) ? activeDraft.tagIds : []}
        onToggleTag={editorData.toggleTag}
        onRefreshTagCatalog={editorData.refreshTagCatalog}
        relationPreviewByMode={editorData.relationPreviewByMode}
        onOpenRelationPicker={editorData.openMediaRelationPicker}
        onOpenRelatedMediaById={undefined}
        isMediaRelationPickerOpen={editorData.isMediaRelationPickerOpen}
        mediaRelationPickerMode={editorData.mediaRelationPickerMode}
        mediaRelationPickerQuery={editorData.mediaRelationPickerQuery}
        onMediaRelationPickerQueryChange={(value) => {
          editorData.setMediaRelationPickerQuery(value);
          editorData.setMediaRelationPickerPage(1);
        }}
        mediaRelationPickerItems={editorData.mediaRelationPickerItems}
        mediaRelationPickerPage={editorData.mediaRelationPickerPage}
        mediaRelationPickerTotalPages={editorData.mediaRelationPickerTotalPages}
        mediaRelationPickerTotalCount={editorData.mediaRelationPickerTotalCount}
        isMediaRelationPickerLoading={editorData.isMediaRelationPickerLoading}
        mediaRelationPickerError={editorData.mediaRelationPickerError}
        onMediaRelationPickerPrev={() => editorData.setMediaRelationPickerPage((current) => Math.max(1, current - 1))}
        onMediaRelationPickerNext={() => editorData.setMediaRelationPickerPage((current) => current + 1)}
        onCloseMediaRelationPicker={editorData.closeMediaRelationPicker}
        onSelectMediaRelationFromPicker={editorData.handleSelectMediaRelationFromPicker}
        primaryActionLabel="Upload"
        primaryActionBusyLabel="Uploading..."
        primaryIconName="upload"
        isPrimaryActionBusy={isUploading}
        onPrimaryAction={onUpload}
        secondaryActionLabel="Back"
        onSecondaryAction={onBack}
        actionLeadingSlot={(
          <div className="media-bulk-group-options">
            <label className="media-upload-group-toggle">
              <input
                type="checkbox"
                checked={settings.isGroupUploadEnabled}
                onChange={(event) => onToggleGroupUpload(event.target.checked)}
                disabled={isUploading}
              />
              group
            </label>
            {settings.isGroupUploadEnabled ? (
              <label className="media-upload-group-toggle">
                <input
                  type="checkbox"
                  checked={isGroupSelectionChainEnabled}
                  onChange={(event) => onToggleGroupSelectionChain(event.target.checked)}
                  disabled={isUploading || !activeUploadItem}
                />
                link order
              </label>
            ) : null}
          </div>
        )}
        previewNode={previewNode}
        previewClassName="upload-edit-thumbnail"
        previewTitle={previewTitle}
        uploadFile={activeUploadItem?.file || null}
      />

      {state.type === "success" && state.message ? (
        <p className="media-action-success">{state.message}</p>
      ) : null}
    </>
  );
}
