import { applyTheme, bindSystemListener, getThemeMode, setThemeMode, nextMode, iconFor } from "./theme.js";
import "./popup.js";

(async () => {
  const btn = document.getElementById("themeToggle");
  const icon = document.getElementById("themeIcon");

  const cur = await getThemeMode();
  applyTheme(cur);
  bindSystemListener();
  if (icon) icon.className = "fa-solid " + iconFor(cur);

  btn?.addEventListener("click", async () => {
    const current = await getThemeMode();
    const n = nextMode(current);
    await setThemeMode(n);
    if (icon) icon.className = "fa-solid " + iconFor(n);
  });
})();

