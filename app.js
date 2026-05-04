let standardsData = [];
let activeTags = new Set();
let activeCategory = null;
let searchQuery = "";
let showLatestOnly = true;

const grid = document.getElementById('standards-grid');
const tagCloud = document.getElementById('tag-cloud');
const categoryList = document.getElementById('category-list');
const searchInput = document.getElementById('search-input');
const latestToggle = document.getElementById('latest-only');
const resultCount = document.getElementById('result-count');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeModal = document.querySelector('.close-modal');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const closeSidebarBtn = document.getElementById('close-sidebar');

async function init() {
    try {
        const response = await fetch('final-standards.json');
        standardsData = await response.json();
        
        renderCategories();
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
        window.onclick = (e) => { 
            if (e.target == modal) modal.style.display = 'none'; 
            if (e.target == sidebarOverlay) closeSidebar();
        };

        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        closeSidebarBtn.addEventListener('click', closeSidebar);

    } catch (error) {
        console.error("Failed to load data:", error);
    }
}

function renderCategories() {
    const categories = {};
    standardsData.forEach(item => {
        if (item.categories) {
            item.categories.forEach(cat => {
                categories[cat] = (categories[cat] || 0) + 1;
            });
        }
    });

    categoryList.innerHTML = '';
    
    // Add "All Standards" option
    const allEl = document.createElement('div');
    allEl.className = `category-item all-categories ${!activeCategory ? 'active' : ''}`;
    allEl.innerHTML = `
        <span>All Standards</span>
        <span class="category-count">${standardsData.length}</span>
    `;
    allEl.onclick = () => selectCategory(null);
    categoryList.appendChild(allEl);
    
    // Sort categories alphabetically
    Object.keys(categories).sort().forEach(cat => {
        const itemEl = document.createElement('div');
        itemEl.className = `category-item ${activeCategory === cat ? 'active' : ''}`;
        itemEl.innerHTML = `
            <span>${cat}</span>
            <span class="category-count">${categories[cat]}</span>
        `;
        itemEl.onclick = () => selectCategory(cat);
        categoryList.appendChild(itemEl);
    });
}

function selectCategory(cat) {
    if (activeCategory === cat) {
        activeCategory = null; // Toggle off if clicking the same one
    } else {
        activeCategory = cat;
    }
    
    renderCategories();
    renderStandards();
    
    if (window.innerWidth <= 768) closeSidebar();
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
    
    // Close sidebar on mobile after selecting a tag
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

function closeSidebar() {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
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

    // Filter by Categories
    if (activeCategory) {
        filtered = filtered.filter(item => 
            item.categories && item.categories.includes(activeCategory)
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
                ${(item.categories || []).map(c => `<span class="card-tag-small" style="background:var(--color-ok-1); color:white; border:none;">${c}</span>`).join('')}
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
            
            ${item.categories && item.categories.length > 0 ? `
                <h3>Industry Categories</h3>
                <div class="modal-tags">
                    ${item.categories.map(c => `<span class="category-item active" style="display:inline-flex; padding:0.4rem 0.8rem; margin-right:0.5rem; border-radius:6px; font-size:0.8rem;">${c}</span>`).join('')}
                </div>
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
