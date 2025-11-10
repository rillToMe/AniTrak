
# 🧩 AniTrack - Changelog

## Version 1.0.0 - November 10, 2025

### ✨ New Features
- **Series Tracking System:**  
  Add, edit, and mark progress for anime episodes with a clean and intuitive UI.  
  Episodes can now reach *thousands*, optimized for lightweight storage.

- **Thumbnail Management:**  
  Upload and store custom cover images safely in `chrome.storage.local` to avoid sync quota issues.

- **Dark Neon Theme:**  
  Reworked popup and settings panel with a unified neon-dark theme, consistent across all views.

- **Settings Panel (Options Page):**  
  - Import / Export progress in JSON format.  
  - Quick edit series metadata (title, thumbnail, total episodes).  
  - Compact sidebar navigation for better layout and usability.

- **Performance Optimization:**  
  Large episode counts handled efficiently without lag or memory issues.

### 🧰 Improvements
- Simplified add-series dialog (auto episode generation).  
- Cleaner episode grid layout with 2–3 columns per row.  
- Custom episode range parser supports formats like `1-12,24,100-110`.  
- Removed unnecessary “Add from tab” logic for better clarity.  
- More reliable thumbnail rendering using local fetch logic.

### 🪄 Developer Notes
- Codebase refactored into modular ES modules (`popup.js`, `options.js`, `common.js`).  
- Uses `chrome.storage.sync` + `chrome.storage.local` hybrid strategy for stable data sync.  
- Prepared for GitHub distribution (without Chrome Web Store).

### 🐞 Bug Fixes
- Fixed missing CSS in the generator dialog.  
- Fixed “next episode” marking not updating progress bar.  
- Fixed thumbnails not rendering properly in settings view.  
- Fixed detail dialog not refreshing after edits.  
- Fixed incorrect mapping for local image pointers.

---

### 🧠 Upcoming (v1.1.0 roadmap)
- Bulk import/export by CSV.  
- Optional auto-sync with external sites (like MyAnimeList).  
- Theme selector (Neon, Midnight, and Aurora).  
- Support for season/subtitle tags.

---

© 2025 Aether Studio  
Developed by Rahmat Aditya (DitDev).
