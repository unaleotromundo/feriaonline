// Feria Virtual - Lógica de la Aplicación (Versión Corregida y Mejorada)

// ... (todo el código desde el principio hasta la sección de exportación se mantiene igual)
// ... (copia todo desde tu script.js hasta justo antes de "--- FUNCIONALIDAD DE GENERACIÓN DE CATÁLOGO PDF ---")

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
// ... (esta parte no cambia)
window.showSection=function(e){document.querySelectorAll(".section").forEach(e=>e.classList.remove("active-section"));const t=document.getElementById(e);t&&t.classList.add("active-section"),document.getElementById("navContainer").classList.remove("active"),"products"===e&&loadProducts(),"my-store"===e&&isMerchant&&loadMyProducts()},window.showLogin=function(){document.getElementById("loginModal").style.display="flex"},window.hideLogin=function(){document.getElementById("loginModal").style.display="none"},window.hideModal=function(e){document.getElementById(e).style.display="none"},window.showProductModal=function(e=null){const t=document.getElementById("productModal"),o=document.getElementById("productModalTitle");resetProductForm(),t.style.display="flex",e?(o.textContent="Editar Producto",t.dataset.productId=e,loadProductForEdit(e)):(o.textContent="Agregar Nuevo Producto",delete t.dataset.productId)};

// --- CARGA DE DATOS (PRODUCTOS) ---
// ... (esta parte no cambia)
async function loadProducts(e="productsGrid",t={}){const o=document.getElementById(e);o.innerHTML="<div>Cargando productos...</div>";try{let n=db.collection("products").where("published","==",!0);t.vendorId&&(n=n.where("vendorId","==",t.vendorId));const d=await n.orderBy("createdAt","desc").get();o.innerHTML="",d.empty?o.innerHTML="<div>No hay productos para mostrar.</div>":d.forEach(e=>renderProductCard(o,{id:e.id,...e.data()}))}catch(r){console.error("Error loading products:",r),o.innerHTML="<div>Error al cargar productos.</div>"}}
async function loadMyProducts(){if(!currentUser)return;const e=document.getElementById("myProductsGrid");e.innerHTML="<div>Cargando tus productos...</div>";try{const t=await db.collection("products").where("vendorId","==",currentUser.uid).orderBy("createdAt","desc").get();if(e.innerHTML="",t.empty)return void(e.innerHTML="<div>Aún no has agregado productos.</div>");t.forEach(t=>renderMyProductCard(e,{id:t.id,...t.data()}))}catch(o){console.error("Error loading user products:",o)}}

// --- AUTENTICACIÓN Y REGISTRO ---
// ... (esta parte no cambia)
window.registerMerchant=async function(){const e=document.getElementById("regName").value.trim(),t=document.getElementById("regEmail").value.trim(),o=document.getElementById("regPassword").value,n=document.getElementById("regBusiness").value.trim(),d=document.getElementById("regPhone").value.trim(),r=document.getElementById("regDescription").value.trim(),a=document.getElementById("registerMessage");if(!e||!t||!o||!n)return showMessage(a,"Por favor completa todos los campos requeridos.","error");if(o.length<6)return showMessage(a,"La contraseña debe tener al menos 6 caracteres.","error");try{const i=await auth.createUserWithEmailAndPassword(t,o),c=i.user;await db.collection("merchants").doc(c.uid).set({name:e,email:t,business:n,phone:d,description:r,createdAt:firebase.firestore.FieldValue.serverTimestamp()}),showMessage(a,"¡Registro exitoso! Redirigiendo...","success")}catch(l){showMessage(a,"Error en el registro.","error")}},window.login=async function(){const e=document.getElementById("loginEmail").value.trim(),t=document.getElementById("loginPassword").value,o=document.getElementById("loginMessage");if(!e||!t)return showMessage(o,"Por favor completa todos los campos.","error");try{await auth.signInWithEmailAndPassword(e,t),showMessage(o,"¡Bienvenido!","success"),setTimeout(()=>{hideLogin(),showSection("profile")},1e3)}catch(n){showMessage(o,"Correo o contraseña incorrectos.","error")}},window.logout=function(){auth.signOut()};

