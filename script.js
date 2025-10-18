
// Niveles de log
const LOG_LEVELS = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG',
};
// Función para registrar logs
function log(message, level = LOG_LEVELS.INFO) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  if (!window.appLogs) {
    window.appLogs = [];
  }
  window.appLogs.push({ timestamp, level, message });
}
// Capturar errores no manejados
window.addEventListener('error', (event) => {
  log(`Error no capturado: ${event.message}`, LOG_LEVELS.ERROR);
  log(`Archivo: ${event.filename}, Línea: ${event.lineno}, Columna: ${event.colno}`, LOG_LEVELS.ERROR);
});
log("Inicializando aplicación...", LOG_LEVELS.INFO);

// === FUNCIONES UTILITARIAS GLOBALES ===
function showRunnerOverlay() {
    const overlay = document.getElementById('runnerOverlay');
    if (overlay) overlay.classList.add('active');
}
function hideRunnerOverlay() {
    const overlay = document.getElementById('runnerOverlay');
    if (overlay) overlay.classList.remove('active');
}
function showGlobalLoadingOverlay(message = 'Cargando...') {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        const msgEl = overlay.querySelector('p');
        if (msgEl) msgEl.textContent = message;
        overlay.style.display = 'flex';
    }
}
function hideGlobalLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
    hideRunnerOverlay();
}

// === NAVEGACIÓN Y ZOOM EN LIGHTBOX CON TECLAS ===
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('imageLightbox');
    if (!lightbox || lightbox.style.display !== 'flex') return;

    const img = document.getElementById('lightboxImg');
    if (!img) return;

    // Navegación horizontal
    if (e.key === 'ArrowLeft') {
        if (typeof prevProduct === 'function') prevProduct();
        e.preventDefault();
    } else if (e.key === 'ArrowRight') {
        if (typeof nextProduct === 'function') nextProduct();
        e.preventDefault();
    }
    // Zoom vertical
    else if (e.key === 'ArrowUp') {
        // Zoom in
        if (currentZoomLevel < ZOOM_LEVELS.length - 1) {
            currentZoomLevel++;
            img.style.transform = `scale(${ZOOM_LEVELS[currentZoomLevel]})`;
        }
        e.preventDefault();
    } else if (e.key === 'ArrowDown') {
        // Zoom out
        if (currentZoomLevel > 0) {
            currentZoomLevel--;
            img.style.transform = `scale(${ZOOM_LEVELS[currentZoomLevel]})`;
        }
        e.preventDefault();
    }
});

/**
 * Alterna la visibilidad de un dropdown por su ID
 */
window.toggleDropdown = function(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const isVisible = dropdown.style.display === 'block';
    document.querySelectorAll('.dropdown-content').forEach(el => {
        if (el.id !== dropdownId) el.style.display = 'none';
    });
    dropdown.style.display = isVisible ? 'none' : 'block';
};

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', function(event) {
    if (!event.target.closest('.filter-dropdown')) {
        document.querySelectorAll('.dropdown-content').forEach(el => {
            el.style.display = 'none';
        });
    }
});

/**
 * Sube una imagen al bucket 'product-images' y devuelve { publicUrl, path }
 */
async function uploadProductImage(file, vendorId) {
    if (!file) return null;
    const sup = getSupabase();
    try {
        const ext = (file.name || 'img').split('.').pop().toLowerCase();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const path = `products/${vendorId}/${fileName}`;
        const { error: uploadError } = await sup.storage.from('product-images').upload(path, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data } = sup.storage.from('product-images').getPublicUrl(path);
        return { publicUrl: data.publicUrl, path };
    } catch (err) {
        console.error('Error uploading product image:', err);
        return null;
    }
}

/**
 * Cierra el modal, panel o lightbox activo cuando se presiona la tecla Esc.
 */
function closeActiveModalOnEsc(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox && lightbox.style.display === 'flex') {
            hideImageLightbox();
            event.preventDefault();
            return;
        }
        const cartPanel = document.getElementById('cartPanel');
        if (cartPanel && cartPanel.classList.contains('active')) {
            toggleCart();
            event.preventDefault();
            return;
        }
        const modals = document.querySelectorAll('.login-modal');
        for (let modal of modals) {
            if (modal.style.display === 'flex') {
                hideModal(modal.id);
                event.preventDefault();
                return;
            }
        }
        const navContainer = document.getElementById('navContainer');
        if (navContainer && navContainer.classList.contains('active')) {
            navContainer.classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
            event.preventDefault();
            return;
        }
    }
}

function showInitialLoadingSpinner(message = 'Cargando datos...') {
    let overlay = document.getElementById('initial-loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'initial-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(255,255,255,0.85)';
        overlay.style.zIndex = '9999';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.innerHTML = `<div class="spinner" style="border: 8px solid #eee; border-top: 8px solid #2196f3; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite;"></div><div id="initial-loading-message" style="margin-top:20px;font-size:1.2em;"></div>`;
        document.body.appendChild(overlay);
        const style = document.createElement('style');
        style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    } else {
        overlay.style.display = 'flex';
    }
    let msgIdx = 0;
    const msgDiv = document.getElementById('initial-loading-message');
    if (window._initialLoadingMsgInterval) clearInterval(window._initialLoadingMsgInterval);
    function setMsg() {
        msgDiv.textContent = appLoadingMessages[msgIdx % appLoadingMessages.length];
        msgIdx++;
    }
    setMsg();
    window._initialLoadingMsgInterval = setInterval(setMsg, 1800);
}

