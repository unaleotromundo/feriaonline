// Permitir navegación con flechas del teclado en el lightbox
document.addEventListener('keydown', function(e) {
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox && lightbox.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
            prevProduct();
            e.preventDefault();
        } else if (e.key === 'ArrowRight') {
            nextProduct();
            e.preventDefault();
        }
    }
});

/**
 * Cierra el modal, panel o lightbox activo cuando se presiona la tecla Esc.
 * Se verifica en orden de prioridad: Lightbox > Carrito > Cualquier Modal > Menú Hamburguesa.
 */
function closeActiveModalOnEsc(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        // 1. Cerrar Lightbox si está visible
        const lightbox = document.getElementById('imageLightbox');
        if (lightbox && lightbox.style.display === 'flex') {
            hideImageLightbox();
            event.preventDefault();
            return;
        }

        // 2. Cerrar Panel del Carrito si está activo
        const cartPanel = document.getElementById('cartPanel');
        if (cartPanel && cartPanel.classList.contains('active')) {
            toggleCart();
            event.preventDefault();
            return;
        }

        // 3. Cerrar cualquier modal que esté visible (display: flex)
        const modals = document.querySelectorAll('.login-modal');
        for (let modal of modals) {
            if (modal.style.display === 'flex') {
                hideModal(modal.id);
                event.preventDefault();
                return;
            }
        }

        // 4. Cerrar el menú hamburguesa si está activo
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
    // Mensajes animados
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

window.generateCatalogJPG = async function() {
    if (!currentUser) return showToast('Debes iniciar sesión para generar imágenes.', 'error');
    showGlobalLoadingOverlay('Generando imágenes del catálogo...');
    try {
        const { data: productsData, error } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id);
        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            hideGlobalLoadingOverlay();
            return showToast('No tienes productos para generar imágenes.', 'error');
        }
        const products = productsData.map(r => normalizeProductRow(r));
        // Crear un contenedor temporal para renderizar productos
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px';
        tempDiv.style.background = '#fff';
        tempDiv.style.padding = '20px';
        tempDiv.innerHTML = '<h2>Catálogo de Productos</h2>';
        products.forEach((product, idx) => {
            const prodDiv = document.createElement('div');
            prodDiv.style.border = '1px solid #ccc';
            prodDiv.style.margin = '10px 0';
            prodDiv.style.padding = '10px';
            prodDiv.innerHTML = `<strong>${idx + 1}. ${product.name || 'Sin nombre'}</strong><br>
                Precio: $${product.price || 'N/A'}<br>
                Descripción: ${product.description || ''}<br>`;
            if (product.imageBase64) {
                const img = document.createElement('img');
                img.src = product.imageBase64;
                img.style.maxWidth = '200px';
                img.style.display = 'block';
                prodDiv.appendChild(img);
            }
            tempDiv.appendChild(prodDiv);
        });
        document.body.appendChild(tempDiv);
        // Usar html2canvas para capturar el contenedor
        if (window.html2canvas) {
            const canvas = await window.html2canvas(tempDiv);
            const imgData = canvas.toDataURL('image/jpeg');
            const a = document.createElement('a');
            a.href = imgData;
            a.download = `catalogo-feria-virtual-${new Date().toISOString().slice(0, 10)}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Imagen JPG generada correctamente.', 'success');
        } else {
            showToast('No se encontró html2canvas. No se puede generar la imagen.', 'error');
        }
        document.body.removeChild(tempDiv);
    } catch (error) {
        console.error('Error generando JPG:', error);
        showToast('Hubo un error al generar la imagen.', 'error');
    } finally {
        hideGlobalLoadingOverlay();
    }
}

window.generatePdfWithJsPDF = async function() {
    if (!currentUser) return showToast('Debes iniciar sesión para generar el PDF.', 'error');
    showGlobalLoadingOverlay('Generando PDF del catálogo...');
    try {
        const { data: productsData, error } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id);
        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            hideGlobalLoadingOverlay();
            return showToast('No tienes productos para generar el PDF.', 'error');
        }
        const products = productsData.map(r => normalizeProductRow(r));
        const docPdf = new window.jspdf.jsPDF();
        docPdf.setFontSize(16);
        docPdf.text('Catálogo de Productos', 20, 20);
        let y = 35;
        products.forEach((product, idx) => {
            docPdf.setFontSize(12);
            docPdf.text(`${idx + 1}. ${product.name || 'Sin nombre'}`, 20, y);
            y += 7;
            docPdf.text(`Precio: $${product.price || 'N/A'}`, 25, y);
            y += 7;
            docPdf.text(`Descripción: ${product.description || ''}`, 25, y);
            y += 7;
            if (product.imageBase64) {
                try {
                    docPdf.addImage(product.imageBase64, 'JPEG', 150, y - 21, 40, 30);
                } catch (imgErr) {
                    // Si la imagen falla, continuar sin ella
                }
            }
            y += 30;
            if (y > 270) {
                docPdf.addPage();
                y = 20;
            }
        });
        docPdf.save(`catalogo-feria-virtual-${new Date().toISOString().slice(0, 10)}.pdf`);
        showToast('PDF generado correctamente.', 'success');
    } catch (error) {
        console.error('Error generando PDF:', error);
        showToast('Hubo un error al generar el PDF.', 'error');
    } finally {
        hideGlobalLoadingOverlay();
    }
}

// Feria Virtual - Lógica de la Aplicación
// Configuración de Supabase (cliente UMD cargado desde index.html)
const supabaseUrl = 'https://gkddymcuajakvghffava.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZGR5bWN1YWpha3ZnaGZmYXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzUyNDksImV4cCI6MjA3MzQ1MTI0OX0.12aqVrRdAGaSq6eEm5xcwqkPpNyEdQdA77t8MeKhWKw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

// --- VARIABLES GLOBALES ---
let currentUser = null;
let isMerchant = false;
let currentMerchantData = null;
let selectedProductFile = null;
let selectedProfilePicFile = null;
let selectedAvatarUrl = null;
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

// Util: normaliza filas de la base (snake_case) a los campos camelCase usados en UI
function normalizeProductRow(row) {
    if (!row) return row;
    return {
        id: row.id,
        name: row.name,
        price: row.price,
        description: row.description,
        imageBase64: row.image_base64 || row.imageBase64 || null,
        vendorId: row.vendor_id || row.vendorId,
        vendorName: row.vendor_name || row.vendorName,
        published: row.published,
        createdAt: row.created_at || row.createdAt
    };
}
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos en milisegundos

// --- MENSAJES PARA SPINNER DE CARGA INICIAL (APP) ---
const appLoadingMessages = [
    "Cargando Feria Virtual...",
    "Estableciendo puestos...",
    "Ordenando ropa...",
    "Regando plantitas...",
    "Encendiendo las luces de la feria...",
    "Preparando el café para los vendedores...",
    "Alistando los carritos...",
    "Poniendo precios justos...",
    "¡Bienvenido! Un momentito más...",
    "Conectando con la nube..."
];

// --- MENSAJES PARA SPINNER DE CARGA DE PRODUCTOS ---
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
    document.getElementById('navContainer').classList.remove('active');
    document.getElementById('navOverlay').classList.remove('active'); // Cerrar overlay al cambiar de sección
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'my-store' && isMerchant) loadMyProducts();
}

window.showLogin = function() { document.getElementById('loginModal').style.display = 'flex'; }
window.hideLogin = function() { document.getElementById('loginModal').style.display = 'none'; }

// --- FUNCIÓN hideModal ACTUALIZADA ---
window.hideModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    // Asegurarse de que el menú hamburguesa también esté cerrado
    document.getElementById('navContainer').classList.remove('active');
    document.getElementById('navOverlay').classList.remove('active');
}

window.showProductModal = function(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    resetProductForm();
    modal.style.display = 'flex';
    if (productId) {
        title.textContent = 'Editar Producto';
        modal.dataset.productId = productId;
        loadProductForEdit(productId);
    } else {
        title.textContent = 'Agregar Nuevo Producto';
        delete modal.dataset.productId;
    }
}

async function loadProducts(containerId = 'productsGrid', filter = {}) {
    const productsGrid = document.getElementById(containerId);
    // Mostrar el corredor animado
    showRunnerOverlay();
    try {
        // Usar Supabase: las columnas en la BD están en snake_case
        let q = supabase.from('products').select('*').eq('published', true);
        if (filter.vendorId) q = q.eq('vendor_id', filter.vendorId);
        q = q.order('created_at', { ascending: false });
        const { data, error } = await q;
        // Ocultar el corredor
        hideRunnerOverlay();
        productsGrid.innerHTML = '';
        if (error) throw error;
        if (!data || data.length === 0) {
            productsGrid.innerHTML = `<div>No hay productos para mostrar.</div>`;
            return;
        }
        data.forEach(row => renderProductCard(productsGrid, normalizeProductRow(row)));
    } catch (error) {
        console.error("Error loading products:", error);
        // Asegurarse de ocultar el overlay incluso si hay error
        hideRunnerOverlay();
        productsGrid.innerHTML = `<div>Error al cargar productos.</div>`;
    }
}

async function loadMyProducts() {
    if (!currentUser) return;
    const productsGrid = document.getElementById('myProductsGrid');
    // Mostrar el corredor animado
    showRunnerOverlay();
    try {
        const { data, error } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id).order('created_at', { ascending: false });
        if (error) throw error;
        const products = (data || []).map(r => normalizeProductRow(r));
        // Ocultar el corredor
        hideRunnerOverlay();
        productsGrid.innerHTML = '';
        if (products.length === 0) {
            productsGrid.innerHTML = '<div>Aún no has agregado productos.</div>';
            return;
        }
        products.forEach(product => renderMyProductCard(productsGrid, product));
    } catch (error) {
        console.error("Error loading user products:", error);
        // Asegurarse de ocultar el overlay incluso si hay error
        hideRunnerOverlay();
    }
}

window.registerMerchant = async function() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const business = document.getElementById('regBusiness').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const description = document.getElementById('regDescription').value.trim();
    const msgEl = document.getElementById('registerMessage');
    const registerBtn = document.querySelector('#register .btn-primary'); // Selecciono el botón "Registrarme"
    if (!name || !email || !password || !business) return showMessage(msgEl, 'Por favor completa todos los campos requeridos.', 'error');
    if (password.length < 6) return showMessage(msgEl, 'La contraseña debe tener al menos 6 caracteres.', 'error');
    // --- INICIO DE LA CARGA ---
    startButtonLoading(registerBtn, 'Registrando...');
    try {
        // Crear usuario en Supabase
        const { data: signData, error: signError } = await supabase.auth.signUp({ email, password });
        if (signError) throw signError;
        const userId = signData?.user?.id;
        // Insertar merchant en la tabla 'merchants' (usar id igual al userId)
        const { error: insertError } = await supabase.from('merchants').insert([{ id: userId, name, email, business, phone, description, created_at: new Date().toISOString() }]);
        if (insertError) throw insertError;
        showMessage(msgEl, '¡Registro exitoso! Revisa tu correo para confirmar (si aplica).', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1000);
    } catch (error) {
        console.error('Error en registro:', error);
        showMessage(msgEl, 'Error en el registro.', 'error');
    } finally {
        // --- FIN DE LA CARGA (SIEMPRE se ejecuta, incluso si hay error) ---
        stopButtonLoading(registerBtn);
    }
}

window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msgEl = document.getElementById('loginMessage');
    const loginBtn = document.querySelector('#loginModal .btn-primary'); // El botón de login en el modal
    if (!email || !password) return showMessage(msgEl, 'Por favor completa todos los campos.', 'error');
    // --- INICIO DE LA CARGA ---
    startButtonLoading(loginBtn, 'Iniciando...');
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showMessage(msgEl, '¡Bienvenido!', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1000);
    } catch (error) {
        console.error('Error login:', error);
        showMessage(msgEl, 'Correo o contraseña incorrectos.', 'error');
    } finally {
        // --- FIN DE LA CARGA ---
        stopButtonLoading(loginBtn);
    }
}

window.logout = async function() { await supabase.auth.signOut(); }

async function updateUserProfile(userId) {
    try {
        const { data: merchant, error: merchantError } = await supabase.from('merchants').select('*').eq('id', userId).single();
        if (merchantError) throw merchantError;
        currentMerchantData = merchant;
        const { data: products, error: productsError } = await supabase.from('products').select('*').eq('vendor_id', userId);
        if (productsError) throw productsError;
        document.getElementById('userName').textContent = currentMerchantData.name;
        document.getElementById('userEmail').textContent = currentMerchantData.email;
        document.getElementById('userPhone').textContent = currentMerchantData.phone || 'No especificado';
        document.getElementById('userBusiness').textContent = currentMerchantData.business;
        document.getElementById('userProducts').textContent = `${(products || []).length} productos publicados`;
        const createdAt = currentMerchantData.created_at;
        document.getElementById('userSince').textContent = createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A';
        const profilePicContainer = document.getElementById('profilePicContainer');
        if (currentMerchantData.profile_pic) {
            profilePicContainer.innerHTML = `<img src="${currentMerchantData.profile_pic}" alt="Foto de perfil" loading="lazy"><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`;
        } else {
             profilePicContainer.innerHTML = `<i class="fas fa-user"></i><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`;
        }
        document.getElementById('storeName').value = currentMerchantData.business;
        document.getElementById('storeDescription').value = currentMerchantData.description;
    } catch (error) { console.error("Error loading profile:", error); }
}

function setupImageUpload(areaId, inputId, fileVariableSetter) {
    const uploadArea = document.getElementById(areaId);
    const fileInput = document.getElementById(inputId);
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
        }
    });
}

async function loadProductForEdit(productId) {
    try {
        const { data: row, error } = await supabase.from('products').select('*').eq('id', productId).single();
        if (error) throw error;
        const product = normalizeProductRow(row);
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description;
        if (product.imageBase64) {
            document.getElementById('productImageUploadArea').innerHTML = `<img src="${product.imageBase64}" class="preview-image">`;
            document.getElementById('productImageUploadArea').dataset.existingImage = product.imageBase64;
        }
    } catch (error) { console.error("Error loading product for edit:", error); } 
}

window.saveProduct = async function() {
    const isEditing = !!document.getElementById('productModal').dataset.productId;
    const productData = { name: document.getElementById('productName').value, price: parseFloat(document.getElementById('productPrice').value), description: document.getElementById('productDescription').value, vendorId: currentUser.uid, vendorName: document.getElementById('userBusiness').textContent };
    let imageBase64 = document.getElementById('productImageUploadArea').dataset.existingImage || null;
    if (selectedProductFile) {
        const compressedFile = await imageCompression(selectedProductFile, { maxSizeMB: 0.5, maxWidthOrHeight: 800 });
        imageBase64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(compressedFile);
        });
    }
    productData.imageBase64 = imageBase64;
    const dbProduct = {
        name: productData.name,
        price: productData.price,
        description: productData.description,
        vendor_id: productData.vendorId,
        vendor_name: productData.vendorName,
        image_base64: productData.imageBase64,
        published: true
    };
    if (!isEditing) dbProduct.created_at = new Date().toISOString();
    // --- INICIO DE LA CARGA ---
    const saveBtn = document.querySelector('#productModal .btn-primary'); // El botón "Guardar Producto" en el modal
    startButtonLoading(saveBtn, 'Guardando...');
    try {
        if (isEditing) {
            const productId = document.getElementById('productModal').dataset.productId;
            const { error } = await supabase.from('products').update(dbProduct).eq('id', productId);
            if (error) throw error;
        } else {
            const { error } = await supabase.from('products').insert([dbProduct]);
            if (error) throw error;
        }
        showToast('Producto guardado.', 'success');
        hideModal('productModal');
        loadMyProducts();
    } catch (error) {
        console.error("Error saving product:", error);
        showToast('Error al guardar el producto.', 'error');
    } finally {
        // --- FIN DE LA CARGA ---
        stopButtonLoading(saveBtn);
    }
}

function resetProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productImageUploadArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra una imagen aquí</p>';
    document.getElementById('productImageInput').value = '';
    delete document.getElementById('productImageUploadArea').dataset.existingImage;
    selectedProductFile = null;
}

function renderProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image" ${product.imageBase64 ? `style="background-image: url('${product.imageBase64}')" onclick="showImageLightbox('${product.imageBase64}', { name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId}', id: '${product.id}' })"` : ''}>
            ${!product.imageBase64 ? '<i class="fas fa-shopping-bag"></i>' : ''}
            <!-- === BOTÓN DE CARRITO EN LA IMAGEN (ESQUINA SUPERIOR DERECHA) === -->
            <button class="btn-add-to-cart-overlay" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                <i class="fas fa-cart-plus"></i>
            </button>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-actions">
                <div class="product-vendor">
                    <i class="fas fa-store"></i>
                    <a href="#" onclick="event.preventDefault(); showVendorPage('${product.vendorId}', '${product.vendorName}')">${product.vendorName || ''}</a>
                    <!-- === BOTÓN DE CARRITO PEQUEÑO A LA DERECHA DEL NOMBRE === -->
                    <button class="btn-add-to-cart-minimal" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>`;
    container.appendChild(card);
}

function renderMyProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image" style="${product.imageBase64 ? `background-image: url('${product.imageBase64}')` : ''}" ${product.imageBase64 ? `onclick="showImageLightbox('${product.imageBase64}', { name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId}', id: '${product.id}' })"` : ''}>
            <!-- === BOTÓN DE CARRITO EN LA IMAGEN (ESQUINA SUPERIOR DERECHA) === -->
            <button class="btn-add-to-cart-overlay" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                <i class="fas fa-cart-plus"></i>
            </button>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <div class="product-actions">
                <button class="action-btn" onclick="showProductModal('${product.id}')"><i class="fas fa-edit"></i></button>
                <!-- BOTÓN DE ELIMINAR REMOVIDO POR PETICIÓN DEL USUARIO -->
                <button class="action-btn" onclick="toggleProductStatus('${product.id}', ${!product.published})"><i class="fas fa-eye${product.published ? '' : '-slash'}"></i></button>
                <!-- === BOTÓN DE CARRITO PEQUEÑO === -->
                <button class="btn-add-to-cart-minimal" onclick="addToCartWithAnimation(this, ${JSON.stringify(product).replace(/"/g, '&quot;')})">
                    <i class="fas fa-cart-plus"></i>
                </button>
            </div>
        </div>`;
    container.appendChild(card);
}

// window.deleteProduct = async function(id) { if (confirm('¿Eliminar producto?')) { await supabase.from('products').delete().eq('id', id); loadMyProducts(); showToast('Producto eliminado.'); } }
window.toggleProductStatus = async function(id, status) { 
    try {
        const { error } = await supabase.from('products').update({ published: status }).eq('id', id);
        if (error) throw error;
        loadMyProducts();
    } catch (err) { console.error('Error toggling product status:', err); }
}

window.showVendorPage = async function(vendorId, vendorName) {
    showSection('vendor-page');
    document.getElementById('vendorPageTitle').textContent = vendorName;
    const whatsappBtn = document.getElementById('vendorWhatsappBtn');
    whatsappBtn.style.display = 'none';
    try {
        const { data: merchant, error } = await supabase.from('merchants').select('*').eq('id', vendorId).single();
        if (!error && merchant && merchant.phone) {
            const phone = merchant.phone.replace(/[^0-9]/g, '');
            if (phone) {
                whatsappBtn.href = `https://wa.me/${phone}`;
                whatsappBtn.style.display = 'inline-flex';
            }
        }
