import CollectionPickerDialogContent from "../../collections/components/CollectionPickerDialogContent";

export default function UploadCollectionPicker({
  isOpen,
  collections,
  selectedIds,
  onToggle,
  onClose
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="media-confirm-overlay" onClick={onClose}>
      <CollectionPickerDialogContent
        items={collections.entities}
        errorMessage={collections.error}
        isLoading={collections.loading}
        selectedIds={selectedIds}
        onSelect={(item) => onToggle(item.id)}
        onClose={onClose}
      />
    </div>
  );
}