function hideInitialLoadingSpinner() {
    const overlay = document.getElementById('initial-loading-overlay');
    if (overlay) overlay.style.display = 'none';
    if (window._initialLoadingMsgInterval) {
        clearInterval(window._initialLoadingMsgInterval);
        window._initialLoadingMsgInterval = null;
    }
}

// Configuración de Supabase - CORREGIDO: Eliminados espacios en blanco
const supabaseUrl = 'https://fyierdvjqwtuoilvhfdh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5aWVyZHZqcXd0dW9pbHZoZmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTU3NTksImV4cCI6MjA3NDY3MTc1OX0.Fx-edKYpWjGJ2tTNODSkGXXodu0pNp1XmvYkwRd3C_M';
let supabase = null;

function initializeSupabaseClient() {
    if (supabase) return supabase;
    supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey, {
        auth: { 
            persistSession: true, 
            autoRefreshToken: true, 
            detectSessionInUrl: false,
            storage: window.localStorage,
            storageKey: 'feria-virtual-auth'
        },
        global: {
            headers: {
                'x-client-info': 'feria-virtual-web'
            }
        }
    });
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session ? 'Sesión activa' : 'Sin sesión');
        if (event === 'SIGNED_OUT') {
            if (currentUser) {
                console.log('Usuario deslogueado');
                currentUser = null;
                isMerchant = false;
                currentMerchantData = null;
                updateAuthUI(); // Actualizar UI
                showSection('home'); // ✅ Redirigir a home al cerrar sesión
            } 
        }
    });
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            const response = await originalFetch.apply(this, args);
            if (response.status === 403 && args[0]?.includes?.('supabase.co/auth')) {
                console.error('❌ Error 403 detectado en llamada auth');
            }
            return response;
        } catch (err) {
            throw err;
        }
    };
    return supabase;
}

function getSupabase() {
    if (!supabase) return initializeSupabaseClient();
    return supabase;
}

// Detectar cuando la pestaña vuelve a estar activa
document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && supabase) {
        console.log('Pestaña activa - verificando sesión...');
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error al obtener sesión:', error);
                return;
            }
            if (session) {
                console.log('Sesión válida detectada');
                const expiresAt = session.expires_at * 1000;
                const now = Date.now();
                const timeUntilExpiry = expiresAt - now;
                if (timeUntilExpiry < 5 * 60 * 1000) {
                    console.log('Refrescando token...');
                    await supabase.auth.refreshSession();
                }
            }
        } catch (err) {
            console.error('Error al verificar sesión:', err);
        }
    }
});

// Mantener la conexión activa
let heartbeatInterval = null;
function startSupabaseHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(async () => {
        if (!supabase) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase.from('merchants').select('id').limit(1);
            }
        } catch (err) {
            console.error('Heartbeat falló:', err);
        }
    }, 30000);
}
function stopSupabaseHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

