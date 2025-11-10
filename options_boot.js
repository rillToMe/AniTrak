import { applyTheme, bindSystemListener, getThemeMode, setThemeMode, nextMode, iconFor } from "./theme.js";
import "./options.js"; 

(async () => {
  
  const cur = await getThemeMode();
  applyTheme(cur);
  bindSystemListener();

  const btnTheme = document.getElementById("optThemeToggle");
  const icon = document.getElementById("optThemeIcon");
  if (icon) icon.className = "fa-solid " + iconFor(cur);

  btnTheme?.addEventListener("click", async () => {
    const n = nextMode(await getThemeMode()); 
    await setThemeMode(n);
    if (icon) icon.className = "fa-solid " + iconFor(n);
  });

  const map = {
    home: document.getElementById("sec-home"),
    series: document.getElementById("sec-series"),
  };
  const buttons = Array.from(document.querySelectorAll(".nav-item[data-section]"));
  function activate(name){
    Object.values(map).forEach(el => el?.classList.remove("is-active"));
    buttons.forEach(b => b.classList.remove("is-active"));
    map[name]?.classList.add("is-active");
    buttons.find(b => b.dataset.section === name)?.classList.add("is-active");
  }
  buttons.forEach(b => b.addEventListener("click", () => {
    const name = b.dataset.section;
    if (name) activate(name);
  }));

  activate("home");
})();
