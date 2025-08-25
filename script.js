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

window.deleteProduct = async function(id) { if (confirm('¿Eliminar producto?')) { await db.collection('products').doc(id).delete(); loadMyProducts(); } }
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
        showToast('Catálogo exportado exitosamente.', 'success');
    } catch (error) {
        console.error("Error exportando a JSON:", error);
        showToast('Hubo un error al exportar el catálogo.', 'error');
    }
}

window.handleJsonImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
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
        let importedCount = 0;
        const importPromises = products.map(product => {
            if (!product.name) return Promise.resolve();
            const newProductData = {
                name: product.name, price: product.price || 0, description: product.description || '', imageBase64: product.imageBase64 || null,
                published: typeof product.published === 'boolean' ? product.published : true,
                vendorId: currentUser.uid, vendorName: currentMerchantData.business, createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            importedCount++;
            return db.collection('products').add(newProductData);
        });
        await Promise.all(importPromises);
        showToast(`${importedCount} productos importados correctamente.`, 'success');
        loadMyProducts();
        updateUserProfile(currentUser.uid);
    } catch (error) {
        console.error("Error durante la importación masiva:", error);
        showToast('Ocurrió un error durante la importación.', 'error');
    }
}

// --- GENERACIÓN DE CATÁLOGOS (PDF & JPG) ---

const PDF_THEMES = {
    naturaleza: { name: 'Naturaleza', icon: 'fa-leaf', headerColor: '#22c55e', accentColor: '#16a34a', iconUnicode: '\uf06c' },
    gastronomia: { name: 'Gastronomía', icon: 'fa-utensils', headerColor: '#f97316', accentColor: '#ea580c', iconUnicode: '\uf2e7' },
    juguetes: { name: 'Juguetes', icon: 'fa-shapes', headerColor: '#3b82f6', accentColor: '#2563eb', iconUnicode: '\uf61f' },
    moda: { name: 'Moda', icon: 'fa-tshirt', headerColor: '#ec4899', accentColor: '#db2777', iconUnicode: '\uf553' },
    tecnologia: { name: 'Tecnología', icon: 'fa-microchip', headerColor: '#6366f1', accentColor: '#4f46e5', iconUnicode: '\uf2db' },
    artesania: { name: 'Artesanía', icon: 'fa-palette', headerColor: '#a855f7', accentColor: '#9333ea', iconUnicode: '\uf53f' },
    minimalista: { name: 'Minimalista', icon: 'fa-dot-circle', headerColor: '#6b7280', accentColor: '#4b5563', iconUnicode: '\uf192' },
    elegante: { name: 'Elegante', icon: 'fa-gem', headerColor: '#d97706', accentColor: '#b45309', iconUnicode: '\uf3a5' }
};