// --- GESTIÓN DE PERFIL Y PUESTO ---
// ... (esta parte no cambia)
async function updateUserProfile(e){try{const t=await db.collection("merchants").doc(e).get();if(!t.exists)return;currentMerchantData=t.data();const o=await db.collection("products").where("vendorId","==",e).get();document.getElementById("userName").textContent=currentMerchantData.name,document.getElementById("userEmail").textContent=currentMerchantData.email,document.getElementById("userPhone").textContent=currentMerchantData.phone||"No especificado",document.getElementById("userBusiness").textContent=currentMerchantData.business,document.getElementById("userProducts").textContent=`${o.size} productos publicados`;const n=currentMerchantData.createdAt?.toDate();document.getElementById("userSince").textContent=n?new Date(n).toLocaleDateString():"N/A";const d=document.getElementById("profilePicContainer");currentMerchantData.profilePic?d.innerHTML=`<img src="${currentMerchantData.profilePic}" alt="Foto de perfil" loading="lazy"><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>`:d.innerHTML='<i class="fas fa-user"></i><div class="profile-pic-edit-overlay"><i class="fas fa-camera"></i></div>',document.getElementById("storeName").value=currentMerchantData.business,document.getElementById("storeDescription").value=currentMerchantData.description}catch(r){console.error("Error loading profile:",r)}}

// --- GESTIÓN DE PRODUCTOS ---
// ... (esta parte no cambia)
function setupImageUpload(e,t,o){const n=document.getElementById(e),d=document.getElementById(t);n.addEventListener("click",()=>d.click()),d.addEventListener("change",e=>{const t=e.target.files[0];if(t){o(t);const d=new FileReader;d.onload=e=>{n.innerHTML=`<img src="${e.target.result}" class="preview-image" loading="lazy">`},d.readAsDataURL(t)}})}
async function loadProductForEdit(e){try{const t=await db.collection("products").doc(e).get();if(t.exists){const o=t.data();document.getElementById("productName").value=o.name,document.getElementById("productPrice").value=o.price,document.getElementById("productDescription").value=o.description,o.imageBase64&&(document.getElementById("productImageUploadArea").innerHTML=`<img src="${o.imageBase64}" class="preview-image">`,document.getElementById("productImageUploadArea").dataset.existingImage=o.imageBase64)}}catch(o){console.error("Error loading product for edit:",o)}}
window.saveProduct=async function(){const e=!!document.getElementById("productModal").dataset.productId,t={name:document.getElementById("productName").value,price:parseFloat(document.getElementById("productPrice").value),description:document.getElementById("productDescription").value,vendorId:currentUser.uid,vendorName:document.getElementById("userBusiness").textContent};let o=document.getElementById("productImageUploadArea").dataset.existingImage||null;if(selectedProductFile){const n=await imageCompression(selectedProductFile,{maxSizeMB:.5,maxWidthOrHeight:800});o=await new Promise(e=>{const t=new FileReader;t.onload=()=>e(t.result),t.readAsDataURL(n)})}t.imageBase64=o;const d=e?db.collection("products").doc(document.getElementById("productModal").dataset.productId):db.collection("products").doc();e||(t.createdAt=firebase.firestore.FieldValue.serverTimestamp()),t.published=!0,await d.set(t,{merge:!0}),showToast("Producto guardado.","success"),hideModal("productModal"),loadMyProducts()}
function resetProductForm(){document.getElementById("productName").value="",document.getElementById("productPrice").value="",document.getElementById("productDescription").value="",document.getElementById("productImageUploadArea").innerHTML='<i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra una imagen aquí</p>',document.getElementById("productImageInput").value="",selectedProductFile=null}