// --- NUEVO: LÓGICA PARA EXPANDIR EL BOTÓN DE WHATSAPP EN DISPOSITIVOS TÁCTILES ---
const whatsappBtnElement = document.getElementById('lightboxWhatsappBtn');
if (whatsappBtnElement) {
    // Remover clase 'expanded' de cualquier botón de WhatsApp previo
    const allWhatsappBtns = document.querySelectorAll('.lightbox-action-btn.whatsapp-btn');
    allWhatsappBtns.forEach(btn => btn.classList.remove('expanded'));

    // Agregar evento 'click' para dispositivos táctiles
    whatsappBtnElement.addEventListener('click', function() {
        // Agregar la clase 'expanded' a este botón
        this.classList.add('expanded');
    });

    // Opcional: Si quieres que se contraiga al hacer clic fuera del botón, puedes agregar un listener al lightbox
    const lightbox = document.getElementById('imageLightbox');
    lightbox.addEventListener('click', function(e) {
        // Si el clic no fue en el botón de WhatsApp ni en su ícono/texto, contraerlo
        if (!e.target.closest('.lightbox-action-btn.whatsapp-btn')) {
            whatsappBtnElement.classList.remove('expanded');
        }
    });
}
// --- FIN DE LA LÓGICA PARA MÓVILES ---
    } catch (error) { console.error("Error fetching vendor phone:", error); }
    loadProducts('vendorProductsGrid', { vendorId: vendorId });
}

