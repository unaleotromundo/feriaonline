// === PRODUCTS MODULE ===
// Variables específicas de productos
let currentVendorProducts = [];
let currentProductIndex = 0;

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
 * Normaliza filas de la base (incluyendo categoría)
 */
function normalizeProductRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name || 'Producto sin nombre',
        price: row.price || 0,
        description: row.description || '',
        category: row.category || 'otros',
        vendorId: row.vendor_id || row.vendorId || null,
        vendorName: row.vendor_name || row.vendorName || 'Vendedor',
        imageBase64: row.image_base64 || row.imageBase64 || null,
        imageUrl: row.image_url || row.imageUrl || null,
        imageStoragePath: row.image_storage_path || row.imageStoragePath || null,
        published: typeof row.published !== 'undefined' ? row.published : true,
        createdAt: row.created_at || row.createdAt || null
    };
}

// Util: valida un id para evitar pasar null/undefined/'null' al query de Supabase
function isValidId(id) {
    return id !== null && id !== undefined && id !== '' && id !== 'null';
}

// === CARGA Y RENDERIZADO DE PRODUCTOS ===
async function loadProducts(containerId = 'productsGrid', filter = {}) {
    const productsGrid = document.getElementById(containerId);
    if (!productsGrid) {
        console.warn(`Container ${containerId} no encontrado`);
        return;
    }
    
    showRunnerOverlay();
    
    // ✅ VERIFICACIÓN MEJORADA: No bloquear si no hay conexión, intentar de todas formas
    const isReachable = await ensureSupabaseAvailable();
    if (!isReachable) {
        console.warn('Supabase no alcanzable, intentando de todas formas...');
    }
    
    try {
        const supabaseClient = getSupabase();
        
        // ✅ Query público - no requiere autenticación
        let q = supabaseClient
            .from('products')
            .select('*')
            .eq('published', true);
        
        if (isValidId(filter.vendorId)) {
            q = q.eq('vendor_id', filter.vendorId);
        }
        
        q = q.order('created_at', { ascending: false });
        
        const { data, error } = await q;
        
        hideRunnerOverlay();
        productsGrid.innerHTML = '';
        
        if (error) {
            console.error("Error loading products:", error);
            productsGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No se pudieron cargar los productos en este momento.</p>
                <p style="font-size: 0.9rem; margin-top: 0.5rem;">Intenta recargar la página.</p>
            </div>`;
            return;
        }
        
        if (!data || data.length === 0) {
            productsGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No hay productos disponibles en este momento.</p>
            </div>`;
            return;
        }
        
        // ✅ Normalizar y renderizar productos
        data.forEach(row => {
            const product = normalizeProductRow(row);
            if (product) {
                renderProductCard(productsGrid, product);
            }
        });
        
    } catch (error) {
        console.error("Error loading products:", error);
        hideRunnerOverlay();
        productsGrid.innerHTML = `<div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <p>Error al cargar productos.</p>
            <p style="font-size: 0.9rem; margin-top: 0.5rem;">${error.message || 'Intenta recargar la página.'}</p>
        </div>`;
    }
}

async function loadMyProducts() {
    if (!currentUser) {
        console.warn('No hay usuario logueado para cargar productos');
        return;
    }
    
    const productsGrid = document.getElementById('myProductsGrid');
    if (!productsGrid) return;
    
    showRunnerOverlay();
    
    if (!(await ensureSupabaseAvailable())) { 
        hideRunnerOverlay(); 
        productsGrid.innerHTML = `<div>Error de red. Intenta más tarde.</div>`; 
        return; 
    }
    
    try {
        const supabaseClient = getSupabase();
        let q = supabaseClient.from('products').select('*');
        
        if (isValidId(currentUser.id)) {
            q = q.eq('vendor_id', currentUser.id);
        }
        
        q = q.order('created_at', { ascending: false });
        
        const { data, error } = await q;
        if (error) throw error;
        
        const products = (data || []).map(r => normalizeProductRow(r));
        
        hideRunnerOverlay();
        productsGrid.innerHTML = '';
        
        if (products.length === 0) {
            productsGrid.innerHTML = '<div>Aún no has agregado productos.</div>';
            return;
        }
        
        products.forEach(product => renderMyProductCard(productsGrid, product));
    } catch (error) {
        console.error("Error loading user products:", error);
        hideRunnerOverlay();
        productsGrid.innerHTML = `<div>Error al cargar tus productos. ${error.message || ''}</div>`;
    }
}

function renderProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const imgSrc = product.imageUrl || product.imageBase64 || '';
    const hasImage = !!imgSrc;
    
    // ✅ Escapar correctamente el JSON para evitar errores
    const escapedProductJson = JSON.stringify(product)
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    // ✅ Manejo seguro del nombre del vendedor
    const safeVendorName = (product.vendorName || 'Vendedor')
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
    
    let vendorLinkHtml = '';
    
    if (isValidId(product.vendorId)) {
        vendorLinkHtml = `<a href="#" onclick="event.preventDefault(); showVendorPage('${product.vendorId}', '${safeVendorName}')">${product.vendorName}</a>`;
    } else {
        vendorLinkHtml = `<span>${product.vendorName}</span>`;
    }
    
    card.innerHTML = `
        <div class="product-image" ${hasImage ? `style="background-image: url('${imgSrc}')" onclick="showImageLightbox('${imgSrc}', { name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId || ''}', id: '${product.id}', category: '${product.category}' })"` : ''}>
            ${!hasImage ? '<i class="fas fa-shopping-bag"></i>' : ''}
            <button class="btn-add-to-cart-overlay" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${escapedProductJson})">
                <i class="fas fa-cart-plus"></i>
            </button>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <p class="product-description">${product.description || ''}</p>
            <div class="product-category">${product.category !== 'otros' ? `<span class="category-tag">${product.category}</span>` : ''}</div>
            <div class="product-actions">
                <div class="product-vendor">
                    <i class="fas fa-store"></i>
                    ${vendorLinkHtml}
                    <button class="btn-add-to-cart-minimal" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${escapedProductJson})">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>`;
    
    container.appendChild(card);
}

// ✅ FUNCIÓN MODIFICADA: Sin botones de carrito, con descripción completa
function renderMyProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgSrc = product.imageUrl || product.imageBase64 || '';
    const hasImage = !!imgSrc;
    
    card.innerHTML = `
        <div class="product-image" style="${hasImage ? `background-image: url('${imgSrc}')` : ''}" ${hasImage ? `onclick="showImageLightbox('${imgSrc}', { name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId}', id: '${product.id}', category: '${product.category}', isMyProduct: true })"` : ''}>
            ${!hasImage ? '<i class="fas fa-shopping-bag"></i>' : ''}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            <p class="product-description">${product.description || 'Sin descripción'}</p>
            <div class="product-category">${product.category !== 'otros' ? `<span class="category-tag">${product.category}</span>` : ''}</div>
            <div class="product-actions">
                <button class="action-btn" onclick="showProductModal('${product.id}')"><i class="fas fa-edit"></i> Editar</button>
                <button class="action-btn" onclick="toggleProductStatus('${product.id}', ${!product.published})">
                    <i class="fas fa-eye${product.published ? '' : '-slash'}"></i> ${product.published ? 'Ocultar' : 'Mostrar'}
                </button>
            </div>
        </div>`;
    container.appendChild(card);
}

// === GESTIÓN DE FORMULARIO DE PRODUCTO ===
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