// --- NETWORK / SUPABASE REACHABILITY HELPERS ---
async function isSupabaseReachable(timeout = 3000) {
    try {
        initializeSupabaseClient();
        return true;
    } catch (e) {
        return false;
    }
}
function showSupabaseNetworkBanner(message) {
    let banner = document.getElementById('supabase-network-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'supabase-network-banner';
        banner.style.position = 'fixed';
        banner.style.left = '0';
        banner.style.right = '0';
        banner.style.top = '0';
        banner.style.zIndex = '10050';
        banner.style.background = '#ffdddd';
        banner.style.color = '#800';
        banner.style.padding = '10px 12px';
        banner.style.fontSize = '14px';
        banner.style.textAlign = 'center';
        banner.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
        document.body.appendChild(banner);
    }
    banner.innerHTML = `<span>${message || 'No se puede conectar a Supabase. Revisa tu conexión a Internet o la URL configurada.'}</span> <button id="supabase-retry-btn" style="margin-left:12px;padding:4px 8px;border:0;background:#fff;border-radius:4px;cursor:pointer;">Reintentar</button>`;
    const btn = document.getElementById('supabase-retry-btn');
    if (btn) btn.addEventListener('click', async () => {
        btn.disabled = true; btn.textContent = 'Probando...';
        try {
            const sup = getSupabase();
            const { data, error } = await sup.from('products').select('id').limit(1);
            if (error) throw error;
            hideSupabaseNetworkBanner();
            showToast('Conexión a Supabase restablecida.', 'success');
            loadProducts();
        } catch (err) {
            console.error('Reintento fallido:', err);
            showToast('Aún no se puede conectar a Supabase.', 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Reintentar';
        }
    });
}
function hideSupabaseNetworkBanner() {
    const banner = document.getElementById('supabase-network-banner');
    if (banner) banner.remove();
}
async function ensureSupabaseAvailable() {
    const reachable = await isSupabaseReachable();
    if (!reachable) {
        console.error('Supabase host not reachable:', supabaseUrl);
        showSupabaseNetworkBanner('No se puede conectar a Supabase (DNS/Red). Si el problema persiste, revisa la URL o tu conexión.');
        showToast('No se puede conectar a Supabase. Revisa tu conexión o la URL.', 'error');
        return false;
    }
    hideSupabaseNetworkBanner();
    return true;
}

// --- VARIABLES GLOBALES ---
let currentUser = null;
let isMerchant = false;
let currentMerchantData = null;
let selectedProductFile = null;
let selectedProfilePicFile = null;
let selectedAvatarUrl = null;
let selectedProductUpload = null;
let selectedProfilePicUpload = null;
let selectedStoreLogoUpload = null; // NUEVO: Para el logo del puesto
const profileLink = document.getElementById('profileLink');
const storeLink = document.getElementById('storeLink');
const authContainer = document.getElementById('authContainer');

// --- CACHÉ EN MEMORIA ---
let dataCache = {
    products: {
        all: { data: null, timestamp: 0 },
        byVendor: {}
    },
    merchants: {}
};

// Util: valida un id
function isValidId(id) {
    return id && typeof id === 'string' && id.length > 0 && id !== 'undefined' && id !== 'null';
}
const CACHE_DURATION = 5 * 60 * 1000;

// --- MENSAJES PARA SPINNER ---
const appLoadingMessages = [
    "Cargando Feria Virtual...",
    "Estableciendo puestos...",
    "Ordenando productos...",
    "Preparando ofertas...",
    "Encendiendo las luces de la feria...",
    "¡Casi listo!...",
    "Conectando con vendedores..."
];
const productLoadingMessages = [
    "Ordenando las góndolas...",
    "Encendiendo las luces del local...",
    "Acomodando los productos más lindos...",
    "Puliendo los precios...",
    "Revisando el stock...",
    "Poniendo carteles bonitos...",
    "Alistando las ofertas del día...",
    "Sacando brillo a los productos...",
    "Preparando todo para vos...",
    "¡Casi listo! Un momentito más..."
];

// --- NAVEGACIÓN Y VISIBILIDAD DE SECCIONES ---
window.showSection = function(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active-section'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active-section');
    
    // Cerrar menú hamburguesa
    document.getElementById('navContainer').classList.remove('active');
    document.getElementById('navOverlay').classList.remove('active');

    // Acciones específicas por sección
    if (sectionId === 'products' && typeof loadProducts === 'function') {
        loadProducts();
    }
    if (sectionId === 'my-store' && isMerchant && typeof loadMyProducts === 'function') {
        loadMyProducts();
    }
    // ✅ NUEVO: Cargar favoritos
    if (sectionId === 'favorites' && typeof renderFavoritesSection === 'function') {
        renderFavoritesSection();
    }
};
window.showLogin = function() { document.getElementById('loginModal').style.display = 'flex'; };
window.hideLogin = function() { document.getElementById('loginModal').style.display = 'none'; };
window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    document.getElementById('navContainer').classList.remove('active');
    document.getElementById('navOverlay').classList.remove('active');
};

// === FUNCIÓN PARA ACTUALIZAR EL LOGO DEL PUESTO EN LA GESTIÓN ===
function updateStoreLogoDisplay(logoUrl) {
    const logoContainer = document.getElementById('storeLogoUploadArea');
    const previewContainer = document.getElementById('storeLogoPreview');
    
    if (logoUrl) {
        logoContainer.innerHTML = `<img src="${logoUrl}" alt="Logo actual" style="max-width: 230px; max-height: 230px; border-radius: var(--border-radius-xl);">`;
        if (previewContainer) previewContainer.style.display = 'none';
    } else {
        logoContainer.innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra el logo aquí</p>';
        if (previewContainer) previewContainer.style.display = 'none';
    }
}

// === ACTUALIZAR updateUserProfile PARA MANEJAR EL LOGO DEL PUESTO - VERSIÓN CON DEPURACIÓN ===
async function updateUserProfile(userId) {
    try {
        if (!(await ensureSupabaseAvailable())) return;
        const supabaseClient = getSupabase();
        const { data: merchant, error: merchantError } = await supabaseClient.from('merchants').select('*').eq('id', userId).single();
        if (merchantError) {
            console.error("Error al cargar merchant:", merchantError);
            throw merchantError;
        }
        
        currentMerchantData = merchant;
        console.log("Perfil actualizado en memoria:", currentMerchantData);
        
        // Actualizar información del perfil
        document.getElementById('userName').textContent = currentMerchantData.name;
        document.getElementById('userEmail').textContent = currentMerchantData.email;
        document.getElementById('userPhone').textContent = currentMerchantData.phone || 'No especificado';
        document.getElementById('userBusiness').textContent = currentMerchantData.business;
        const createdAt = currentMerchantData.created_at;
        document.getElementById('userSince').textContent = createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A';
        
        // Actualizar foto de perfil (diferente del logo del puesto)
        const profilePicContainer = document.getElementById('profilePicContainer');
        if (currentMerchantData.profile_pic) {
            profilePicContainer.innerHTML = `<img src="${currentMerchantData.profile_pic}" alt="Foto de perfil" loading="lazy"><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`;
        } else {
            profilePicContainer.innerHTML = `<i class="fas fa-user"></i><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`;
        }
        
        // Actualizar información del puesto
        document.getElementById('storeName').value = currentMerchantData.business;
        document.getElementById('storeDescription').value = currentMerchantData.description;
        
        // Actualizar LOGO DEL PUESTO en la gestión (independiente de la foto de perfil)
        console.log("Actualizando logo del puesto en UI con:", currentMerchantData.store_logo);
        updateStoreLogoDisplay(currentMerchantData.store_logo);
        
        // Cargar productos del usuario para actualizar contador
        let productsQuery = supabaseClient.from('products').select('id');
        if (isValidId(userId)) productsQuery = productsQuery.eq('vendor_id', userId);
        const { data: products, error: productsError } = await productsQuery;
        if (productsError) throw productsError;
        document.getElementById('userProducts').textContent = `${(products || []).length} productos publicados`;
        
    } catch (error) { 
        console.error("Error loading profile:", error); 
    }
}

