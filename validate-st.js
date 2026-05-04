const fs = require('fs');
const path = require('path');

const ST_FILE = 'st.txt';
const STANDARDS_DIR = 'standards';

function validate() {
    if (!fs.existsSync(ST_FILE)) {
        console.error(`Error: ${ST_FILE} not found.`);
        return;
    }
    if (!fs.existsSync(STANDARDS_DIR)) {
        console.error(`Error: ${STANDARDS_DIR} directory not found.`);
        return;
    }

    const stData = JSON.parse(fs.readFileSync(ST_FILE, 'utf8'));
    const existingFiles = new Set(fs.readdirSync(STANDARDS_DIR));
    
    let totalFiles = 0;
    let missingFiles = [];
    let matchedFiles = new Set();

    console.log('--- Validation Report ---');

    for (const [category, files] of Object.entries(stData)) {
        files.forEach(fileWithSuffix => {
            totalFiles++;
            const fileName = fileWithSuffix.replace(' [PDF]', '');
            
            if (existingFiles.has(fileName)) {
                matchedFiles.add(fileName);
            } else {
                missingFiles.push({ category, file: fileName });
            }
        });
    }

    if (missingFiles.length === 0) {
        console.log(`Success: All ${totalFiles} files listed in ${ST_FILE} exist in ${STANDARDS_DIR}/.`);
    } else {
        console.log(`Found ${missingFiles.length} missing files out of ${totalFiles} listed:`);
        missingFiles.forEach(m => {
            console.log(`[MISSING] ${m.file} (Category: ${m.category})`);
        });
    }

    const extraFiles = Array.from(existingFiles).filter(f => !matchedFiles.has(f) && f.endsWith('.pdf'));
    if (extraFiles.length > 0) {
        console.log(`\nFound ${extraFiles.length} extra PDF files in ${STANDARDS_DIR}/ not listed in ${ST_FILE}:`);
        extraFiles.forEach(f => {
            console.log(`[EXTRA] ${f}`);
        });
    }
}

validate();
