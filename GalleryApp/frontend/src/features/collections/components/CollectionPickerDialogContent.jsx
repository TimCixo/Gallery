import PickerDialog from "../../shared/components/PickerDialog";
import PickerGridButton from "../../shared/components/PickerGridButton";

const getCollectionPreviewUrl = (item) => (
  item?.coverMedia?.tileUrl
  || item?.coverMedia?.previewUrl
  || item?.coverMedia?.originalUrl
  || ""
);

export default function CollectionPickerDialogContent({
  items,
  errorMessage,
  isLoading,
  isBusy = false,
  onSelect,
  onClose,
  selectedIds = []
}) {
  const collectionItems = Array.isArray(items) ? items : [];

  return (
    <PickerDialog
      title="Select collection"
      onClose={onClose}
      errorMessage={errorMessage}
      isLoading={isLoading}
      loadingText="Loading collections..."
      isEmpty={collectionItems.length === 0}
      emptyText="No collections available."
      items={collectionItems}
      renderItem={(item) => {
        const collectionId = Number(item?.id);
        const isIncluded = Number.isSafeInteger(collectionId) && selectedIds.includes(collectionId);
        return (
          <li key={item.id}>
            <PickerGridButton
              className={`collection-picker-item${isIncluded ? " is-included" : ""}`}
              title={item.label || "Untitled collection"}
              subtitle={isIncluded ? "Included" : "Not included"}
              description={item.description || "No description."}
              status={Number.isSafeInteger(collectionId) ? `#${collectionId}` : ""}
              previewUrl={getCollectionPreviewUrl(item)}
              previewAlt=""
              fallbackIcon="collection"
              fallbackLabel="No cover"
              isSelected={isIncluded}
              disabled={isBusy}
              onClick={() => onSelect?.(item)}
            />
          </li>
        );
      }}
    />
  );
}
