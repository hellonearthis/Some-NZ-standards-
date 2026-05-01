const fs = require('fs');
const path = require('path');

const JSON_FILE = 'sponsored-links.json';
const DOWNLOAD_DIR = 'standards';

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function run() {
    if (!fs.existsSync(JSON_FILE)) return;
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

    // Map of download URL to proper name
    const urlToName = new Map();
    data.forEach(item => {
        if (item.downloadUrl) {
            urlToName.set(item.downloadUrl, sanitizeFilename(item.originalNumber) + '.pdf');
        }
        if (item.supersededInfo && item.supersededInfo.downloadUrl) {
            const slug = item.supersededInfo.link.split('/').pop();
            urlToName.set(item.supersededInfo.downloadUrl, sanitizeFilename(slug) + '.pdf');
        }
    });

    const files = fs.readdirSync(DOWNLOAD_DIR);
    console.log(`Processing ${files.length} files in ${DOWNLOAD_DIR}...`);

    // We don't easily know which file came from which URL unless we re-run the downloader
    // or if we match by the "wrong" name.
    
    // Safer approach: Just re-run the downloader. It will see the files don't exist with the NEW names
    // and download them. Then the user can manually delete the old ones or I can delete all .pdf files first.

    console.log("Renaming existing files is tricky without metadata mapping.");
    console.log("Recommendation: Delete the 'standards' folder and re-run 'node download-pdfs.js'.");
    console.log("It will download everything with the correct names.");
}

run();
