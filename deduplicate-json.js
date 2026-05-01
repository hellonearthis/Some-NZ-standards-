const fs = require('fs');

const JSON_FILE = 'sponsored-links.json';

function deduplicate() {
    if (!fs.existsSync(JSON_FILE)) {
        console.error(`File not found: ${JSON_FILE}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`Starting with ${data.length} entries.`);

    const merged = new Map();

    data.forEach(item => {
        // Skip entries that weren't found
        if (item.foundTitle === 'NOT FOUND' || (!item.link && !item.supersededInfo)) {
            const key = `NOT_FOUND_${item.originalNumber}`;
            merged.set(key, item);
            return;
        }

        // Determine the "target" link (hoist if superseded)
        let targetLink = item.link;
        let targetDownload = item.downloadUrl;
        if (item.status === 'Current' && item.isCurrentOverride && item.supersededInfo) {
            targetLink = item.supersededInfo.link || item.link;
            targetDownload = item.supersededInfo.downloadUrl || item.downloadUrl;
        }

        const key = targetLink;

        if (!merged.has(key)) {
            merged.set(key, { 
                ...item, 
                link: targetLink, 
                downloadUrl: targetDownload,
                replaces: [] 
            });
        } else {
            const existing = merged.get(key);
            
            // Determine which entry is the "primary"
            // The primary is the one where originalNumber is the modern version (matches standardTitle)
            const cleanTitle = existing.standardTitle.toLowerCase().trim();
            const itemIsPrimary = item.originalNumber.toLowerCase().trim() === cleanTitle;
            const existingIsPrimary = existing.originalNumber.toLowerCase().trim() === cleanTitle;

            let primary, alias;
            if (itemIsPrimary && !existingIsPrimary) {
                primary = item;
                alias = existing;
            } else {
                primary = existing;
                alias = item;
            }

            // Merge replaces list
            const replaces = new Set(primary.replaces || []);
            if (alias.originalNumber !== primary.originalNumber) {
                replaces.add(alias.originalNumber);
            }
            if (alias.replaces) {
                alias.replaces.forEach(r => replaces.add(r));
            }

            // Merge tags
            const tags = new Set([...(primary.tags || []), ...(alias.tags || [])]);

            // Update Map
            merged.set(key, {
                ...primary,
                link: targetLink,
                downloadUrl: targetDownload,
                replaces: Array.from(replaces),
                tags: Array.from(tags),
                originalDescription: (primary.originalDescription.length >= alias.originalDescription.length) 
                    ? primary.originalDescription 
                    : alias.originalDescription
            });
        }
    });

    const finalData = Array.from(merged.values());
    fs.writeFileSync(JSON_FILE, JSON.stringify(finalData, null, 2));

    console.log(`Deduplication complete.`);
    console.log(`Merged ${data.length} entries down to ${finalData.length}.`);
    
    // Summary of duplicates found
    const duplicates = finalData.filter(d => d.replaces && d.replaces.length > 0);
    console.log(`Found ${duplicates.length} standards with multiple historical versions.`);
    duplicates.slice(0, 5).forEach(d => {
        console.log(` - ${d.standardTitle} (Replaces: ${d.replaces.join(', ')})`);
    });
}

deduplicate();
