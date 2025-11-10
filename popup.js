import { AniStore, uid, parseEpisodeList, calcProgress, openOptions } from "./common.js";

const q  = (s) => document.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

const tpl = q("#cardTpl");
const els = {
  seriesList: q("#seriesList"),
  addSeries:  q("#addSeries"),
  dlg:        q("#newSeriesDlg"),
  form:       q("#newSeriesForm"),
  search:     q("#search"),
  openOptions:q("#openOptions"),

  detailDlg:    q("#detailDlg"),
  detailForm:   q("#detailForm"),
  dTitle:       q("#dTitle"),
  dThumb:       q("#dThumb"),
  dInputTitle:  q("#dInputTitle"),
  dSave:        q("#dSave"),
  episodes:     q("#episodes"),

  nClose: q("#nClose"),
  dClose: q("#dClose"),

  dGenOpen: q("#dGenOpen"),
  genDlg:   q("#genDlg"),
  genForm:  q("#genForm"),
  gClose:   q("#gClose"),
  gTotal:   q("#gTotal"),
  gList:    q("#gList"),

  nThumbFile: q("#nThumbFile"),
  nThumbPick: q("#nThumbPick"),
  dThumbFile: q("#dThumbFile"),
  dThumbPick: q("#dThumbPick"),
};

let newSeriesThumbData = "";

let state = { raw: [], filtered: [], selected: null };
let view  = { pageSize: 120, page: 1 };

const THUMB_PREFIX = "local:";
const THUMB_KEY = (id) => `thumb:${id}`;
const isDataUrl = (s) => typeof s === "string" && s.startsWith("data:");

