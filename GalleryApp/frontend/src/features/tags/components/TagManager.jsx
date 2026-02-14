import { useTagItemsManager } from "../hooks/useTagItemsManager";
import { useTagTypesManager } from "../hooks/useTagTypesManager";
import { TagTypesBoard } from "./TagTypesBoard";

export function TagManager() {
  const tagTypesState = useTagTypesManager();
  const tagItemsState = useTagItemsManager({ setTagTypesError: tagTypesState.setTagTypesError });

  const handleDeleteTagType = async (tagTypeId) => {
    const deleted = await tagTypesState.handleDeleteTagType(tagTypeId);
    if (deleted) {
      tagItemsState.removeTagTypeData(tagTypeId);
    }
  };

  return (
    <TagTypesBoard
      tagTypesState={tagTypesState}
      tagItemsState={tagItemsState}
      onDeleteTagType={handleDeleteTagType}
    />
  );
}
