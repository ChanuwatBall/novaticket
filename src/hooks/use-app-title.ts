import { useEffect, useState } from "react";
import { getStoredPreferences, PREFERENCES_UPDATED_EVENT } from "@/lib/preferences";

const FALLBACK_APP_TITLE = "NOVA Express";

const getAppTitle = () => getStoredPreferences()?.oaTitle?.trim() || FALLBACK_APP_TITLE;

/** Keeps UI labels in sync with branding returned by the configuration API. */
export const useAppTitle = () => {
  const [appTitle, setAppTitle] = useState(getAppTitle);

  useEffect(() => {
    const refreshAppTitle = () => setAppTitle(getAppTitle());

    window.addEventListener(PREFERENCES_UPDATED_EVENT, refreshAppTitle);
    return () => window.removeEventListener(PREFERENCES_UPDATED_EVENT, refreshAppTitle);
  }, []);

  return appTitle;
};