// === ACTUALIZAR toggleStoreEditMode PARA MANEJAR EL LOGO ===
window.toggleStoreEditMode = function(isEditing) {
    document.getElementById('storeName').readOnly = !isEditing;
    document.getElementById('storeDescription').readOnly = !isEditing;
    document.getElementById('storeLogoUploadArea').style.pointerEvents = isEditing ? 'auto' : 'none';
    document.getElementById('editStoreBtn').style.display = isEditing ? 'none' : 'block';
    document.getElementById('storeFormFooter').style.display = isEditing ? 'flex' : 'none';
    
    if (!isEditing && currentMerchantData) {
        document.getElementById('storeName').value = currentMerchantData.business;
        document.getElementById('storeDescription').value = currentMerchantData.description;
        updateStoreLogoDisplay(currentMerchantData.store_logo);
    }
};

// === ACTUALIZAR saveStoreInfo PARA GUARDAR EL LOGO DEL PUESTO - VERSIÓN CON DEPURACIÓN ===
window.saveStoreInfo = async function() {
    const newData = { 
        business: document.getElementById('storeName').value, 
        description: document.getElementById('storeDescription').value 
    };
    
    // Agregar logo del puesto si se subió uno nuevo (diferente de la foto de perfil)
    if (selectedStoreLogoUpload) {
        console.log("Guardando nuevo logo en newData:", selectedStoreLogoUpload.publicUrl);
        newData.store_logo = selectedStoreLogoUpload.publicUrl;
    } else {
        console.log("No hay nuevo logo seleccionado, no se actualiza store_logo en newData.");
    }
    
    const saveBtn = document.querySelector('#storeFormFooter .btn-primary');
    startButtonLoading(saveBtn, 'Guardando...');
    
    try {
        if (!(await ensureSupabaseAvailable())) { 
            console.warn("Supabase no disponible para guardar info del puesto.");
            stopButtonLoading(saveBtn); 
            return; 
        }
        const supabaseClient = getSupabase();
        console.log("Intentando actualizar merchant con datos:", newData);
        const { error } = await supabaseClient.from('merchants').update(newData).eq('id', currentUser.id);
        if (error) {
            console.error("Error al actualizar merchant en Supabase:", error);
            throw error;
        }
        
        console.log("Actualización de merchant exitosa. Recargando perfil.");
        await updateUserProfile(currentUser.id); 
        toggleStoreEditMode(false);
        showToast('Información del puesto actualizada.', 'success');
    } catch (error) {
        console.error("Error updating store info:", error);
        showToast('Error al actualizar la información.', 'error');
    } finally {
        stopButtonLoading(saveBtn);
    }
};

// === SUBIDA DEL LOGO DEL PUESTO (SOLO EN MODO EDICIÓN) - VERSIÓN CON DEPURACIÓN ===
function setupStoreLogoUpload() {
    const uploadArea = document.getElementById('storeLogoUploadArea');
    const fileInput = document.getElementById('storeLogoInput');
    const previewContainer = document.getElementById('storeLogoPreview');
    const previewImg = document.getElementById('storeLogoPreviewImg');

    if (!uploadArea || !fileInput) {
        console.warn('setupStoreLogoUpload: elementos no encontrados');
        return;
    }

    // Evento de click en el área
    uploadArea.addEventListener('click', (e) => {
        console.log("Evento click en storeLogoUploadArea detectado.");
        // Verificar si el footer de edición está visible
        const editFooter = document.getElementById('storeFormFooter');
        if (editFooter && editFooter.style.display !== 'none') {
            console.log("Modo edición detectado, abriendo selector de archivos.");
            // Si está visible, permitimos la subida
            fileInput.click();
        } else {
            // Si no está visible, no hacemos nada (fuera de modo edición)
            console.log("Subida de logo deshabilitada fuera de modo edición.");
        }
    });

    // Evento de cambio en el input de archivo
    fileInput.addEventListener('change', async (e) => {
        console.log("Evento change en storeLogoInput detectado.");
        const file = e.target.files[0];
        if (file) {
            console.log("Archivo seleccionado:", file.name, file.size, file.type);
            try {
                // Mostrar vista previa
                if (previewContainer && previewImg) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        previewImg.src = event.target.result;
                        previewContainer.style.display = 'block';
                    };
                    reader.readAsDataURL(file);
                }

                // Subir imagen inmediatamente
                if (!(await ensureSupabaseAvailable())) {
                    console.warn("Supabase no disponible para subida de logo.");
                    return;
                }

                const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 400 });
                console.log("Archivo comprimido:", compressedFile.name, compressedFile.size);
                const uploadResult = await uploadProductImage(compressedFile, currentUser?.id || 'anonymous');

                if (uploadResult) {
                    console.log("Subida exitosa, guardando en selectedStoreLogoUpload:", uploadResult);
                    selectedStoreLogoUpload = uploadResult;
                    updateStoreLogoDisplay(uploadResult.publicUrl);
                    showToast('Logo del puesto subido.', 'success');
                } else {
                    console.error("Subida fallida, uploadResult es null.");
                    showToast('Error al subir el logo.', 'error');
                }
            } catch (err) {
                console.error('Error uploading store logo:', err);
                showToast('Error al subir el logo.', 'error');
            }
        } else {
            console.warn("No se seleccionó un archivo.");
        }
    });
}

