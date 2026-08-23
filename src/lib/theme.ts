export type PaperTheme = "paper" | "night";

export const THEME_KEY = "tc-theme-v1";

export function readTheme(): PaperTheme {
  if (typeof window === "undefined") return "paper";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "night" || saved === "paper") return saved;
  } catch {
    /* private mode */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "night" : "paper";
}

export function applyTheme(theme: PaperTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "night" ? "dark" : "light";
}

export function writeTheme(theme: PaperTheme) {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

/** Inline head script — paint the chosen look before first CSS. */
export const THEME_BOOT =
  'try{var k="tc-theme-v1";var t=localStorage.getItem(k);if(t!=="paper"&&t!=="night")t=matchMedia("(prefers-color-scheme: dark)").matches?"night":"paper";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t==="night"?"dark":"light"}catch(e){}';
