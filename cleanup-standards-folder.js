const fs = require('fs');
const path = require('path');

const JSON_FILE = 'sponsored-links.json';
const DOWNLOAD_DIR = 'standards';

function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

function cleanup() {
    if (!fs.existsSync(JSON_FILE) || !fs.existsSync(DOWNLOAD_DIR)) {
        console.error("Required files or directories missing.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    
    // Build a set of valid filenames based on the latest versions in our JSON
    const validFilenames = new Set();
    data.forEach(item => {
        if (item.downloadUrl && item.downloadUrl !== 'NOT FOUND') {
            const cleanName = (item.standardTitle || item.originalNumber).split('\n')[0].trim();
            const filename = sanitizeFilename(cleanName) + '.pdf';
            validFilenames.add(filename);
        }
    });

    console.log(`Identified ${validFilenames.size} valid "Latest" filenames.`);

    const files = fs.readdirSync(DOWNLOAD_DIR);
    let deletedCount = 0;
    let brokenCount = 0;

    files.forEach(file => {
        const filePath = path.join(DOWNLOAD_DIR, file);
        const stats = fs.statSync(filePath);

        // 1. Delete if it's not in our valid latest list
        if (!validFilenames.has(file)) {
            console.log(`Deleting old/duplicate version: ${file}`);
            fs.unlinkSync(filePath);
            deletedCount++;
        } 
        // 2. Delete if it's a "broken" download (e.g., 155 bytes)
        else if (stats.size < 500) {
            console.log(`Deleting broken download (too small): ${file}`);
            fs.unlinkSync(filePath);
            brokenCount++;
        }
    });

    console.log(`\nCleanup complete!`);
    console.log(`Deleted ${deletedCount} old/duplicate files.`);
    console.log(`Deleted ${brokenCount} broken download files.`);
    console.log(`Remaining valid files: ${fs.readdirSync(DOWNLOAD_DIR).length}`);
    console.log(`\nRecommendation: Run 'node download-pdfs.js' to fill in the missing latest versions.`);
}

cleanup();