window.toggleStoreEditMode = function(isEditing) {
    document.getElementById('storeName').readOnly = !isEditing;
    document.getElementById('storeDescription').readOnly = !isEditing;
    document.getElementById('editStoreBtn').style.display = isEditing ? 'none' : 'block';
    document.getElementById('storeFormFooter').style.display = isEditing ? 'flex' : 'none';
    if (!isEditing && currentMerchantData) {
        document.getElementById('storeName').value = currentMerchantData.business;
        document.getElementById('storeDescription').value = currentMerchantData.description;
    }
}

window.saveStoreInfo = async function() {
    const newData = { business: document.getElementById('storeName').value, description: document.getElementById('storeDescription').value };
    // --- INICIO DE LA CARGA ---
    const saveBtn = document.querySelector('#storeFormFooter .btn-primary'); // El botón "Guardar Cambios" del puesto
    startButtonLoading(saveBtn, 'Guardando...');
    try {
        const { error } = await supabase.from('merchants').update(newData).eq('id', currentUser.id);
        if (error) throw error;
        await updateUserProfile(currentUser.id); 
        toggleStoreEditMode(false);
        showToast('Información del puesto actualizada.', 'success');
    } catch (error) {
        console.error("Error updating store info:", error);
        showToast('Error al actualizar la información.', 'error');
    } finally {
        // --- FIN DE LA CARGA ---
        stopButtonLoading(saveBtn);
    }
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
}