async function stashThumbIfNeeded(thumb, seriesId) {
  if (!thumb) return "";
  if (!isDataUrl(thumb)) return thumb;
  const key = THUMB_KEY(seriesId);
  await chrome.storage.local.set({ [key]: thumb });
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

async function fileToDataURL(file){
  if (!file) return "";
  return await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function load() {
  const series = await AniStore.listSeries();
  state.raw = (series || []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  filterRender();
}

function filterRender() {
  const term = (els.search?.value || "").trim().toLowerCase();
  state.filtered = !term ? state.raw : state.raw.filter(s => s.title.toLowerCase().includes(term));
  renderList();
}

function renderList() {
  if (!els.seriesList || !tpl) return;
  els.seriesList.innerHTML = "";

  for (const s of state.filtered) {
    const node = tpl.content.cloneNode(true);

    const card       = node.querySelector(".card");
    const img        = node.querySelector(".thumb");
    const titleEl    = node.querySelector(".title");
    const delBtn     = node.querySelector(".delete-btn");
    const barFill    = node.querySelector(".fill");
    const label      = node.querySelector(".label");
    const detailBtn  = node.querySelector(".open-detail");
    const markNextBtn= node.querySelector(".mark-next");

    if (img) {
      img.src = "icons/icon128.png";
      resolveThumbSrc(s).then(src => { if (img && img.closest(".card")) img.src = src; });
      img.alt = s.title;
    }
    if (titleEl) titleEl.textContent = s.title;

    const pr = calcProgress(s);
    if (barFill) barFill.style.width = pr.pct + "%";
    if (label)   label.textContent   = `${pr.watched}/${pr.total} - ${pr.pct}%`;

    on(delBtn, "click", async () => {
      if (!confirm(`Delete "${s.title}"?`)) return;
      await AniStore.deleteSeries(s.id);
      await load();
    });

    on(detailBtn, "click", () => openDetail(s));

    on(markNextBtn, "click", async () => {
      const total = Number(s.total) || 0;
      if (!total) { alert("Please set total episodes first."); return; }

      let next = null;
      for (let i = 1; i <= total; i++) {
        if (!s.episodes?.[String(i)]?.watched) { next = i; break; }
      }
      if (next == null) { alert("All episodes are already marked."); return; }

      if (!s.episodes) s.episodes = {};
      s.episodes[String(next)] = { ...(s.episodes[String(next)]||{}), watched: true };
      s.updatedAt = Date.now();
      await AniStore.saveSeries(s);
      await load();
    });

    on(card, "mouseenter", () => AniStore.setLastSelected(s.id));

    els.seriesList.appendChild(node);
  }
}

function newSeriesDialog() {
  els.form?.reset?.();
  newSeriesThumbData = "";
  els.dlg?.showModal?.();
}

async function createSeriesFromForm() {
  if (!els.form) return false;
  const fd      = new FormData(els.form);
  const title   = String(fd.get("title") || "").trim();
  const totalStr= fd.get("total");
  const listStr = String(fd.get("list") || "").trim();

  if (!title) { alert("Title is required."); return false; }

  let total = 0;
  if (listStr) {
    const set = parseEpisodeList(listStr);
    if (!set.size) { alert("Custom list is not valid."); return false; }
    total = Math.max(...Array.from(set));
  } else {
    total = Number(totalStr || 0);
    if (!Number.isInteger(total) || total <= 0) {
      alert("Please enter total episodes or custom list."); return false;
    }
  }

  const series = {
    id: uid("sr"),
    title,
    total,
    episodes: {},
    thumb: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  series.thumb = await stashThumbIfNeeded(newSeriesThumbData, series.id);

  await AniStore.saveSeries(series);
  await AniStore.setLastSelected(series.id);
  newSeriesThumbData = "";
  return true;
}

on(els.nThumbPick, "click", () => els.nThumbFile?.click());
on(els.nThumbFile, "change", async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  newSeriesThumbData = await fileToDataURL(f);
});

function openDetail(series) {
  state.selected = structuredClone(series);
  if (els.dTitle)       els.dTitle.textContent = series.title;
  if (els.dInputTitle)  els.dInputTitle.value  = series.title;
  resolveThumbSrc(state.selected).then(src => { if (els.dThumb) els.dThumb.src = src; });
  renderEpisodeEditor(state.selected);
  els.detailDlg?.showModal?.();
}

function renderEpisodeEditor(series) {
  if (!els.episodes) return;

  const total = Number(series.total) || 0;
  if (total <= 0) {
    els.episodes.innerHTML = `<div class="muted">No episodes yet. Click "Add Episode".</div>`;
    return;
  }

  const per   = view.pageSize || 120;
  const pages = Math.max(1, Math.ceil(total / per));
  if (view.page > pages) view.page = pages;

  const start = (view.page - 1) * per + 1;
  const end   = Math.min(total, start + per - 1);

  const wrap = document.createElement("div");
  wrap.className = "episodes-wrap";

  const head = document.createElement("div");
  head.className = "ep-pager";
  head.innerHTML = `
    <div class="left">
      <button class="btn tiny" data-nav="prev" ${view.page<=1?"disabled":""}>←</button>
      <span class="muted">Page ${view.page} / ${pages}</span>
      <button class="btn tiny" data-nav="next" ${view.page>=pages?"disabled":""}>→</button>
    </div>
    <div class="right">
      <label class="mr8 muted">Mark up to Ep</label>
      <input type="number" class="ep-range" min="1" max="${total}" value="${end}">
      <button class="btn tiny" data-bulk="mark">Apply</button>
      <button class="btn tiny" data-bulk="unmark">Clear</button>
    </div>     
  `;
  wrap.appendChild(head);

  const grid = document.createElement("div");
  grid.className = "episodes-grid-inner";
  for (let n = start; n <= end; n++) {
    const card = document.createElement("div");
    card.className = "ep-card";
    card.innerHTML = `
      <div class="ep-left">Ep <b>${n}</b></div>
      <input type="checkbox" class="ep-check" data-ep="${n}" aria-label="Mark Ep ${n}">
    `;
    const check = card.querySelector(".ep-check");
    check.checked = !!series.episodes?.[String(n)]?.watched;

    card.addEventListener("click", (e) => {
      if (e.target === check) return;
      check.checked = !check.checked;
      onToggle(n, check.checked);
    });
    check.addEventListener("change", (e) => onToggle(n, e.target.checked));

    grid.appendChild(card);
  }
  wrap.appendChild(grid);

  els.episodes.innerHTML = "";
  els.episodes.appendChild(wrap);

  wrap.querySelectorAll("[data-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      const dir = btn.getAttribute("data-nav");
      if (dir === "prev" && view.page > 1) view.page--;
      if (dir === "next" && view.page < pages) view.page++;
      renderEpisodeEditor(series);
    });
  });

  const rangeInput = wrap.querySelector(".ep-range");
  wrap.querySelector("[data-bulk='mark']")?.addEventListener("click", () => {
    const to = Math.min(total, Math.max(1, Number(rangeInput.value || 1)));
    for (let i = 1; i <= to; i++) onToggle(i, true);
    renderEpisodeEditor(series);
  });
  wrap.querySelector("[data-bulk='unmark']")?.addEventListener("click", () => {
    const to = Math.min(total, Math.max(1, Number(rangeInput.value || 1)));
    for (let i = 1; i <= to; i++) onToggle(i, false);
    renderEpisodeEditor(series);
  });

  function onToggle(n, val) {
    if (!series.episodes) series.episodes = {};
    const key = String(n);
    if (val) {
      series.episodes[key] = series.episodes[key] || {};
      series.episodes[key].watched = true;
    } else {
      if (series.episodes[key]) {
        delete series.episodes[key].watched;
        if (!series.episodes[key].title && !series.episodes[key].url && !series.episodes[key].thumb) {
          delete series.episodes[key];
        }
      }
    }
    series.updatedAt = Date.now();
  }
}

