// ─── Estado global ────────────────────────────────────────────────
const state = {
    allApps: [],
    currentCategory: 'todas',
    currentView: 'home',
    // Respaldo en memoria para cuando localStorage falla (Safari privado)
    accessExpires: 0
};

const ACCESS_KEY = 'davidiOS_access';

let lastPopTime = 0;
const POP_COOLDOWN = 50000; // 50 segundos

function canTriggerPop() {
    const now = Date.now();
    return (now - lastPopTime) > POP_COOLDOWN;
}

function triggerPopIfAllowed() {
    if (!canTriggerPop()) return false;

    lastPopTime = Date.now();
    return true;
}

// ─── Acceso con doble capa: memoria + localStorage ─────────────────
function getAccessExpiry() {
    // 1) Memoria (siempre disponible, se pierde al cerrar pestaña)
    if (state.accessExpires && Date.now() < state.accessExpires) {
        return state.accessExpires;
    }
    // 2) localStorage (persiste entre recargas)
    try {
        const raw = localStorage.getItem(ACCESS_KEY);
        if (raw) {
            const { expires } = JSON.parse(raw);
            if (expires && Date.now() < expires) {
                state.accessExpires = expires; // sincronizar a memoria
                return expires;
            }
        }
    } catch (_) { /* Safari privado puede lanzar error */ }
    return 0;
}

function hasValidAccess() {
    return getAccessExpiry() > Date.now();
}

function grantAccess(minutes = 5) {
    const expires = Date.now() + minutes * 60 * 1000;
    state.accessExpires = expires; // siempre guarda en memoria
    try {
        localStorage.setItem(ACCESS_KEY, JSON.stringify({ expires }));
    } catch (_) { /* Safari privado: solo usamos memoria */ }
}

function revokeAccess() {
    state.accessExpires = 0;
    try { localStorage.removeItem(ACCESS_KEY); } catch (_) {}
}

// ─── Metadatos de categorías ───────────────────────────────────────
const categoryMeta = {
    todas:      { label: 'Todas',           accent: 'Biblioteca completa' },
    top:        { label: 'Top Apps',        accent: 'Curadas y destacadas' },
    emuladores: { label: 'Emuladores',      accent: 'Retro y consolas' },
    juegos:     { label: 'Juegos',          accent: 'Accion, casual y más' },
    tweaks:     { label: 'Tweaks',   accent: 'Apps con tweaks' },
    streaming:  { label: 'Redes Sociales',  accent: 'Regram, Watusi y más' },
    utilidades: { label: 'Utilidades',      accent: 'Herramientas para iPhone' }
};

const elements = {};

// ─── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    registerServiceWorker();
    loadApps();
    syncViewMode();

    // Revisión periódica: cuando expira, se bloquea automáticamente
    // No necesita hacer nada visualmente; el bloqueo ocurre en el
    // próximo intento de descarga al llamar hasValidAccess().
    setInterval(() => {
        if (!hasValidAccess()) {
            revokeAccess(); // limpia residuos
        }
    }, 3000);
});



// ─── Cache de elementos DOM ────────────────────────────────────────
function cacheElements() {
    elements.landingView      = document.getElementById('landingView');
    elements.libraryView      = document.getElementById('libraryView');
    elements.openLibraryButton = document.getElementById('openLibraryButton');
    elements.backHomeButton   = document.getElementById('backHomeButton');
    elements.categoryTabs     = document.getElementById('categoryTabs');
    elements.pageTitle        = document.getElementById('pageTitle');
    elements.resultsLabel     = document.getElementById('resultsLabel');
    elements.appsGrid         = document.getElementById('appsGrid');
    elements.appCardTemplate  = document.getElementById('appCardTemplate');
}

