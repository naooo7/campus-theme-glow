import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { institutionById, type InstitutionPalette } from "@/data/institutions";
import {
  getInstitutionThemeEnabled,
  getTargetInstitutionId,
  setInstitutionThemeEnabled as persistInstitutionThemeEnabled,
  setTargetInstitutionId as persistTargetInstitutionId,
} from "@/services/profile-preferences";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
  targetInstitutionId: string | null;
  setTargetInstitutionId: (institutionId: string) => void;
  institutionThemeEnabled: boolean;
  setInstitutionThemeEnabled: (enabled: boolean) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "fastlearner-theme";
const paletteProperties: Record<keyof InstitutionPalette, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  ring: "--ring",
  answerHover: "--answer-hover",
  answerHoverForeground: "--answer-hover-foreground",
  answerSelected: "--answer-selected",
  answerSelectedForeground: "--answer-selected-foreground",
  answerSelectedBorder: "--answer-selected-border",
};

function getSystemTheme(): "light" | "dark" {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const [targetInstitutionId, setTargetInstitutionIdState] = useState<string | null>(null);
  const [institutionThemeEnabled, setInstitutionThemeEnabledState] = useState(false);

  useEffect(() => {
    setPreference(readPreference());
    setSystemTheme(getSystemTheme());
    setTargetInstitutionIdState(getTargetInstitutionId());
    setInstitutionThemeEnabledState(getInstitutionThemeEnabled());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  const resolvedTheme = preference === "system" ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.documentElement.style.colorScheme = resolvedTheme;
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference, resolvedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    Object.values(paletteProperties).forEach((property) => root.style.removeProperty(property));
    const institution = institutionThemeEnabled ? institutionById(targetInstitutionId) : undefined;
    if (!institution) {
      root.removeAttribute("data-institution-theme");
      return;
    }
    const palette = institution.theme[resolvedTheme];
    (Object.keys(paletteProperties) as Array<keyof InstitutionPalette>).forEach((key) => {
      root.style.setProperty(paletteProperties[key], palette[key]);
    });
    root.dataset["institutionTheme"] = institution.id;
  }, [institutionThemeEnabled, resolvedTheme, targetInstitutionId]);

  const setTargetInstitutionId = (institutionId: string) => {
    persistTargetInstitutionId(institutionId);
    setTargetInstitutionIdState(institutionId);
  };

  const setInstitutionThemeEnabled = (enabled: boolean) => {
    persistInstitutionThemeEnabled(enabled);
    setInstitutionThemeEnabledState(enabled);
  };

  const value = useMemo(
    () => ({ preference, setPreference, resolvedTheme, targetInstitutionId, setTargetInstitutionId, institutionThemeEnabled, setInstitutionThemeEnabled }),
    [preference, resolvedTheme, targetInstitutionId, institutionThemeEnabled],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}