const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.standards.govt.nz';
const LIST_FILE = 'List-of-Building-Related-Sponsored-Standards-18122024.md';

async function run() {
    const filePath = path.join(__dirname, LIST_FILE);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const standardsToSearch = [];

    // Parse the markdown tables
    // Regex to match | Index | Standard Number | Description |
    const rowRegex = /^\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/;

    for (let line of lines) {
        const match = line.match(rowRegex);
        if (match) {
            const id = match[1];
            const number = match[2].trim();
            const description = match[3].trim();
            
            // Skip header if it matched (though \d+ should prevent that)
            if (isNaN(id)) continue;

            standardsToSearch.push({ number, description });
        }
    }

    console.log(`Extracted ${standardsToSearch.length} standards from the list.`);

    const finalResults = [];

    for (let i = 0; i < standardsToSearch.length; i++) {
        const item = standardsToSearch[i];
        console.log(`[${i + 1}/${standardsToSearch.length}] Searching for: ${item.number}`);

        // Construct search URL
        // We use the standard number as the search query
        const searchUrl = `${BASE_URL}/search/doSearch?Search=${encodeURIComponent(item.number)}&filterby=standards&Status[]=Current&Status[]=Superseded`;

        try {
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const searchResults = $('.search-result__product');

            let bestMatch = null;

            searchResults.each((idx, el) => {
                const title = $(el).find('.search-result__product-header').text().trim();
                const priceText = $(el).find('.search-result__product-price').text().trim();
                const relativeLink = $(el).find('a').attr('href');
                const info = $(el).find('.search-result__description').text().trim() || 
                             $(el).find('.search-result__product-description').text().trim();

                // If the title contains the standard number, it's likely a match
                // We prefer "Sponsored" results
                if (title.toLowerCase().includes(item.number.toLowerCase().split(':')[0])) {
                    if (!bestMatch || priceText.includes('Sponsored')) {
                        bestMatch = {
                            title,
                            link: relativeLink ? BASE_URL + relativeLink : '',
                            info,
                            sponsored: priceText.includes('Sponsored')
                        };
                    }
                }
            });

            if (bestMatch && bestMatch.link) {
                console.log(`   Found match: ${bestMatch.title}`);
                
                let abstract = '';
                let downloadUrl = '';
                let supersededInfo = null;

                // Fetch the product page to get the download link and abstract
                try {
                    const productResponse = await axios.get(bestMatch.link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    const $product = cheerio.load(productResponse.data);
                    
                    // Extract abstract
                    abstract = $product('.product__abstract').text().trim();
                    
                    // Extract download link
                    const downloadBtn = $product('.product-variation__button--download');
                    const downloadLink = downloadBtn.attr('href');
                    downloadUrl = downloadLink ? BASE_URL + downloadLink : '';
                    
                    if (downloadUrl) {
                        console.log(`   Download Link Found!`);
                    }

                    // Check for superseded link
                    const initialSupersededLink = $product('.product__superseded-by-link').attr('href');
                    if (initialSupersededLink) {
                        const supersededUrl = BASE_URL + initialSupersededLink;
                        
                        // Recursive function to follow superseded links
                        const fetchRecursive = async (url, depth = 0) => {
                            if (depth > 5) return null;
                            console.log(`   [Depth ${depth}] Following replacement: ${url}`);
                            try {
                                const sRes = await axios.get(url, {
                                    headers: { 'User-Agent': 'Mozilla/5.0' }
                                });
                                const $s = cheerio.load(sRes.data);
                                const sTitle = $s('.product__title').text().trim() || $s('h1').text().trim();
                                const sStatus = $s('.product__state').text().trim();
                                const sDownloadLink = $s('.product-variation__button--download').attr('href');
                                const nextLink = $s('.product__superseded-by-link').attr('href');

                                const currentInfo = {
                                    title: sTitle,
                                    link: url,
                                    downloadUrl: sDownloadLink ? BASE_URL + sDownloadLink : '',
                                    status: sStatus
                                };

                                if (nextLink && sStatus !== 'Current') {
                                    const nextInfo = await fetchRecursive(BASE_URL + nextLink, depth + 1);
                                    return nextInfo || currentInfo;
                                }
                                return currentInfo;
                            } catch (e) {
                                console.error(`   Error at depth ${depth}: ${e.message}`);
                                return null;
                            }
                        };

                        supersededInfo = await fetchRecursive(supersededUrl);
                        if (supersededInfo) {
                            console.log(`   Final replacement reached: ${supersededInfo.title} (${supersededInfo.status})`);
                        }
                    }
                } catch (prodError) {
                    console.error(`   Error fetching product page: ${prodError.message}`);
                }

                finalResults.push({
                    originalNumber: item.number,
                    originalDescription: item.description,
                    foundTitle: bestMatch.title,
                    link: bestMatch.link,
                    downloadUrl: downloadUrl,
                    abstract: abstract,
                    supersededInfo: supersededInfo,
                    isSponsored: bestMatch.sponsored
                });
            } else {
                console.log(`   No direct match found for ${item.number}`);
                finalResults.push({
                    originalNumber: item.number,
                    originalDescription: item.description,
                    foundTitle: 'NOT FOUND',
                    link: '',
                    downloadUrl: '',
                    abstract: '',
                    supersededBy: '',
                    isSponsored: false
                });
            }

            // Delay to respect the site
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`   Error searching for ${item.number}: ${error.message}`);
        }
    }

    // Save results
    fs.writeFileSync('sponsored-links.json', JSON.stringify(finalResults, null, 2));
    
    const csv = [
        'Standard Number,Description,Found Title,Link,Download Link,Replacement Title,Replacement Download,Abstract,Is Sponsored',
        ...finalResults.map(r => {
            const cleanTitle = r.foundTitle.replace(/\s+/g, ' ').trim();
            const cleanAbstract = r.abstract.replace(/\s+/g, ' ').trim();
            const replacementTitle = r.supersededInfo ? r.supersededInfo.title : '';
            const replacementDownload = r.supersededInfo ? r.supersededInfo.downloadUrl : '';
            return `"${r.originalNumber.replace(/"/g, '""')}","${r.originalDescription.replace(/"/g, '""')}","${cleanTitle.replace(/"/g, '""')}","${r.link}","${r.downloadUrl}","${replacementTitle.replace(/"/g, '""')}","${replacementDownload}","${cleanAbstract.replace(/"/g, '""')}","${r.isSponsored}"`;
        })
    ].join('\n');

    fs.writeFileSync('sponsored-links.csv', csv);
    console.log(`\nDone! Saved ${finalResults.length} results to sponsored-links.csv`);
}

run().catch(console.error);
