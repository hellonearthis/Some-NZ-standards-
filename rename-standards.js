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

    let renameCount = 0;

    data.forEach(item => {
        if (item.supersededInfo && item.supersededInfo.downloadUrl) {
            // Old name logic
            const oldName = sanitizeFilename(item.supersededInfo.title.split(' ')[0] + '_UPDATED') + '.pdf';
            const oldPath = path.join(DOWNLOAD_DIR, oldName);

            // New name logic
            const slug = item.supersededInfo.link.split('/').pop();
            const newName = sanitizeFilename(slug) + '.pdf';
            const newPath = path.join(DOWNLOAD_DIR, newName);

            if (fs.existsSync(oldPath)) {
                console.log(`Renaming: ${oldName} -> ${newName}`);
                try {
                    fs.renameSync(oldPath, newPath);
                    renameCount++;
                } catch (e) {
                    console.error(`   Error renaming ${oldName}: ${e.message}`);
                }
            }
        }
    });

    console.log(`\nFinished! Renamed ${renameCount} files.`);
}

run();