window.saveProfileInfo = async function() {
    const newData = {
        name: document.getElementById('userNameInput').value.trim(),
        phone: document.getElementById('userPhoneInput').value.trim()
    };
    // --- INICIO DE LA CARGA ---
    const saveBtn = document.querySelector('#profileFormFooter .btn-primary'); // El botón "Guardar Cambios" del perfil
    startButtonLoading(saveBtn, 'Actualizando...');
    try {
        const { error } = await supabase.from('merchants').update(newData).eq('id', currentUser.id);
        if (error) throw error;
        await updateUserProfile(currentUser.id);
        toggleProfileEditMode(false);
        showToast('Perfil actualizado.', 'success');
    } catch (error) {
        console.error("Error updating profile:", error);
        showToast('Error al actualizar el perfil.', 'error');
    } finally {
        // --- FIN DE LA CARGA ---
        stopButtonLoading(saveBtn);
    }
}

window.showProfilePicModal = function() {
    document.getElementById('profilePicModal').style.display = 'flex';
    selectedProfilePicFile = null;
    selectedAvatarUrl = null;
    document.getElementById('profilePicUploadArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic para subir</p>';
}

window.saveProfilePic = async function() {
    let picUrl = null;
    if (selectedProfilePicFile) {
        const compressedFile = await imageCompression(selectedProfilePicFile, { maxSizeMB: 0.2, maxWidthOrHeight: 400 });
        picUrl = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(compressedFile);
        });
    } else if (selectedAvatarUrl) {
        picUrl = selectedAvatarUrl;
    }
    if(picUrl) {
        try {
            const { error } = await supabase.from('merchants').update({ profile_pic: picUrl }).eq('id', currentUser.id);
            if (error) throw error;
            await updateUserProfile(currentUser.id);
            hideModal('profilePicModal');
            showToast('Foto de perfil actualizada.', 'success');
        } catch (err) {
            console.error('Error updating profile pic:', err);
            showToast('Error al actualizar la foto de perfil.', 'error');
        }
    } else {
        showToast('No seleccionaste ninguna imagen.', 'error');
    }
}

function populateAvatars() {
    const container = document.getElementById('avatarSelection');
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
            document.getElementById('profilePicUploadArea').innerHTML = `<img src="${avatarUrl}" class="preview-image">`;
            document.querySelectorAll('.avatar-item').forEach(el => el.style.borderColor = 'transparent');
            avatarItem.style.borderColor = 'var(--cyan)';
        };
        container.appendChild(avatarItem);
    });
}

// --- COPIA DE SEGURIDAD (IMPORT/EXPORT JSON) ---
window.exportCatalogToJSON = async function() {
    if (!currentUser) return showToast('Debes iniciar sesión para exportar tu catálogo.', 'error');
    hideModal('backup-options-modal');
    showToast('Preparando la exportación...', 'success');
    try {
        const { data: productsData, error } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id);
        if (error) throw error;
        if (!productsData || productsData.length === 0) return showToast('No tienes productos para exportar.', 'error');
        const productsToExport = productsData.map(d => ({ name: d.name, price: d.price, description: d.description, imageBase64: d.image_base64 || null, published: typeof d.published === 'boolean' ? d.published : true }));
        const jsonString = JSON.stringify(productsToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogo-feria-virtual-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Catálogo exportado correctamente.', 'success');
    } catch (error) {
        console.error("Error exportando a JSON:", error);
        showToast('Hubo un error al exportar el catálogo.', 'error');
    }
}

