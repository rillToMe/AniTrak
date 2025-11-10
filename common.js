const AniStore = {
  async _getAll() {
    const { anitrack } = await chrome.storage.sync.get({
      anitrack: { series: [], lastSelectedSeriesId: null }
    });
    if (!anitrack.series) anitrack.series = [];
    return anitrack;
  },
  async _setAll(obj) { await chrome.storage.sync.set({ anitrack: obj }); },

  async listSeries() { return (await this._getAll()).series; },
  async getSeries(id) { return (await this._getAll()).series.find(s => s.id === id) || null; },

  async saveSeries(seriesObj) {
    const db = await this._getAll();
    const i  = db.series.findIndex(s => s.id === seriesObj.id);
    seriesObj.updatedAt = Date.now();
    if (i >= 0) db.series[i] = seriesObj; else db.series.push(seriesObj);
    await this._setAll(db);
  },

  async deleteSeries(id) {
    const db = await this._getAll();
    db.series = db.series.filter(s => s.id !== id);
    await this._setAll(db);
  },

  async setLastSelected(id) {
    const db = await this._getAll();
    db.lastSelectedSeriesId = id;
    await this._setAll(db);
  },
  async getLastSelected() {
    return (await this._getAll()).lastSelectedSeriesId || null;
  },

  async importJson(obj) {
    if (!obj || typeof obj !== "object" || !Array.isArray(obj.series)) {
      throw new Error("Invalid import format");
    }
    await this._setAll({
      series: obj.series,
      lastSelectedSeriesId: obj.lastSelectedSeriesId || null
    });
  },
  async exportJson() { return await this._getAll(); }
};

function uid(prefix = "sr") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

function parseEpisodeList(input) {
  const out = new Set();
  const s = String(input || "").trim();
  if (!s) return out;
  for (const p of s.split(",").map(x => x.trim()).filter(Boolean)) {
    if (/^\d+$/.test(p)) out.add(Number(p));
    else if (/^\d+\s*-\s*\d+$/.test(p)) {
      let [a,b] = p.split("-").map(n=>Number(n.trim()));
      const start = Math.min(a,b), end = Math.max(a,b);
      for (let i=start;i<=end;i++) out.add(i);
    }
  }
  return new Set([...out].sort((a,b)=>a-b));
}

function getTotalSafe(series) {
  if (Number.isInteger(series.total) && series.total > 0) return series.total;
  const keys = Object.keys(series.episodes || {});
  const maxKey = keys.length ? Math.max(...keys.map(k => Number(k) || 0)) : 0;
  return maxKey;
}

function calcProgress(series) {
  const total   = getTotalSafe(series);
  const watched = series.episodes
    ? Object.values(series.episodes).filter(e => e && e.watched === true).length
    : 0;
  const pct = total ? Math.round((watched * 100) / total) : 0;
  return { total, watched, pct };
}

function openOptions() {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage(() => {
      if (chrome.runtime.lastError) {
        const url = chrome.runtime.getURL("options.html");
        chrome.tabs?.create({ url }) ?? window.open(url, "_blank");
      }
    });
  } else {
    const url = chrome.runtime.getURL("options.html");
    chrome.tabs?.create({ url }) ?? window.open(url, "_blank");
  }
}

export { AniStore, uid, parseEpisodeList, calcProgress, openOptions };