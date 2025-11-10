// === PRODUCTS MODULE ===
// Variables específicas de productos
let currentVendorProducts = [];
let currentProductIndex = 0;
let searchDebounceTimer = null;
// --- NUEVAS VARIABLES PARA EDICIÓN DE PRODUCTO ---
let editingProductOriginalId = null; // ID del producto que se está editando (opcional, útil para validaciones)
let editingProductOriginalImage = null; // URL original de la imagen
let editingProductOriginalImagePath = null; // Ruta original en storage
// --- FIN NUEVAS VARIABLES ---
// === ZOOM EN LIGHTBOX ===
let currentZoomLevel = 2; // Índice inicial en el array (1.0x)
const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0];
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
    // ✅ Reiniciar mapa global de productos
    window.allProductsMap = {};
    showRunnerOverlay();
    const isReachable = await ensureSupabaseAvailable();
    if (!isReachable) {
        console.warn('Supabase no alcanzable, intentando de todas formas...');
    }
    try {
        const supabaseClient = getSupabase();
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
updateFavoriteUI();
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
    // === NO TRUNCAR DESCRIPCIÓN EN LA TARJETA. SOLO BOTÓN. ===
    const fullDesc = product.description || 'Sin descripción';
    // Solo creamos el botón, sin mostrar texto de descripción en la tarjeta.
    const descHtml = `
        <button class="btn btn-secondary btn-view-more-public" 
                data-full-description="${fullDesc.replace(/"/g, '&quot;')}"
                style="font-size: 0.8rem; padding: 0.25rem 0.5rem; width: auto; margin-top: 0.5rem;">
            Leer descripción
        </button>
    `;
    card.innerHTML = `
        <div class="product-image" 
             ${hasImage ? `style="background-image: url('${imgSrc}')" onclick="showImageLightbox('${imgSrc}', { name: '${product.name.replace(/'/g, "\\'")}', price: ${product.price || 0}, vendorId: '${product.vendorId || ''}', id: '${product.id}', category: '${product.category}' })"` : ''}>
            ${!hasImage ? '<i class="fas fa-shopping-bag"></i>' : ''}
            <button class="btn-add-to-cart-overlay" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${escapedProductJson})">
                <i class="fas fa-cart-plus"></i>
            </button>
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            ${descHtml}
            <div class="product-category">${product.category !== 'otros' ? `<span class="category-tag">${product.category}</span>` : ''}</div>
            <div class="product-actions">
                <div class="product-vendor">
                    <i class="fas fa-store"></i>
                    ${vendorLinkHtml}
                    <button class="btn-favorite" data-product-id="${product.id}">
                        ${isFavorite(product.id) ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>'}
                    </button>
                    <button class="btn-add-to-cart-minimal" onclick="event.stopPropagation(); addToCartWithAnimation(this, ${escapedProductJson})">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>`;
    container.appendChild(card);
}
// ✅ FUNCIÓN MODIFICADA: Sin botones de carrito, con descripción completa
// ✅ FUNCIÓN ACTUALIZADA: Limita descripción a 100 caracteres y agrega "Ver más"
function renderMyProductCard(container, product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const imgSrc = product.imageUrl || product.imageBase64 || '';
    const hasImage = !!imgSrc;
    const imgTag = hasImage 
        ? `<img src="${imgSrc}" loading="lazy" alt="${product.name}" class="product-grid-img">`
        : '<i class="fas fa-shopping-bag"></i>';
    // === TRUNCAR DESCRIPCIÓN ===
    const fullDesc = product.description || 'Sin descripción';
    const MAX_DESC = 100;
    let descHtml = '';
    if (fullDesc.length <= MAX_DESC) {
        descHtml = `<p class="product-description">${fullDesc}</p>`;
    } else {
        const truncated = fullDesc.substring(0, MAX_DESC) + '...';
        // Guardamos la descripción completa en un atributo data para el modal
        descHtml = `
            <p class="product-description">${truncated}</p>
            <button class="btn btn-secondary btn-view-more" 
                    data-full-description="${fullDesc.replace(/"/g, '&quot;')}"
                    style="font-size: 0.85rem; padding: 0.3rem 0.6rem; width: auto; margin-top: 0.5rem;">
                Ver más
            </button>
        `;
    }
    card.innerHTML = `
        <div class="product-image-container">
            ${imgTag}
        </div>
        <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
            ${descHtml}
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
    // ✅ Limpiar variables de edición antes de abrir el modal
    editingProductOriginalId = null;
    editingProductOriginalImage = null;
    editingProductOriginalImagePath = null;
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
    // ✅ Limpiar variables de edición (por si acaso)
    editingProductOriginalImage = null;
    editingProductOriginalImagePath = null;
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
        // --- MODIFICADO: Almacenar datos originales y manejar vista previa ---
        editingProductOriginalImage = product.imageUrl || product.imageBase64 || null;
        editingProductOriginalImagePath = product.imageStoragePath || null;
        if (editingProductOriginalImage) {
            document.getElementById('productImageUploadArea').innerHTML = `<img src="${editingProductOriginalImage}" class="preview-image">`;
            document.getElementById('productImageUploadArea').dataset.existingImage = editingProductOriginalImage;
        } else {
            document.getElementById('productImageUploadArea').innerHTML = '<i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra una imagen aquí</p>';
            delete document.getElementById('productImageUploadArea').dataset.existingImage;
        }
        // --- FIN MODIFICADO ---
    } catch (error) { 
        console.error("Error loading product for edit:", error);
        // ✅ Limpiar variables por si acaso
        editingProductOriginalImage = null;
        editingProductOriginalImagePath = null;
    } 
}
window.saveProduct = async function() {
    const saveBtn = document.querySelector('#productModal .btn-primary');
    const isEditing = !!document.getElementById('productModal').dataset.productId;
    // ✅ Deshabilitar inmediatamente el botón para evitar doble envío
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
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
        // ✅ Rehabilitar botón si hay error de validación
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Guardar Producto';
        return;
    }
    // --- MODIFICADO: Manejo de la imagen ---
    let imageUrl = null;
    let imageStoragePath = null;
    if (selectedProductUpload) {
        // Se subió una nueva imagen
        imageUrl = selectedProductUpload.publicUrl;
        imageStoragePath = selectedProductUpload.path;
        console.log("Usando nueva imagen:", imageUrl);
    } else if (isEditing && editingProductOriginalImage) {
        // Estamos editando y no se subió una nueva imagen, mantener la original
        imageUrl = editingProductOriginalImage;
        imageStoragePath = editingProductOriginalImagePath; // Mantener la ruta original si existe
        console.log("Manteniendo imagen original:", imageUrl);
    } else if (selectedProductFile) {
        // Se seleccionó un archivo pero no se subió inmediatamente (caso raro, pero por si acaso)
        try {
            const compressedFile = await imageCompression(selectedProductFile, { maxSizeMB: 0.5, maxWidthOrHeight: 800 });
            const upload = await uploadProductImage(compressedFile, currentUser?.id || 'anonymous');
            if (upload) {
                imageUrl = upload.publicUrl;
                imageStoragePath = upload.path;
            } else {
                // Si falla la subida, se podría intentar con base64, pero para consistencia, mejor fallar
                throw new Error("No se pudo subir la imagen.");
            }
        } catch (uploadError) {
            console.error("Error al subir imagen:", uploadError);
            showToast('Error al subir la imagen del producto.', 'error');
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Guardar Producto';
            return;
        }
    } else {
        // Ni nueva imagen ni imagen original (en edición) ni archivo nuevo. Dejar como estaba o null.
        if (isEditing) {
            // Si estamos editando y no hay nueva imagen ni archivo, usar la original
            imageUrl = editingProductOriginalImage;
            imageStoragePath = editingProductOriginalImagePath;
        }
        // Si es creación y no hay imagen, imageUrl y imageStoragePath serán null
    }
    // --- FIN MODIFICADO ---
    try {
        const dbProduct = {
            name: productData.name,
            price: productData.price,
            description: productData.description,
            category: productData.category,
            vendor_id: productData.vendorId,
            vendor_name: productData.vendorName,
            image_url: imageUrl, // Usar el valor determinado arriba
            image_storage_path: imageStoragePath, // Usar el valor determinado arriba
            published: true
        };
        if (!isEditing) dbProduct.created_at = new Date().toISOString();
        if (!(await ensureSupabaseAvailable())) {
            throw new Error('No se puede conectar a Supabase.');
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
        showToast(isEditing ? 'Producto actualizado.' : 'Producto guardado.', 'success');
        hideModal('productModal');
        loadMyProducts();
        if (document.getElementById('products').classList.contains('active-section')) {
            loadProducts();
        }
        // ✅ Limpiar variables de edición y subida después de guardar exitosamente
        editingProductOriginalId = null;
        editingProductOriginalImage = null;
        editingProductOriginalImagePath = null;
        selectedProductFile = null;
        selectedProductUpload = null;
    } catch (error) {
        console.error("Error saving product:", error);
        showToast(`Error al ${isEditing ? 'actualizar' : 'guardar'} el producto. ${error.message || ''}`, 'error');
    } finally {
        // ✅ Siempre rehabilitar el botón al final
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Guardar Producto';
    }
};
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
// ✅ MODIFICADO: Muestra SOLO nombre, precio y botón "Leer descripción"
async function showCurrentProductInLightbox(isMyProduct = false) {
    const product = currentVendorProducts[currentProductIndex];
    if (!product) return;
    const img = document.getElementById('lightboxImg');
    const productNameEl = document.getElementById('lightboxProductName');
    const productPriceEl = document.getElementById('lightboxProductPrice');
    const overlayInfo = document.getElementById('lightboxOverlayInfo');
    const lightbox = document.getElementById('imageLightbox');
    if (!img || !productNameEl || !productPriceEl || !overlayInfo || !lightbox) {
        console.error('❌ Elementos del lightbox no encontrados');
        return;
    }
    // Mostrar nombre y precio
    productNameEl.textContent = product.name || 'Producto sin nombre';
    productPriceEl.textContent = `$${(product.price || 0).toFixed(2)}`;
    // === LIMPIAR CONTENIDO ANTERIOR ===
    overlayInfo.innerHTML = `
        <h2 id="lightboxProductName" class="lightbox-product-name">${product.name || 'Producto sin nombre'}</h2>
        <div class="lightbox-product-price" id="lightboxProductPrice">$${(product.price || 0).toFixed(2)}</div>
    `;
    // === CREAR BOTÓN "Leer descripción" SIEMPRE ===
    const leerBtn = document.createElement('button');
    leerBtn.className = 'lightbox-ver-mas-btn';
    leerBtn.textContent = 'Leer descripción';
    leerBtn.onclick = (e) => {
        e.stopPropagation();
        showFullDescriptionModal(product.description || 'Sin descripción');
    };
    overlayInfo.appendChild(leerBtn);
    // Mostrar el panel
    overlayInfo.style.display = 'block';
    overlayInfo.classList.add('visible');
    // Cargar imagen
    img.classList.remove('lightbox-img-visible');
    img.classList.add('lightbox-img-fade');
    setTimeout(() => {
        img.src = product.imageUrl || product.imageBase64 || '';
        img.alt = product.name || 'Producto';
        img.onload = img.onerror = () => {
            img.classList.remove('lightbox-img-fade');
            img.classList.add('lightbox-img-visible');
        };
    }, 50);
    // Reiniciar zoom
    currentZoomLevel = 2;
    img.style.transform = 'scale(1)';
    img.style.transformOrigin = 'center center';
    lightbox.style.display = 'flex';
    // === BOTÓN DE CARRITO (solo si no es mi producto) ===
    const existingCartBtn = lightbox.querySelector('.floating-cart-btn');
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
    // === BOTÓN DE FAVORITOS ===
    const existingFavBtn = lightbox.querySelector('.floating-favorite-btn');
    if (existingFavBtn) existingFavBtn.remove();
    const floatingFavBtn = document.createElement('div');
    floatingFavBtn.className = 'floating-favorite-btn';
    floatingFavBtn.innerHTML = isFavorite(product.id) 
        ? '<i class="fas fa-heart"></i>' 
        : '<i class="far fa-heart"></i>';
    floatingFavBtn.title = isFavorite(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos';
    floatingFavBtn.onclick = function(event) {
        event.stopPropagation();
        toggleFavorite(product.id);
        const isNowFav = isFavorite(product.id);
        floatingFavBtn.innerHTML = isNowFav 
            ? '<i class="fas fa-heart"></i>' 
            : '<i class="far fa-heart"></i>';
        floatingFavBtn.title = isNowFav ? 'Quitar de favoritos' : 'Agregar a favoritos';
    };
    lightbox.appendChild(floatingFavBtn);
    // === BOTÓN "IR A ESTE PUESTO" ===
    const storeBtn = document.getElementById('lightboxStoreBtn');
    if (storeBtn) {
        if (isMyProduct) {
            storeBtn.style.display = 'none';
        } else if (product.vendorId && product.vendorName) {
            storeBtn.style.display = 'flex';
            storeBtn.textContent = 'Ir a este puesto';
            storeBtn.onclick = function(event) {
                event.preventDefault();
                hideImageLightbox();
                showVendorPage(product.vendorId, product.vendorName);
            };
        } else {
            storeBtn.style.display = 'none';
        }
    }
    // === BOTÓN DE WHATSAPP ===
    const whatsappBtn = document.getElementById('lightboxWhatsappBtn');
    if (!whatsappBtn) return;
    if (isMyProduct) {
        whatsappBtn.style.display = 'none';
        return;
    }
    whatsappBtn.style.display = 'flex';
    whatsappBtn.href = '#';
    whatsappBtn.innerHTML = `<i class="fab fa-whatsapp"></i><span class="whatsapp-btn-text">Contactar vendedor</span>`;
    whatsappBtn.classList.remove('lightbox-whatsapp-modern-btn--loading');
    whatsappBtn.classList.add('lightbox-whatsapp-modern-btn');
    if (isValidId(product.vendorId)) {
        try {
            const supClient = getSupabase();
            const { data: vendor, error } = await supClient.from('merchants').select('*').eq('id', product.vendorId).single();
            if (!error && vendor?.phone) {
                const phone = vendor.phone.replace(/[^0-9]/g, '');
                if (phone) {
                    const productName = product.name || 'un producto';
                    const productPrice = product.price ? `$${parseFloat(product.price).toFixed(2)}` : 'precio no especificado';
                    const baseMessage = `Hola, vi tu producto "${productName}" en Feria Virtual. ¿Me podrías dar más información? Precio: ${productPrice}. Categoría: ${product.category || 'otros'}.`;
                    whatsappBtn.href = `https://wa.me/${phone}?text=${encodeURIComponent(baseMessage)}`;
                }
            }
        } catch (err) {
            console.error('Error fetching vendor phone:', err);
        }
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
    // ✅ Quitar clase visible para resetear transición
    const overlayInfo = document.getElementById('lightboxOverlayInfo');
    if (overlayInfo) overlayInfo.classList.remove('visible');
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
            const imgSrc = product.imageUrl || product.imageBase64 || 'https://placehold.co/120x80/e2e8f0/a0aec0?text=Sin+Imagen';
            productElement.innerHTML = `
                <img src="${imgSrc}" alt="${product.name}" loading="lazy">
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
    const vendorLogo = document.getElementById('vendorLogo');
    const vendorLogoPlaceholder = document.getElementById('vendorLogoPlaceholder');
    const vendorDescription = document.getElementById('vendorDescription');
    const whatsappBtn = document.getElementById('vendorWhatsappBtn');
    // ✅ Reset inicial
    vendorLogo.style.display = 'none';
    vendorLogoPlaceholder.style.display = 'inline-block';
    vendorDescription.textContent = 'Descripción del puesto...';
    whatsappBtn.style.display = 'none';
    try {
        if (!(await ensureSupabaseAvailable())) {
            showToast('No se puede conectar para cargar la página del vendedor.', 'error');
            return;
        }
        const supabaseClient = getSupabase();
        let merchant = null;
        if (isValidId(vendorId)) {
            const { data: mdata, error } = await supabaseClient.from('merchants').select('*').eq('id', vendorId).single();
            if (!error && mdata) merchant = mdata;
        }
        if (merchant) {
            // ✅ Mostrar logo si existe
            if (merchant.store_logo) {
                vendorLogo.src = merchant.store_logo;
                vendorLogo.style.display = 'block';
                vendorLogoPlaceholder.style.display = 'none';
            } else {
                vendorLogo.style.display = 'none';
                vendorLogoPlaceholder.style.display = 'inline-block';
            }
            // ✅ Mostrar descripción
            vendorDescription.textContent = merchant.description || 'Este vendedor aún no ha agregado una descripción.';
            // ✅ WhatsApp
            if (merchant.phone) {
                const phone = merchant.phone.replace(/[^0-9]/g, '');
                if (phone) {
                    whatsappBtn.href = `https://wa.me/${phone}`;
                    whatsappBtn.style.display = 'inline-flex';
                }
            }
            // --- Mostrar redes sociales del vendedor (también para visitantes sin sesión) ---
            try {
                const socialsObj = {
                    instagram: merchant.instagram || null,
                    facebook: merchant.facebook || null,
                    youtube: merchant.youtube || null,
                    website: merchant.sitioweb || null
                };
                // Llamada a la función del script principal que renderiza botones
                if (typeof renderVendorSocials === 'function') renderVendorSocials(socialsObj);
            } catch (err) {
                console.warn('No se pudieron renderizar redes del vendedor:', err);
            }
        }
    } catch (error) { 
        console.error("Error fetching vendor data:", error); 
    }
    // Dentro de showVendorPage, al final:
    loadProducts('vendorProductsGrid', { vendorId: vendorId });
    // ✅ Actualizar favoritos después de que los productos se rendericen
    setTimeout(updateFavoriteUI, 100);
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
// ✅ FUNCIÓN CON DEBOUNCE CORRECTO
window.filterProducts = function() {
    console.log("🔍 filterProducts ejecutada");
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        console.log("✅ applyFilters llamado (debounce OK)");
        const searchInput = document.getElementById('productSearchInput');
        currentSearchText = searchInput.value.trim().toLowerCase();
        const clearBtn = document.getElementById('clearSearchBtn');
        clearBtn.style.display = currentSearchText ? 'flex' : 'none';
        applyFilters();
    }, 500);
};
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
    const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
    const priceDropdownBtn = document.getElementById('priceDropdownBtn');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const priceDropdown = document.getElementById('priceDropdown');
    if (categoryDropdownBtn) {
        categoryDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            categoryDropdown.classList.toggle('open');
            priceDropdown.classList.remove('open');
        });
    }
    if (priceDropdownBtn) {
        priceDropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            priceDropdown.classList.toggle('open');
            categoryDropdown.classList.remove('open');
        });
    }
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter-dropdown')) {
            document.querySelectorAll('.filter-dropdown').forEach(el => {
                el.classList.remove('open');
            });
        }
    });
});
// Variable global para guardar el orden actual
let currentPriceOrder = null;
// Función de ordenamiento por precio
window.sortByPrice = async function(order) {
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
        if (currentCategory !== 'all') {
            q = q.eq('category', currentCategory);
        }
        q = q.order('price', { ascending: order === 'asc' });
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
// === FAVORITOS ===
let favorites = [];
try {
    const stored = localStorage.getItem('feriaVirtualFavorites');
    const parsed = stored ? JSON.parse(stored) : [];
    if (Array.isArray(parsed)) {
        favorites = parsed;
    } else {
        throw new Error('Invalid format');
    }
} catch (e) {
    console.warn('Favoritos corruptos. Reiniciando.');
    localStorage.setItem('feriaVirtualFavorites', '[]');
    favorites = [];
}
function toggleFavorite(productId) {
    const index = favorites.indexOf(productId);
    const isFavorited = index === -1;
    // Actualizar array de favoritos
    if (isFavorited) {
        favorites.push(productId);
    } else {
        favorites.splice(index, 1);
    }
    localStorage.setItem('feriaVirtualFavorites', JSON.stringify(favorites));
    // ✅ Actualizar el botón específico en el DOM (sin recargar toda la grilla)
    const btn = document.querySelector(`.btn-favorite[data-product-id="${productId}"]`);
    if (btn) {
        const icon = btn.querySelector('i');
        if (isFavorited) {
            btn.classList.add('active');
            icon.className = 'fas fa-heart'; // lleno
        } else {
            btn.classList.remove('active');
            icon.className = 'far fa-heart'; // vacío
        }
    // ✅ Actualizar el badge del header en tiempo real
    document.getElementById('favoritesCount').textContent = favorites.length;
    }
    // Opcional: notificación
    // showToast(isFavorited ? 'Agregado a favoritos' : 'Eliminado de favoritos', 'info');
}
function isFavorite(productId) {
    return favorites.includes(productId);
}
function updateFavoriteUI() {
    // Solo en secciones activas
    const activeSections = document.querySelectorAll('.section.active-section');
    if (activeSections.length === 0) return;
    activeSections.forEach(section => {
        const favoriteButtons = section.querySelectorAll('.btn-favorite');
        favoriteButtons.forEach(btn => {
            const id = btn.dataset.productId;
            if (id && isFavorite(id)) {
                btn.classList.add('active');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-heart';
            } else {
                btn.classList.remove('active');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'far fa-heart';
            }
        });
    });
}
// === DELEGACIÓN SEGURA DE EVENTOS PARA CARRITO Y FAVORITOS ===
document.addEventListener('click', function(e) {
    // Carrito
    const addToCartBtn = e.target.closest('.btn-add-to-cart-overlay, .btn-add-to-cart-minimal');
    if (addToCartBtn) {
        e.stopPropagation();
        const productId = addToCartBtn.dataset.productId;
        const product = window.allProductsMap?.[productId];
        if (product && typeof window.addToCartWithAnimation === 'function') {
            window.addToCartWithAnimation(addToCartBtn, product);
        }
    }
    // Favoritos
    const favoriteBtn = e.target.closest('.btn-favorite');
    if (favoriteBtn) {
        e.stopPropagation();
        const productId = favoriteBtn.dataset.productId;
        if (productId) {
            toggleFavorite(productId);
            // Actualizar visualmente al instante
            const isNowFav = isFavorite(productId);
            favoriteBtn.classList.toggle('active', isNowFav);
            const icon = favoriteBtn.querySelector('i');
            if (icon) {
                icon.className = isNowFav ? 'fas fa-heart' : 'far fa-heart';
            }
        }
    }
});
/**
 * Muestra un modal con la descripción completa del producto.
 */
function showFullDescriptionModal(description) {
    // Reutilizar modal existente si está en el DOM
    let modal = document.getElementById('fullDescriptionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'fullDescriptionModal';
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="login-box" style="max-width: 600px; max-height: 80vh;">
                <button type="button" class="close-modal-btn" onclick="this.parentElement.parentElement.style.display='none'">
                    <i class="fas fa-times"></i>
                </button>
                <div class="login-header">
                    <h2>Descripción completa</h2>
                </div>
                <div id="fullDescriptionContent" style="padding: 1rem; line-height: 1.6; color: var(--text-primary); max-height: 60vh; overflow-y: auto; white-space: pre-wrap;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('fullDescriptionContent').textContent = description;
    modal.style.display = 'flex';
}
// === DELEGACIÓN DE EVENTO PARA "VER MÁS" EN MIS PRODUCTOS ===
document.addEventListener('click', function(e) {
    const viewMoreBtn = e.target.closest('.btn-view-more');
    if (viewMoreBtn) {
        e.stopPropagation();
        const fullDesc = viewMoreBtn.dataset.fullDescription || 'Sin descripción';
        document.getElementById('fullProductDescContent').textContent = fullDesc;
        document.getElementById('fullProductDescModal').style.display = 'flex';
    }
});
// === RENDERIZAR SECCIÓN DE FAVORITOS ===
window.renderFavoritesSection = function() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    const noFavoritesMsg = document.getElementById('noFavoritesMessage');
    if (!favoritesGrid) return;
    const favorites = JSON.parse(localStorage.getItem('feriaVirtualFavorites') || '[]');
    document.getElementById('favoritesCount').textContent = favorites.length;
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = '';
        noFavoritesMsg.style.display = 'flex';
        return;
    }
    noFavoritesMsg.style.display = 'none';
    favoritesGrid.innerHTML = '<p>Cargando favoritos...</p>';
    // Dentro de renderFavoritesSection:
    const stored = localStorage.getItem('feriaVirtualFavorites');
    const validFavorites = stored ? JSON.parse(stored) : [];
    if (!Array.isArray(validFavorites)) {
        localStorage.setItem('feriaVirtualFavorites', '[]');
        validFavorites = [];
    }
    document.getElementById('favoritesCount').textContent = validFavorites.length;
    // Cargar productos desde Supabase
    (async () => {
        try {
            if (!(await ensureSupabaseAvailable())) {
                favoritesGrid.innerHTML = '<p>No se puede conectar a la base de datos.</p>';
                return;
            }
            const supabaseClient = getSupabase();
            const { data, error } = await supabaseClient
                .from('products')
                .select('*')
                .in('id', favorites)
                .eq('published', true);
            if (error) throw error;
            const products = (data || []).map(normalizeProductRow);
            favoritesGrid.innerHTML = '';
            if (products.length === 0) {
                noFavoritesMsg.style.display = 'flex';
                return;
            }
            products.forEach(product => renderProductCard(favoritesGrid, product));
            // ✅ Actualizar UI de favoritos (corazones llenos)
            updateFavoriteUI();
        } catch (err) {
            console.error('Error al cargar favoritos:', err);
            favoritesGrid.innerHTML = '<p>Error al cargar tus favoritos.</p>';
        }
    })();
};
// === DELEGACIÓN DE EVENTO PARA "VER MÁS" EN PRODUCTOS PÚBLICOS ===
document.addEventListener('click', function(e) {
    const viewMoreBtn = e.target.closest('.btn-view-more-public');
    if (viewMoreBtn) {
        e.stopPropagation();
        const fullDesc = viewMoreBtn.dataset.fullDescription || 'Sin descripción';
        // Crear o reutilizar modal
        let modal = document.getElementById('fullProductDescModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'fullProductDescModal';
            modal.className = 'login-modal';
            modal.innerHTML = `
                <div class="login-box" style="max-width: 600px; max-height: 80vh;">
                    <button type="button" class="close-modal-btn" onclick="this.parentElement.parentElement.style.display='none'">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="login-header">
                        <h2>Descripción del producto</h2>
                    </div>
                    <div id="fullProductDescContent" style="padding: 1rem; line-height: 1.6; color: var(--text-primary); max-height: 60vh; overflow-y: auto; white-space: pre-wrap;"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('fullProductDescContent').textContent = fullDesc;
        modal.style.display = 'flex';
    }
});