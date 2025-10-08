// === CARRITO DE COMPRAS (VERSIÓN MEJORADA CON AGRUPACIÓN POR VENDEDOR) ===
let shoppingCart = [];

/**
 * Guarda el carrito actual en localStorage con una marca de tiempo.
 */
function saveCartToLocalStorage() {
    try {
        const cartData = {
            items: shoppingCart,
            timestamp: Date.now()
        };
        localStorage.setItem('feriaVirtualCart', JSON.stringify(cartData));
        console.log('🛒 Carrito guardado en localStorage.');
    } catch (error) {
        console.error('Error al guardar el carrito:', error);
    }
}

/**
 * Carga el carrito desde localStorage si no ha expirado (por defecto: 7 días).
 */
function loadCartFromLocalStorage(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    try {
        const cartData = JSON.parse(localStorage.getItem('feriaVirtualCart'));
        if (!cartData || !Array.isArray(cartData.items)) return;
        if (Date.now() - cartData.timestamp > maxAgeMs) {
            console.log('🛒 Carrito expirado. Se descarta.');
            localStorage.removeItem('feriaVirtualCart');
            return;
        }
        shoppingCart = cartData.items;
        console.log('🛒 Carrito cargado desde localStorage.');
        updateCartUI();
    } catch (error) {
        console.error('Error al cargar el carrito:', error);
        localStorage.removeItem('feriaVirtualCart');
    }
}

/**
 * Vacía el carrito tras confirmación del usuario.
 */
window.clearCart = function() {
    if (shoppingCart.length === 0) {
        showToast('El carrito ya está vacío.', 'info');
        return;
    }
    if (confirm('¿Estás seguro de que deseas vaciar tu lista de contactos?')) {
        shoppingCart = [];
        updateCartUI();
        saveCartToLocalStorage();
        showToast('Lista de contactos vaciada.', 'success');
    }
}

/**
 * Agrega un producto al carrito con animación visual.
 */
window.addToCartWithAnimation = function(button, product) {
    if (product.price == null || isNaN(parseFloat(product.price))) {
        showToast('Este producto no tiene un precio válido.', 'error');
        return;
    }
    button.classList.add('bounce');
    setTimeout(() => button.classList.remove('bounce'), 600);
    const existingItem = shoppingCart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        shoppingCart.push({
            id: product.id,
            name: product.name || 'Producto sin nombre',
            price: parseFloat(product.price),
            imageUrl: product.imageUrl,
            imageBase64: product.imageBase64,
            vendorId: product.vendorId,
            vendorName: product.vendorName || 'Vendedor desconocido',
            quantity: 1,
            category: product.category || 'otros'
        });
    }
    updateCartUI();
    createCartConfirmationAnimation(button);
    showToast(`${product.name} agregado al carrito.`, 'success');
    saveCartToLocalStorage();
}

/**
 * Elimina un producto del carrito por su ID.
 */
window.removeFromCart = function(productId) {
    shoppingCart = shoppingCart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToLocalStorage();
    showToast('Producto eliminado del carrito.', 'success');
}

/**
 * Actualiza la cantidad de un producto en el carrito.
 */
window.updateCartItemQuantity = function(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }
    const item = shoppingCart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        updateCartUI();
        saveCartToLocalStorage();
    }
}

/**
 * Actualiza la interfaz del carrito: badge, panel y agrupación por vendedor.
 */