// --- REGISTRO Y LOGIN ---
window.registerMerchant = async function() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const business = document.getElementById('regBusiness').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const description = document.getElementById('regDescription').value.trim();
    const msgEl = document.getElementById('registerMessage');
    const registerBtn = document.querySelector('#register .btn-primary');

    if (!name || !email || !password || !business) {
        return showMessage(msgEl, 'Por favor completa todos los campos requeridos.', 'error');
    }
    if (password.length < 6) {
        return showMessage(msgEl, 'La contraseña debe tener al menos 6 caracteres.', 'error');
    }

    startButtonLoading(registerBtn, 'Registrando...');
    try {
        if (!(await ensureSupabaseAvailable())) {
            stopButtonLoading(registerBtn);
            return;
        }

        const supabaseClient = getSupabase();

        // 1. Verificar si el correo ya está registrado en Auth
        const { data: { user: existingUser }, error: signInError } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (!signInError && existingUser) {
            // Usuario ya existe → no crear de nuevo
            showMessage(msgEl, 'Este correo ya está registrado. Inicia sesión en su lugar.', 'error');
            stopButtonLoading(registerBtn);
            return;
        }

        // 2. Registrar nuevo usuario en Auth
        const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({ email, password });
        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                showMessage(msgEl, 'Este correo ya está registrado. Inicia sesión en su lugar.', 'error');
            } else {
                throw signUpError;
            }
            stopButtonLoading(registerBtn);
            return;
        }

        const userId = signUpData?.user?.id;
        if (!userId) throw new Error('No se obtuvo ID del usuario.');

        // 3. Verificar si ya existe en merchants
        const { data: existingMerchants, error: selectError } = await supabaseClient
            .from('merchants')
            .select('id')
            .eq('id', userId);

        if (selectError) throw selectError;

        const merchantData = {
            id: userId,
            name,
            email,
            business,
            phone,
            description,
            created_at: new Date().toISOString()
        };

        let dbError;
        if (existingMerchants && existingMerchants.length > 0) {
            // Ya existe → actualizar (por si el registro anterior fue incompleto)
            const { error } = await supabaseClient
                .from('merchants')
                .update(merchantData)
                .eq('id', userId);
            dbError = error;
        } else {
            // No existe → insertar
            const { error } = await supabaseClient
                .from('merchants')
                .insert([merchantData]);
            dbError = error;
        }

if (dbError) throw dbError;

// ✅ Establecer sesión activa
currentUser = { id: userId, email };
isMerchant = true;
currentMerchantData = null;

// ✅ Cargar perfil inmediatamente desde la base de datos
await updateUserProfile(userId);

// ✅ Actualizar menú y mostrar sección
updateAuthUI();
showSection('my-store');

showMessage(msgEl, '¡Registro exitoso! Bienvenido a tu puesto.', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('my-store');
        }, 1500);

    } catch (error) {
        console.error('Error en registro:', error);
        let userMsg = 'Error en el registro.';
        if (error?.message) {
            if (error.message.includes('already registered')) {
                userMsg = 'Este correo ya está registrado. Inicia sesión en su lugar.';
            } else {
                userMsg += ' ' + error.message;
            }
        }
        showMessage(msgEl, userMsg, 'error');
    } finally {
        stopButtonLoading(registerBtn);
    }
};

window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msgEl = document.getElementById('loginMessage');
    const loginBtn = document.querySelector('#loginModal .btn-primary');
    if (!email || !password) {
        return showMessage(msgEl, 'Por favor completa todos los campos.', 'error');
    }
    startButtonLoading(loginBtn, 'Iniciando...');
    try {
        if (!(await ensureSupabaseAvailable())) {
            stopButtonLoading(loginBtn);
            return;
        }
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage(msgEl, '¡Bienvenido!', 'success');
        // After a successful sign-in, refresh session info, set currentUser, and update UI/data
        try {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (session && session.user) {
                currentUser = { id: session.user.id, email: session.user.email };
                isMerchant = true;
                // Load latest merchant/profile data and update UI
                await updateUserProfile(currentUser.id);
                updateAuthUI();
                // If a function to load merchant products exists, call it to refresh the management view
                if (typeof loadMyProducts === 'function') {
                    try { await loadMyProducts(); } catch (e) { console.warn('loadMyProducts failed:', e); }
                } else if (typeof loadMyProductsWrapper === 'function') {
                    try { await loadMyProductsWrapper(); } catch (e) { console.warn('loadMyProductsWrapper failed:', e); }
                }
            }
        } catch (e) {
            console.warn('Error al refrescar sesión tras login:', e);
        }

        setTimeout(() => {
            hideLogin();
            showSection('my-store'); // ✅ Redirigir a Mi Puesto al iniciar sesión
        }, 700);
    } catch (error) {
        console.error('Error login:', error);
        let userMsg = 'Correo o contraseña incorrectos.';
        if (error && error.message) userMsg = `${userMsg} ${error.message}`;
        showMessage(msgEl, userMsg, 'error');
    } finally {
        stopButtonLoading(loginBtn);
    }
};
window.logout = async function() { 
    await supabase.auth.signOut(); 
};

