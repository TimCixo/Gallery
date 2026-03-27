import { useEffect, useMemo, useState } from "react";
import AppIcon from "../../shared/components/AppIcon";
import MediaEditActions from "./MediaEditActions";
import TagNamesAutocompleteInput from "./TagNamesAutocompleteInput";
import { parseTagNamesList } from "../../tags/tagUtils";
import { createQuickTaggingConfig, resolveTagIdsToTokens, resolveTagTokensToIds } from "../utils/quickTagging";

export default function QuickTaggingModal({
  isOpen,
  tagCatalog,
  isLoading,
  initialConfig,
  onConfirm,
  onDisable,
  onClose
}) {
  const [draft, setDraft] = useState(() => ({
    addTagsInput: resolveTagIdsToTokens(initialConfig?.addTagIds, tagCatalog).join(" ")
  }));
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setDraft({
      addTagsInput: resolveTagIdsToTokens(initialConfig?.addTagIds, tagCatalog).join(" ")
    });
    setErrorMessage("");
  }, [initialConfig, isOpen, tagCatalog]);

  const tagNames = useMemo(() => (
    Array.from(new Set(
      (Array.isArray(tagCatalog) ? tagCatalog : [])
        .map((tag) => String(tag?.name || "").trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right))
  ), [tagCatalog]);

  if (!isOpen) {
    return null;
  }

  const handleConfirm = () => {
    const addTagIds = resolveTagTokensToIds(parseTagNamesList(draft.addTagsInput), tagCatalog);
    const normalizedConfig = createQuickTaggingConfig({
      addTagIds
    });

    if (normalizedConfig.addTagIds.length === 0) {
      setErrorMessage("Enter at least one existing tag to add.");
      return;
    }

    const didConfirm = onConfirm?.(normalizedConfig);
    if (didConfirm) {
      setErrorMessage("");
    }
  };

  return (
    <div className="media-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="media-modal media-modal-editing media-quick-tagging-modal" onClick={(event) => event.stopPropagation()}>
        <div className="media-modal-header">
          <h2 className="upload-modal-title">Quick tagging</h2>
          <button
            type="button"
            className="media-icon-btn media-icon-btn-close"
            onClick={onClose}
            aria-label="Close quick tagging"
            title="Close quick tagging"
          >
            <AppIcon name="close" alt="" aria-hidden="true" />
          </button>
        </div>
        <div className="media-modal-body media-quick-tagging-body">
          <section className="media-quick-tagging-section">
            <TagNamesAutocompleteInput
              id="quick-tagging-add-tags"
              label="Tags to add"
              value={draft.addTagsInput}
              onChange={(nextValue) => {
                setDraft((current) => ({ ...current, addTagsInput: nextValue }));
                setErrorMessage("");
              }}
              placeholder="author:artist3 character:some_character"
              tagCatalog={tagCatalog}
              disabled={isLoading}
            />
          </section>

          {isLoading ? <p className="media-state">Loading tags...</p> : null}
          {!isLoading && tagNames.length === 0 ? <p className="media-state">No tags available.</p> : null}
          {errorMessage ? <p className="media-action-error">{errorMessage}</p> : null}
        </div>
        <div className="media-modal-footer">
          <MediaEditActions
            primaryLabel={initialConfig?.enabled ? "Update quick tagging" : "Enable quick tagging"}
            primaryIconName="confirm"
            onPrimary={handleConfirm}
            secondaryLabel="Cancel"
            onSecondary={onDisable}
            isDisabled={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
