const THEME_KEY = "anitrack_themeMode"; 
const MODES = ["system", "light", "dark"];

export async function getThemeMode() {
  const o = await chrome.storage.sync.get({ [THEME_KEY]: "system" });
  return o[THEME_KEY];
}
export async function setThemeMode(mode) {
  await chrome.storage.sync.set({ [THEME_KEY]: mode });
  applyTheme(mode);
}
export function applyTheme(mode) {
  const root = document.documentElement;
  const sysDark = matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", mode === "system" ? (sysDark ? "dark" : "light") : mode);
}
export function bindSystemListener() {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const handler = async () => { if ((await getThemeMode()) === "system") applyTheme("system"); };
  mq.addEventListener ? mq.addEventListener("change", handler) : mq.addListener(handler);
}
export function nextMode(cur) {
  const i = MODES.indexOf(cur);
  return MODES[(i + 1) % MODES.length];
}
export function iconFor(mode, sysDark = matchMedia("(prefers-color-scheme: dark)").matches) {
  const effective = mode === "system" ? (sysDark ? "dark" : "light") : mode;
  if (mode === "system") return "fa-computer";
  return effective === "dark" ? "fa-moon" : "fa-sun";
}
