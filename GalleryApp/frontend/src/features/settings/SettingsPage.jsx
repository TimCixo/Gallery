import { normalizeAppSettings } from "./utils/appSettings.js";
import {
  MAX_SEARCH_SUGGESTIONS_LIMIT,
  MIN_SEARCH_SUGGESTIONS_LIMIT
} from "../search/searchSuggestionSettings.js";

export default function SettingsPage({
  appSettings,
  onAppSettingsChange,
  onGroupRelatedMediaDefaultChange
}) {
  const normalizedSettings = normalizeAppSettings(appSettings);
  const recommendationSettings = normalizedSettings.recommendationSettings;
  const updateSettings = (patch) => onAppSettingsChange?.({ ...normalizedSettings, ...patch });
  const updateRecommendationSettings = (patch) => onAppSettingsChange?.({
    ...normalizedSettings,
    recommendationSettings: {
      ...recommendationSettings,
      ...patch
    }
  });

  return (
    <section className="settings-page">
      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-kicker">Browsing</p>
            <h3 className="settings-section-title">Gallery and viewer defaults</h3>
            <p className="settings-section-description">
              Control how media opens, how many items load per page, and what is visible in the viewer.
            </p>
          </div>
        </div>
        <div className="settings-grid settings-grid-compact">
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Group related media by default</span>
              <span className="settings-option-description">Collapse linked parent/child media into grouped gallery tiles.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.groupRelatedMediaByDefault}
              onChange={(event) => {
                const nextValue = event.target.checked;
                updateSettings({ groupRelatedMediaByDefault: nextValue });
                onGroupRelatedMediaDefaultChange?.(nextValue);
              }}
            />
          </label>
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Show related media strip</span>
              <span className="settings-option-description">Display the linked media strip above the viewer when relations exist.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.showRelatedMediaStrip}
              onChange={(event) => updateSettings({ showRelatedMediaStrip: event.target.checked })}
            />
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Default media fit mode</span>
              <span className="settings-option-description">Choose how media is framed when the viewer opens.</span>
            </div>
            <select
              value={normalizedSettings.defaultMediaFitMode}
              onChange={(event) => updateSettings({ defaultMediaFitMode: event.target.value })}
            >
              <option value="resize">Resize</option>
              <option value="height">Fit height</option>
              <option value="width">Fit width</option>
            </select>
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Media grid page size</span>
              <span className="settings-option-description">Used by gallery, favorites, and collection media grids.</span>
            </div>
            <input
              type="number"
              min="12"
              max="120"
              value={normalizedSettings.mediaGridPageSize}
              onChange={(event) => updateSettings({ mediaGridPageSize: event.target.value })}
            />
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Duplicates page size</span>
              <span className="settings-option-description">How many duplicate groups to show on one page.</span>
            </div>
            <input
              type="number"
              min="6"
              max="60"
              value={normalizedSettings.duplicatesPageSize}
              onChange={(event) => updateSettings({ duplicatesPageSize: event.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-kicker">Workflow</p>
            <h3 className="settings-section-title">Memory and editing defaults</h3>
            <p className="settings-section-description">
              Decide what the app remembers between sessions and which defaults are prefilled for repetitive tasks.
            </p>
          </div>
        </div>
        <div className="settings-grid">
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Remember last opened page</span>
              <span className="settings-option-description">Return to the previous section after a reload instead of always starting on gallery.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.rememberLastOpenedPage}
              onChange={(event) => updateSettings({ rememberLastOpenedPage: event.target.checked })}
            />
          </label>
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Remember search history</span>
              <span className="settings-option-description">Keep recent search queries and suggestions between sessions.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.rememberSearchHistory}
              onChange={(event) => updateSettings({ rememberSearchHistory: event.target.checked })}
            />
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Search suggestions limit</span>
              <span className="settings-option-description">How many autocomplete suggestions to show at once. Suggestions appear even before you start typing.</span>
            </div>
            <input
              type="number"
              min={MIN_SEARCH_SUGGESTIONS_LIMIT}
              max={MAX_SEARCH_SUGGESTIONS_LIMIT}
              value={normalizedSettings.searchSuggestionsLimit}
              onChange={(event) => updateSettings({ searchSuggestionsLimit: event.target.value })}
            />
          </label>
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Enable group upload mode by default</span>
              <span className="settings-option-description">Open the upload editor in group mode instead of single-item editing.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.defaultGroupUploadMode}
              onChange={(event) => updateSettings({ defaultGroupUploadMode: event.target.checked })}
            />
          </label>
          <label className="settings-option settings-option-toggle">
            <div className="settings-option-copy">
              <span className="settings-option-title">Confirm destructive actions</span>
              <span className="settings-option-description">Ask before deletions and duplicate clean-up actions.</span>
            </div>
            <input
              type="checkbox"
              checked={normalizedSettings.confirmDestructiveActions}
              onChange={(event) => updateSettings({ confirmDestructiveActions: event.target.checked })}
            />
          </label>
          <label className="settings-option settings-option-wide">
            <div className="settings-option-copy">
              <span className="settings-option-title">Default quick tagging tags</span>
              <span className="settings-option-description">Prefill quick tagging with tags you add most often.</span>
            </div>
            <input
              type="text"
              value={normalizedSettings.defaultQuickTaggingTags}
              onChange={(event) => updateSettings({ defaultQuickTaggingTags: event.target.value })}
              placeholder="author:artist3 character:some_character"
            />
          </label>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">
          <div>
            <p className="settings-section-kicker">Recommendations</p>
            <h3 className="settings-section-title">Similarity tuning</h3>
            <p className="settings-section-description">
              Adjust when recommendations appear and how strict the similarity filter should be.
            </p>
          </div>
        </div>
        <div className="settings-grid settings-grid-compact">
          <label className="settings-option settings-option-toggle settings-option-wide">
            <div className="settings-option-copy">
              <span className="settings-option-title">Load recommendations automatically in viewer</span>
              <span className="settings-option-description">Turn this off if you want a cleaner viewer and fewer recommendation requests.</span>
            </div>
            <input
              type="checkbox"
              checked={recommendationSettings.enabled}
              onChange={(event) => updateRecommendationSettings({ enabled: event.target.checked })}
            />
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Images to display</span>
              <span className="settings-option-description">Maximum number of recommended items shown under the viewer.</span>
            </div>
            <input
              type="number"
              min="1"
              max="50"
              value={recommendationSettings.visibleCount}
              onChange={(event) => updateRecommendationSettings({ visibleCount: event.target.value })}
            />
          </label>
          <label className="settings-option">
            <div className="settings-option-copy">
              <span className="settings-option-title">Minimum similarity, %</span>
              <span className="settings-option-description">Hide weaker matches and show only closer recommendations.</span>
            </div>
            <input
              type="number"
              min="0"
              max="100"
              value={recommendationSettings.minSimilarityPercent}
              onChange={(event) => updateRecommendationSettings({ minSimilarityPercent: event.target.value })}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