// --- RENDERIZADO DE ELEMENTOS ---
// ... (esta parte no cambia)
function renderProductCard(e,t){const o=document.createElement("div");o.className="product-card",o.innerHTML=`
        <div class="product-image" ${t.imageBase64?`style="background-image: url('${t.imageBase64}')" onclick="showImageLightbox('${t.imageBase64}')"`:""}>
            ${t.imageBase64?"":'<i class="fas fa-shopping-bag"></i>'}
        </div>
        <div class="product-info">
            <h3 class="product-title">${t.name}</h3>
            <div class="product-price">$${(t.price||0).toFixed(2)}</div>
            <p class="product-description">${t.description||""}</p>
            <div class="product-vendor">
                <i class="fas fa-store"></i>
                <a href="#" onclick="event.preventDefault(); showVendorPage('${t.vendorId}', '${t.vendorName}')">${t.vendorName||""}</a>
            </div>
        </div>`,e.appendChild(o)}
function renderMyProductCard(e,t){const o=document.createElement("div");o.className="product-card",o.innerHTML=`
        <div class="product-image" style="${t.imageBase64?`background-image: url('${t.imageBase64}')`:""}" ${t.imageBase64?`onclick="showImageLightbox('${t.imageBase64}')"`:""}></div>
        <div class="product-info">
            <h3 class="product-title">${t.name}</h3>
            <div class="product-price">$${(t.price||0).toFixed(2)}</div>
            <div class="product-actions">
                <button class="action-btn" onclick="showProductModal('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="action-btn" onclick="deleteProduct('${t.id}')"><i class="fas fa-trash"></i></button>
                <button class="action-btn" onclick="toggleProductStatus('${t.id}', ${!t.published})"><i class="fas fa-eye${t.published?"":"-slash"}"></i></button>
            </div>
        </div>`,e.appendChild(o)}

// --- ACCIONES DE PRODUCTO Y PUESTO ---
// ... (esta parte no cambia)
window.deleteProduct=async function(e){confirm("¿Eliminar producto?")&&await db.collection("products").doc(e).delete().then(()=>loadMyProducts())},window.toggleProductStatus=async function(e,t){await db.collection("products").doc(e).update({published:t}),loadMyProducts()},window.showVendorPage=async function(e,t){showSection("vendor-page"),document.getElementById("vendorPageTitle").textContent=t;const o=document.getElementById("vendorWhatsappBtn");o.style.display="none";try{const n=await db.collection("merchants").doc(e).get();if(n.exists&&n.data().phone){const d=n.data().phone.replace(/[^0-9]/g,"");d&&(o.href=`https://wa.me/${d}`,o.style.display="inline-flex")}}catch(r){console.error("Error fetching vendor phone:",r)}loadProducts("vendorProductsGrid",{vendorId:e})},window.toggleStoreEditMode=function(e){document.getElementById("storeName").readOnly=!e,document.getElementById("storeDescription").readOnly=!e,document.getElementById("editStoreBtn").style.display=e?"none":"block",document.getElementById("storeFormFooter").style.display=e?"flex":"none",!e&&currentMerchantData&&(document.getElementById("storeName").value=currentMerchantData.business,document.getElementById("storeDescription").value=currentMerchantData.description)},window.saveStoreInfo=async function(){const e={business:document.getElementById("storeName").value,description:document.getElementById("storeDescription").value};await db.collection("merchants").doc(currentUser.uid).update(e),await updateUserProfile(currentUser.uid),toggleStoreEditMode(!1),showToast("Información del puesto actualizada.","success")},window.toggleProfileEditMode=function(e){const t=document.getElementById("profileCard");t.classList.toggle("edit-mode",e),document.getElementById("editProfileBtn").style.display=e?"none":"block",document.getElementById("profileFormFooter").style.display=e?"flex":"none",e&&(document.getElementById("userNameInput").value=document.getElementById("userName").textContent,document.getElementById("userPhoneInput").value="No especificado"===(e=document.getElementById("userPhone").textContent)?"":e)},window.saveProfileInfo=async function(){const e={name:document.getElementById("userNameInput").value.trim(),phone:document.getElementById("userPhoneInput").value.trim()};await db.collection("merchants").doc(currentUser.uid).update(e),await updateUserProfile(currentUser.uid),toggleProfileEditMode(!1),showToast("Perfil actualizado.","success")},window.showProfilePicModal=function(){document.getElementById("profilePicModal").style.display="flex",selectedProfilePicFile=null,selectedAvatarUrl=null,document.getElementById("profilePicUploadArea").innerHTML='<i class="fas fa-cloud-upload-alt"></i><p>Haz clic para subir</p>'},window.saveProfilePic=async function(){let e=null;if(selectedProfilePicFile){const t=await imageCompression(selectedProfilePicFile,{maxSizeMB:.2,maxWidthOrHeight:400});e=await new Promise(e=>{const o=new FileReader;o.onload=()=>e(o.result),o.readAsDataURL(t)})}else selectedAvatarUrl&&(e=selectedAvatarUrl);e?(await db.collection("merchants").doc(currentUser.uid).update({profilePic:e}),await updateUserProfile(currentUser.uid),hideModal("profilePicModal"),showToast("Foto de perfil actualizada.","success")):showToast("No seleccionaste ninguna imagen.","error")},window.populateAvatars=function(){const e=document.getElementById("avatarSelection");e.innerHTML="";["male","female","human","identicon","bottts","avataaars","jdenticon","micah"].forEach(t=>{const o=`https://api.dicebear.com/8.x/pixel-art/svg?seed=${t}&radius=50`,n=document.createElement("div");n.className="avatar-item",n.innerHTML=`<img src="${o}" alt="Avatar ${t}" loading="lazy">`,n.onclick=()=>{selectedAvatarUrl=o,selectedProfilePicFile=null,document.getElementById("profilePicUploadArea").innerHTML=`<img src="${o}" class="preview-image">`,e.querySelectorAll(".avatar-item").forEach(e=>e.style.borderColor="transparent"),n.style.borderColor="var(--cyan)"},e.appendChild(n)})};