function setupImageUpload(areaId, inputId, fileVariableSetter) {
    const uploadArea = document.getElementById(areaId);
    const fileInput = document.getElementById(inputId);
    if (!uploadArea || !fileInput) {
        console.warn(`setupImageUpload: elementos no encontrados (${areaId}, ${inputId})`);
        return;
    }
    uploadArea.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileVariableSetter(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadArea.innerHTML = `<img src="${event.target.result}" class="preview-image" loading="lazy">`;
            };
            reader.readAsDataURL(file);
            (async () => {
                try {
                    if (inputId.includes('product')) selectedProductUpload = null;
                    if (inputId.includes('profile')) selectedProfilePicUpload = null;
                    if (!(await ensureSupabaseAvailable())) return;
                    if (!document.getElementById('upload-spinner-styles')) {
                        const style = document.createElement('style');
                        style.id = 'upload-spinner-styles';
                        style.innerHTML = `
                        .uploading-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px;color:#444}
                        .small-spinner{width:28px;height:28px;border:4px solid rgba(0,0,0,0.1);border-top-color:var(--cyan,#06b6d4);border-radius:50%;animation:spin 0.9s linear infinite;margin-bottom:6px}
                        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
                        `;
                        document.head.appendChild(style);
                    }
                    const prev = uploadArea.innerHTML;
                    uploadArea.innerHTML = `<div class="uploading-placeholder"><div class="small-spinner"></div><div style="font-size:0.9em">Subiendo...</div></div>`;
                    const opts = inputId.includes('product') ? { maxSizeMB: 0.5, maxWidthOrHeight: 800 } : { maxSizeMB: 0.2, maxWidthOrHeight: 400 };
                    const compressed = await imageCompression(file, opts);
                    const supId = currentUser?.id || 'anonymous';
                    const uploadResult = await uploadProductImage(compressed, supId);
                    if (uploadResult) {
                        const publicUrl = uploadResult.publicUrl;
                        if (inputId.includes('product')) selectedProductUpload = uploadResult;
                        if (inputId.includes('profile')) selectedProfilePicUpload = uploadResult;
                        uploadArea.innerHTML = `<img src="${publicUrl}" class="preview-image" loading="lazy">`;
                        uploadArea.dataset.existingImage = publicUrl;
                    } else {
                        uploadArea.innerHTML = prev;
                    }
                } catch (err) {
                    console.error('Immediate upload failed:', err);
                }
            })();
        }
    });
}

window.toggleProfileEditMode = function(isEditing) {
    const card = document.getElementById('profileCard');
    card.classList.toggle('edit-mode', isEditing);
    document.getElementById('editProfileBtn').style.display = isEditing ? 'none' : 'block';
    document.getElementById('profileFormFooter').style.display = isEditing ? 'flex' : 'none';
    if (isEditing) {
        document.getElementById('userNameInput').value = document.getElementById('userName').textContent;
        const currentPhone = document.getElementById('userPhone').textContent;
        document.getElementById('userPhoneInput').value = currentPhone === 'No especificado' ? '' : currentPhone;
    }
};
window.saveProfileInfo = async function() {
    const newData = {
        name: document.getElementById('userNameInput').value.trim(),
        phone: document.getElementById('userPhoneInput').value.trim()
    };
    const saveBtn = document.querySelector('#profileFormFooter .btn-primary');
    startButtonLoading(saveBtn, 'Actualizando...');
    try {
        if (!(await ensureSupabaseAvailable())) { 
            stopButtonLoading(saveBtn); 
            return; 
        }
        const supabaseClient = getSupabase();
        const { error } = await supabaseClient.from('merchants').update(newData).eq('id', currentUser.id);
        if (error) throw error;
        await updateUserProfile(currentUser.id);
        toggleProfileEditMode(false);
        showToast('Perfil actualizado.', 'success');
    } catch (error) {
        console.error("Error updating profile:", error);
        showToast('Error al actualizar el perfil.', 'error');
    } finally {
        stopButtonLoading(saveBtn);
    }
};
window.showProfilePicModal = function() {
    document.getElementById('profilePicModal').style.display = 'flex';
    selectedProfilePicFile = null;
    selectedAvatarUrl = null;
    document.getElementById('profilePicUploadArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic para subir</p>';
};
window.saveProfilePic = async function() {
    let picUrl = null;
    if (selectedProfilePicUpload) {
        picUrl = selectedProfilePicUpload.publicUrl;
    } else if (selectedProfilePicFile) {
        try {
            const compressedFile = await imageCompression(selectedProfilePicFile, { maxSizeMB: 0.2, maxWidthOrHeight: 400 });
            const upload = await uploadProductImage(compressedFile, currentUser?.id || 'anonymous');
            if (upload) {
                selectedProfilePicUpload = upload;
                picUrl = upload.publicUrl;
            } else {
                picUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(compressedFile);
                });
            }
        } catch (e) { 
            console.error('Error uploading profile pic:', e); 
        }
    } else if (selectedAvatarUrl) {
        picUrl = selectedAvatarUrl;
    }
    if(picUrl) {
        try {
            if (!(await ensureSupabaseAvailable())) {
                return showToast('No se puede conectar a Supabase para actualizar la foto.', 'error');
            }
            const supabaseClient = getSupabase();
            const { error } = await supabaseClient.from('merchants').update({ profile_pic: picUrl }).eq('id', currentUser.id);
            if (error) throw error;
            await updateUserProfile(currentUser.id);
            hideModal('profilePicModal');
            selectedProfilePicUpload = null;
            showToast('Foto de perfil actualizada.', 'success');
        } catch (err) {
            console.error('Error updating profile pic:', err);
            showToast('Error al actualizar la foto de perfil.', 'error');
        }
    } else {
        showToast('No seleccionaste ninguna imagen.', 'error');
    }
};

