const fs = require('fs');

const mainData = JSON.parse(fs.readFileSync('sponsored-links.json', 'utf8'));
const structuredData = JSON.parse(fs.readFileSync('st.txt', 'utf8'));

// Map to help find standard by title or number
const findStandard = (filename) => {
    // Normalize filename: remove [PDF], remove .pdf
    const base = filename.replace(' [PDF]', '').replace('.pdf', '').toLowerCase();
    const cleanBase = base.replace(/[^a-z0-9]/g, '');
    
    return mainData.find(item => {
        const itemNumber = item.originalNumber.toLowerCase();
        const cleanNumber = itemNumber.replace(/[^a-z0-9]/g, '');
        
        const itemTitle = item.standardTitle ? item.standardTitle.toLowerCase() : '';
        const cleanTitle = itemTitle.replace(/[^a-z0-9]/g, '');

        // Check link slug
        const linkParts = item.link.split('/');
        const slug = linkParts[linkParts.length - 1].toLowerCase();
        const cleanSlug = slug.replace(/[^a-z0-9]/g, '');
        
        return cleanNumber === cleanBase || 
               cleanBase.includes(cleanNumber) || 
               cleanNumber.includes(cleanBase) ||
               cleanTitle.includes(cleanBase) ||
               cleanSlug === cleanBase ||
               cleanSlug.includes(cleanBase) ||
               cleanBase.includes(cleanSlug);
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
