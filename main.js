// Dark Mode Toggle Functionality
(function(){
    const toggleButton = document.getElementById('darkModeToggle');
    const body = document.body;

    // Function to toggle dark mode
    function toggleDarkMode() {
        body.classList.toggle('dark-mode');
        const isDarkMode = body.classList.contains('dark-mode');
        
        // Update icon
        toggleButton.querySelector('i').className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
        
        // Animate icon with GSAP
        if (window.gsap) {
            gsap.to(toggleButton.querySelector('i'), {
                rotation: isDarkMode ? 180 : 0,
                duration: 0.3,
                ease: 'power2.out'
            });
        }
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', isDarkMode ? 'enabled' : 'disabled');
        console.log('Modo claro/oscuro alternado:', isDarkMode ? 'Oscuro' : 'Claro');
    }

    // Initialize dark mode based on localStorage
    document.addEventListener('DOMContentLoaded', () => {
        const darkMode = localStorage.getItem('darkMode');
        if (darkMode === 'enabled') {
            body.classList.add('dark-mode');
            toggleButton.querySelector('i').className = 'fas fa-sun';
        }
        console.log('Botón de modo claro/oscuro inicializado');
        
        // Add event listener for toggle
        toggleButton.addEventListener('click', toggleDarkMode);
    });
})();

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlqGoYrHkASbhmE2aBKIOXqkkNBBEEiGU",
    authDomain: "feria-online-ec7c6.firebaseapp.com",
    projectId: "feria-online-ec7c6",
    storageBucket: "feria-online-ec7c6.appspot.com",
    messagingSenderId: "1001881267179",
    appId: "1:1001881267179:web:fc5ac0fd940964537887ae"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Global variables
let currentUser = null;
let isMerchant = false;

// DOM Elements
const profileLink = document.getElementById('profileLink');
const storeLink = document.getElementById('storeLink');
const authContainer = document.getElementById('authContainer');

// Function to show a section
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        if (section.classList.contains('active-section')) {
            section.classList.add('fade-out');
            setTimeout(() => {
                section.classList.remove('active-section', 'fade-out');
            }, 300);
        }
    });
    
    // Show the selected section
    const targetSection = document.getElementById(sectionId);
    targetSection.classList.add('active-section', 'fade-in');
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick').includes("'" + sectionId + "'")) {
            link.classList.add('active');
        }
    });
    
    // Load content according to section
    switch(sectionId) {
        case 'products':
            loadProducts();
            break;
        case 'my-store':
            if (!isMerchant) {
                showLogin();
                showSection('home');
            } else {
                loadMyProducts();
            }
            break;
        case 'profile':
            if (!isMerchant) {
                showLogin();
                showSection('home');
            }
            break;
    }
    
    // Smooth scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Function to show login modal
function showLogin() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('loginMessage').style.display = 'none';
}

// Function to hide login modal
function hideLogin() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginMessage').style.display = 'none';
}

// Function to show add/edit product modal
function showProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const message = document.getElementById('productModalMessage');
    const saveButton = modal.querySelector('.btn-primary');

    resetProductForm();
    modal.style.display = 'flex';
    message.style.display = 'none';
    
    if (productId) {
        title.textContent = 'Editar Producto';
        saveButton.textContent = 'Actualizar Producto';
        modal.dataset.productId = productId;
        loadProductForEdit(productId);
    } else {
        title.textContent = 'Agregar Nuevo Producto';
        saveButton.textContent = 'Guardar Producto';
        delete modal.dataset.productId;
    }
}

// Function to hide modal
function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Function to show messages
function showMessage(element, message, type) {
    element.textContent = message;
    element.style.display = 'block';
    element.className = `login-message ${type === 'success' ? 'login-success' : 'login-error'}`;
}

// Function to show toast notifications
function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Function to reset product form
function resetProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = 'Artesanías';
    document.getElementById('productDescription').value = '';
    const uploadArea = document.querySelector('#productModal .product-image-upload');
    uploadArea.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Haz clic o arrastra una imagen aquí</p>
        <input type="file" accept="image/*" style="display: none;">
    `;
    setupImageUpload();
}

// Setup image upload functionality
function setupImageUpload() {
    const uploadArea = document.querySelector('#productModal .product-image-upload');
    const fileInput = uploadArea.querySelector('input[type="file"]');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--cyan)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--gray)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--gray)';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImagePreview(file, uploadArea);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImagePreview(file, uploadArea);
        }
    });
}

// Function to handle image preview
function handleImagePreview(file, uploadArea) {
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadArea.innerHTML = `
            <img src="${e.target.result}" class="preview-image" alt="Vista previa del producto">
            <button class="remove-image-btn" type="button"><i class="fas fa-times"></i></button>
        `;
        const removeBtn = uploadArea.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => {
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Haz clic o arrastra una imagen aquí</p>
                <input type="file" accept="image/*" style="display: none;">
            `;
            setupImageUpload();
        });
    };
    reader.readAsDataURL(file);
}

// Function to load products
async function loadProducts() {
    const productsGrid = document.getElementById('productsGrid');
    productsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando productos...</div>';
    
    try {
        const snapshot = await db.collection('products')
            .where('published', '==', true)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        
        productsGrid.innerHTML = '';
        
        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="no-products"><i class="fas fa-box-open"></i> No hay productos disponibles</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            renderProductCard(productsGrid, product);
        });
        
    } catch (error) {
        productsGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error al cargar productos: ${error.message}</div>`;
        console.error("Error loading products:", error);
    }
}

// Function to load merchant products
async function loadMyProducts() {
    if (!currentUser) return;
    
    const productsGrid = document.getElementById('myProductsGrid');
    productsGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Cargando tus productos...</div>';
    
    try {
        const snapshot = await db.collection('products')
            .where('vendorId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        productsGrid.innerHTML = '';
        
        if (snapshot.empty) {
            productsGrid.innerHTML = '<div class="no-products"><i class="fas fa-box-open"></i> Aún no has agregado productos</div>';
            return;
        }
        
        snapshot.forEach(doc => {
            const product = doc.data();
            product.id = doc.id;
            renderMyProductCard(productsGrid, product);
        });
        
    } catch (error) {
        productsGrid.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-circle"></i> Error al cargar tus productos: ${error.message}</div>`;
        console.error("Error loading user products:", error);
    }
}