// ✅ FUNCIÓN CORREGIDA: Verifica que el contenedor exista
function populateAvatars() {
    const container = document.getElementById('avatarSelection');
    if (!container) {
        console.warn('⚠️ #avatarSelection no encontrado. El modal de perfil no está en el DOM.');
        return;
    }
    container.innerHTML = '';
    const avatars = ['male', 'female', 'human', 'identicon', 'bottts', 'avataaars', 'jdenticon', 'micah'];
    avatars.forEach(seed => {
        const avatarUrl = `https://api.dicebear.com/8.x/pixel-art/svg?seed=${seed}&radius=50`;
        const avatarItem = document.createElement('div');
        avatarItem.className = 'avatar-item';
        avatarItem.innerHTML = `<img src="${avatarUrl}" alt="Avatar ${seed}" loading="lazy">`;
        avatarItem.onclick = () => {
            selectedAvatarUrl = avatarUrl;
            selectedProfilePicFile = null;
            const uploadArea = document.getElementById('profilePicUploadArea');
            if (uploadArea) {
                uploadArea.innerHTML = `<img src="${avatarUrl}" class="preview-image">`;
            }
            document.querySelectorAll('.avatar-item').forEach(el => el.style.borderColor = 'transparent');
            avatarItem.style.borderColor = 'var(--cyan)';
        };
        container.appendChild(avatarItem);
    });
}

// --- UTILIDADES Y FUNCIONES AUXILIARES ---
function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `login-message login-${type}`;
    element.style.display = 'block';
}
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}
window.toggleChatbot = function toggleChatbot() {
    const ctn = document.getElementById('chatbotContainer');
    const isOpen = ctn.classList.toggle('visible');
    if (typeof gsap !== 'undefined') {
        gsap.to(ctn, { scale: isOpen ? 1 : 0.9, opacity: isOpen ? 1 : 0, duration: 0.3 });
    } else {
         ctn.style.opacity = isOpen ? '1' : '0';
    }
};
function startButtonLoading(button, loadingText = 'Cargando...') {
    if (!button) return;
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    button.style.opacity = '0.7';
}
function stopButtonLoading(button) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || 'Guardar';
    button.style.opacity = '1';
    delete button.dataset.originalText;
}
function updateAuthUI() {
    if (isMerchant && currentUser) {
        // Mostrar enlaces directos en el header
        authContainer.innerHTML = `
            <a href="#" class="nav-link" onclick="showSection('profile')">
                <i class="fas fa-user"></i>
                <span>Mi Perfil</span>
            </a>
            <a href="#" class="nav-link" onclick="showSection('my-store')">
                <i class="fas fa-store"></i>
                <span>Mi Puesto</span>
            </a>
        `;
        profileLink.style.display = 'none'; // Ya no se usa el enlace del menú lateral
        storeLink.style.display = 'none';
    } else {
        authContainer.innerHTML = `
            <a href="#" class="nav-link" onclick="showLogin()">
                <i class="fas fa-sign-in-alt"></i>
                <span>Iniciar sesión</span>
            </a>
        `;
        profileLink.style.display = 'none';
        storeLink.style.display = 'none';
    }
}

// === DELEGACIÓN DE EVENTOS PARA BOTONES DINÁMICOS ===
document.addEventListener('click', function(e) {
    if (e.target.id === 'create-catalog-btn') {
        document.getElementById('catalog-options-modal').style.display = 'flex';
    } else if (e.target.id === 'backup-btn') {
        document.getElementById('backup-options-modal').style.display = 'flex';
    } else if (e.target.id === 'generate-pdf-btn') {
        hideModal('catalog-options-modal');
        showExportModal('pdf');
    } else if (e.target.id === 'generate-jpg-btn') {
        loadUserProductsForSelection();
    }
});
document.addEventListener('change', function(e) {
    if (e.target.id === 'json-import-input') {
        handleJsonImport(e);
    }
});

// === FUNCIONES DE COMPATIBILIDAD PARA NAVEGACIÓN ENTRE MÓDULOS ===
if (typeof window.loadProductsWrapper === 'undefined') {
    window.loadProductsWrapper = function(containerId = 'productsGrid', filter = {}) {
        if (typeof loadProducts === 'function') {
            return loadProducts(containerId, filter);
        } else {
            console.warn('loadProducts no está disponible aún');
        }
    };
}
if (typeof window.loadMyProductsWrapper === 'undefined') {
    window.loadMyProductsWrapper = function() {
        if (typeof loadMyProducts === 'function') {
            return loadMyProducts();
        } else {
            console.warn('loadMyProducts no está disponible aún');
        }
    };
}