window.handleJsonImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    hideModal('backup-options-modal');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const products = JSON.parse(e.target.result);
            if (!Array.isArray(products) || products.length === 0) {
                showToast('El archivo no contiene productos para importar.', 'error');
                return;
            }
            if (confirm(`¿Estás seguro de que deseas importar ${products.length} productos a tu catálogo? Esta acción no se puede deshacer.`)) {
                importCatalogFromJSON(products);
            }
        } catch (error) {
            console.error("Error al parsear el archivo JSON:", error);
            showToast('El archivo seleccionado no es un JSON válido.', 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

async function importCatalogFromJSON(products) {
    if (!Array.isArray(products) || products.length === 0) return showToast('El archivo no contiene productos para importar.', 'error');
    showToast(`Importando ${products.length} productos...`, 'success');
    try {
        const rows = products.map(p => ({ name: p.name, price: p.price || 0, description: p.description || '', image_base64: p.imageBase64 || null, published: typeof p.published === 'boolean' ? p.published : true, vendor_id: currentUser.id, vendor_name: currentMerchantData.business, created_at: new Date().toISOString() }));
        const { error } = await supabase.from('products').insert(rows);
        if (error) throw error;
        showToast(`${products.length} productos importados correctamente.`, 'success');
        loadMyProducts();
        updateUserProfile(currentUser.id);
    } catch (error) {
        console.error("Error durante la importación masiva:", error);
        showToast('Ocurrió un error durante la importación.', 'error');
    }
}

// --- GENERACIÓN DE CATÁLOGOS ---
const PDF_THEMES = {
    naturaleza: { name: 'Naturaleza', icon: 'fa-leaf', headerColor: '#22c55e', accentColor: '#16a34a' },
    gastronomia: { name: 'Gastronomía', icon: 'fa-utensils', headerColor: '#f97316', accentColor: '#ea580c' },
    juguetes: { name: 'Juguetes', icon: 'fa-shapes', headerColor: '#3b82f6', accentColor: '#2563eb' },
    moda: { name: 'Moda', icon: 'fa-tshirt', headerColor: '#ec4899', accentColor: '#db2777' },
    tecnologia: { name: 'Tecnología', icon: 'fa-microchip', headerColor: '#6366f1', accentColor: '#4f46e5' },
    artesania: { name: 'Artesanía', icon: 'fa-palette', headerColor: '#a855f7', accentColor: '#9333ea' },
    minimalista: { name: 'Minimalista', icon: 'fa-dot-circle', headerColor: '#6b7280', accentColor: '#4b5563' },
    elegante: { name: 'Elegante', icon: 'fa-gem', headerColor: '#d97706', accentColor: '#b45309' }
};

window.showExportModal = function(exportType) {
    if (!currentUser) return showToast('Debes iniciar sesión para crear un catálogo.', 'error');
    const grid = document.getElementById('themeSelectionGrid');
    grid.innerHTML = '';
    document.getElementById('exportModalTitle').textContent = `Elige un Diseño para tu Catálogo PDF`;
    for (const key in PDF_THEMES) {
        const theme = PDF_THEMES[key];
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.innerHTML = `<i class="fas ${theme.icon}"></i><span>${theme.name}</span>`;
        card.onclick = () => generatePdfWithJsPDF(key);
        grid.appendChild(card);
    }
    document.getElementById('exportThemeModal').style.display = 'flex';
}

async function generatePdfWithJsPDF(themeKey) {
    hideModal('exportThemeModal');
    const loadingOverlay = document.getElementById('globalLoadingOverlay');
    try {
        loadingOverlay.style.display = 'flex';
        const { data: productsData, error } = await supabase.from('products').select('*').eq('vendor_id', currentUser.id).eq('published', true).order('created_at', { ascending: false });
        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            showToast('No tienes productos publicados para incluir.', 'error');
            return;
        }
        const products = productsData.map(r => normalizeProductRow(r));
        const theme = PDF_THEMES[themeKey];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const gutter = 10;
        const contentWidth = pageWidth - (margin * 2);
        const columnWidth = (contentWidth - (gutter * 2)) / 3;
        let currentY = margin;
        let columnIndex = 0;
        const addHeader = () => {
            currentY = margin;
            doc.setFontSize(28); doc.setTextColor(theme.headerColor);
            doc.text(String(currentMerchantData.business || ''), pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
            doc.setFontSize(11); doc.setTextColor('#666');
            const descLines = doc.splitTextToSize(String(currentMerchantData.description || ''), contentWidth - 40);
            doc.text(descLines, pageWidth / 2, currentY, { align: 'center' });
            currentY += (descLines.length * 5) + 8;
            doc.setDrawColor(theme.headerColor); doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;
        };
        const addFooter = (pageNumber) => {
            const footerY = pageHeight - 10;
            doc.setFontSize(9); doc.setTextColor('#999');
            doc.text(`Catálogo de ${currentMerchantData.business} | Página ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
        };
        addHeader();
        let pageCount = 1;
        addFooter(pageCount);
        for (const product of products) {
            const productBlockHeight = 140;
            if (columnIndex > 2) { columnIndex = 0; currentY += productBlockHeight; }
            if (currentY + productBlockHeight > pageHeight - margin) {
                doc.addPage(); pageCount++; addHeader(); addFooter(pageCount);
                currentY = doc.internal.pageSize.getHeight() - pageHeight + 48;
                columnIndex = 0;
            }
            const columnX = margin + (columnIndex * (columnWidth + gutter));
            if (product.imageBase64) {
                try {
                    const format = product.imageBase64.substring("image/".length, product.imageBase64.indexOf(";base64")).toUpperCase();
                    if (['JPG', 'JPEG', 'PNG'].includes(format)) {
                        const img = new Image();
                        img.src = product.imageBase64;
                        await new Promise(r => { img.onload = r; img.onerror = r; });
                        const boxW = columnWidth, boxH = 80;
                        let w = img.width, h = img.height;
                        if (w > boxW) { h = (boxW / w) * h; w = boxW; }
                        if (h > boxH) { w = (boxH / h) * w; h = boxH; }
                        const x = columnX + (boxW - w) / 2;
                        const y = currentY + (boxH - h) / 2;
                        doc.addImage(product.imageBase64, format, x, y, w, h);
                    }
                } catch (e) { console.error("Error al añadir imagen:", e); }
            }
            let textY = currentY + 90;
            doc.setFontSize(18); doc.setTextColor(theme.headerColor);
            doc.text(doc.splitTextToSize(String(product.name || ''), columnWidth), columnX, textY);
            textY += (doc.splitTextToSize(String(product.name || ''), columnWidth).length * 7) + 3;
            doc.setFontSize(20); doc.setTextColor(theme.accentColor);
            doc.text(`$${(product.price || 0).toFixed(2)}`, columnX, textY);
            textY += 10;
            doc.setFontSize(11); doc.setTextColor('#333');
            doc.text(doc.splitTextToSize(String(product.description || ''), columnWidth), columnX, textY);
            columnIndex++;
        }
        doc.save(`catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.pdf`);
    } catch (error) {
        console.error("Error generando PDF:", error);
        showToast("Hubo un error al generar el catálogo.", "error");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// === NUEVAS FUNCIONES PARA FICHA DE PRODUCTO (JPG) ===
async function getProductsByVendor(vendorId) {
    const { data, error } = await supabase.from('products').select('*').eq('vendor_id', vendorId).order('created_at', { ascending: false });
    if (error) { console.error('Error fetching products by vendor:', error); return []; }
    return (data || []).map(r => normalizeProductRow(r));
}

async function loadUserProductsForSelection() {
    if (!currentUser) return;
    hideModal('catalog-options-modal');
    const container = document.getElementById('product-selection-list');
    container.innerHTML = '<p>Cargando tus productos...</p>';
    document.getElementById('select-product-modal').style.display = 'flex';
    try {
        const products = await getProductsByVendor(currentUser.uid);
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p>No tienes productos para seleccionar.</p>';
            return;
        }
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-selection-item';
            productElement.innerHTML = `
                <img src="${product.imageBase64 || 'https://placehold.co/120x80/e2e8f0/a0aec0?text=Sin+Imagen'}" alt="${product.name}" loading="lazy">
                <p>${product.name}</p>
            `;
            productElement.onclick = () => {
                generateProductJPG(product);
                hideModal('select-product-modal');
            };
            container.appendChild(productElement);
        });
    } catch (error) {
        console.error("Error loading products for selection:", error);
        container.innerHTML = '<p>Error al cargar productos.</p>';
    }
}

/**
 * Genera una imagen JPG de un solo producto usando un canvas.
 * @param {object} product El objeto del producto.
 */
async function generateProductJPG(product) {
    showToast('Generando ficha de producto...', 'success');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 800, canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // Fondo y membretado
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const themeCyan = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim();
    ctx.fillStyle = themeCyan || '#06b6d4';
    ctx.fillRect(0, 0, canvasWidth, 100);
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(currentMerchantData.business || "Mi Tienda", canvasWidth / 2, 65);
    // Imagen del producto
    const productImage = new Image();
    productImage.crossOrigin = "anonymous";
    productImage.src = product.imageBase64 || 'https://placehold.co/700x400/e2e8f0/a0aec0?text=Producto+sin+imagen';
    productImage.onload = () => {
        // --- INICIO DE LA LÓGICA DE ESCALADO PROPORCIONAL ---
        const boxX = 50, boxY = 120, boxWidth = 700, boxHeight = 400;
        const imgRatio = productImage.width / productImage.height;
        const boxRatio = boxWidth / boxHeight;
        let finalWidth, finalHeight;
        if (imgRatio > boxRatio) {
            finalWidth = boxWidth;
            finalHeight = finalWidth / imgRatio;
        } else {
            finalHeight = boxHeight;
            finalWidth = finalHeight * imgRatio;
        }
        const finalX = boxX + (boxWidth - finalWidth) / 2;
        const finalY = boxY + (boxHeight - finalHeight) / 2;
        ctx.drawImage(productImage, finalX, finalY, finalWidth, finalHeight);
        // --- FIN DE LA LÓGICA DE ESCALADO ---
        // Textos
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.fillText(product.name, 50, 580);
        const themeSuccess = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
        ctx.font = 'bold 48px "Segoe UI", sans-serif';
        ctx.fillStyle = themeSuccess || '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText(`$${(product.price || 0).toFixed(2)}`, 750, 580);
        ctx.font = '20px "Segoe UI", sans-serif';
        ctx.fillStyle = '#555555';
        ctx.textAlign = 'left';
        wrapText(ctx, product.description || 'Sin descripción.', 50, 630, 700, 24);
        // Descarga
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `ficha-${product.name.replace(/\s+/g, '-')}.jpg`;
        link.click();
    };
    productImage.onerror = () => showToast("Error al cargar la imagen del producto.", "error");
}

function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

// --- UTILIDADES Y FUNCIONES AUXILIARES ---
// --- Lightbox con navegación entre productos del mismo vendedor ---
let currentVendorProducts = [];
let currentProductIndex = 0;

window.showImageLightbox = async function(imageBase64, productData = null) {
    if (!productData || !productData.vendorId) {
        console.warn("No se recibió información del producto.");
        return;
    }
    // --- MOSTRAR SPINNER DE CARGA INMEDIATAMENTE ---
    const loadingSpinner = document.getElementById('lightboxLoadingSpinner');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightbox = document.getElementById('imageLightbox');
    loadingSpinner.style.display = 'flex';
    lightboxImg.classList.add('loading');
    lightbox.style.display = 'flex'; // Mostramos el lightbox inmediatamente
    try {
        // 1. Cargar TODOS los productos del mismo vendedor desde Supabase
        const { data, error } = await supabase.from('products').select('*').eq('vendor_id', productData.vendorId).eq('published', true).order('created_at', { ascending: false });
        if (error) throw error;
        currentVendorProducts = (data || []).map(r => normalizeProductRow(r));
        // 2. Encontrar el índice del producto actual
        currentProductIndex = currentVendorProducts.findIndex(p => p.imageBase64 === imageBase64);
        if (currentProductIndex === -1) {
            currentProductIndex = 0; // Si no lo encuentra, empieza por el primero
        }
        // 3. Mostrar el producto actual en el lightbox
        showCurrentProductInLightbox();
        // 4. Configurar los eventos de swipe
        setupSwipeGestures();
    } catch (error) {
        console.error("Error al cargar productos del vendedor:", error);
        showToast('Error al cargar productos.', 'error');
    } finally {
        // --- OCULTAR SPINNER DE CARGA ---
        loadingSpinner.style.display = 'none';
        lightboxImg.classList.remove('loading');
    }
}

/**
 * Muestra el producto actual en el lightbox y actualiza los botones de WhatsApp e Ir al Puesto.
 */
/**
 * Muestra el producto actual en el lightbox y actualiza los botones de WhatsApp e Ir al Puesto.
 */
function showCurrentProductInLightbox() {
    const product = currentVendorProducts[currentProductIndex];
    if (!product) return;

    const img = document.getElementById('lightboxImg');
    // Aplicar efecto fade a la imagen
    img.classList.remove('lightbox-img-visible');
    img.classList.add('lightbox-img-fade');
    setTimeout(() => {
        img.src = product.imageBase64 || '';
        img.onload = () => {
            img.classList.remove('lightbox-img-fade');
            img.classList.add('lightbox-img-visible');
        };
        img.onerror = () => {
            img.classList.remove('lightbox-img-fade');
            img.classList.add('lightbox-img-visible');
        };
    }, 50);

    const lightbox = document.getElementById('imageLightbox');
    lightbox.style.display = 'flex';

    // --- CONFIGURAR EL CARRITO FLOTANTE ---
    const floatingCartBtn = document.createElement('div');
    floatingCartBtn.className = 'floating-cart-btn';
    floatingCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i>';
    floatingCartBtn.title = 'Agregar al carrito';
    floatingCartBtn.onclick = function(event) {
        event.stopPropagation();
        addToCartWithAnimation(this, product);
    };
    // Quitamos cualquier carrito flotante anterior
    const existingCartBtn = document.querySelector('.floating-cart-btn');
    if (existingCartBtn) existingCartBtn.remove();
    // Añadimos el nuevo carrito flotante
    lightbox.appendChild(floatingCartBtn);
    // --- FIN DE LA CONFIGURACIÓN DEL CARRITO FLOTANTE ---

    // --- Configurar el botón "Ir al Puesto" ---
    const storeBtn = document.getElementById('lightboxStoreBtn');
    if (product.vendorId && product.vendorName) {
        storeBtn.style.display = 'flex';
        storeBtn.onclick = function(event) {
            event.preventDefault();
            hideImageLightbox();
            showVendorPage(product.vendorId, product.vendorName);
        };
    } else {
        storeBtn.style.display = 'none';
        storeBtn.onclick = function(event) {
            event.preventDefault();
            showToast('Información del vendedor no disponible.', 'error');
        };
    }
    // --- FIN DE LA MODIFICACIÓN PARA EL BOTÓN DE PUESTO ---

    // --- Configurar el botón de WhatsApp ---
    const whatsappBtn = document.getElementById('lightboxWhatsappBtn');

    // === NUEVO: MOSTRAR EL CÍRCULO CON EL ÍCONO INMEDIATAMENTE ===
    whatsappBtn.style.display = 'flex'; // Mostrar el botón de inmediato
    whatsappBtn.href = '#'; // Enlace temporal
    whatsappBtn.innerHTML = `
        <i class="fab fa-whatsapp"></i>
        <span class="whatsapp-btn-text">Chatear por WhatsApp</span>
    `;

    // === NUEVO: DESACTIVAR LA EXPANSIÓN HASTA QUE ESTÉ LISTO ===
    // Removemos temporalmente las clases que permiten la expansión
    whatsappBtn.classList.remove('lightbox-whatsapp-circle-btn');
    whatsappBtn.classList.add('lightbox-whatsapp-circle-btn--loading');

    // === NUEVO: ESTILOS TEMPORALES PARA EL ESTADO "CARGANDO" ===
    const style = document.createElement('style');
    style.id = 'whatsapp-loading-style';
    style.innerHTML = `
        .lightbox-whatsapp-circle-btn--loading {
            position: absolute !important;
            top: 20px !important;
            left: 20px !important;
            z-index: 1003 !important;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background-color: #25D366;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-weight: 700;
            box-shadow: 0 4px 8px rgba(37, 211, 102, 0.3);
            transition: all 0.3s ease;
            overflow: hidden;
        }
        .lightbox-whatsapp-circle-btn--loading i {
            font-size: 24px;
            margin: 0;
        }
        .lightbox-whatsapp-circle-btn--loading .whatsapp-btn-text {
            display: none; /* Ocultar texto completamente en este estado */
        }
    `;
    document.head.appendChild(style);

    // Ahora, intentamos cargar la información del vendedor
    if (product.vendorId) {
        supabase.from('merchants').select('*').eq('id', product.vendorId).single()
            .then(({ data: vendor, error }) => {
                if (error) return setupFallbackWhatsapp(whatsappBtn);
                if (vendor && vendor.phone) {
                    const phone = vendor.phone.replace(/[^0-9]/g, '');
                    if (phone) {
                        const productName = product.name || 'un producto';
                        const productPrice = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'precio no especificado';
                        const baseMessage = `Hola, vi tu producto "${productName}" en Feria Virtual. ¿Me podrías dar más información? Precio: ${productPrice}.`;
                        const message = encodeURI(baseMessage);
                        whatsappBtn.href = `https://wa.me/${phone}?text=${message}`;
                        whatsappBtn.classList.remove('lightbox-whatsapp-circle-btn--loading');
                        whatsappBtn.classList.add('lightbox-whatsapp-circle-btn');
                        const tempStyle = document.getElementById('whatsapp-loading-style');
                        if (tempStyle) tempStyle.remove();
                    } else {
                        setupFallbackWhatsapp(whatsappBtn);
                    }
                } else {
                    setupFallbackWhatsapp(whatsappBtn);
                }
            }).catch(err => {
                console.error("Error al obtener teléfono del vendedor:", err);
                setupFallbackWhatsapp(whatsappBtn);
            });
    } else {
        setupFallbackWhatsapp(whatsappBtn);
    }
    // --- FIN DE LA CONFIGURACIÓN DEL BOTÓN DE WHATSAPP ---
}

