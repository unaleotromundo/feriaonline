(function(){
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
            
            // 4. Load user data
            await updateUserProfile(user.uid);
            updateAuthUI();
            
            // 5. Redirect after 2 seconds
            setTimeout(() => showSection('profile'), 2000);
            
        } catch (error) {
            let errorMessage = "Error en el registro";
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "Este correo ya está registrado";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "Correo electrónico inválido";
            }
            showMessage(messageElement, errorMessage, 'error');
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
            
            // 1. Authenticate user
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // 2. Check if merchant
            const merchantDoc = await db.collection('merchants').doc(user.uid).get();
            
            if (!merchantDoc.exists) {
                await auth.signOut();
                showMessage(messageElement, 'Esta cuenta no está registrada como comerciante', 'error');
                return;
            }
            
            // 3. Update state
            isMerchant = true;
            currentUser = user;
            
            // 4. Update last login
            await db.collection('merchants').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // 5. Load user data
            await updateUserProfile(user.uid);
            
            // 6. Update UI and redirect
            showMessage(messageElement, `¡Bienvenido ${merchantDoc.data().name}!`, 'success');
            setTimeout(() => {
                hideLogin();
                updateAuthUI();
                showSection('profile');
            }, 1500);
            
        } catch (error) {
            let errorMessage = "Error al iniciar sesión";
            if (error.code === 'auth/wrong-password') {
                errorMessage = "Contraseña incorrecta";
            } else if (error.code === 'auth/user-not-found') {
                errorMessage = "Usuario no encontrado";
            }
            showMessage(messageElement, errorMessage, 'error');
        }
    }
    
    // Function to load user profile
    async function updateUserProfile(userId) {
        try {
            const doc = await db.collection('merchants').doc(userId).get();
            if (doc.exists) {
                const data = doc.data();
                
                // Update profile UI
                document.getElementById('userName').textContent = data.name;
                document.getElementById('userEmail').textContent = data.email;
                document.getElementById('userPhone').textContent = data.phone || 'No especificado';
                document.getElementById('userBusiness').textContent = data.business;
                
                // Format date
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                const createdAt = data.createdAt?.toDate();
                document.getElementById('userSince').textContent = createdAt ? 
                    createdAt.toLocaleDateString('es-ES', options) : 'Reciente';
                
                // Update "My Store" section
                document.getElementById('storeName').value = data.business;
                document.getElementById('storeDescription').value = data.description || '';
                document.getElementById('storeContact').value = data.phone || '';
                
                // Load statistics
                await loadUserStats(userId);
            }
        } catch (error) {
            console.error("Error loading profile:", error);
            showErrorMessage("Error al cargar el perfil");
        }
    }
    
    // Function to load user statistics
    async function loadUserStats(userId) {
        try {
            // Count user products
            const productsQuery = await db.collection('products')
                .where('vendorId', '==', userId)
                .get();
            
            document.getElementById('userProducts').textContent = productsQuery.size;
            
            // Here we could add more statistics like:
            // - Total sales
            // - Average rating
            // - Most popular products
        } catch (error) {
            console.error("Error loading user stats:", error);
        }
    }
    
    // Setup image upload functionality
    function setupImageUpload() {
        const uploadArea = document.querySelector('#productModal .product-image-upload');
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        uploadArea.appendChild