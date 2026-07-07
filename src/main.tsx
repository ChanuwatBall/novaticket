import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { applyPreferences, getStoredPreferences } from "./lib/preferences";
import { applyRemoteLanguageResources } from "./i18n/remoteResources";

const storedPreferences = getStoredPreferences();
applyRemoteLanguageResources(storedPreferences?.languageResources);
applyPreferences(storedPreferences);

createRoot(document.getElementById("root")!).render(<App />);