// === GENERAR PARTÍCULAS DE FUEGO ===
function createFireParticles() {
    const container = document.getElementById('fire-particles');
    if (!container) return;

    const particleCount = Math.min(30, window.innerWidth / 30); // Ajustar según el ancho

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        
        // Posición horizontal aleatoria
        const leftPos = Math.random() * 100;
        particle.style.left = `${leftPos}%`;
        
        // Tamaño y duración aleatorios
        const size = 4 + Math.random() * 8;
        const duration = 8 + Math.random() * 12;
        const drift = -20 + Math.random() * 40; // Deriva horizontal (-20 a +20px)
        
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animationDuration = `${duration}s`;
        particle.style.setProperty('--drift', drift.toString());
        
        // Retraso aleatorio para evitar sincronía
        particle.style.animationDelay = `${Math.random() * 5}s`;
        
        container.appendChild(particle);
    }
}

// Ejecutar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    createFireParticles();
});

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
async function initializeApp() {
    showInitialLoadingSpinner('Cargando Feria Virtual...');
    try {
        const supReachable = await isSupabaseReachable();
        window._supabaseReachable = supReachable;
        if (!supReachable) {
            console.warn('Supabase no alcanzable, modo sin conexión');
            showSupabaseNetworkBanner('Modo sin conexión. Algunas funciones pueden no estar disponibles.');
        }
        if (supReachable) {
            initializeSupabaseClient();
            const supabaseClient = getSupabase();
            try {
                const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
                if (session && session.user && !sessionError) {
                    const { data: merchant, error: merchantError } = await supabaseClient
                        .from('merchants')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    if (!merchantError && merchant) {
                        currentUser = { id: session.user.id, email: session.user.email }; 
                        isMerchant = true;
                        await updateUserProfile(session.user.id);
                        showSection('my-store'); // ✅ Redirigir a Mi Puesto al iniciar
                    } else {
                        currentUser = null;
                        isMerchant = false;
                        currentMerchantData = null;
                        showSection('home');
                    }
                } else {
                    currentUser = null;
                    isMerchant = false;
                    currentMerchantData = null;
                    showSection('home');
                }
            } catch (authError) {
                console.warn('Error al verificar autenticación:', authError);
                currentUser = null;
                isMerchant = false;
                currentMerchantData = null;
                showSection('home');
            }
        } else {
            currentUser = null;
            isMerchant = false;
            currentMerchantData = null;
            showSection('home');
        }
    } catch (e) {
        console.error('Error en inicialización:', e);
        currentUser = null;
        isMerchant = false;
        currentMerchantData = null;
        showSection('home');
    }

    hideInitialLoadingSpinner();
    updateAuthUI();

    // Eventos del DOM
    const loginPasswordInput = document.getElementById('loginPassword');
    if (loginPasswordInput) {
        loginPasswordInput.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') login();
        });
    }
    document.addEventListener('keydown', closeActiveModalOnEsc);
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    if (hamburgerMenu) {
        hamburgerMenu.addEventListener('click', function() {
            document.getElementById('navContainer').classList.toggle('active');
            document.getElementById('navOverlay').classList.toggle('active');
        });
    }
    const navOverlay = document.getElementById('navOverlay');
    if (navOverlay) {
        navOverlay.addEventListener('click', function() {
            document.getElementById('navContainer').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
        });
    }
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.getElementById('navContainer').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
        });
    });
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const applyTheme = (theme) => { 
            document.body.dataset.theme = theme; 
            localStorage.setItem('theme', theme); 
        };
        themeToggle.addEventListener('click', () => {
            const newTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
            applyTheme(newTheme);
        });
        applyTheme(localStorage.getItem('theme') || 'light');
    }

    // ✅ Inicializar avatares, uploads y logo del puesto
    populateAvatars();
    setupImageUpload('productImageUploadArea', 'productImageInput', (file) => selectedProductFile = file);
    setupImageUpload('profilePicUploadArea', 'profilePicInput', (file) => {
        selectedProfilePicFile = file;
        selectedAvatarUrl = null;
        document.querySelectorAll('.avatar-item').forEach(el => el.style.borderColor = 'transparent');
    });
    setupStoreLogoUpload(); // Inicializar subida de logo del puesto

    // ✅ Cargar productos y carrito
    if (typeof loadProducts === 'function') {
        loadProducts();
    }
    if (typeof loadCartFromLocalStorage === 'function') {
        loadCartFromLocalStorage();
    }
}
// ✅ Inicializar contador de favoritos (versión segura)
try {
    const stored = localStorage.getItem('feriaVirtualFavorites');
    const favs = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(favs)) {
        throw new Error('Invalid favorites format');
    }
    document.getElementById('favoritesCount').textContent = favs.length;
} catch (e) {
    console.warn('Favoritos corruptos en localStorage. Reiniciando.');
    localStorage.setItem('feriaVirtualFavorites', '[]');
    document.getElementById('favoritesCount').textContent = '0';
}
// ✅ Ejecutar SOLO cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeApp);


