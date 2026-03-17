function ModalManager({
  uploadDialog,
  relationPicker,
  mediaEditor,
  tagDeleteConfirm,
  collectionDeleteConfirm
}) {
  return (
    <>
      {mediaEditor}
      {uploadDialog}
      {relationPicker}
      {tagDeleteConfirm}
      {collectionDeleteConfirm}
    </>
  );
}

export default ModalManager;
