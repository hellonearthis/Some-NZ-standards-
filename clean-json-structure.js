const fs = require('fs');

const JSON_FILE = 'sponsored-links.json';

function cleanData() {
    if (!fs.existsSync(JSON_FILE)) return;
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));

    const cleanedData = data.map(item => {
        let title = '';
        let status = '';

        if (item.foundTitle) {
            const parts = item.foundTitle.split('\n');
            title = parts[0].trim();
            status = parts.length > 1 ? parts[parts.length - 1].trim() : 'Current';
        }

        // Hoisting logic: If superseded but we have a CURRENT replacement, use replacement info
        if (status === 'Superseded' && item.supersededInfo && 
            (item.supersededInfo.status === 'Current' || item.supersededInfo.status === 'CurrentSponsored')) {
            
            // Try to extract a clean standard number from the replacement link slug
            let replacementCode = '';
            if (item.supersededInfo.link) {
                const slug = item.supersededInfo.link.split('/').pop(); // e.g. NZS-1170-52004-EXCLUDES-AMDT-1
                // Look for 4 digits (year starting with 19 or 20) and add a colon
                let code = slug.replace(/((?:19|20)\d{2})/, ':$1');
                // Restore decimal points (e.g., 1170-5 -> 1170.5)
                code = code.replace(/(\d+)-(\d+)/g, '$1.$2');
                // Clean up hyphens and trailing colons if any
                replacementCode = code.replace(/-/g, ' ').replace(/: /g, ':');
            }
            
            title = (replacementCode || item.supersededInfo.title);
            status = 'Current';
            item.isCurrentOverride = true; 
        }

        return {
            ...item,
            standardTitle: title,
            status: status
        };
    });

    fs.writeFileSync(JSON_FILE, JSON.stringify(cleanedData, null, 2));
    console.log("JSON structure cleaned. Added 'standardTitle' and 'status' fields.");
}

cleanData();
