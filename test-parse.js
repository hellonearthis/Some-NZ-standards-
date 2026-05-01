const fs = require('fs');
const path = require('path');

const LIST_FILE = 'List-of-Building-Related-Sponsored-Standards-18122024.md';
const content = fs.readFileSync(LIST_FILE, 'utf8');
const lines = content.split('\n');

const rowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;

let found = false;
for (let line of lines) {
    if (line.includes('4203')) {
        console.log("LINE:", line);
        const match = line.match(rowRegex);
        if (match) {
            console.log("MATCHED:", match[2]);
        } else {
            console.log("FAILED TO MATCH REGEX");
        }
        found = true;
    }
}
if (!found) console.log("4203 NOT FOUND IN FILE");