// ─── Eventos globales ──────────────────────────────────────────────
function bindEvents() {
    elements.openLibraryButton.addEventListener('click', () => {
        triggerPopIfAllowed(); // 👈 limpio y claro
        
        state.currentView = 'library';
        syncViewMode();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    elements.backHomeButton.addEventListener('click', () => {
        state.currentView = 'home';
        syncViewMode();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ─── Carga de apps ─────────────────────────────────────────────────
async function loadApps() {
    try {
        const appsURL = new URL('apps.json', document.baseURI);
        const response = await fetch(appsURL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        state.allApps = await response.json();
        renderCategoryTabs();
        renderApps();
    } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        elements.appsGrid.innerHTML = `
            <article class="empty-state">
                <strong>No pudimos cargar la biblioteca.</strong>
                <p>Revisa que <code>apps.json</code> exista.</p>
                <p class="empty-state-detail"><code>${detail}</code></p>
            </article>`;
    }
}

// ─── Render tabs ───────────────────────────────────────────────────
function renderCategoryTabs() {
    elements.categoryTabs.innerHTML = Object.entries(categoryMeta).map(([id, data]) => `
        <button class="category-tab ${state.currentCategory === id ? 'active' : ''}"
                type="button" data-category="${id}">
            <strong>${data.label}</strong>
            <span>${data.accent}</span>
        </button>`).join('');

    elements.categoryTabs.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', () => {
            state.currentCategory = btn.dataset.category;
            renderCategoryTabs();
            renderApps();
        });
    });
}

// ─── Render apps grid ──────────────────────────────────────────────
function renderApps() {
    const filteredApps = getFilteredApps();
    const currentMeta = categoryMeta[state.currentCategory] || categoryMeta.todas;

    elements.pageTitle.textContent = currentMeta.label;
    elements.resultsLabel.textContent =
        `${filteredApps.length} resultado${filteredApps.length === 1 ? '' : 's'}`;

    if (filteredApps.length === 0) {
        elements.appsGrid.innerHTML = `
            <article class="empty-state">
                <strong>No hay resultados con ese filtro.</strong>
                <p>Prueba otra categoria.</p>
            </article>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredApps.forEach(app => {
        const node = elements.appCardTemplate.content.firstElementChild.cloneNode(true);
        const iconEl = node.querySelector('.app-icon');
    iconEl.innerHTML = `<img src="${app.imagen}" alt="${app.nombre}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
        node.querySelector('.app-name').textContent = app.nombre;
        node.querySelector('.app-version-line').textContent = `Version ${app.version || 'N/A'}`;

        const link = node.querySelector('.download-link');
        link.href = '#';
        link.setAttribute('aria-label', `Descargar ${app.nombre}`);

        if (!app.enlace || app.enlace === '#') {
            link.textContent = 'Proximamente';
            link.classList.add('disabled');
            link.addEventListener('click', e => e.preventDefault());
        } else {
            link.addEventListener('click', e => {
                e.preventDefault();
                handleDownload(app);
            });
        }

        fragment.appendChild(node);
    });

    elements.appsGrid.innerHTML = '';
    elements.appsGrid.appendChild(fragment);
}

function getFilteredApps() {
    return state.allApps.filter(app => {
        if (state.currentCategory === 'todas') return true;
        const cats = Array.isArray(app.categoria) ? app.categoria : [app.categoria];
        return cats.includes(state.currentCategory);
    });
}

function syncViewMode() {
    const showLibrary = state.currentView === 'library';
    elements.landingView.classList.toggle('hidden', showLibrary);
    elements.libraryView.classList.toggle('hidden', !showLibrary);
    document.body.classList.toggle('library-mode', showLibrary);
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    });
}

// ─── Descarga con validación ───────────────────────────────────────
function handleDownload(app) {
    if (!app.enlace || app.enlace === '#') return;

    if (hasValidAccess()) {
        window.open(app.enlace, '_blank');
        return;
    }

    // Sin acceso válido → pedir tareas
    showTasksModal(app);
}

// ─── Modal de tareas ───────────────────────────────────────────────
function showTasksModal(app) {
    const modal      = document.getElementById('tasksModal');
    const closeBtn   = document.getElementById('closeModal');
    const taskAd     = document.getElementById('taskAd');
    const taskArticle= document.getElementById('taskArticle');
    const unlockBtn  = document.getElementById('unlockBtn');

    // ── RESET COMPLETO del estado visual del modal ──
    // (esto es lo que faltaba: sin reset, la segunda vez los botones
    //  ya estaban en "done" y unlockBtn quedaba habilitado gratis)
    taskAd.disabled      = false;
    taskAd.textContent   = '📺 Ver anuncio';
    taskAd.classList.remove('done');

    taskArticle.disabled    = false;
    taskArticle.textContent = '📖 Leer artículo';
    taskArticle.classList.remove('done');

    unlockBtn.disabled = true;

    let adDone      = false;
    let articleDone = false;

    function checkBothDone() {
        if (adDone && articleDone) unlockBtn.disabled = false;
    }

    // Tarea 1: popunder / anuncio
    taskAd.onclick = () => {
        window.open('https://omg10.com/4/10860143', '_blank');

        taskAd.disabled    = true;
        taskAd.textContent = '⏳ Verificando...';

        setTimeout(() => {
            adDone = true;
            taskAd.classList.add('done');
            taskAd.textContent = '✔ Anuncio completado';
            checkBothDone();
        }, 3000);
    };

    // Tarea 2: direct link
    taskArticle.onclick = () => {
        window.open('https://omg10.com/4/10859026', '_blank');

        taskArticle.disabled    = true;
        taskArticle.textContent = '⏳ Verificando...';

        setTimeout(() => {
            articleDone = true;
            taskArticle.classList.add('done');
            taskArticle.textContent = '✔ Artículo abierto';
            checkBothDone();
        }, 3000);
    };

    // Desbloquear: guarda acceso y lanza descarga pendiente
    unlockBtn.onclick = () => {
        // ⚠️ Cambia el tiempo aquí para producción (ej: 5 minutos)
        // Para pruebas usa 0.3 (18 seg) o 1 (1 minuto)
        grantAccess(1); // acceso de 1 minuto para pruebas
        modal.classList.add('hidden');
        // Abre la descarga que el usuario quería
        if (app && app.enlace) window.open(app.enlace, '_blank');
    };

    closeBtn.onclick = () => {
    if (!adDone || !articleDone) {
        alert("Completa las tareas para desbloquear las descargas 🔓");
        return;
    }
    modal.classList.add('hidden');
};

    modal.classList.remove('hidden');
}