function resetProductForm() {
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productCategory').value = 'otros';
    document.getElementById('productImageUploadArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra una imagen aquí</p>';
    document.getElementById('productImageInput').value = '';
    delete document.getElementById('productImageUploadArea').dataset.existingImage;
    selectedProductFile = null;
    selectedProductUpload = null;
}

async function loadProductForEdit(productId) {
    try {
        if (!(await ensureSupabaseAvailable())) return;
        const supabaseClient = getSupabase();
        const { data: row, error } = await supabaseClient.from('products').select('*').eq('id', productId).single();
        if (error) throw error;
        const product = normalizeProductRow(row);
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productDescription').value = product.description;
        document.getElementById('productCategory').value = product.category || 'otros';
        if (product.imageUrl || product.imageBase64) {
            const imgSrc = product.imageUrl || product.imageBase64;
            document.getElementById('productImageUploadArea').innerHTML = `<img src="${imgSrc}" class="preview-image">`;
            document.getElementById('productImageUploadArea').dataset.existingImage = imgSrc;
        }
    } catch (error) { 
        console.error("Error loading product for edit:", error); 
    } 
}

window.saveProduct = async function() {
    const isEditing = !!document.getElementById('productModal').dataset.productId;
    const productData = { 
        name: document.getElementById('productName').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value),
        description: document.getElementById('productDescription').value.trim(),
        category: document.getElementById('productCategory').value,
        vendorId: currentUser.id,
        vendorName: document.getElementById('userBusiness').textContent
    };
    if (!productData.name || !productData.price || isNaN(productData.price)) {
        showToast('Por favor completa el nombre y precio del producto.', 'error');
        return;
    }
    let imageBase64 = document.getElementById('productImageUploadArea').dataset.existingImage || null;
    let imageUrl = null;
    let imageStoragePath = null;
    if (selectedProductUpload) {
        imageUrl = selectedProductUpload.publicUrl;
        imageStoragePath = selectedProductUpload.path;
    } else if (selectedProductFile) {
        const compressedFile = await imageCompression(selectedProductFile, { maxSizeMB: 0.5, maxWidthOrHeight: 800 });
        const upload = await uploadProductImage(compressedFile, currentUser?.id || 'anonymous');
        if (upload) {
            imageUrl = upload.publicUrl;
            imageStoragePath = upload.path;
        } else {
            imageBase64 = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(compressedFile);
            });
        }
    }
    productData.imageBase64 = imageBase64;
    productData.imageUrl = imageUrl;
    productData.imageStoragePath = imageStoragePath;

    const dbProduct = {
        name: productData.name,
        price: productData.price,
        description: productData.description,
        category: productData.category,
        vendor_id: productData.vendorId,
        vendor_name: productData.vendorName,
        image_url: productData.imageUrl,
        image_storage_path: productData.imageStoragePath,
        published: true
    };
    if (!isEditing) dbProduct.created_at = new Date().toISOString();

    const saveBtn = document.querySelector('#productModal .btn-primary');
    startButtonLoading(saveBtn, 'Guardando...');
    try {
        if (!(await ensureSupabaseAvailable())) { 
            stopButtonLoading(saveBtn); 
            return; 
        }
        const supabaseClient = getSupabase();
        if (isEditing) {
            const productId = document.getElementById('productModal').dataset.productId;
            const { error } = await supabaseClient.from('products').update(dbProduct).eq('id', productId);
            if (error) throw error;
        } else {
            const { error } = await supabaseClient.from('products').insert([dbProduct]);
            if (error) throw error;
        }
        showToast('Producto guardado.', 'success');
        hideModal('productModal');
        loadMyProducts();
        if (document.getElementById('products').classList.contains('active-section')) {
            loadProducts();
        }
    } catch (error) {
        console.error("Error saving product:", error);
        showToast(`Error al guardar el producto. ${error.message || ''}`, 'error');
    } finally {
        stopButtonLoading(saveBtn);
    }
}

window.toggleProductStatus = async function(id, status) { 
    try {
        if (!(await ensureSupabaseAvailable())) return;
        const supabaseClient = getSupabase();
        const { error } = await supabaseClient.from('products').update({ published: status }).eq('id', id);
        if (error) throw error;
        showToast(status ? 'Producto visible' : 'Producto oculto', 'success');
        loadMyProducts();
    } catch (err) { 
        console.error('Error toggling product status:', err);
        showToast('Error al cambiar visibilidad', 'error');
    }
}

