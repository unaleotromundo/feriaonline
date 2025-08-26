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
const functions = firebase.functions(); // Inicializa Cloud Functions

// --- VARIABLES GLOBALES ---
let currentUser = null;
let isMerchant = false;
let currentMerchantData = null;
let selectedProductFile = null;
let selectedProfilePicFile = null;
let selectedAvatarUrl = null;
let currentAITask = {}; // Almacena la tarea de IA actual
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
// (El resto de las funciones hasta `generatePdfWithJsPDF` se mantienen igual)
// ...
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
    if (!name || !email || !password || !business) return showMessage(msgEl, 'Por favor completa todos los campos requeridos.', 'error');
    if (password.length < 6) return showMessage(msgEl, 'La contraseña debe tener al menos 6 caracteres.', 'error');
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        await db.collection('merchants').doc(user.uid).set({
            name, email, business, phone, description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showMessage(msgEl, '¡Registro exitoso! Redirigiendo...', 'success');
    } catch (error) { showMessage(msgEl, 'Error en el registro.', 'error'); }
}
window.login = async function() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msgEl = document.getElementById('loginMessage');
    if (!email || !password) return showMessage(msgEl, 'Por favor completa todos los campos.', 'error');
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showMessage(msgEl, '¡Bienvenido!', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1000);
    } catch (error) { showMessage(msgEl, 'Correo o contraseña incorrectos.', 'error'); }
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
    await docRef.set(productData, { merge: true });
    showToast('Producto guardado.', 'success');
    hideModal('productModal');
    loadMyProducts();
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
        <div class="product-image" ${product.imageBase64 ? `style="background-image: url('${product.imageBase64}')" onclick="showImageLightbox('${product.imageBase64}')"` : ''}>
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
    card.innerHTML = `
        <div class="product-image" style="${product.imageBase64 ? `background-image: url('${product.imageBase64}')` : ''}" ${product.imageBase64 ? `onclick="showImageLightbox('${product.imageBase64}')"` : ''}></div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <div class="product-actions">
                <button class="action-btn" onclick="showProductModal('${product.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="deleteProduct('${product.id}')"><i class="fas fa-trash"></i></button>
                <button class="action-btn" onclick="toggleProductStatus('${product.id}', ${!product.published})"><i class="fas fa-eye${product.published ? '' : '-slash'}"></i></button>
            </div>
        </div>`;
    container.appendChild(card);
}
window.deleteProduct = async function(id) { if (confirm('¿Eliminar producto?')) { await db.collection('products').doc(id).delete(); loadMyProducts(); showToast('Producto eliminado.'); } }
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
    await db.collection('merchants').doc(currentUser.uid).update(newData);
    await updateUserProfile(currentUser.uid); 
    toggleStoreEditMode(false);
    showToast('Información del puesto actualizada.', 'success');
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
    await db.collection('merchants').doc(currentUser.uid).update(newData);
    await updateUserProfile(currentUser.uid);
    toggleProfileEditMode(false);
    showToast('Perfil actualizado.', 'success');
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
            event.target.value = '';
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
        // (Tu lógica de PDF estándar se mantiene igual)
        // ...
        doc.save(`catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.pdf`);

        // NUEVO: Mostrar el modal de mejora con IA
        showAIUpsellModal('pdf');
    } catch (error) {
        console.error("Error generando PDF:", error);
        showToast("Hubo un error al generar el catálogo.", "error");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

// --- LÓGICA DE MEJORA CON IA ---

function showAIUpsellModal(type, data = null) {
    currentAITask = { type, data };
    const title = document.getElementById('aiUpsellTitle');
    const desc = document.getElementById('aiUpsellDescription');
    if (type === 'pdf') {
        title.textContent = '¡Sube de Nivel tu Catálogo!';
        desc.textContent = '¿Quieres usar la magia de la IA para crear un encabezado y pie de página únicos?';
    } else {
        title.textContent = '¡Crea una Promo Irresistible!';
        desc.textContent = '¿Quieres que la IA genere un fondo profesional para la foto de tu producto?';
    }
    document.getElementById('ai-upsell-modal').style.display = 'flex';
}

function showAIPromptModal() {
    hideModal('ai-upsell-modal');
    document.getElementById('ai-prompt-modal').style.display = 'flex';
    document.getElementById('aiPromptInput').value = ''; // Limpiar input
}

async function handleAIGeneration() {
    const userPrompt = document.getElementById('aiPromptInput').value.trim();
    if (!userPrompt) {
        showToast('Por favor, describe el estilo que buscas.', 'error');
        return;
    }

    const generateBtn = document.getElementById('aiGenerateBtn');
    generateBtn.classList.add('loading');
    generateBtn.disabled = true;

    try {
        const generateAIDesigns = functions.httpsCallable('generateAIDesigns');
        const result = await generateAIDesigns({
            designType: currentAITask.type,
            userPrompt: userPrompt
        });

        if (currentAITask.type === 'pdf') {
            // Lógica para generar PDF con los nuevos assets
            showToast('Función de PDF con IA aún no implementada.', 'success');
        } else if (currentAITask.type === 'jpg' && result.data.backgroundImageUrl) {
            await generateAIJpg(currentAITask.data, result.data.backgroundImageUrl);
        }

    } catch (error) {
        console.error("Error en la función de IA:", error);
        showToast(error.message || 'Hubo un error al generar el diseño.', 'error');
    } finally {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
        hideModal('ai-prompt-modal');
    }
}

async function generateAIJpg(product, backgroundImageUrl) {
    showToast('Creando tu imagen profesional...', 'success');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 1024, canvasHeight = 1024; // Usar el tamaño de la imagen generada
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Cargar imagen de fondo desde la URL de la IA
    const backgroundImage = new Image();
    backgroundImage.crossOrigin = "anonymous";
    backgroundImage.src = backgroundImageUrl;
    await new Promise(r => backgroundImage.onload = r);
    ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
    
    // Cargar imagen del producto
    const productImage = new Image();
    productImage.crossOrigin = "anonymous";
    productImage.src = product.imageBase64 || 'https://placehold.co/700x400/e2e8f0/a0aec0?text=Producto';
    await new Promise(r => productImage.onload = r);
    
    // Escalar proporcionalmente el producto para que ocupe un 60% del canvas
    const boxSize = canvasWidth * 0.6;
    const imgRatio = productImage.width / productImage.height;
    let finalWidth, finalHeight;
    if (imgRatio > 1) { // más ancha que alta
        finalWidth = boxSize;
        finalHeight = finalWidth / imgRatio;
    } else {
        finalHeight = boxSize;
        finalWidth = finalHeight * imgRatio;
    }
    const finalX = (canvasWidth - finalWidth) / 2;
    const finalY = (canvasHeight - finalHeight) / 2;
    ctx.drawImage(productImage, finalX, finalY, finalWidth, finalHeight);

    // Añadir textos (puedes hacerlos más estilizados)
    ctx.textAlign = 'center';
    ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText(product.name, canvasWidth / 2, canvasHeight - 120);
    ctx.fillText(product.name, canvasWidth / 2, canvasHeight - 120);

    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffdd59'; // Un color de precio llamativo
    ctx.strokeText(`$${(product.price || 0).toFixed(2)}`, canvasWidth / 2, canvasHeight - 40);
    ctx.fillText(`$${(product.price || 0).toFixed(2)}`, canvasWidth / 2, canvasHeight - 40);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `promo-ia-${product.name.replace(/\s+/g, '-')}.jpg`;
    link.click();
}


// --- LÓGICA ESTÁNDAR PARA FICHA DE PRODUCTO (JPG) ---
// (Se mantiene igual, solo se añade la llamada al modal de IA al final)
async function generateProductJPG(product) {
    showToast('Generando ficha de producto...', 'success');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 800, canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const themeCyan = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim();
    ctx.fillStyle = themeCyan || '#06b6d4';
    ctx.fillRect(0, 0, canvasWidth, 100);
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(currentMerchantData.business || "Mi Tienda", canvasWidth / 2, 65);
    const productImage = new Image();
    productImage.crossOrigin = "anonymous";
    productImage.src = product.imageBase64 || 'https://placehold.co/700x400/e2e8f0/a0aec0?text=Producto+sin+imagen';
    productImage.onload = () => {
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `ficha-${product.name.replace(/\s+/g, '-')}.jpg`;
        link.click();

        // NUEVO: Mostrar el modal de mejora con IA
        showAIUpsellModal('jpg', product);
    };
    productImage.onerror = () => showToast("Error al cargar la imagen del producto.", "error");
}


// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initializeApp() {
    auth.onAuthStateChanged(async (user) => {
        // ... (lógica de autenticación se mantiene igual)
    });

    // --- EVENT LISTENERS GLOBALES ---
    // ... (listeners existentes)
    
    // NUEVOS listeners para los botones de IA
    document.getElementById('aiConfirmBtn').addEventListener('click', showAIPromptModal);
    document.getElementById('aiGenerateBtn').addEventListener('click', handleAIGeneration);
    // ...
}

initializeApp();