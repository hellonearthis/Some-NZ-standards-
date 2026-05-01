const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.standards.govt.nz';
const JSON_FILE = 'sponsored-links.json';

async function run() {
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const notFound = data.filter(item => item.foundTitle === 'NOT FOUND');

    console.log(`Found ${notFound.length} items to fix.`);

    for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.foundTitle !== 'NOT FOUND') continue;

        // Try searching for the prefix (e.g., NZS 3605)
        const prefix = item.originalNumber.split(':')[0].trim();
        console.log(`\nAttempting to fix: ${item.originalNumber} (Searching for: ${prefix})`);

        const searchUrl = `${BASE_URL}/search/doSearch?Search=${encodeURIComponent(prefix)}&filterby=standards`;

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

                // If it's a sponsored current version, it's likely the right one
                if (title.toLowerCase().includes(prefix.toLowerCase())) {
                    if (!bestMatch || priceText.includes('Sponsored')) {
                        bestMatch = {
                            title,
                            link: relativeLink ? BASE_URL + relativeLink : '',
                            sponsored: priceText.includes('Sponsored')
                        };
                    }
                }
            });

            if (bestMatch && bestMatch.link) {
                console.log(`   Found potential match: ${bestMatch.title}`);
                
                // Fetch metadata
                try {
                    const productResponse = await axios.get(bestMatch.link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    const $product = cheerio.load(productResponse.data);
                    
                    const abstract = $product('.product__abstract').text().trim();
                    const downloadBtn = $product('.product-variation__button--download');
                    const downloadLink = downloadBtn.attr('href');
                    
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

                    // Update the item
                    item.foundTitle = bestMatch.title;
                    item.link = bestMatch.link;
                    item.downloadUrl = downloadLink ? BASE_URL + downloadLink : '';
                    item.abstract = abstract;
                    item.supersededInfo = supersededInfo;
                    item.isSponsored = bestMatch.sponsored;

                    console.log(`   Fix applied!`);
                } catch (e) {
                    console.error(`   Error fetching metadata: ${e.message}`);
                }
            } else {
                console.log(`   No suitable match found for ${prefix}`);
            }

            // Small delay
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`   Error searching for ${prefix}: ${error.message}`);
        }
    }

    // Save back to JSON
    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
    console.log(`\nFinished fixing entries.`);
}

run().catch(console.error);
