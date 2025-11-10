import { AniStore, parseEpisodeList } from "./common.js";

const els = {
  exportBtn:  document.getElementById("exportBtn"),
  importFile: document.getElementById("importFile"),
  jsonArea:   document.getElementById("jsonArea"),
  seriesAdmin:document.getElementById("seriesAdmin"),
  backPopup:  document.getElementById("backPopup"),
};

const q  = (s, r=document) => r.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn, { passive:false });

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

const THUMB_PREFIX = "local:";
const THUMB_KEY = id => `thumb:${id}`;
const isDataUrl  = s => typeof s === "string" && s.startsWith("data:");

async function stashThumbIfNeeded(value, seriesId) {
  if (!value) return "";
  if (value.startsWith(THUMB_PREFIX)) return value;
  if (!isDataUrl(value)) return value;
  const key = THUMB_KEY(seriesId);
  await chrome.storage.local.set({ [key]: value });
  return `${THUMB_PREFIX}${seriesId}`;
}

async function resolveThumbSrc(series) {
  const v = series?.thumb || "";
  if (!v) return "icons/icon128.png";
  if (v.startsWith(THUMB_PREFIX)) {
    const key = THUMB_KEY(series.id);
    const got = await chrome.storage.local.get(key);
    return got?.[key] || "icons/icon128.png";
  }
  return v;
}

async function fileToDataURL(file) {
  if (!file) return "";
  const r = new FileReader();
  const p = new Promise((res, rej)=>{ r.onload=()=>res(String(r.result||"")); r.onerror=rej; });
  r.readAsDataURL(file);
  return p;
}

on(els.backPopup, "click", (e)=>{ e.preventDefault(); window.close(); });

async function load() {
  const list = await AniStore.listSeries();
  renderAdmin(list);
}

function renderAdmin(list) {
  const root = els.seriesAdmin;
  root.innerHTML = "";

  if (!list.length) {
    const div = document.createElement("div");
    div.className = "empty-tip";
    div.textContent = "No series yet. Add some from the popup first.";
    root.appendChild(div);
    return;
  }

  for (const s of list) {
    const row = document.createElement("div");
    row.className = "s-line";
    const fileId = `pick_${s.id}`;

    row.innerHTML = `
      <img class="s-thumb" alt="">
      <input class="grid-span s-title" type="text" value="${escapeHtml(s.title)}" data-k="title" placeholder="Series title"/>

      <div class="thumb-field">
        <input class="s-thumb-file" type="file" id="${fileId}" accept="image/*" hidden>
        <button class="btn small" data-act="pick">Choose Image</button>
      </div>

      <input class="s-total" type="number" min="1" placeholder="Total" data-k="total" value="${Number.isInteger(s.total)? s.total : ""}"/>

      <div class="actions">
        <button class="btn small" data-act="custom" title="Set total from custom list">Custom</button>
        <button class="btn small danger" data-act="del" title="Delete">Delete</button>
      </div>
    `;

    const img = q(".s-thumb", row);
    resolveThumbSrc(s).then(src => { img.src = src; });

    on(q(".s-title", row), "change", async (e) => {
      s.title = e.target.value.trim() || s.title;
      s.updatedAt = Date.now();
      await AniStore.saveSeries(s);
    });

    const fileEl = q(`#${fileId}`, row);
    on(q("[data-act='pick']", row), "click", (e) => {
      e.preventDefault();
      fileEl?.click();
    });
    on(fileEl, "change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const dataUrl = await fileToDataURL(f);
      s.thumb = await stashThumbIfNeeded(dataUrl, s.id);
      s.updatedAt = Date.now();
      await AniStore.saveSeries(s);
      resolveThumbSrc(s).then(src => { img.src = src; });
      e.target.value = "";
    });

    const totalEl = q(".s-total", row);
    const applyTotal = async () => {
      const n = Number(totalEl.value);
      if (!Number.isInteger(n) || n <= 0) return;
      s.total = n;
      s.updatedAt = Date.now();
      await AniStore.saveSeries(s);
    };
    on(totalEl, "change", applyTotal);

    on(q("[data-act='custom']", row), "click", async (e) => {
      e.preventDefault();
      const txt = prompt("Custom list (e.g., 1-12,24,100-110):", "");
      if (txt == null) return;

      const set = parseEpisodeList(txt);
      if (!set.size) return alert("Invalid list.");

      const maxN = Math.max(...Array.from(set));
      s.total = maxN;
      s.updatedAt = Date.now();
      await AniStore.saveSeries(s);

      q(".s-total", row).value = s.total;
    });

    on(q("[data-act='del']", row), "click", async (e) => {
      e.preventDefault();
      if (!confirm(`Delete "${s.title}"?`)) return;
      await AniStore.deleteSeries(s.id);
      await load();
    });

    root.appendChild(row);
  }
}

on(els.exportBtn, "click", async (e) => {
  e.preventDefault();
  const data = await AniStore.exportJson();
  els.jsonArea.value = JSON.stringify(data, null, 2);
  const blob = new Blob([els.jsonArea.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `anitrack-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

on(els.importFile, "change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  try {
    const obj = JSON.parse(text);
    await AniStore.importJson(obj);
    alert("Import successful.");
    els.jsonArea.value = JSON.stringify(obj, null, 2);
    await load();
  } catch {
    alert("Import failed: invalid format.");
  } finally {
    e.target.value = "";
  }
});

load();