// --- FUNCIONES DE IMPORTACIÓN Y EXPORTACIÓN (JSON) ---
// ... (esta parte no cambia)
window.exportCatalogToJSON=async function(){if(!currentUser)return showToast("Debes iniciar sesión para exportar tu catálogo.","error");showToast("Preparando la exportación...","success");try{const e=await db.collection("products").where("vendorId","==",currentUser.uid).get();if(e.empty)return showToast("No tienes productos para exportar.","error");const t=e.docs.map(e=>{const t=e.data();return{name:t.name,price:t.price,description:t.description,imageBase64:t.imageBase64||null,published:t.published}}),o=JSON.stringify(t,null,2),n=new Blob([o],{type:"application/json"}),d=URL.createObjectURL(n),r=document.createElement("a");r.href=d,r.download=`catalogo-feria-virtual-${(new Date).toISOString().slice(0,10)}.json`,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(d),showToast("Catálogo exportado exitosamente.","success")}catch(a){console.error("Error exportando a JSON:",a),showToast("Hubo un error al exportar el catálogo.","error")}},window.handleJsonImport=function(e){const t=e.target.files[0];if(!t)return;const o=new FileReader;o.onload=e=>{try{const t=JSON.parse(e.target.result);confirm(`¿Estás seguro de que deseas importar ${t.length} productos a tu catálogo? Esta acción no se puede deshacer.`)&&importCatalogFromJSON(t)}catch(o){console.error("Error al parsear el archivo JSON:",o),showToast("El archivo seleccionado no es un JSON válido.","error")}finally{event.target.value=""}},o.readAsText(t)},async function importCatalogFromJSON(e){if(!Array.isArray(e)||0===e.length)return showToast("El archivo no contiene productos para importar.","error");showToast(`Importando ${e.length} productos...`,"success");try{let t=0;const o=e.map(e=>{if(e.name)return t++,db.collection("products").add({name:e.name,price:e.price||0,description:e.description||"",imageBase64:e.imageBase64||null,published:"boolean"==typeof e.published?e.published:!0,vendorId:currentUser.uid,vendorName:currentMerchantData.business,createdAt:firebase.firestore.FieldValue.serverTimestamp()});return Promise.resolve()});await Promise.all(o),showToast(`${t} productos importados correctamente.`,"success"),loadMyProducts(),updateUserProfile(currentUser.uid)}catch(n){console.error("Error durante la importación masiva:",n),showToast("Ocurrió un error durante la importación.","error")}};


