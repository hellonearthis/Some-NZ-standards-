const fs = require('fs');

const mainData = JSON.parse(fs.readFileSync('sponsored-links.json', 'utf8'));
const structuredData = JSON.parse(fs.readFileSync('structured standards.json', 'utf8')).NZ_Standards;

// Map to help find standard by title or number
const findStandard = (filename) => {
    // Normalize filename: remove .pdf, replace _ with : or space
    const base = filename.replace('.pdf', '');
    const normalized = base.replace(/_/g, ':').toLowerCase();
    const normalizedSpace = base.replace(/_/g, ' ').toLowerCase();
    
    return mainData.find(item => {
        const itemNumber = item.originalNumber.toLowerCase();
        const itemTitle = item.standardTitle ? item.standardTitle.toLowerCase() : '';
        const itemSafeTitle = (item.standardTitle || item.originalNumber).replace(/[\/\\?%*:|"<>]/g, '-').toLowerCase();
        
        return itemNumber.includes(normalized) || 
               normalized.includes(itemNumber) || 
               itemTitle.includes(normalizedSpace) ||
               itemSafeTitle === base.toLowerCase();
    });
};

const finalData = mainData.map(item => ({ ...item, categories: [] }));

for (const [category, files] of Object.entries(structuredData)) {
    files.forEach(file => {
        const item = findStandard(file);
        if (item) {
            const finalItem = finalData.find(fi => fi.originalNumber === item.originalNumber);
            if (finalItem && !finalItem.categories.includes(category)) {
                finalItem.categories.push(category);
            }
        }
    });
}

fs.writeFileSync('final-standards.json', JSON.stringify(finalData, null, 2));
console.log('Successfully created final-standards.json with categories');
