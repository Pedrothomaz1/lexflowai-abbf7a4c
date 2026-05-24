import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

const CONSENT_KEY = "lexflow-cookie-consent";
const CONSENT_VERSION = 1;

interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

interface CookieConsent {
  version: number;
  timestamp: string;
  preferences: CookiePreferences;
}

const defaultConsent: CookieConsent | null = null;

export function useCookieConsent() {
  const [consent, setConsent] = useLocalStorage<CookieConsent | null>(
    CONSENT_KEY,
    defaultConsent
  );

  const hasConsent = useMemo(() => consent !== null, [consent]);

  const preferences = useMemo((): CookiePreferences => {
    if (!consent) {
      return { essential: true, analytics: false, marketing: false };
    }
    return consent.preferences;
  }, [consent]);

  const saveConsent = useCallback((prefs: Omit<CookiePreferences, "essential">) => {
    const newConsent: CookieConsent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      preferences: {
        essential: true,
        ...prefs,
      },
    };
    setConsent(newConsent);
  }, [setConsent]);

  const acceptAll = useCallback(() => {
    saveConsent({ analytics: true, marketing: true });
  }, [saveConsent]);

  const rejectNonEssential = useCallback(() => {
    saveConsent({ analytics: false, marketing: false });
  }, [saveConsent]);

  const updatePreferences = useCallback((prefs: Partial<Omit<CookiePreferences, "essential">>) => {
    saveConsent({
      analytics: prefs.analytics ?? preferences.analytics,
      marketing: prefs.marketing ?? preferences.marketing,
    });
  }, [saveConsent, preferences]);

  const resetConsent = useCallback(() => {
    setConsent(null);
  }, [setConsent]);

  return {
    hasConsent,
    preferences,
    acceptAll,
    rejectNonEssential,
    updatePreferences,
    resetConsent,
  };
}
