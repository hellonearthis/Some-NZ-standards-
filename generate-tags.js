const axios = require('axios');
const fs = require('fs');

const JSON_FILE = 'sponsored-links.json';
const LM_STUDIO_URL = 'http://localhost:1234/v1/chat/completions';

async function generateTags() {
    if (!fs.existsSync(JSON_FILE)) {
        console.error("JSON file not found.");
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`Processing ${data.length} items for tagging...`);

    // Group by unique standards to avoid redundant LLM calls
    // We'll use the prefix as the key
    const uniqueStandards = new Map();
    data.forEach(item => {
        const prefix = item.originalNumber.split(':')[0].trim();
        if (!uniqueStandards.has(prefix)) {
            uniqueStandards.set(prefix, {
                title: item.standardTitle || item.foundTitle,
                description: item.originalDescription,
                abstract: item.abstract
            });
        }
    });

    const prefixToTags = new Map();
    const batchSize = 5;
    const entries = Array.from(uniqueStandards.entries());

    for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize);
        console.log(`Processing batch ${i / batchSize + 1}/${Math.ceil(entries.length / batchSize)}...`);

        const prompt = `You are a technical librarian. Analyze the following New Zealand Building Standards and provide 2-3 short, one-word or two-word category tags for each. 
Return ONLY a JSON object where keys are the Standard IDs and values are arrays of strings.

Standards:
${batch.map(([id, info]) => `${id}: ${info.title} - ${info.description}. Abstract: ${info.abstract.substring(0, 200)}...`).join('\n\n')}

JSON Format example:
{
  "NZS 3604": ["Timber", "Construction", "Residential"],
  "NZS 4512": ["Fire Safety", "Alarms"]
}`;

        try {
            const response = await axios.post(LM_STUDIO_URL, {
                model: "local-model", // LM Studio uses whatever is loaded
                messages: [
                    { role: "system", content: "You are a precise classifier. Return only valid JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            }, { timeout: 30000 });

            const content = response.data.choices[0].message.content;
            // Extract JSON from potential markdown code blocks
            const jsonStr = content.match(/\{[\s\S]*\}/)[0];
            const tags = JSON.parse(jsonStr);

            Object.entries(tags).forEach(([id, tagList]) => {
                prefixToTags.set(id, tagList);
            });

        } catch (error) {
            console.error(`Error in batch ${i}: ${error.message}`);
            // Fallback tags if LLM fails (Improved with official ranges)
            batch.forEach(([id, info]) => {
                const tags = new Set();
                const fullText = (info.title + ' ' + info.description + ' ' + info.abstract).toLowerCase();
                
                // Extract the main numeric part (e.g., 4402 from NZS 4402.2.8.2)
                const numMatch = id.match(/\d+/);
                const num = numMatch ? parseInt(numMatch[0]) : 0;

                // 1. Range-based tagging
                if (num >= 1000 && num <= 1999) tags.add('Structural Engineering');
                if (num >= 1170 && num <= 1170) tags.add('Structural Design');
                
                if (num >= 2000 && num <= 2999) tags.add('Civil & Infrastructure');
                
                if (num >= 3000 && num <= 3999) {
                    tags.add('Building Services');
                    if (num >= 3100 && num <= 3199) tags.add('Concrete Structures');
                    if (num >= 3400 && num <= 3499) tags.add('Steel Structures');
                    if (num >= 3500 && num <= 3599) tags.add('Plumbing & Drainage');
                    if (num >= 3600 && num <= 3699) tags.add('Timber & Residential');
                    if (num === 3604) tags.add('Timber-framed Buildings');
                }

                if (num >= 4200 && num <= 4299) {
                    tags.add('Insulation & Energy');
                    if (num === 4218) tags.add('Thermal Insulation');
                }

                if (num >= 4300 && num <= 4399) tags.add('Sanitation & Quality');
                
                if (num >= 4500 && num <= 4599) tags.add('Fire & Emergency');
                
                if (num >= 5400 && num <= 5499) tags.add('Hazardous & Safety');
                if (num >= 6800 && num <= 6899) tags.add('Acoustics');
                if (num >= 7200 && num <= 7999) tags.add('Land Development');
                if (num >= 8000) tags.add('Management Systems');

                // 2. Refined Keyword-based tagging (adding to the set)
                if (fullText.includes('fire')) tags.add('Fire Safety');
                if (fullText.includes('timber') || fullText.includes('wood')) tags.add('Timber');
                if (fullText.includes('concrete')) tags.add('Concrete');
                if (fullText.includes('steel')) tags.add('Steel');
                if (fullText.includes('plumbing') || fullText.includes('water')) tags.add('Plumbing');
                if (fullText.includes('smoke') || fullText.includes('alarm')) tags.add('Alarms');
                if (fullText.includes('soil') || fullText.includes('earth')) tags.add('Geotechnical');
                if (fullText.includes('soil')) tags.add('Soil');
                if (fullText.includes('electric') || fullText.includes('wire')) tags.add('Electrical');
                if (fullText.includes('energy') || fullText.includes('thermal')) tags.add('Energy');
                if (fullText.includes('glazing') || fullText.includes('glass')) tags.add('Glazing');
                if (fullText.includes('seismic') || fullText.includes('earthquake')) tags.add('Seismic');
                
                if (tags.size === 0) tags.add('General');
                prefixToTags.set(id, Array.from(tags));
            });
        }
    }

    // Update the original data with tags
    data.forEach(item => {
        const prefix = item.originalNumber.split(':')[0].trim();
        item.tags = prefixToTags.get(prefix) || [];
    });

    fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2));
    console.log("Tagging complete! Tags saved to sponsored-links.json");
}

generateTags().catch(console.error);
