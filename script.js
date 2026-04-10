const state = {
    allApps: [],
    currentCategory: 'todas',
    searchTerm: '',
    previewLibrary: false
};

const categoryMeta = {
    todas: { label: 'Todas', accent: 'Biblioteca completa' },
    top: { label: 'Top Apps', accent: 'Curadas y destacadas' },
    emuladores: { label: 'Emuladores', accent: 'Retro y consolas' },
    juegos: { label: 'Juegos', accent: 'Accion, casual y premium' },
    tweaks: { label: 'Tweaks & Mods', accent: 'Funciones extra y ajustes' },
    streaming: { label: 'Streaming', accent: 'Video, musica y series' },
    utilidades: { label: 'Utilidades', accent: 'Herramientas para iPhone' }
};

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    registerServiceWorker();
    updateInstallCopy();
    loadApps();
    syncViewMode();
});

function cacheElements() {
    elements.landingView = document.getElementById('landingView');
    elements.libraryView = document.getElementById('libraryView');
    elements.previewLibraryButton = document.getElementById('previewLibraryButton');
    elements.backToGuideButton = document.getElementById('backToGuideButton');
    elements.installStateTitle = document.getElementById('installStateTitle');
    elements.installStateText = document.getElementById('installStateText');
    elements.searchInput = document.getElementById('searchInput');
    elements.categoryTabs = document.getElementById('categoryTabs');
    elements.pageTitle = document.getElementById('pageTitle');
    elements.resultsLabel = document.getElementById('resultsLabel');
    elements.appsGrid = document.getElementById('appsGrid');
    elements.appCount = document.getElementById('appCount');
    elements.categoryCount = document.getElementById('categoryCount');
    elements.appCardTemplate = document.getElementById('appCardTemplate');
}

function bindEvents() {
    elements.previewLibraryButton.addEventListener('click', () => {
        state.previewLibrary = true;
        syncViewMode();
    });
    elements.backToGuideButton.addEventListener('click', () => {
        state.previewLibrary = false;
        syncViewMode();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    elements.searchInput.addEventListener('input', (event) => {
        state.searchTerm = event.target.value.trim().toLowerCase();
        renderApps();
    });

    window.addEventListener('appinstalled', () => {
        state.previewLibrary = false;
        syncViewMode();
    });

    window.addEventListener('resize', updateInstallCopy);
}

async function loadApps() {
    try {
        const response = await fetch('apps.json', { cache: 'no-store' });
        state.allApps = await response.json();
        renderCategoryTabs();
        updateCounts();
        renderApps();
    } catch (error) {
        elements.appsGrid.innerHTML = `
            <article class="empty-state">
                <strong>No pudimos cargar la biblioteca.</strong>
                <p>Revisa que <code>apps.json</code> exista y que el dominio permita servirlo correctamente.</p>
            </article>
        `;
    }
}

function renderCategoryTabs() {
    const categories = Object.entries(categoryMeta).map(([id, data]) => {
        const isActive = state.currentCategory === id;
        return `
            <button
                class="category-tab ${isActive ? 'active' : ''}"
                type="button"
                data-category="${id}"
            >
                <strong>${data.label}</strong>
                <span>${data.accent}</span>
            </button>
        `;
    }).join('');

    elements.categoryTabs.innerHTML = categories;
    elements.categoryTabs.querySelectorAll('[data-category]').forEach((button) => {
        button.addEventListener('click', () => {
            state.currentCategory = button.dataset.category;
            renderCategoryTabs();
            renderApps();
        });
    });
}

function renderApps() {
    const filteredApps = getFilteredApps();
    const fragment = document.createDocumentFragment();
    const currentMeta = categoryMeta[state.currentCategory] || categoryMeta.top;

    elements.pageTitle.textContent = currentMeta.label;
    elements.resultsLabel.textContent = `${filteredApps.length} resultado${filteredApps.length === 1 ? '' : 's'}`;

    if (filteredApps.length === 0) {
        elements.appsGrid.innerHTML = `
            <article class="empty-state">
                <strong>No hay resultados con ese filtro.</strong>
                <p>Prueba otra categoria o cambia la busqueda para ver mas apps.</p>
            </article>
        `;
        return;
    }

    filteredApps.forEach((app) => {
        const node = elements.appCardTemplate.content.firstElementChild.cloneNode(true);
        node.querySelector('.app-icon').textContent = app.icono || '📱';
        node.querySelector('.app-name').textContent = app.nombre;
        node.querySelector('.app-version-line').textContent = `Version ${app.version || 'N/A'}`;

        const link = node.querySelector('.download-link');
        link.href = app.enlace || '#';
        link.setAttribute('aria-label', `Descargar ${app.nombre}`);

        if (!app.enlace || app.enlace === '#') {
            link.textContent = 'Proximamente';
            link.classList.add('disabled');
            link.addEventListener('click', (event) => event.preventDefault());
        }

        fragment.appendChild(node);
    });

    elements.appsGrid.innerHTML = '';
    elements.appsGrid.appendChild(fragment);
}

function getFilteredApps() {
    return state.allApps.filter((app) => {
        const matchesCategory = state.currentCategory === 'todas' || app.categoria === state.currentCategory;
        const matchesSearch = !state.searchTerm || `${app.nombre} ${app.descripcion} ${app.categoria}`
            .toLowerCase()
            .includes(state.searchTerm);
        return matchesCategory && matchesSearch;
    });
}

function updateCounts() {
    const categories = new Set(state.allApps.map((app) => app.categoria));
    elements.appCount.textContent = String(state.allApps.length);
    elements.categoryCount.textContent = String(categories.size + 1);
}

function syncViewMode() {
    const showLibrary = isStandaloneMode() || state.previewLibrary;
    elements.landingView.classList.toggle('hidden', showLibrary);
    elements.libraryView.classList.toggle('hidden', !showLibrary);
}

function isStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function updateInstallCopy() {
    if (isStandaloneMode()) {
        elements.installStateTitle.textContent = 'La biblioteca ya puede usarse como app instalada.';
        elements.installStateText.textContent = 'Ahora solo queda mantener el catalogo al dia con tus enlaces IPA reales y categorias.';
        return;
    }

    if (/iphone|ipad|ipod/i.test(window.navigator.userAgent)) {
        elements.installStateTitle.textContent = 'Instalala desde Safari para que se vea como una app real.';
        elements.installStateText.textContent = 'Cuando la anadas a inicio, el nombre sugerido sera "DavidiOS Apps" y abrira en modo pantalla completa.';
        return;
    }

    elements.installStateTitle.textContent = 'Puedes previsualizar la biblioteca desde aqui.';
    elements.installStateText.textContent = 'Para la experiencia real de iPhone, prueba el dominio desde Safari en tu dispositivo.';
}

function formatCategory(categoryId) {
    return categoryMeta[categoryId]?.label || categoryId;
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // No bloqueamos la UI si falla el registro.
        });
    });
}