/**
 * Configura el comportamiento de fallback para el botón de WhatsApp.
 * @param {HTMLElement} whatsappBtn - El botón de WhatsApp.
 */
function setupFallbackWhatsapp(whatsappBtn) {
    whatsappBtn.href = '#';
    whatsappBtn.onclick = function(event) {
        event.preventDefault();
        showToast('No se pudo cargar el contacto del vendedor. Inténtalo más tarde.', 'error');
    };

    // Activar la expansión con el mensaje de error
    whatsappBtn.classList.remove('lightbox-whatsapp-circle-btn--loading');
    whatsappBtn.classList.add('lightbox-whatsapp-circle-btn');

    // Eliminar el estilo temporal
    const tempStyle = document.getElementById('whatsapp-loading-style');
    if (tempStyle) tempStyle.remove();
}
/**
 * Configura los eventos táctiles y de mouse para navegar entre productos.
 */
function setupSwipeGestures() {
    const lightboxImg = document.getElementById('lightboxImg');
    let startX = 0;
    let endX = 0;
    // Evento para touch (móviles)
    lightboxImg.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
    }, { passive: true });
    lightboxImg.addEventListener('touchend', (e) => {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
    }, { passive: true });
    // Evento para mouse (desktop)
    lightboxImg.addEventListener('mousedown', (e) => {
        startX = e.clientX;
    });
    lightboxImg.addEventListener('mouseup', (e) => {
        endX = e.clientX;
        handleSwipe();
    });
    function handleSwipe() {
        const diff = startX - endX;
        const threshold = 50; // Umbral mínimo para considerar un swipe
        if (Math.abs(diff) > threshold) {
            if (diff > 0) {
                // Swipe a la izquierda -> Siguiente producto
                nextProduct();
            } else {
                // Swipe a la derecha -> Producto anterior
                prevProduct();
            }
        }
    }
}