// Render product card for marketplace
function renderProductCard(container, product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
        <div class="product-image" style="${product.imageUrl ? `background-image: url('${product.imageUrl}')` : ''}">
            ${!product.imageUrl ? '<i class="fas fa-shopping-bag"></i>' : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <p class="product-description">${product.description}</p>
            <div class="product-vendor">
                <i class="fas fa-store"></i>
                <span>${product.vendorName || 'Vendedor'}</span>
            </div>
            <div class="product-category">
                <span class="category-badge">${product.category || 'General'}</span>
            </div>
        </div>
    `;
    container.appendChild(productCard);
}

// Render product card for owner
function renderMyProductCard(container, product) {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
        <div class="product-image" style="${product.imageUrl ? `background-image: url('${product.imageUrl}')` : ''}">
            ${!product.imageUrl ? '<i class="fas fa-shopping-bag"></i>' : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${product.price.toFixed(2)}</div>
            <p class="product-description">${product.description}</p>
            <div class="product-actions">
                <button class="action-btn edit-btn" onclick="showProductModal('${product.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="confirmDeleteProduct('${product.id}')">
                    <i class="fas fa-trash"></i>
                </button>
                <button class="action-btn status-btn" onclick="toggleProductStatus('${product.id}', ${!product.published})">
                    <i class="fas fa-eye${product.published ? '' : '-slash'}"></i>
                </button>
            </div>
        </div>
    `;
    container.appendChild(productCard);
}

// Function to register a new merchant
async function registerMerchant() {
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const business = document.getElementById('regBusiness').value.trim();
    const phone = document.getElementById('regPhone').value.trim();
    const description = document.getElementById('regDescription').value.trim();
    const messageElement = document.getElementById('registerMessage');
    
    // Validation
    if (!name || !email || !password || !business) {
        showMessage(messageElement, 'Por favor completa todos los campos requeridos', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage(messageElement, 'La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        showMessage(messageElement, 'Registrando tu cuenta...', 'success');
        
        // 1. Create auth user
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Save additional data to Firestore
        await db.collection('merchants').doc(user.uid).set({
            name,
            email,
            business,
            phone,
            description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Update UI
        showMessage(messageElement, '¡Registro exitoso! Redirigiendo...', 'success');
        isMerchant = true;
        currentUser = user;
        
        // 4. Load user profile and redirect
        await updateUserProfile(user.uid);
        setTimeout(() => {
            showSection('profile');
            hideModal('register');
        }, 1500);
    } catch (error) {
        showMessage(messageElement, `Error al registrarte: ${error.message}`, 'error');
        console.error("Error registering merchant:", error);
    }
}

// Function to login
async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const messageElement = document.getElementById('loginMessage');
    
    if (!email || !password) {
        showMessage(messageElement, 'Por favor completa todos los campos', 'error');
        return;
    }

    try {
        showMessage(messageElement, 'Iniciando sesión...', 'success');
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        showMessage(messageElement, '¡Inicio de sesión exitoso!', 'success');
        setTimeout(() => {
            hideLogin();
            showSection('profile');
        }, 1500);
    } catch (error) {
        showMessage(messageElement, `Error al iniciar sesión: ${error.message}`, 'error');
        console.error("Error logging in:", error);
    }
}

// Function to save product
async function saveProduct() {
    const productId = document.getElementById('productModal').dataset.productId;
    const productName = document.getElementById('productName').value.trim();
    const productPrice = parseFloat(document.getElementById('productPrice').value);
    const productCategory = document.getElementById('productCategory').value;
    const productDescription = document.getElementById('productDescription').value.trim();
    const uploadArea = document.querySelector('#productModal .product-image-upload');
    const fileInput = uploadArea.querySelector('input[type="file"]');
    const messageElement = document.getElementById('productModalMessage');
    
    // Validation
    if (!productName || !productPrice || isNaN(productPrice) || !productCategory || !productDescription) {
        showMessage(messageElement, 'Por favor completa todos los campos requeridos', 'error');
        return;
    }

    try {
        showMessage(messageElement, 'Guardando producto...', 'success');
        
        let imageUrl = '';
        const file = fileInput && fileInput.files[0];
        
        // Upload image if exists
        if (file) {
            const storageRef = storage.ref(`products/${currentUser.uid}/${Date.now()}_${file.name}`);
            const uploadTask = await storageRef.put(file);
            imageUrl = await uploadTask.ref.getDownloadURL();
        }
        
        const productData = {
            name: productName,
            price: productPrice,
            category: productCategory,
            description: productDescription,
            imageUrl,
            vendorId: currentUser.uid,
            vendorName: document.getElementById('userName').textContent,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            published: true
        };
        
        // Save or update product
        if (productId) {
            // Update existing product
            await db.collection('products').doc(productId).update(productData);
            showMessage(messageElement, 'Producto actualizado con éxito', 'success');
        } else {
            // Add new product
            await db.collection('products').add(productData);
            showMessage(messageElement, 'Producto guardado con éxito', 'success');
        }
        
        // Reset form and refresh products
        resetProductForm();
        await loadMyProducts();
        setTimeout(() => hideModal('productModal'), 1500);
        
    } catch (error)