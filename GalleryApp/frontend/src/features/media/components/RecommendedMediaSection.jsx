import AppIcon from "../../shared/components/AppIcon";
import { resolvePreviewMediaUrl } from "../../shared/utils/mediaPredicates";

const formatScore = (value) => `${Math.max(0, Math.min(100, Math.round(Number(value || 0) * 100)))}%`;

export default function RecommendedMediaSection({
  items,
  isLoading = false,
  errorMessage = "",
  onOpenMedia
}) {
  const recommendedItems = Array.isArray(items) ? items : [];

  return (
    <section className="media-similar-section" aria-label="Recommended media">
      <div className="media-similar-header">
        <h3 className="media-similar-title">Recommended media</h3>
      </div>
      {isLoading ? <p className="media-similar-state">Loading recommendations...</p> : null}
      {!isLoading && errorMessage ? <p className="media-similar-state media-similar-state-error">{errorMessage}</p> : null}
      {!isLoading && !errorMessage && recommendedItems.length === 0 ? (
        <p className="media-similar-state">No recommendations found.</p>
      ) : null}
      {!isLoading && !errorMessage && recommendedItems.length > 0 ? (
        <div className="media-similar-strip">
          {recommendedItems.map((item) => {
            const itemId = Number(item?.id);
            const previewUrl = resolvePreviewMediaUrl(item);
            const label = String(item?.title || item?.name || item?.relativePath || `#${itemId}`);

            return (
              <button
                key={itemId}
                type="button"
                className="media-similar-card"
                onClick={() => onOpenMedia?.(itemId, "recommended")}
                title={label}
                aria-label={`Open recommended media ${itemId}.`}
              >
                <span className="media-similar-card-thumb-wrap" aria-hidden="true">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="media-similar-card-thumb" loading="lazy" />
                  ) : (
                    <span className="media-linked-editor-placeholder">
                      <AppIcon name="create" alt="" aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="media-similar-card-meta">
                  <span className="media-similar-card-id">#{itemId}</span>
                  <span className="media-similar-card-score">{formatScore(item?.recommendationScore)}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