/**
 * Muestra el producto anterior.
 */
function prevProduct() {
    if (currentVendorProducts.length > 1) {
        currentProductIndex = (currentProductIndex - 1 + currentVendorProducts.length) % currentVendorProducts.length;
        showCurrentProductInLightbox();
    }
}

/**
 * Muestra el siguiente producto.
 */
function nextProduct() {
    if (currentVendorProducts.length > 1) {
        currentProductIndex = (currentProductIndex + 1) % currentVendorProducts.length;
        showCurrentProductInLightbox();
    }
}

window.hideImageLightbox = function() {
    document.getElementById('imageLightbox').style.display = 'none';
}

/**
 * Muestra el overlay de carga global con un mensaje personalizado o aleatorio según el tipo.
 * @param {string} message - Mensaje a mostrar. Si es 'app' o 'productos', se usa un mensaje aleatorio de la lista correspondiente.
 */
function showGlobalLoadingOverlay(message = 'Cargando...') {
    // Siempre mostramos el corredor animado para cualquier tipo de carga
    showRunnerOverlay();
    // Mantenemos la lógica de mensajes para otros propósitos si es necesario
    const overlay = document.getElementById('globalLoadingOverlay');
    if (!overlay) return;
    let msg = message;
    if (message === 'app') {
        const arr = typeof appLoadingMessages !== 'undefined' ? appLoadingMessages : ['Cargando...'];
        msg = arr[Math.floor(Math.random() * arr.length)];
    } else if (message === 'productos') {
        const arr = typeof productLoadingMessages !== 'undefined' ? productLoadingMessages : ['Cargando productos...'];
        msg = arr[Math.floor(Math.random() * arr.length)];
    }
    const msgEl = overlay.querySelector('span') || overlay.querySelector('p');
    if (msgEl) msgEl.textContent = msg;
    overlay.style.display = 'flex';
}

function hideGlobalLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
    // También ocultamos el corredor
    hideRunnerOverlay();
}

// --- NUEVAS FUNCIONES PARA EL CORREDOR ANIMADO ---
/**
 * Muestra el overlay del corredor animado.
 */
function showRunnerOverlay() {
    const overlay = document.getElementById('runnerOverlay');
    if (overlay) {
        overlay.classList.add('active');
    }
}

/**
 * Oculta el overlay del corredor animado.
 */