window.showExportModal = function(exportType) {
    if (!currentUser) {
        showToast('Debes iniciar sesión para crear un catálogo.', 'error');
        return;
    }
    const grid = document.getElementById('themeSelectionGrid');
    const modalTitle = document.getElementById('exportModalTitle');
    grid.innerHTML = '';
    
    modalTitle.textContent = `Elige un Diseño para tu Catálogo ${exportType.toUpperCase()}`;
    
    for (const key in PDF_THEMES) {
        const theme = PDF_THEMES[key];
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.innerHTML = `<i class="fas ${theme.icon}"></i><span>${theme.name}</span>`;
        if (exportType === 'pdf') {
            card.onclick = () => generatePdfWithJsPDF(key);
        } else {
            card.onclick = () => generateJpgCatalog(key);
        }
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
        const merchantInfo = currentMerchantData;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const numColumns = 3;
        const columnGutter = 10;
        const contentWidth = pageWidth - (margin * 2);
        const columnWidth = (contentWidth - (columnGutter * (numColumns - 1))) / numColumns;
        let currentColumnIndex = 0;
        let currentY = margin;
        
        const columnXPositions = Array.from({ length: numColumns }, (_, i) => margin + i * (columnWidth + columnGutter));

        // --- Helper Functions para dibujar en la página ---
        const addPageDecorations = () => {
            // Dibujar icono de fondo
            doc.setFont('FontAwesome', 'normal');
            doc.setFontSize(180);
            doc.setTextColor(theme.headerColor);
            doc.text(theme.iconUnicode, pageWidth / 2, pageHeight / 2 + 45, { align: 'center', opacity: 0.08 });
            doc.setFont('Helvetica', 'normal'); // Reset font

            // Dibujar patrón de fondo
            doc.setDrawColor(theme.accentColor);
            doc.setLineWidth(0.1);
            for (let i = 0; i < pageWidth; i += 10) {
                doc.line(i, 0, i, pageHeight);
            }
            for (let i = 0; i < pageHeight; i += 10) {
                doc.line(0, i, pageWidth, i);
            }
        };

        const addHeader = () => {
            currentY = margin;
            doc.setFontSize(32);
            doc.setTextColor(theme.headerColor);
            doc.text(merchantInfo.business, pageWidth / 2, currentY + 5, { align: 'center' });
            currentY += 15;
            
            doc.setFontSize(10);
            doc.setTextColor('#666');
            const descriptionText = String(merchantInfo.description || '');
            const descLines = doc.splitTextToSize(descriptionText, contentWidth - 60);
            doc.text(descLines, pageWidth / 2, currentY, { align: 'center' });
            currentY += (descLines.length * 4) + 8;
            
            doc.setDrawColor(theme.headerColor);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 10;
        };

        const addFooter = (pageNumber) => {
            const footerY = pageHeight - 10;
            doc.setFontSize(8);
            doc.setTextColor('#999');
            const footerText = `Catálogo de ${merchantInfo.business} | Página ${pageNumber}`;
            doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
        };
        
        const addNewPage = () => {
            doc.addPage();
            pageCount++;
            currentY = margin;
            currentColumnIndex = 0;
            addPageDecorations();
            addHeader();
            addFooter(pageCount);
        };

        // --- Inicio del Documento ---
        let pageCount = 1;
        addPageDecorations();
        addHeader();
        addFooter(pageCount);

        for (const product of products) {
            const productBlockHeight = 70; // Espacio vertical para cada producto
            
            if (currentY + productBlockHeight > pageHeight - margin) {
                currentColumnIndex++;
                currentY = margin + 42; // Reset Y a la posición inicial después del header
                if (currentColumnIndex >= numColumns) {
                    addNewPage();
                }
            }

            const currentX = columnXPositions[currentColumnIndex];

            // Dibujar Imagen
            if (product.imageBase64) {
                try {
                    const format = product.imageBase64.substring("data:image/".length, product.imageBase64.indexOf(";base64")).toUpperCase();
                    if (['JPG', 'JPEG', 'PNG'].includes(format)) {
                        const img = new Image();
                        img.src = product.imageBase64;
                        await new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });

                        const maxWidth = columnWidth;
                        const maxHeight = 40;
                        
                        let finalWidth = img.width;
                        let finalHeight = img.height;

                        if (finalWidth > maxWidth) {
                            finalHeight = (maxWidth / finalWidth) * finalHeight;
                            finalWidth = maxWidth;
                        }
                        if (finalHeight > maxHeight) {
                            finalWidth = (maxHeight / finalHeight) * finalWidth;
                            finalHeight = maxHeight;
                        }

                        const xOffset = currentX + (maxWidth - finalWidth) / 2;
                        const yOffset = currentY + (maxHeight - finalHeight) / 2;

                        doc.addImage(product.imageBase64, format, xOffset, yOffset, finalWidth, finalHeight);
                    }
                } catch (e) { console.error("Error al añadir imagen:", e); }
            }
            let textY = currentY + 48; // Posición Y para el texto, debajo de la imagen

            // Dibujar Textos
            doc.setFontSize(11);
            doc.setTextColor(theme.headerColor);
            const titleLines = doc.splitTextToSize(String(product.name || ''), columnWidth);
            doc.text(titleLines, currentX, textY);
            textY += (titleLines.length * 4.5);

            doc.setFontSize(12);
            doc.setTextColor(theme.accentColor);
            doc.text(`$${(product.price || 0).toFixed(2)}`, currentX, textY);
            textY += 6;
            
            doc.setFontSize(8);
            doc.setTextColor('#333');
            const descLines = doc.splitTextToSize(String(product.description || ''), columnWidth);
            doc.text(descLines, currentX, textY);
            
            currentY += productBlockHeight + 10;
        }

        doc.save(`catalogo-${merchantInfo.business.replace(/\s+/g, '-')}.pdf`);

    } catch (error) {
        console.error("Error generando PDF con jsPDF:", error);
        showToast("Hubo un error al generar el catálogo.", "error");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

async function generateJpgCatalog(themeKey) {
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
        const element = await buildCatalogHtml_forImage(themeKey, products);
        const canvas = await html2canvas(element.querySelector('.pdf-page'), { useCORS: true, scale: 2 });
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/jpeg', 0.95);
        a.download = `catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        document.body.removeChild(element);
    } catch (error) {
        console.error("Error generando JPG:", error);
        showToast("Hubo un error al generar la imagen del catálogo.", "error");
    } finally {
        loadingOverlay.style.display = 'none';
    }
}

function buildCatalogHtml_forImage(themeKey, products) {
    return new Promise((resolve) => {
        const theme = PDF_THEMES[themeKey];
        const merchantInfo = currentMerchantData;
        const wrapper = document.createElement('div');
        wrapper.id = 'pdf-content-wrapper';
        let contentHTML = `
            <style>
                .pdf-header { border-color: ${theme.headerColor}; }
                .pdf-header h1 { color: ${theme.headerColor}; }
                .pdf-product-details .price { color: ${theme.accentColor}; }
                .pdf-product-details h3 { color: ${theme.headerColor}; }
            </style>
            <div class="pdf-page">
                <div class="pdf-header">
                    <h1>${merchantInfo.business}</h1>
                    <p>${merchantInfo.description || ''}</p>
                </div>
                <div class="pdf-product-grid">
        `;
        products.forEach((product) => {
            contentHTML += `
                <div class="pdf-product-item">
                    <div class="pdf-product-image-container">
                        ${product.imageBase64 ? `<img src="${product.imageBase64}" crossorigin="anonymous">` : '<i class="fas fa-image" style="font-size: 50px; color: #ccc;"></i>'}
                    </div>
                    <div class="pdf-product-details">
                        <h3>${product.name}</h3>
                        <div class="price">$${(product.price || 0).toFixed(2)}</div>
                        <p class="description">${product.description || 'Sin descripción.'}</p>
                    </div>
                </div>
            `;
        });
        contentHTML += `</div></div>`;
        wrapper.innerHTML = contentHTML;
        document.body.appendChild(wrapper);

        const images = wrapper.getElementsByTagName('img');
        if (images.length === 0) {
            setTimeout(() => resolve(wrapper), 100);
            return;
        }
        const imagePromises = Array.from(images).filter(img => !img.complete).map(img => new Promise(res => { img.onload = res; img.onerror = res; }));
        Promise.all(imagePromises).then(() => {
            setTimeout(() => resolve(wrapper), 100);
        });
    });
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

window.showImageLightbox = function(imageBase64) {
    const lightboxImg = document.getElementById('lightboxImg');
    lightboxImg.src = imageBase64;
    lightboxImg.loading = 'lazy';
    document.getElementById('imageLightbox').style.display = 'flex';
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

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
function initializeApp() {
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
    });
    const hamburger = document.getElementById('hamburgerMenu');
    const navContainer = document.getElementById('navContainer');
    hamburger.addEventListener('click', () => {
        navContainer.classList.toggle('active');
    });
    setupImageUpload('productImageUploadArea', 'productImageInput', (file) => selectedProductFile = file);
    setupImageUpload('profilePicUploadArea', 'profilePicInput', (file) => {
        selectedProfilePicFile = file;
        selectedAvatarUrl = null;
        document.querySelectorAll('.avatar-item').forEach(el => el.style.borderColor = 'transparent');
    });
    loadProducts();
    populateAvatars();
    const themeToggle = document.getElementById('themeToggle');
    const applyTheme = (theme) => { document.body.dataset.theme = theme; localStorage.setItem('theme', theme); };
    themeToggle.addEventListener('click', () => applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'));
    applyTheme(localStorage.getItem('theme') || 'light');
}

initializeApp();