// --- NUEVA SECCIÓN: GENERACIÓN DE CATÁLOGOS (PDF & JPG) ---

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

/**
 * Función centralizada y robusta para construir el HTML del catálogo
 * y asegurar que todas las imágenes estén cargadas antes de proceder.
 * @param {string} themeKey - La clave del tema seleccionado.
 * @param {Array} products - El array de productos a mostrar.
 * @returns {Promise<HTMLElement>} - Una promesa que resuelve con el elemento del DOM listo para ser exportado.
 */
function buildCatalogHtml(themeKey, products) {
    return new Promise((resolve) => {
        const theme = PDF_THEMES[themeKey];
        const merchantInfo = currentMerchantData;
        
        const wrapper = document.createElement('div');
        wrapper.id = 'pdf-content-wrapper';

        let contentHTML = `...`; // (El contenido HTML se genera igual que antes)
        
        // Esta parte es idéntica a la versión anterior
        contentHTML = `
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

        products.forEach((product, index) => {
            const itemsPerPage = 4; // 2x2 grid
            if (index > 0 && index % itemsPerPage === 0) {
                contentHTML += `</div><div class="html2pdf__page-break"></div><div class="pdf-product-grid">`;
            }
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
        
        contentHTML += `
                </div>
                <div class="pdf-footer">
                    Catálogo de ${merchantInfo.business} &copy; ${new Date().getFullYear()}
                </div>
            </div>
        `;
        
        wrapper.innerHTML = contentHTML;
        document.body.appendChild(wrapper);

        // --- LA SOLUCIÓN DEFINITIVA ---
        // Esperamos a que TODAS las imágenes se carguen
        const images = wrapper.getElementsByTagName('img');
        const imagePromises = [];
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            if (img.complete) continue; // Si ya está cacheada, no hacemos nada
            
            imagePromises.push(new Promise(res => {
                img.onload = res;
                img.onerror = res; // Resolvemos incluso si hay error para no bloquear la exportación
            }));
        }

        Promise.all(imagePromises).then(() => {
            // Damos un respiro extra de 100ms por si acaso
            setTimeout(() => resolve(wrapper), 100);
        });
    });
}

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
            card.onclick = () => generatePdfCatalog(key);
        } else {
            card.onclick = () => generateJpgCatalog(key);
        }
        grid.appendChild(card);
    }
    document.getElementById('exportThemeModal').style.display = 'flex';
}

async function generatePdfCatalog(themeKey) {
    hideModal('exportThemeModal');
    showToast('Generando tu catálogo PDF, por favor espera...', 'success');

    const productsSnapshot = await db.collection('products').where('vendorId', '==', currentUser.uid).where('published', '==', true).get();
    if (productsSnapshot.empty) {
        showToast('No tienes productos publicados para incluir.', 'error');
        return;
    }
    const products = productsSnapshot.docs.map(doc => doc.data());

    // 1. Construir y esperar el HTML renderizado
    const element = await buildCatalogHtml(themeKey, products);
    
    const opt = {
        margin: 0,
        filename: `catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // 2. Generar el PDF
    html2pdf().from(element).set(opt).save().then(() => {
        document.body.removeChild(element); // Limpieza
    });
}

async function generateJpgCatalog(themeKey) {
    hideModal('exportThemeModal');
    showToast('Generando tu imagen JPG, por favor espera...', 'success');

    const productsSnapshot = await db.collection('products').where('vendorId', '==', currentUser.uid).where('published', '==', true).get();
    if (productsSnapshot.empty) {
        showToast('No tienes productos publicados para incluir.', 'error');
        return;
    }
    const products = productsSnapshot.docs.map(doc => doc.data());

    // 1. Construir y esperar el HTML renderizado
    const element = await buildCatalogHtml(themeKey, products);

    // 2. Usar html2canvas para generar la imagen
    html2canvas(element.querySelector('.pdf-page'), { useCORS: true, scale: 2 })
        .then(canvas => {
            const a = document.createElement('a');
            a.href = canvas.toDataURL('image/jpeg', 0.95);
            a.download = `catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            document.body.removeChild(element); // Limpieza
        });
}

// --- UTILIDADES Y FUNCIONES AUXILIARES ---
// ... (esta parte no cambia)
function updateAuthUI(){isMerchant&&currentUser?(authContainer.innerHTML=`
            <div class="user-dropdown">
                <div class="nav-link" onclick="this.nextElementSibling.style.display = 'block' === this.nextElementSibling.style.display ? 'none' : 'block'">
                    <i class="fas fa-user-circle"></i><span>Mi Cuenta</span>
                </div>
                <div class="dropdown-menu">
                    <a href="#" onclick="showSection('profile')"><i class="fas fa-user"></i> Mi Perfil</a>
                    <a href="#" onclick="showSection('my-store')"><i class="fas fa-store"></i> Mi Puesto</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
                </div>
            </div>`,profileLink.style.display="flex",storeLink.style.display="flex"):(authContainer.innerHTML='<a href="#" class="nav-link" onclick="showLogin()"><i class="fas fa-sign-in-alt"></i><span>Iniciar sesión</span></a>',profileLink.style.display="none",storeLink.style.display="none")}
function showMessage(e,t,o){e.textContent=t,e.className=`login-message login-${o}`,e.style.display="block"}function showToast(e,t="success"){const o=document.createElement("div");o.className=`toast toast-${t}`,o.textContent=e,document.body.appendChild(o),setTimeout(()=>{o.classList.add("fade-out"),o.addEventListener("animationend",()=>o.remove())},3e3)}
window.showImageLightbox=function(e){const t=document.getElementById("lightboxImg");t.src=e,t.loading="lazy",document.getElementById("imageLightbox").style.display="flex"},window.hideImageLightbox=function(){document.getElementById("imageLightbox").style.display="none"},window.toggleChatbot=function(){const e=document.getElementById("chatbotContainer"),t=e.classList.toggle("visible");"undefined"!=typeof gsap?gsap.to(e,{scale:t?1:.9,opacity:t?1:0,duration:.3}):e.style.opacity=t?"1":"0"};

// --- INICIALIZACIÓN DE LA APLICACIÓN ---
// ... (esta parte no cambia)
function initializeApp(){auth.onAuthStateChanged(async e=>{e?await db.collection("merchants").doc(e.uid).get().then(async t=>{t.exists?(currentUser=e,isMerchant=!0,await updateUserProfile(e.uid),showSection("profile")):(isMerchant=!1,currentUser=null,currentMerchantData=null)}):(currentUser=null,isMerchant=!1,currentMerchantData=null,showSection("home")),updateAuthUI()});const e=document.getElementById("hamburgerMenu"),t=document.getElementById("navContainer");e.addEventListener("click",()=>t.classList.toggle("active")),setupImageUpload("productImageUploadArea","productImageInput",e=>selectedProductFile=e),setupImageUpload("profilePicUploadArea","profilePicInput",e=>{selectedProfilePicFile=e,selectedAvatarUrl=null,document.querySelectorAll(".avatar-item").forEach(e=>e.style.borderColor="transparent")}),loadProducts(),populateAvatars();const o=document.getElementById("themeToggle"),n=e=>{document.body.dataset.theme=e,localStorage.setItem("theme",e)};o.addEventListener("click",()=>n("dark"===document.body.dataset.theme?"light":"dark")),n(localStorage.getItem("theme")||"light")}initializeApp();