function hideRunnerOverlay() {
    const overlay = document.getElementById('runnerOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function updateAuthUI() {
    if (isMerchant && currentUser) {
        authContainer.innerHTML = `
            <div class="user-dropdown">
                <div class="nav-link" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'block' ? 'none' : 'block'">
                    <i class="fas fa-user-circle"></i><span>Mi Cuenta</span>
                </div>
                <div class="dropdown-menu">
                    <a href="#" onclick="showSection('profile')"><i class="fas fa-user"></i> Mi Perfil</a>
                    <a href="#" onclick="showSection('my-store')"><i class="fas fa-store"></i> Mi Puesto</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
                </div>
            </div>`;
        profileLink.style.display = 'flex';
        storeLink.style.display = 'flex';
    } else {
        authContainer.innerHTML = `<a href="#" class="nav-link" onclick="showLogin()"><i class="fas fa-sign-in-alt"></i><span>Iniciar sesión</span></a>`;
        profileLink.style.display = 'none';
        storeLink.style.display = 'none';
    }
}

function showMessage(element, message, type) { element.textContent = message; element.className = `login-message login-${type}`; element.style.display = 'block'; }
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

// --- NUEVAS FUNCIONES UTILITARIAS PARA BLOQUEO DE BOTONES ---
/**
 * Activa el estado de carga en un botón.
 * @param {HTMLButtonElement} button - El botón a bloquear.
 * @param {string} [loadingText='Cargando...'] - Texto opcional a mostrar.
 */
function startButtonLoading(button, loadingText = 'Cargando...') {
    if (!button) return;
    // Guardamos el texto y el HTML original para restaurarlo después
    button.dataset.originalText = button.innerHTML;
    button.disabled = true; // ¡IMPORTANTE! Bloquea el botón
    button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText}`;
    button.style.opacity = '0.7'; // Opcional: da feedback visual de que está deshabilitado
}

/**
 * Restaura un botón a su estado original después de la carga.
 * @param {HTMLButtonElement} button - El botón a restaurar.
 */
function stopButtonLoading(button) {
    if (!button) return;
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || 'Guardar'; // Valor por defecto por si falla
    button.style.opacity = '1';
    delete button.dataset.originalText; // Limpiamos
}

// --- CARRITO DE COMPRAS ---
let shoppingCart = [];

/**
 * Agrega un producto al carrito con animación visual.
 * @param {HTMLElement} button - El botón que fue clickeado (para la animación).
 * @param {Object} product - El objeto del producto a agregar.
 */
function addToCartWithAnimation(button, product) {
    // 1. Aplicar efecto de rebote al carrito flotante
    button.classList.add('bounce');
    setTimeout(() => button.classList.remove('bounce'), 600);
    // 2. Buscamos si el producto ya está en el carrito
    const existingItem = shoppingCart.find(item => item.id === product.id);
    if (existingItem) {
        // Si ya existe, incrementamos la cantidad
        existingItem.quantity += 1;
    } else {
        // Si es nuevo, lo agregamos con cantidad 1
        shoppingCart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            imageBase64: product.imageBase64,
            vendorId: product.vendorId,
            vendorName: product.vendorName,
            quantity: 1
        });
    }
    // 3. Actualizamos la interfaz
    updateCartUI();
    // 4. Crear y mostrar animación de confirmación
    createCartConfirmationAnimation(button);
    // 5. Mostrar toast de confirmación
    showToast(`${product.name} agregado al carrito.`, 'success');
}

/**
 * Crea una animación visual que simula que el producto vuela hacia el ícono del carrito.
 * @param {HTMLElement} sourceElement - El elemento desde donde inicia la animación.
 */
function createCartConfirmationAnimation(sourceElement) {
    // Obtener posición del botón clickeado
    const rect = sourceElement.getBoundingClientRect();
    // Crear elemento de animación
    const animationElement = document.createElement('div');
    animationElement.className = 'cart-confirmation-animation';
    animationElement.innerHTML = '<i class="fas fa-cart-plus" style="font-size: 24px; color: var(--primary);"></i>';
    animationElement.style.position = 'fixed';
    animationElement.style.left = `${rect.left + rect.width / 2}px`;
    animationElement.style.top = `${rect.top + rect.height / 2}px`;
    animationElement.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(animationElement);
    // Obtener posición del ícono del carrito
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        const cartRect = cartIcon.getBoundingClientRect();
        const cartX = cartRect.left + cartRect.width / 2;
        const cartY = cartRect.top + cartRect.height / 2;
        // Aplicar animación
        animationElement.style.transition = 'all 0.6s ease-out';
        setTimeout(() => {
            animationElement.style.left = `${cartX}px`;
            animationElement.style.top = `${cartY}px`;
            animationElement.style.transform = 'translate(-50%, -50%) scale(0.5)';
            animationElement.style.opacity = '0';
        }, 10);
        // Hacer que el ícono del carrito rebote
        cartIcon.classList.add('bounce');
        setTimeout(() => cartIcon.classList.remove('bounce'), 600);
    }
    // Eliminar el elemento de animación después de que termine
    setTimeout(() => {
        if (animationElement.parentNode) {
            animationElement.parentNode.removeChild(animationElement);
        }
    }, 600);
}

/**
 * Función de respaldo para mantener compatibilidad (llama a la nueva función).
 * @param {Object} product - El objeto del producto a agregar.
 */
function addToCart(product) {
    // Buscamos cualquier botón de carrito en la página para usarlo como origen de la animación
    const anyCartButton = document.querySelector('.btn-add-to-cart-overlay, .btn-add-to-cart-minimal') || document.body;
    addToCartWithAnimation(anyCartButton, product);
}

/**
 * Elimina un producto del carrito.
 * @param {string} productId - El ID del producto a eliminar.
 */
function removeFromCart(productId) {
    shoppingCart = shoppingCart.filter(item => item.id !== productId);
    updateCartUI();
}

/**
 * Actualiza la cantidad de un producto en el carrito.
 * @param {string} productId - El ID del producto.
 * @param {number} newQuantity - La nueva cantidad (debe ser >= 1).
 */
function updateCartItemQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    const item = shoppingCart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        updateCartUI();
    }
}

/**
 * Actualiza toda la interfaz del carrito: contador, items y total.
 */
function updateCartUI() {
    // Actualizar el contador en el ícono
    const itemCount = shoppingCart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartItemCount').textContent = itemCount;
    // Actualizar la lista de items
    const container = document.getElementById('cartItemsContainer');
    if (shoppingCart.length === 0) {
        container.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío.</p>';
    } else {
        container.innerHTML = '';
        shoppingCart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item';
            itemElement.innerHTML = `
                <div class="cart-item-image" style="background-image: url('${item.imageBase64 || 'https://placehold.co/80x80/e2e8f0/a0aec0?text=No+Img'}')"></div>
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <p class="cart-item-price">$${(item.price || 0).toFixed(2)}</p>
                    <div class="cart-item-quantity">
                        <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
            `;
            container.appendChild(itemElement);
        });
    }
    // Actualizar el total
    const total = shoppingCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

/**
 * Alterna la visibilidad del panel del carrito.
 */
function toggleCart() {
    const panel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    panel.classList.toggle('active');
    overlay.classList.toggle('active');
}

/**
 * Procesa el pago (por ahora solo muestra un mensaje).
 */
function proceedToCheckout() {
    if (shoppingCart.length === 0) {
        showToast('Tu carrito está vacío.', 'error');
        return;
    }
    // Aquí iría la lógica para procesar el pago
    // Por ejemplo, redirigir a una pasarela de pago o mostrar un formulario
    showToast('¡Función de pago aún no implementada! Contacta directamente al vendedor por WhatsApp.', 'info');
    // Opcional: puedes cerrar el carrito después de hacer clic
    // toggleCart();
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
async function initializeApp() {
    // --- MOSTRAR SPINNER DE CARGA INICIAL ---
    showInitialLoadingSpinner('Cargando datos y autenticando...');
    // Obtener usuario actual y sus datos
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // Verificar si es merchant
            const { data: merchant, error } = await supabase.from('merchants').select('*').eq('id', user.id).single();
            if (!error && merchant) {
                currentUser = { id: user.id, email: user.email }; isMerchant = true;
                await updateUserProfile(user.id);
                showSection('profile');
            } else {
                isMerchant = false; currentUser = null; currentMerchantData = null;
            }
        } else {
            currentUser = null; isMerchant = false; currentMerchantData = null;
            showSection('home');
        }
    } catch (e) {
        console.error('Error checking auth state:', e);
    }
    // Escuchar cambios de auth (login/logout)
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            const user = session.user;
            currentUser = { id: user.id, email: user.email };
            updateUserProfile(user.id);
            isMerchant = true;
            showSection('profile');
        } else if (event === 'SIGNED_OUT') {
            currentUser = null; isMerchant = false; currentMerchantData = null;
            showSection('home');
        }
        updateAuthUI();
        hideInitialLoadingSpinner();
    });

// --- EVENT LISTENER PARA INICIAR SESIÓN CON ENTER ---
document.getElementById('loginPassword').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        login();
    }
});

    // --- EVENT LISTENER GLOBAL PARA CERRAR CON ESC ---
    document.addEventListener('keydown', closeActiveModalOnEsc);

    document.getElementById('create-catalog-btn').addEventListener('click', () => document.getElementById('catalog-options-modal').style.display = 'flex');
    document.getElementById('backup-btn').addEventListener('click', () => document.getElementById('backup-options-modal').style.display = 'flex');
    document.getElementById('generate-pdf-btn').addEventListener('click', () => {
        hideModal('catalog-options-modal');
        showExportModal('pdf');
    });
    document.getElementById('generate-jpg-btn').addEventListener('click', loadUserProductsForSelection);
    document.getElementById('json-import-input').addEventListener('change', handleJsonImport);
    setupImageUpload('productImageUploadArea', 'productImageInput', (file) => selectedProductFile = file);
    setupImageUpload('profilePicUploadArea', 'profilePicInput', (file) => {
        selectedProfilePicFile = file;
        selectedAvatarUrl = null;
        document.querySelectorAll('.avatar-item').forEach(el => el.style.borderColor = 'transparent');
    });
    const themeToggle = document.getElementById('themeToggle');
    const applyTheme = (theme) => { document.body.dataset.theme = theme; localStorage.setItem('theme', theme); };
    themeToggle.addEventListener('click', () => applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'));
    applyTheme(localStorage.getItem('theme') || 'light');
    loadProducts();
    populateAvatars();

    // --- NUEVO: EVENT LISTENER PARA CERRAR EL MENÚ HAMBURGUESA ---
    document.getElementById('hamburgerMenu').addEventListener('click', function() {
        document.getElementById('navContainer').classList.toggle('active');
        document.getElementById('navOverlay').classList.toggle('active');
    });

    // Cerrar al hacer clic en el overlay
    document.getElementById('navOverlay').addEventListener('click', function() {
        document.getElementById('navContainer').classList.remove('active');
        document.getElementById('navOverlay').classList.remove('active');
    });

    // Cerrar al hacer clic en cualquier enlace de navegación
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            document.getElementById('navContainer').classList.remove('active');
            document.getElementById('navOverlay').classList.remove('active');
        });
    });
}

initializeApp();