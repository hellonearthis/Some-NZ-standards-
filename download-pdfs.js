const axios = require('axios');
const fs = require('fs');
const path = require('path');

const JSON_FILE = 'sponsored-links.json';
const DOWNLOAD_DIR = 'standards';

async function downloadFile(url, destPath) {
    const writer = fs.createWriteStream(destPath);

    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

function sanitizeFilename(name) {
    // Remove invalid characters for Windows filenames
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function run() {
    if (!fs.existsSync(DOWNLOAD_DIR)) {
        fs.mkdirSync(DOWNLOAD_DIR);
    }

    if (!fs.existsSync(JSON_FILE)) {
        console.error("JSON file not found.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    
    // Create a unique set of downloads based on the URL
    const downloadMap = new Map();
    
    data.forEach(item => {
        if (item.downloadUrl && item.downloadUrl !== 'NOT FOUND') {
            // Use standardTitle for the filename to ensure it's the latest version's name
            const cleanName = (item.standardTitle || item.originalNumber).split('\n')[0].trim();
            downloadMap.set(item.downloadUrl, {
                url: item.downloadUrl,
                name: cleanName,
                title: item.standardTitle
            });
        }
    });

    const allItems = Array.from(downloadMap.values());

    console.log(`Checking ${allItems.length} potential PDFs...`);

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const filename = sanitizeFilename(item.name) + '.pdf';
        const destPath = path.join(DOWNLOAD_DIR, filename);

        if (fs.existsSync(destPath)) {
            console.log(`[${i + 1}/${allItems.length}] Skipping: ${filename} (Already exists)`);
            continue;
        }

        console.log(`[${i + 1}/${allItems.length}] Downloading: ${filename} (${item.title})`);

        try {
            await downloadFile(item.url, destPath);
            console.log(`   Success: Saved to ${destPath}`);
        } catch (error) {
            console.error(`   Error downloading ${filename}: ${error.message}`);
        }

        // Wait 3 seconds between downloads to be polite
        console.log(`   Waiting 3 seconds...`);
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log('\nAll downloads completed!');
}

run().catch(console.error);
