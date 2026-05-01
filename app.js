let standardsData = [];
let activeTags = new Set();
let searchQuery = "";
let showLatestOnly = true;

const grid = document.getElementById('standards-grid');
const tagCloud = document.getElementById('tag-cloud');
const searchInput = document.getElementById('search-input');
const latestToggle = document.getElementById('latest-only');
const resultCount = document.getElementById('result-count');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');

async function init() {
    try {
        const response = await fetch('sponsored-links.json');
        standardsData = await response.json();
        
        renderTags();
        renderStandards();
        
        // Event Listeners
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderStandards();
        });

        latestToggle.addEventListener('change', (e) => {
            showLatestOnly = e.target.checked;
            renderStandards();
        });

        closeModal.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    } catch (error) {
        console.error("Failed to load data:", error);
    }
}

function renderTags() {
    const allTags = new Set();
    standardsData.forEach(item => {
        if (item.tags) item.tags.forEach(t => allTags.add(t));
    });

    tagCloud.innerHTML = '';
    Array.from(allTags).sort().forEach(tagText => {
        const tagEl = document.createElement('div');
        tagEl.className = 'tag';
        tagEl.textContent = tagText;
        tagEl.onclick = () => toggleTag(tagText, tagEl);
        tagCloud.appendChild(tagEl);
    });
}

function toggleTag(tag, el) {
    if (activeTags.has(tag)) {
        activeTags.delete(tag);
        el.classList.remove('active');
    } else {
        activeTags.add(tag);
        el.classList.add('active');
    }
    renderStandards();
}

function renderStandards() {
    let filtered = standardsData;

    // Filter by Search (checks number, title, abstract, and aliases)
    if (searchQuery) {
        filtered = filtered.filter(item => 
            item.originalNumber.toLowerCase().includes(searchQuery) ||
            (item.standardTitle && item.standardTitle.toLowerCase().includes(searchQuery)) ||
            (item.abstract && item.abstract.toLowerCase().includes(searchQuery)) ||
            (item.replaces && item.replaces.some(r => r.toLowerCase().includes(searchQuery)))
        );
    }

    // Filter by Tags
    if (activeTags.size > 0) {
        filtered = filtered.filter(item => 
            item.tags && item.tags.some(t => activeTags.has(t))
        );
    }

    // Apply "Latest Only" filter
    if (showLatestOnly) {
        filtered = filtered.filter(item => item.status === 'Current');
    }

    resultCount.textContent = filtered.length;
    grid.innerHTML = '';

    filtered.forEach(item => {
        const displayTitle = item.standardTitle || item.foundTitle?.split('\n')[0] || 'Standard';
        const displayStatus = item.status || 'Current';
        const isCurrent = displayStatus.toLowerCase().includes('current');
        
        // Truncate abstract for card
        const abstractText = item.abstract || 'No description available.';
        const truncatedAbstract = abstractText.length > 180 ? abstractText.substring(0, 180) + '...' : abstractText;

        const safeTitle = (item.standardTitle || item.originalNumber).replace(/[\/\\?%*:|"<>]/g, '-');
        const card = document.createElement('div');
        card.className = `card ${isCurrent ? 'current' : 'superseded'}`;
        card.innerHTML = `
            <div class="card-header">
                <span class="status-badge">${displayStatus}</span>
                <span class="standard-id">${item.originalNumber}</span>
            </div>
            <h2>${displayTitle}</h2>
            <div class="abstract-preview">${truncatedAbstract}</div>
            
            ${item.replaces && item.replaces.length > 0 ? `
                <div class="alias-info">Replaces: ${item.replaces.join(', ')}</div>
            ` : ''}

            <div class="card-tags">
                ${(item.tags || []).slice(0, 3).map(t => `<span class="card-tag-small">${t}</span>`).join('')}
                ${item.tags && item.tags.length > 3 ? `<span class="card-tag-more">+${item.tags.length - 3}</span>` : ''}
            </div>

            <div class="card-actions">
                ${item.downloadUrl ? `<a href="standards/${safeTitle}.pdf" target="_blank" class="btn-download">Download PDF</a>` : '<span class="no-download">PDF not available</span>'}
            </div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('a')) {
                showModal(item);
            }
        };
        
        grid.appendChild(card);
    });
}

function showModal(item) {
    const title = item.standardTitle || item.originalNumber;
    const safeTitle = (item.standardTitle || item.originalNumber).replace(/[\/\\?%*:|"<>]/g, '-');
    modalBody.innerHTML = `
        <div class="modal-header">
            <span class="status-badge large">${item.status}</span>
            <h2>${title}</h2>
            <p class="standard-id-large">${item.originalNumber}</p>
        </div>
        <div class="modal-main">
            <h3>Abstract</h3>
            <p class="full-abstract">${item.abstract || 'No abstract available.'}</p>
            
            ${item.replaces && item.replaces.length > 0 ? `
                <h3>Historical Versions</h3>
                <p>This standard replaces: ${item.replaces.join(', ')}</p>
            ` : ''}

            <h3>Classification</h3>
            <div class="modal-tags">
                ${(item.tags || []).map(t => `<span class="tag large">${t}</span>`).join('')}
            </div>
        </div>
        <div class="modal-footer">
             <a href="${item.link}" target="_blank" class="btn primary">View on Standards NZ</a>
             ${item.downloadUrl ? `<a href="standards/${safeTitle}.pdf" target="_blank" class="btn success">Open Local PDF</a>` : ''}
        </div>
    `;
    modal.style.display = 'block';
}

init();
