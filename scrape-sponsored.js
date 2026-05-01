const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const BASE_URL = 'https://www.standards.govt.nz';

async function scrapeSponsored() {
    let start = 0;
    const pageSize = 100; // Increased page size for efficiency
    const results = [];

    while (true) {
        const url = `${BASE_URL}/search/doSearch?Search=*&start=${start}&pageSize=${pageSize}&filterby=standards&Status[]=Current&ICSCode=*`;

        console.log(`Fetching ${url}`);

        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);
            const items = $('.search-result');

            if (items.length === 0) {
                console.log('No more results found.');
                break;
            }

            let foundOnPage = 0;

            items.each((i, el) => {
                const priceElement = $(el).find('.search-result__product-price');
                const priceText = priceElement.text().trim();

                if (priceText.includes('Sponsored')) {
                    foundOnPage++;

                    const title = $(el)
                        .find('.search-result__title')
                        .text()
                        .trim();

                    const relativeLink = $(el)
                        .find('a')
                        .attr('href');

                    const link = relativeLink
                        ? BASE_URL + relativeLink
                        : '';

                    const info = $(el)
                        .find('.search-result__description')
                        .text()
                        .trim();

                    results.push({
                        title,
                        link,
                        info
                    });
                }
            });

            console.log(`Page starting at ${start}: Found ${items.length} total items, ${foundOnPage} sponsored`);

            start += pageSize;

            // Optional: If we find 0 items for several pages, we might be at the end.
            // But usually items.length === 0 is the indicator.
            
            await new Promise(r => setTimeout(r, 1000));

        } catch (error) {
            console.error(`Error fetching ${url}: ${error.message}`);
            break;
        }
    }

    console.log(`\nTotal sponsored standards found: ${results.length}`);

    if (results.length > 0) {
        // Save to JSON
        fs.writeFileSync('sponsored-standards.json', JSON.stringify(results, null, 2));
        console.log('Results saved to sponsored-standards.json');

        // Save to CSV
        const csv = [
            'Title,Link,Info',
            ...results.map(r => {
                return `"${r.title.replace(/"/g, '""')}","${r.link}","${r.info.replace(/"/g, '""')}"`;
            })
        ].join('\n');

        fs.writeFileSync('sponsored-standards.csv', csv);
        console.log('Results saved to sponsored-standards.csv');
    } else {
        console.log('No sponsored standards were found.');
    }
}

scrapeSponsored().catch(console.error);
