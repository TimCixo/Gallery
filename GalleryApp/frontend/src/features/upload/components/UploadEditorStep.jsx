import MediaEditorPanel from "../../media/components/MediaEditorPanel";

export default function UploadEditorStep({
  activeUploadItem,
  isUploading,
  collections,
  settings,
  state,
  onDraftChange,
  onOpenCollectionPicker,
  onToggleGroupUpload,
  onBack,
  onUpload,
  renderUploadPreview,
  editorData
}) {
  const activeDraft = activeUploadItem?.draft || {};

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
        showFavoriteButton={false}
        showCloseButton={false}
        allowOpenRelatedMedia={false}
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
        isPrimaryActionBusy={isUploading}
        onPrimaryAction={onUpload}
        secondaryActionLabel="Back"
        onSecondaryAction={onBack}
        actionLeadingSlot={(
          <label className="media-upload-group-toggle">
            <input
              type="checkbox"
              checked={settings.isGroupUploadEnabled}
              onChange={(event) => onToggleGroupUpload(event.target.checked)}
              disabled={isUploading}
            />
            group
          </label>
        )}
        previewNode={renderUploadPreview()}
        previewClassName="upload-edit-thumbnail"
        uploadFile={activeUploadItem?.file || null}
      />

      {state.type === "success" && state.message ? (
        <p className="media-action-success">{state.message}</p>
      ) : null}
    </>
  );
}