// === LIGHTBOX Y VISUALIZACIÓN ===
window.showImageLightbox = async function(imageBase64, productData = null) {
    if (!productData || !productData.vendorId) {
        console.warn("No se recibió información del producto.");
        return;
    }
    
    const loadingSpinner = document.getElementById('lightboxLoadingSpinner');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightbox = document.getElementById('imageLightbox');
    
    loadingSpinner.style.display = 'flex';
    lightboxImg.classList.add('loading');
    lightbox.style.display = 'flex';
    
    try {
        if (!(await ensureSupabaseAvailable())) throw new Error('Supabase unreachable');
        const supabaseClient = getSupabase();
        const { data, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('vendor_id', productData.vendorId)
            .eq('published', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        currentVendorProducts = (data || []).map(r => normalizeProductRow(r));
        
        currentProductIndex = currentVendorProducts.findIndex(p => p.id === productData.id);
        
        if (currentProductIndex === -1) {
            currentProductIndex = currentVendorProducts.findIndex(p => 
                p.imageBase64 === imageBase64 || p.imageUrl === imageBase64
            );
        }
        
        if (currentProductIndex === -1) {
            currentProductIndex = 0;
        }
        
        // ✅ Pasar si es producto propio
        await showCurrentProductInLightbox(productData.isMyProduct);
        setupSwipeGestures();
    } catch (error) {
        console.error("Error al cargar productos del vendedor:", error);
        showToast('Error al cargar productos.', 'error');
    } finally {
        loadingSpinner.style.display = 'none';
        lightboxImg.classList.remove('loading');
    }
}

// ✅ MODIFICADO: Oculta botones WhatsApp e "Ir al Puesto" si es mi producto
async function showCurrentProductInLightbox(isMyProduct = false) {
    const product = currentVendorProducts[currentProductIndex];
    if (!product) return;
    const img = document.getElementById('lightboxImg');
    img.classList.remove('lightbox-img-visible');
    img.classList.add('lightbox-img-fade');
    setTimeout(() => {
        img.src = product.imageUrl || product.imageBase64 || '';
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

    // ✅ Solo mostrar botón de carrito si NO es mi producto
    const existingCartBtn = document.querySelector('.floating-cart-btn');
    if (existingCartBtn) existingCartBtn.remove();
    
    if (!isMyProduct) {
        const floatingCartBtn = document.createElement('div');
        floatingCartBtn.className = 'floating-cart-btn';
        floatingCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i>';
        floatingCartBtn.title = 'Agregar al carrito';
        floatingCartBtn.onclick = function(event) {
            event.stopPropagation();
            addToCartWithAnimation(this, product);
        };
        lightbox.appendChild(floatingCartBtn);
    }

    // ✅ Ocultar botón "Ir al Puesto" si es mi producto
    const storeBtn = document.getElementById('lightboxStoreBtn');
    if (isMyProduct) {
        storeBtn.style.display = 'none';
    } else if (product.vendorId && product.vendorName) {
        storeBtn.style.display = 'flex';
        storeBtn.onclick = function(event) {
            event.preventDefault();
            hideImageLightbox();
            showVendorPage(product.vendorId, product.vendorName);
        };
    } else {
        storeBtn.style.display = 'none';
    }

    // ✅ Ocultar botón de WhatsApp si es mi producto
    const whatsappBtn = document.getElementById('lightboxWhatsappBtn');
    
    if (isMyProduct) {
        whatsappBtn.style.display = 'none';
        return; // Salir temprano si es mi producto
    }
    
    // Si NO es mi producto, cargar WhatsApp normalmente
    whatsappBtn.style.display = 'flex';
    whatsappBtn.href = '#';
    whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i><span class="whatsapp-btn-text">Chatear por WhatsApp</span>`;
    whatsappBtn.classList.remove('lightbox-whatsapp-circle-btn');
    whatsappBtn.classList.add('lightbox-whatsapp-circle-btn--loading');

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
            display: none;
        }
    `;
    document.head.appendChild(style);

    if (isValidId(product.vendorId)) {
        try {
            const supClient = getSupabase();
            const { data: vendor, error } = await supClient.from('merchants').select('*').eq('id', product.vendorId).single();
            if (error || !vendor) {
                setupFallbackWhatsapp(whatsappBtn);
            } else if (vendor.phone) {
                const phone = vendor.phone.replace(/[^0-9]/g, '');
                if (phone) {
                    const productName = product.name || 'un producto';
                    const productPrice = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'precio no especificado';
                    const baseMessage = `Hola, vi tu producto "${productName}" en Feria Virtual. ¿Me podrías dar más información? Precio: ${productPrice}. Categoría: ${product.category || 'otros'}.`;
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
        } catch (err) {
            console.error('Error fetching vendor phone:', err);
            setupFallbackWhatsapp(whatsappBtn);
        }
    } else {
        setupFallbackWhatsapp(whatsappBtn);
    }
}

function setupFallbackWhatsapp(whatsappBtn) {
    whatsappBtn.href = '#';
    whatsappBtn.onclick = function(event) {
        event.preventDefault();
        showToast('No se pudo cargar el contacto del vendedor. Inténtalo más tarde.', 'error');
    };
    whatsappBtn.classList.remove('lightbox-whatsapp-circle-btn--loading');
    whatsappBtn.classList.add('lightbox-whatsapp-circle-btn');
    const tempStyle = document.getElementById('whatsapp-loading-style');
    if (tempStyle) tempStyle.remove();
}

function setupSwipeGestures() {
    const lightboxImg = document.getElementById('lightboxImg');
    let startX = 0;
    let endX = 0;
    lightboxImg.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    lightboxImg.addEventListener('touchend', (e) => { endX = e.changedTouches[0].clientX; handleSwipe(); }, { passive: true });
    lightboxImg.addEventListener('mousedown', (e) => { startX = e.clientX; });
    lightboxImg.addEventListener('mouseup', (e) => { endX = e.clientX; handleSwipe(); });
    function handleSwipe() {
        const diff = startX - endX;
        const threshold = 50;
        if (Math.abs(diff) > threshold) {
            if (diff > 0) nextProduct();
            else prevProduct();
        }
    }
}

function prevProduct() {
    if (currentVendorProducts.length > 1) {
        currentProductIndex = (currentProductIndex - 1 + currentVendorProducts.length) % currentVendorProducts.length;
        showCurrentProductInLightbox();
    }
}

function nextProduct() {
    if (currentVendorProducts.length > 1) {
        currentProductIndex = (currentProductIndex + 1) % currentVendorProducts.length;
        showCurrentProductInLightbox();
    }
}

window.hideImageLightbox = function() {
    document.getElementById('imageLightbox').style.display = 'none';
}

// === FICHA DE PRODUCTO (JPG) ===
async function getProductsByVendor(vendorId) {
    if (!(await ensureSupabaseAvailable())) return [];
    const supabaseClient = getSupabase();
    let q = supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    if (isValidId(vendorId)) q = q.eq('vendor_id', vendorId);
    const { data, error } = await q;
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
        if (!(await ensureSupabaseAvailable())) { 
            container.innerHTML = '<p>Error de red. Intenta más tarde.</p>'; 
            return; 
        }
        const products = await getProductsByVendor(currentUser.id);
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p>No tienes productos para seleccionar.</p>';
            return;
        }
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-selection-item';
            productElement.innerHTML = `
                <img src="${product.imageUrl || product.imageBase64 || 'https://placehold.co/120x80/e2e8f0/a0aec0?text=Sin+Imagen'}" alt="${product.name}" loading="lazy">
                <p>${product.name} (${product.category})</p>
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
    productImage.src = product.imageUrl || product.imageBase64 || 'https://placehold.co/700x400/e2e8f0/a0aec0?text=Producto+sin+imagen';
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
        ctx.fillText(`${(product.price || 0).toFixed(2)}`, 750, 580);

        if (product.category && product.category !== 'otros') {
            ctx.font = '20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#555555';
            ctx.textAlign = 'left';
            ctx.fillText(`Categoría: ${product.category}`, 50, 620);
            ctx.font = '20px "Segoe UI", sans-serif';
            wrapText(ctx, product.description || 'Sin descripción.', 50, 660, 700, 24);
        } else {
            ctx.font = '20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#555555';
            ctx.textAlign = 'left';
            wrapText(ctx, product.description || 'Sin descripción.', 50, 630, 700, 24);
        }

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

// === VENDEDOR Y FILTROS ===
window.showVendorPage = async function(vendorId, vendorName) {
    showSection('vendor-page');
    document.getElementById('vendorPageTitle').textContent = vendorName || 'Tienda del Vendedor';
    const whatsappBtn = document.getElementById('vendorWhatsappBtn');
    whatsappBtn.style.display = 'none';
    
    try {
        if (!(await ensureSupabaseAvailable())) {
            showToast('No se puede conectar para cargar la página del vendedor.', 'error');
            return;
        }
        
        const supabaseClient = getSupabase();
        let merchant = null;
        
        try {
            if (isValidId(vendorId)) {
                const { data: mdata, error } = await supabaseClient.from('merchants').select('*').eq('id', vendorId).single();
                if (!error && mdata) merchant = mdata;
            } else if (vendorName) {
                const nameTrim = vendorName.trim();
                if (nameTrim) {
                    const { data: exact, error: exactErr } = await supabaseClient.from('merchants').select('*').eq('business', nameTrim).limit(1).single();
                    if (!exactErr && exact) merchant = exact;
                    else {
                        const { data: ilikeData, error: ilikeErr } = await supabaseClient.from('merchants').select('*').ilike('business', `%${nameTrim}%`).limit(1);
                        if (!ilikeErr && ilikeData && ilikeData.length > 0) merchant = ilikeData[0];
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching merchant by id/name fallback:', e);
        }
        
        if (merchant && merchant.phone) {
            const phone = merchant.phone.replace(/[^0-9]/g, '');
            if (phone) {
                whatsappBtn.href = `https://wa.me/${phone}`;
                whatsappBtn.style.display = 'inline-flex';
            }
        }
    } catch (error) { 
        console.error("Error fetching vendor phone:", error); 
    }
    
    loadProducts('vendorProductsGrid', { vendorId: vendorId });
}

// === BÚSQUEDA Y FILTRADO ===
let currentCategory = 'all';
let currentSearchText = '';

window.filterByCategory = function(category) {
    currentCategory = category;
    document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.remove('active'));
    const categoryChip = document.querySelector(`[data-category="${category}"]`);
    if (categoryChip) categoryChip.classList.add('active');
    applyFilters();
}

window.filterProducts = function() {
    const searchInput = document.getElementById('productSearchInput');
    currentSearchText = searchInput.value.trim().toLowerCase();
    const clearBtn = document.getElementById('clearSearchBtn');
    clearBtn.style.display = currentSearchText ? 'flex' : 'none';
    applyFilters();
}

window.clearSearch = function() {
    document.getElementById('productSearchInput').value = '';
    currentSearchText = '';
    document.getElementById('clearSearchBtn').style.display = 'none';
    applyFilters();
}

async function applyFilters() {
    const productsGrid = document.getElementById('productsGrid');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!productsGrid) return;
    
    showRunnerOverlay();
    
    try {
        if (!(await ensureSupabaseAvailable())) {
            hideRunnerOverlay();
            productsGrid.innerHTML = `<div>Error de red. Intenta más tarde.</div>`;
            return;
        }
        
        const supabaseClient = getSupabase();
        let q = supabaseClient.from('products').select('*').eq('published', true);
        
        if (currentCategory !== 'all') {
            q = q.eq('category', currentCategory);
        }
        
        q = q.order('created_at', { ascending: false });
        
        const { data, error } = await q;
        if (error) throw error;
        
        let products = (data || []).map(r => normalizeProductRow(r));
        
        if (currentSearchText) {
            products = products.filter(product => {
                const name = (product.name || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                const vendor = (product.vendorName || '').toLowerCase();
                return name.includes(currentSearchText) || 
                       description.includes(currentSearchText) ||
                       vendor.includes(currentSearchText);
            });
        }
        
        hideRunnerOverlay();
        
        if (products.length === 0) {
            productsGrid.style.display = 'none';
            noResultsMessage.style.display = 'flex';
            resultsCount.textContent = 'No se encontraron productos';
        } else {
            productsGrid.style.display = 'grid';
            noResultsMessage.style.display = 'none';
            const categoryText = currentCategory === 'all' ? 'todos los productos' : `categoría "${currentCategory}"`;
            const searchText = currentSearchText ? ` con "${currentSearchText}"` : '';
            resultsCount.textContent = `Mostrando ${products.length} producto${products.length !== 1 ? 's' : ''} en ${categoryText}${searchText}`;
            productsGrid.innerHTML = '';
            products.forEach(product => renderProductCard(productsGrid, product));
        }
    } catch (error) {
        console.error("Error aplicando filtros:", error);
        hideRunnerOverlay();
        productsGrid.innerHTML = `<div>Error al cargar productos.</div>`;
    }
}

// === MANEJO DE DROPDOWNS ===
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando dropdowns...');
    
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const priceDropdownBtn = document.getElementById('priceDropdownBtn');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const priceDropdown = document.getElementById('priceDropdown');
    
    if (categoryDropdownBtn) {
        console.log('Botón de categorías encontrado');
        categoryDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click en categorías');
            categoryDropdown.classList.toggle('open');
            priceDropdown.classList.remove('open');
        });
    }
    
    if (priceDropdownBtn) {
        console.log('Botón de precio encontrado');
        priceDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Click en precio');
            priceDropdown.classList.toggle('open');
            categoryDropdown.classList.remove('open');
        });
    }
    
    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            document.querySelectorAll('.filter-dropdown').forEach(el => {
                el.classList.remove('open');
            });
        }
    });
    
    // ✅ DELEGACIÓN CORRECTA: Capturar clicks en botones de categoría
    const categoryContent = document.getElementById('categoryDropdownContent');
    if (categoryContent) {
        categoryContent.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button) {
                e.preventDefault();
                e.stopPropagation();
                
                // Extraer categoría del onclick
                const onclickAttr = button.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/filterByCategory\('(.+?)'\)/);
                    if (match) {
                        const category = match[1];
                        console.log('🎯 Ejecutando filterByCategory:', category);
                        filterByCategory(category);
                        categoryDropdown.classList.remove('open');
                    }
                }
            }
        });
    }
    
    // ✅ DELEGACIÓN CORRECTA: Capturar clicks en botones de precio
    const priceContent = document.getElementById('priceDropdownContent');
    if (priceContent) {
        priceContent.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button) {
                e.preventDefault();
                e.stopPropagation();
                
                // Extraer orden del onclick
                const onclickAttr = button.getAttribute('onclick');
                if (onclickAttr) {
                    const match = onclickAttr.match(/sortByPrice\('(.+?)'\)/);
                    if (match) {
                        const order = match[1];
                        console.log('🎯 Ejecutando sortByPrice:', order);
                        sortByPrice(order);
                        priceDropdown.classList.remove('open');
                    }
                }
            }
        });
    }
});

