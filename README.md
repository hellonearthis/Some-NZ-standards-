# Building Standards Explorer

A professional dashboard and automation suite for navigating, tracking, and downloading sponsored New Zealand Building Standards.

**Official Source:** [Standards New Zealand - Building-related sponsored standards](https://www.standards.govt.nz/sponsored-standards/building-related-sponsored-standards/)

**Current Database:** The list of currently available and tracked documents is maintained in `sponsored-links.json`.

## 🚀 Recommended Workflow

To refresh the entire library from scratch or update existing data, follow this order:

### 1. Data Extraction & Discovery
`node scrape-from-list.js`
- **What it does:** Reads the official markdown list of 134 sponsored standards.
- **Why run it:** It discovers the latest "Superseded by" chains recursively until it finds the final **Current** version for every document.
- **Output:** Updates `sponsored-links.json`.

### 2. Data Sanitization (Hoisting)
`node clean-json-structure.js`
- **What it does:** Normalizes the raw scraped data into structured `standardTitle` and `status` fields.
- **Why run it:** It performs "Hoisting"—if a standard is superseded but we have the update, it automatically sets the title to the latest version (e.g., `NZS 4512:1981` -> `NZS 4512:2021`) and marks it as **Current**.

### 3. Thematic Classification
`node generate-tags.js`
- **What it does:** Uses official SNZ numeric ranges (e.g., 3600-3699 for Timber) and keyword detection to categorize standards.
- **Why run it:** Populates the `tags` field in the JSON for the sidebar filtering system.

### 4. Data Deduplication
`node deduplicate-json.js`
- **What it does:** Merges redundant entries where both an old and new version of a standard were discovered.
- **Why run it:** Ensures your library only contains the **Latest** version of each document, while keeping old numbers as searchable "aliases".

### 5. Automated PDF Downloads
`node download-pdfs.js`
- **What it does:** Downloads the latest PDFs into the `standards/` folder using clean, human-readable filenames.
- **Why run it:** Ensures your local library is offline-ready and only contains the most modern versions.

---

## 🛠️ Utility Scripts

| Script | Purpose |
| :--- | :--- |
| `scrape-sponsored.js` | Generic scraper for searching the Standards NZ shop for new items. |
| `fix-not-found.js` | Retries searching for items that were previously marked as "NOT FOUND". |
| `test-parse.js` | Diagnostic tool for testing markdown regex patterns. |

---

## 💻 Running the Dashboard

To view the interactive Explorer, simply serve the project directory:

```bash
npx serve .
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

### Key Features:
- **Latest Only Toggle**: Automatically hides historical documents if a modern replacement is in your library.
- **Recursive Tracking**: Shows "Current (Update Found)" for documents that have been successfully traced to a newer version.
- **Scrollable Categories**: Navigate through dozens of trade-specific tags in the sidebar.
- **Direct Links**: Click any card title to jump to the official Standards NZ product page.

---

## 📁 Project Structure

- `standards/`: Local repository for downloaded PDF documents.
- `sponsored-links.json`: The core database for the application.
- `app.js` / `style.css` / `index.html`: The frontend dashboard.
- `*.js`: Backend automation and data processing scripts.