window.updateCartUI = function() {
    const itemCount = shoppingCart.reduce((total, item) => total + item.quantity, 0);
    document.getElementById('cartItemCount').textContent = itemCount;
    const mobileBadge = document.getElementById('mobileCartBadge');
    const mobileCount = document.getElementById('mobileCartCount');
    if (itemCount > 0) {
        mobileCount.textContent = itemCount;
        if (window.innerWidth <= 768) {
            mobileBadge.classList.add('active');
            mobileBadge.style.display = 'flex';
        } else {
            mobileBadge.style.display = 'none';
        }
    } else {
        mobileBadge.classList.remove('active');
        mobileBadge.style.display = 'none';
    }
    const container = document.getElementById('cartItemsContainer');
    if (shoppingCart.length === 0) {
        container.innerHTML = '<p class="empty-cart-message">Tu lista de contactos está vacía.</p>';
        return;
    }
    const vendorsMap = {};
    shoppingCart.forEach(item => {
        if (!item.vendorId) return;
        if (!vendorsMap[item.vendorId]) {
            vendorsMap[item.vendorId] = {
                vendorName: item.vendorName || 'Vendedor desconocido',
                vendorId: item.vendorId,
                items: [],
                total: 0
            };
        }
        vendorsMap[item.vendorId].items.push(item);
        const price = parseFloat(item.price) || 0;
        vendorsMap[item.vendorId].total += price * item.quantity;
    });
    const vendors = Object.values(vendorsMap);
    let html = '';
    vendors.forEach(vendor => {
        html += `
            <div class="cart-vendor-block">
                <div class="cart-vendor-header">
                    <h4><i class="fas fa-store"></i> ${vendor.vendorName}</h4>
                    <div class="cart-vendor-total">Total: $${vendor.total.toFixed(2)}</div>
                </div>
                <div class="cart-vendor-items">
        `;
        vendor.items.forEach(item => {
            const displayPrice = parseFloat(item.price) || 0;
            const imgSrc = item.imageUrl || item.imageBase64 || 'https://placehold.co/60x60/e2e8f0/a0aec0?text=No+Img';
            html += `
                <div class="cart-item">
                    <div class="cart-item-image" style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 8px; background-image: url('${imgSrc}'); background-size: cover; background-position: center;"></div>
                    <div class="cart-item-details">
                        <h5 class="cart-item-title">${item.name}</h5>
                        <p class="cart-item-price">$${displayPrice.toFixed(2)} c/u</p>
                        <p class="cart-item-category">Categoría: ${item.category || 'otros'}</p>
                        <div class="cart-item-quantity">
                            <button onclick="updateCartItemQuantity('${item.id}', ${Math.max(1, item.quantity - 1)})" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartItemQuantity('${item.id}', ${item.quantity + 1})">+</button>
                            <button onclick="removeFromCart('${item.id}')" class="btn-trash" title="Eliminar producto">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        html += `
                </div>
                <div class="cart-vendor-actions">
                    <button class="btn btn-whatsapp" onclick="contactVendorViaWhatsApp('${vendor.vendorId}', ${JSON.stringify(vendor.items).replace(/"/g, '&quot;')})">
                        <i class="fab fa-whatsapp"></i> Contactar con ${vendor.vendorName}
                    </button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

/**
 * Abre un chat de WhatsApp con un vendedor incluyendo los productos seleccionados.
 */
window.contactVendorViaWhatsApp = async function(vendorId, items) {
    try {
        const supabaseClient = getSupabase();
        const { data: vendorData, error } = await supabaseClient
            .from('merchants')
            .select('phone, business')
            .eq('id', vendorId)
            .single();
        if (error || !vendorData) {
            showToast('No se encontró la información del vendedor.', 'error');
            return;
        }
        let phone = vendorData.phone;
        if (!phone) {
            showToast('Este vendedor no tiene un número de WhatsApp registrado.', 'error');
            return;
        }
        phone = phone.replace(/\D/g, '');
        let message = `Hola, quiero comprar los siguientes productos de tu puesto en Feria Virtual:\n`;
        let total = 0;
        items.forEach(item => {
            const subtotal = item.price * item.quantity;
            message += `- ${item.name} (${item.category || 'otros'}) (${item.quantity} u.): $${subtotal.toFixed(2)}\n`;
            total += subtotal;
        });
        message += `Total: $${total.toFixed(2)}\n`;
        message += `Por favor, confírmame para coordinar la entrega y el pago. ¡Gracias!`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
        showToast(`Abriendo chat con ${vendorData.business || 'el vendedor'}...`, 'success');
    } catch (error) {
        console.error("Error al contactar al vendedor:", error);
        showToast('Hubo un error al intentar contactar al vendedor.', 'error');
    }
}

/**
 * Crea una animación de confirmación al agregar al carrito (efecto de vuelo).
 */
function createCartConfirmationAnimation(sourceElement) {
    const rect = sourceElement.getBoundingClientRect();
    const animationElement = document.createElement('div');
    animationElement.className = 'cart-confirmation-animation';
    animationElement.innerHTML = '<i class="fas fa-cart-plus" style="font-size: 24px; color: var(--primary);"></i>';
    animationElement.style.position = 'fixed';
    animationElement.style.left = `${rect.left + rect.width / 2}px`;
    animationElement.style.top = `${rect.top + rect.height / 2}px`;
    animationElement.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(animationElement);
    const cartIcon = document.getElementById('cartIcon');
    if (cartIcon) {
        const cartRect = cartIcon.getBoundingClientRect();
        const cartX = cartRect.left + cartRect.width / 2;
        const cartY = cartRect.top + cartRect.height / 2;
        animationElement.style.transition = 'all 0.6s ease-out';
        setTimeout(() => {
            animationElement.style.left = `${cartX}px`;
            animationElement.style.top = `${cartY}px`;
            animationElement.style.transform = 'translate(-50%, -50%) scale(0.5)';
            animationElement.style.opacity = '0';
        }, 10);
        cartIcon.classList.add('bounce');
        setTimeout(() => cartIcon.classList.remove('bounce'), 600);
    }
    setTimeout(() => {
        if (animationElement.parentNode) {
            animationElement.parentNode.removeChild(animationElement);
        }
    }, 600);
}

/**
 * Alterna la visibilidad del panel del carrito y el overlay.
 */
window.toggleCart = function() {
    const panel = document.getElementById('cartPanel');
    const overlay = document.getElementById('cartOverlay');
    const mobileBadge = document.getElementById('mobileCartBadge');
    const isActive = panel.classList.toggle('active');
    overlay.classList.toggle('active');
    if (isActive && window.innerWidth <= 768) {
        mobileBadge.style.opacity = '0';
        mobileBadge.style.pointerEvents = 'none';
    } else {
        mobileBadge.style.opacity = '1';
        mobileBadge.style.pointerEvents = 'auto';
    }
}

// --- Inicialización del carrito al cargar la app ---
document.addEventListener('DOMContentLoaded', () => {
    loadCartFromLocalStorage();
});