on(els.dThumbPick, "click", () => els.dThumbFile?.click());
on(els.dThumbFile, "change", async (e) => {
  const f = e.target.files?.[0];
  if (!f || !state.selected) return;
  const dataUrl = await fileToDataURL(f);
  state.selected.thumb = dataUrl;
  if (els.dThumb) els.dThumb.src = dataUrl || "icons/icon128.png";
});

async function saveDetail() {
  if (!state.selected) return;
  state.selected.title = (els.dInputTitle?.value || "").trim() || state.selected.title;
  state.selected.thumb = await stashThumbIfNeeded(state.selected.thumb, state.selected.id);
  state.selected.updatedAt = Date.now();
  await AniStore.saveSeries(state.selected);
  await load();
}

on(els.addSeries, "click", newSeriesDialog);
on(els.nClose, "click", () => els.dlg?.close());
on(els.dClose, "click", () => els.detailDlg?.close());

on(els.dlg, "close", async () => {
  if (els.dlg.returnValue === "ok") {
    const ok = await createSeriesFromForm();
    if (ok) await load();
  }
});

on(els.search, "input", filterRender);
on(els.openOptions, "click", openOptions);

on(els.detailDlg, "close", async () => {
  if (els.detailDlg.returnValue === "ok") {
    await saveDetail();
  }
});

on(els.dGenOpen, "click", () => {
  if (!state.selected) return;
  if (els.gTotal) els.gTotal.value = "";
  if (els.gList)  els.gList.value  = "";
  els.genDlg?.showModal?.();
});
on(els.gClose, "click", () => els.genDlg?.close());

const presetChips = els.genForm?.querySelectorAll(".chip[data-preset]") || [];
presetChips.forEach((b) => {
  on(b, "click", () => {
    presetChips.forEach((x) => x.classList.remove("is-active"));
    b.classList.add("is-active");
    if (els.gTotal) els.gTotal.value = b.dataset.preset || "";
    if (els.gList)  els.gList.value  = "";
  });
});
on(els.gTotal, "input", () => presetChips.forEach(x => x.classList.remove("is-active")));
on(els.gList,  "input", () => presetChips.forEach(x => x.classList.remove("is-active")));

on(els.genDlg, "close", async () => {
  if (els.genDlg.returnValue !== "ok" || !state.selected) return;
  const listTxt = (els.gList?.value || "").trim();
  const totalNum= Number(els.gTotal?.value || 0);

  if (listTxt) {
    const set = parseEpisodeList(listTxt);
    if (!set.size) { alert("Custom list is not valid."); return; }
    const maxN = Math.max(...Array.from(set));
    state.selected.total = Math.max(maxN, Number(state.selected.total) || 0);
  } else if (Number.isInteger(totalNum) && totalNum > 0) {
    state.selected.total = totalNum;
  } else {
    alert("Please enter Total or Custom list first.");
    return;
  }

  state.selected.updatedAt = Date.now();
  await AniStore.saveSeries(state.selected);
  renderEpisodeEditor(state.selected);
  await load();
});

load();