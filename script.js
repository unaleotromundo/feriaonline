// Feria Virtual - Lógica de la Aplicación

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAlqGoYrHkASbhmE2aBKIOXqkkNBBEEiGU",
    authDomain: "feria-online-ec7c6.firebaseapp.com",
    projectId: "feria-online-ec7c6",
    storageBucket: "feria-online-ec7c6.firebasestorage.app",
    messagingSenderId: "1001881267179",
    appId: "1:1001881267179:web:fc5ac0fd940964537887ae",
    measurementId: "G-GQZZQMNVPH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

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

// --- NAVEGACIÓN Y VISIBILIDAD DE SECCIONES ---
window.showSection = function(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active-section'));
    const targetSection = document.getElementById(sectionId);
    if (targetSection) targetSection.classList.add('active-section');
    document.getElementById('navContainer').classList.remove('active');
    if (sectionId === 'products') loadProducts();
    if (sectionId === 'my-store' && isMerchant) loadMyProducts();
}
window.showLogin = function() { document.getElementById('loginModal').style.display = 'flex'; }
window.hideLogin = function() { document.getElementById('loginModal').style.display = 'none'; }
window.hideModal = function(modalId) { document.getElementById(modalId).style.display = 'none'; }
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
    productsGrid.innerHTML = `<div>Cargando productos...</div>`;
    try {
        let query = db.collection('products').where('published', '==', true);
        if (filter.vendorId) {
            query = query.where('vendorId', '==', filter.vendorId);
        }
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        productsGrid.innerHTML = '';
        if (snapshot.empty) {
            productsGrid.innerHTML = `<div>No hay productos para mostrar.</div>`;
            return;
        }
        snapshot.forEach(doc => renderProductCard(productsGrid, { id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error loading products:", error);
        productsGrid.innerHTML = `<div>Error al cargar productos.</div>`;
    }
}

async function loadMyProducts() {
    if (!currentUser) return;
    const productsGrid = document.getElementById('myProductsGrid');
    productsGrid.innerHTML = `<div>Cargando tus productos...</div>`;
    try {
        const snapshot = await db.collection('products').where('vendorId', '==', currentUser.uid).orderBy('createdAt', 'desc').get();
        productsGrid.innerHTML = '';
        if (snapshot.empty) {
            productsGrid.innerHTML = '<div>Aún no has agregado productos.</div>';
            return;
        }
        snapshot.forEach(doc => renderMyProductCard(productsGrid, { id: doc.id, ...doc.data() }));
    } catch (error) { console.error("Error loading user products:", error); }
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
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await db.collection('merchants').doc(user.uid).set({
            name, email, business, phone, description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showMessage(msgEl, '¡Registro exitoso! Redirigiendo...', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1000);
    } catch (error) {
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
        await auth.signInWithEmailAndPassword(email, password);
        showMessage(msgEl, '¡Bienvenido!', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1000);
    } catch (error) {
        showMessage(msgEl, 'Correo o contraseña incorrectos.', 'error');
    } finally {
        // --- FIN DE LA CARGA ---
        stopButtonLoading(loginBtn);
    }
}

window.logout = function() { auth.signOut(); }

async function updateUserProfile(userId) {
    try {
        const doc = await db.collection('merchants').doc(userId).get();
        if (!doc.exists) return;
        currentMerchantData = doc.data();
        const productsSnapshot = await db.collection('products').where('vendorId', '==', userId).get();
        document.getElementById('userName').textContent = currentMerchantData.name;
        document.getElementById('userEmail').textContent = currentMerchantData.email;
        document.getElementById('userPhone').textContent = currentMerchantData.phone || 'No especificado';
        document.getElementById('userBusiness').textContent = currentMerchantData.business;
        document.getElementById('userProducts').textContent = `${productsSnapshot.size} productos publicados`;
        const createdAt = currentMerchantData.createdAt?.toDate();
        document.getElementById('userSince').textContent = createdAt ? new Date(createdAt).toLocaleDateString() : 'N/A';
        const profilePicContainer = document.getElementById('profilePicContainer');
        if (currentMerchantData.profilePic) {
            profilePicContainer.innerHTML = `<img src="${currentMerchantData.profilePic}" alt="Foto de perfil" loading="lazy"><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`;
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
        const doc = await db.collection('products').doc(productId).get();
        if (doc.exists) {
            const product = doc.data();
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productDescription').value = product.description;
            if (product.imageBase64) {
                document.getElementById('productImageUploadArea').innerHTML = `<img src="${product.imageBase64}" class="preview-image">`;
                document.getElementById('productImageUploadArea').dataset.existingImage = product.imageBase64;
            }
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
    const docRef = isEditing ? db.collection('products').doc(document.getElementById('productModal').dataset.productId) : db.collection('products').doc();
    if (!isEditing) productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    productData.published = true;
    // --- INICIO DE LA CARGA ---
    const saveBtn = document.querySelector('#productModal .btn-primary'); // El botón "Guardar Producto" en el modal
    startButtonLoading(saveBtn, 'Guardando...');

    try {
        await docRef.set(productData, { merge: true });
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
    // --- PASAMOS EL ID DEL PRODUCTO A showImageLightbox ---
    card.innerHTML = `
        <div class="product-image" ${product.imageBase64 ? `style="background-image: url('${product.imageBase64}')" onclick="showImageLightbox('${product.imageBase64}', { id: '${product.id}', name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId}' })"` : ''}>
            ${!product.imageBase64 ? '<i class="fas fa-shopping-bag"></i>' : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-vendor">
                <i class="fas fa-store"></i>
                <a href="#" onclick="event.preventDefault(); showVendorPage('${product.vendorId}', '${product.vendorName}')">${product.vendorName || ''}</a>
            </div>
        </div>`;
    container.appendChild(card);
}

function renderMyProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    // --- PASAMOS EL ID DEL PRODUCTO A showImageLightbox ---
    card.innerHTML = `
        <div class="product-image" style="${product.imageBase64 ? `background-image: url('${product.imageBase64}')` : ''}" ${product.imageBase64 ? `onclick="showImageLightbox('${product.imageBase64}', { id: '${product.id}', name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId}' })"` : ''}></div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <div class="product-actions">
                <button class="action-btn" onclick="showProductModal('${product.id}')"><i class="fas fa-edit"></i></button>
                <!-- BOTÓN DE ELIMINAR REMOVIDO POR PETICIÓN DEL USUARIO -->
                <button class="action-btn" onclick="toggleProductStatus('${product.id}', ${!product.published})"><i class="fas fa-eye${product.published ? '' : '-slash'}"></i></button>
            </div>
        </div>`;
    container.appendChild(card);
}

// window.deleteProduct = async function(id) { if (confirm('¿Eliminar producto?')) { await db.collection('products').doc(id).delete(); loadMyProducts(); showToast('Producto eliminado.'); } }
window.toggleProductStatus = async function(id, status) { await db.collection('products').doc(id).update({ published: status }); loadMyProducts(); }

window.showVendorPage = async function(vendorId, vendorName) {
    showSection('vendor-page');
    document.getElementById('vendorPageTitle').textContent = vendorName;
    const whatsappBtn = document.getElementById('vendorWhatsappBtn');
    whatsappBtn.style.display = 'none';
    try {
        const doc = await db.collection('merchants').doc(vendorId).get();
        if (doc.exists && doc.data().phone) {
            const phone = doc.data().phone.replace(/[^0-9]/g, '');
            if(phone) {
                // --- CORRECCIÓN: Se eliminó el espacio en la URL ---
                whatsappBtn.href = `https://wa.me/${phone}`;
                whatsappBtn.style.display = 'inline-flex';
            }
        }
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
        await db.collection('merchants').doc(currentUser.uid).update(newData);
        await updateUserProfile(currentUser.uid); 
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
        await db.collection('merchants').doc(currentUser.uid).update(newData);
        await updateUserProfile(currentUser.uid);
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
        await db.collection('merchants').doc(currentUser.uid).update({ profilePic: picUrl });
        await updateUserProfile(currentUser.uid);
        hideModal('profilePicModal');
        showToast('Foto de perfil actualizada.', 'success');
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
        const snapshot = await db.collection('products').where('vendorId', '==', currentUser.uid).get();
        if (snapshot.empty) return showToast('No tienes productos para exportar.', 'error');
        const productsToExport = snapshot.docs.map(doc => {
            const data = doc.data();
            return { name: data.name, price: data.price, description: data.description, imageBase64: data.imageBase64 || null, published: data.published };
        });
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
            if (confirm(`¿Estás seguro de que deseas importar ${products.length} productos a tu catálogo? Esta acción no se puede deshacer.`)) {
                importCatalogFromJSON(products);
            }
        } catch (error) {
            console.error("Error al parsear el archivo JSON:", error);
            showToast('El archivo seleccionado no es un JSON válido.', 'error');
        } finally {
            event.target.value = ''; // Reset input
        }
    };
    reader.readAsText(file);
}

async function importCatalogFromJSON(products) {
    if (!Array.isArray(products) || products.length === 0) return showToast('El archivo no contiene productos para importar.', 'error');
    showToast(`Importando ${products.length} productos...`, 'success');
    try {
        const importPromises = products.map(product => {
            if (!product.name) return Promise.resolve();
            const newProductData = {
                name: product.name, price: product.price || 0, description: product.description || '', imageBase64: product.imageBase64 || null,
                published: typeof product.published === 'boolean' ? product.published : true,
                vendorId: currentUser.uid, vendorName: currentMerchantData.business, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            return db.collection('products').add(newProductData);
        });
        await Promise.all(importPromises);
        showToast(`${products.length} productos importados correctamente.`, 'success');
        loadMyProducts();
        updateUserProfile(currentUser.uid);
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
        const productsSnapshot = await db.collection('products').where('vendorId', '==', currentUser.uid).where('published', '==', true).get();
        if (productsSnapshot.empty) {
            showToast('No tienes productos publicados para incluir.', 'error');
            return;
        }
        const products = productsSnapshot.docs.map(doc => doc.data());
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
    const snapshot = await db.collection('products').where('vendorId', '==', vendorId).orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

/**
 * Muestra el overlay de carga global con un mensaje personalizado.
 * @param {string} message - Mensaje a mostrar.
 */
function showGlobalLoadingOverlay(message = 'Cargando...') {
    const overlay = document.getElementById('globalLoadingOverlay');
    const messageEl = overlay.querySelector('p');
    if (messageEl) messageEl.textContent = message;
    overlay.style.display = 'flex';
}

/**
 * Oculta el overlay de carga global.
 */
function hideGlobalLoadingOverlay() {
    const overlay = document.getElementById('globalLoadingOverlay');
    overlay.style.display = 'none';
}

// --- NUEVA FUNCIÓN: Mostrar lightbox con navegación entre productos del mismo vendedor ---
let currentVendorProducts = []; // Array global para los productos del vendedor actual
let currentProductIndex = 0; // Índice del producto actual en el array

window.showImageLightbox = async function(imageBase64, productData = null) {
    if (!productData || !productData.vendorId) {
        console.warn("No se recibió información del producto.");
        return;
    }

    // --- MOSTRAR INDICADOR DE CARGA ---
    showGlobalLoadingOverlay('Cargando.. si te deslizas hacia los lados podrás ver más productos del vendedor...');

    try {
        // 1. Cargar TODOS los productos del mismo vendedor (con caché)
        if (!window.vendorProductCache) {
            window.vendorProductCache = {}; // Creamos un objeto global para caché
        }

        let shouldFetch = true;
        if (window.vendorProductCache[productData.vendorId]) {
            // Verificamos si la caché tiene menos de 5 minutos (300000 ms)
            const cacheAge = Date.now() - window.vendorProductCache[productData.vendorId].timestamp;
            if (cacheAge < 300000) {
                shouldFetch = false;
                currentVendorProducts = window.vendorProductCache[productData.vendorId].products;
            }
        }

        if (shouldFetch) {
            const snapshot = await db.collection('products')
                .where('vendorId', '==', productData.vendorId)
                .where('published', '==', true)
                .orderBy('createdAt', 'desc')
                .get();

            currentVendorProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Guardamos en caché
            window.vendorProductCache[productData.vendorId] = {
                products: currentVendorProducts,
                timestamp: Date.now()
            };
        }

        // 2. Encontrar el índice del producto actual usando el ID (¡MÁS SEGURO!)
        currentProductIndex = currentVendorProducts.findIndex(p => p.id === productData.id);
        if (currentProductIndex === -1) {
            // Si no lo encuentra por ID, intenta por imagen como fallback
            currentProductIndex = currentVendorProducts.findIndex(p => p.imageBase64 === imageBase64);
            if (currentProductIndex === -1) {
                currentProductIndex = 0; // Si no lo encuentra, empieza por el primero
            }
        }

        // 3. Mostrar el lightbox y el producto actual
        showCurrentProductInLightbox();

        // 4. Configurar los eventos de swipe
        setupSwipeGestures();

    } catch (error) {
        console.error("Error al cargar productos del vendedor:", error);
        showToast('Error al cargar productos.', 'error');
    } finally {
        // --- OCULTAR INDICADOR DE CARGA ---
        hideGlobalLoadingOverlay();
    }
}

/**
 * Muestra el producto actual en el lightbox y actualiza el botón de WhatsApp.
 */
function showCurrentProductInLightbox() {
    const product = currentVendorProducts[currentProductIndex];
    if (!product) return;

    // Mostrar la imagen
    document.getElementById('lightboxImg').src = product.imageBase64 || '';
    const lightbox = document.getElementById('imageLightbox');
    lightbox.style.display = 'flex';

    // Actualizar el botón de WhatsApp
    const whatsappBtn = document.getElementById('lightboxWhatsappBtn');
    whatsappBtn.style.display = 'none';
    whatsappBtn.href = '#';

    if (product.vendorId) {
        db.collection('merchants').doc(product.vendorId).get().then(vendorDoc => {
            if (vendorDoc.exists && vendorDoc.data().phone) {
                const phone = vendorDoc.data().phone.replace(/[^0-9]/g, '');
                if (phone) {
                    const productName = product.name || 'un producto';
                    const productPrice = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'precio no especificado';
                    const baseMessage = `Hola, vi tu producto "${productName}" en Feria Virtual. ¿Me podrías dar más información? Precio: ${productPrice}.`;
                    const message = encodeURI(baseMessage);
                    whatsappBtn.href = `https://wa.me/${phone}?text=${message}`;
                    whatsappBtn.style.display = 'flex';
                }
            }
        }).catch(error => {
            console.error("Error al obtener teléfono del vendedor:", error);
        });
    }
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

window.hideImageLightbox = function() { document.getElementById('imageLightbox').style.display = 'none'; }

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

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initializeApp() {
    // Mostramos el spinner de carga inicial
    const initialLoadingOverlay = document.getElementById('initialLoadingOverlay');
    const loadingMessageElement = document.getElementById('loadingMessage');

    // Array de mensajes amigables
    const loadingMessages = [
        "Cargando Feria Virtual...",
        "Estableciendo puestos...",
        "Ordenando ropa...",
        "Regando plantitas...",
        "Acomodando productos...",
        "Preparando ofertas...",
        "Encendiendo las luces de la feria...",
        "Alistando los carritos...",
        "Poniendo precios justos...",
        "¡Bienvenido! Un momento más..."
    ];

<<<<<<< HEAD
    // Función para cambiar el mensaje cada 4 segundos
    let msgType = 'app';
    let intervalId = setInterval(() => {
        showGlobalLoadingOverlay(msgType);
        msgType = msgType === 'app' ? 'productos' : 'app';
    }, 4000);

    // Esperamos a que Firebase esté listo y autenticación
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        isMerchant = !!user;
        if (user) {
            await updateUserProfile(user.uid);
        }
        updateAuthUI();
        hideGlobalLoadingOverlay();
        clearInterval(intervalId);
    });
}

// Inicializar la app al cargar la página
window.addEventListener('DOMContentLoaded', initializeApp);
=======
    // Función para cambiar el mensaje cada 3 segundos
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        if (loadingMessageElement) {
            loadingMessageElement.textContent = loadingMessages[messageIndex];
        }
    }, 3000);

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const merchantDoc = await db.collection('merchants').doc(user.uid).get();
            if (merchantDoc.exists) {
                currentUser = user; isMerchant = true;
                await updateUserProfile(user.uid);
                showSection('profile');
            } else { isMerchant = false; currentUser = null; currentMerchantData = null; }
        } else {
            currentUser = null; isMerchant = false; currentMerchantData = null;
            showSection('home');
        }
        updateAuthUI();

        // --- OCULTAMOS EL SPINNER DE CARGA INICIAL ---
        // Limpiamos el intervalo de mensajes
        clearInterval(messageInterval);
        // Ocultamos el overlay
        if (initialLoadingOverlay) {
            initialLoadingOverlay.style.display = 'none';
        }
    });

    // --- EVENT LISTENERS GLOBALES ---
    document.getElementById('hamburgerMenu').addEventListener('click', () => {
        document.getElementById('navContainer').classList.toggle('active');
    });
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
}

initializeApp();
>>>>>>> parent of aba8635 (asd)
