let allApps = [];
let currentCategory = 'top';

async function loadApps() {
    const res = await fetch('apps.json');
    allApps = await res.json();
    renderApps();
    renderCategoryTabs();
}

function renderCategoryTabs() {
    const categories = [
        {id: 'top', name: '🔥 Top Apps'},
        {id: 'emuladores', name: '🎮 Emuladores'},
        {id: 'juegos', name: '🎲 Juegos'},
        {id: 'tweaks', name: '✨ Tweaks & Mods'},
        {id: 'streaming', name: '📺 Streaming'},
        {id: 'utilidades', name: '🛠 Utilidades'}
    ];

    const container = document.getElementById('categoryTabs');
    container.innerHTML = categories.map(cat => `
        <button onclick="filterByCategory('${cat.id}')" 
                class="category-btn px-6 py-2 rounded-3xl whitespace-nowrap transition ${currentCategory === cat.id ? 'bg-violet-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}">
            ${cat.name}
        </button>
    `).join('');
}

function filterByCategory(cat) {
    currentCategory = cat;
    document.getElementById('pageTitle').textContent = cat === 'top' ? 'Top Apps 🔥' : 
        document.querySelector(`button[onclick="filterByCategory('${cat}')"]`).textContent;
    renderApps();
}

function renderApps(filteredApps = null) {
    const grid = document.getElementById('appsGrid');
    const appsToShow = filteredApps || allApps.filter(app => 
        currentCategory === 'top' || app.categoria === currentCategory
    );

    grid.innerHTML = appsToShow.map(app => `
        <div class="app-card bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden cursor-pointer" onclick="openApp('${app.id}')">
            <div class="aspect-square bg-zinc-800 flex items-center justify-center text-6xl p-6">
                ${app.icono}
            </div>
            <div class="p-5">
                <h3 class="font-semibold text-lg">${app.nombre}</h3>
                <p class="text-zinc-400 text-sm line-clamp-2 mt-1">${app.descripcion}</p>
                <div class="flex justify-between items-center mt-4 text-xs">
                    <span class="bg-emerald-400 text-emerald-950 px-3 py-1 rounded-2xl">${app.version}</span>
                    <span class="text-cyan-400">Descargar →</span>
                </div>
            </div>
        </div>
    `).join('');
}

function openApp(id) {
    const app = allApps.find(a => a.id === id);
    if (!app) return;
    
    // Aquí iría el enlace real de descarga (tú lo cambias después)
    window.open(app.enlace, '_blank');
}

// === OFFERWALL + TIMER (30 minutos) ===
let unlockTime = 0;

function checkAccess() {
    const now = Date.now();
    if (now < unlockTime) return true; // aún tiene acceso
    
    // Primera vez o tiempo expirado
    document.getElementById('offerModal').classList.remove('hidden');
    // Aquí cargaremos tu offerwall real
    return false;
}

function completeTaskDemo() {
    // Esto es para probar. Cuando tengas CPAlead, quita esta función y usa el iframe real
    unlockTime = Date.now() + (30 * 60 * 1000); // 30 minutos
    document.getElementById('offerModal').classList.add('hidden');
    alert('✅ ¡Acceso desbloqueado por 30 minutos! 🎉');
}

function closeModal() {
    document.getElementById('offerModal').classList.add('hidden');
}

// PWA install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    deferredPrompt = e;
});

function installPWA() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt = null;
    } else {
        alert('Toca el botón compartir en Safari y selecciona "Añadir a pantalla de inicio"');
    }
}

// Cargar todo
window.onload = loadApps;

// Cada vez que se abre la app, revisa si necesita tareas
setTimeout(() => {
    if (!checkAccess()) {
        // modal ya se abrió
    }
}, 800);