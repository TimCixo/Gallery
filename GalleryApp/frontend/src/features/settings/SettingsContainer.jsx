import SettingsPage from "./SettingsPage";

export default function SettingsContainer({ appSettings, onAppSettingsChange, onGroupRelatedMediaDefaultChange }) {
  return (
    <SettingsPage
      appSettings={appSettings}
      onAppSettingsChange={onAppSettingsChange}
      onGroupRelatedMediaDefaultChange={onGroupRelatedMediaDefaultChange}
    />
  );
}