// Variable global para guardar el orden actual
let currentPriceOrder = null;

// Función de ordenamiento por precio
window.sortByPrice = async function(order) {
    console.log('💰 sortByPrice llamado con orden:', order);
    currentPriceOrder = order;
    
    const productsGrid = document.getElementById('productsGrid');
    const noResultsMessage = document.getElementById('noResultsMessage');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!productsGrid) return;
    
    showRunnerOverlay();
    
    try {
        if (!(await ensureSupabaseAvailable())) {
            hideRunnerOverlay();
            productsGrid.innerHTML = `<div>Error de red. Intenta más tarde.</div>`;
            return;
        }
        
        const supabaseClient = getSupabase();
        let q = supabaseClient.from('products').select('*').eq('published', true);
        
        // Aplicar filtro de categoría si existe
        if (currentCategory !== 'all') {
            q = q.eq('category', currentCategory);
        }
        
        // Ordenar por precio según el orden seleccionado
        q = q.order('price', { ascending: order === 'asc' });
        
        const { data, error } = await q;
        if (error) throw error;
        
        let products = (data || []).map(r => normalizeProductRow(r));
        
        // Aplicar búsqueda por texto si existe
        if (currentSearchText) {
            products = products.filter(product => {
                const name = (product.name || '').toLowerCase();
                const description = (product.description || '').toLowerCase();
                const vendor = (product.vendorName || '').toLowerCase();
                return name.includes(currentSearchText) || 
                       description.includes(currentSearchText) ||
                       vendor.includes(currentSearchText);
            });
        }
        
        hideRunnerOverlay();
        
        if (products.length === 0) {
            productsGrid.style.display = 'none';
            noResultsMessage.style.display = 'flex';
            resultsCount.textContent = 'No se encontraron productos';
        } else {
            productsGrid.style.display = 'grid';
            noResultsMessage.style.display = 'none';
            
            const orderText = order === 'asc' ? 'menor a mayor precio' : 'mayor a menor precio';
            const categoryText = currentCategory === 'all' ? 'todos los productos' : `categoría "${currentCategory}"`;
            const searchText = currentSearchText ? ` con "${currentSearchText}"` : '';
            
            resultsCount.textContent = `Mostrando ${products.length} producto${products.length !== 1 ? 's' : ''} en ${categoryText}${searchText} (${orderText})`;
            
            productsGrid.innerHTML = '';
            products.forEach(product => renderProductCard(productsGrid, product));
        }
    } catch (error) {
        console.error("Error ordenando por precio:", error);
        hideRunnerOverlay();
        productsGrid.innerHTML = `<div>Error al cargar productos.</div>`;
    }
}