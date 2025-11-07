// ========================================
// 📊 SISTEMA DE ANALYTICS PARA FERIA VIRTUAL
// Tracking de eventos y envío a Supabase
// ========================================

// Obtener o crear session ID
function getSessionId() {
    let sessionId = sessionStorage.getItem('feria_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('feria_session_id', sessionId);
    }
    return sessionId;
}

// Detectar tipo de dispositivo
function getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

// Detectar navegador
function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    if (ua.indexOf('Trident') > -1) return 'IE';
    if (ua.indexOf('Edge') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    return 'Unknown';
}

// Función principal para registrar eventos
async function trackEvent(eventType, eventData = {}) {
    try {
        const supabase = getSupabase();
        if (!supabase) {
            console.warn('Supabase no disponible para analytics');
            return;
        }

        const eventPayload = {
            event_type: eventType,
            event_category: eventData.category || null,
            event_label: eventData.label || null,
            event_value: eventData.value || null,
            user_session_id: getSessionId(),
            user_id: currentUser?.id || null,
            page_url: window.location.href,
            referrer: document.referrer || null,
            user_agent: navigator.userAgent,
            device_type: getDeviceType(),
            browser: getBrowser()
        };

        const { error } = await supabase
            .from('analytics_events')
            .insert([eventPayload]);

        if (error) {
            console.error('Error guardando evento de analytics:', error);
        }
    } catch (err) {
        console.error('Error en trackEvent:', err);
    }
}

// ========================================
// TRACKING AUTOMÁTICO DE EVENTOS
// ========================================

// Track page view al cargar
document.addEventListener('DOMContentLoaded', () => {
    trackEvent('page_view', {
        category: 'Navegación',
        label: document.title
    });

    // Track tiempo en página
    let startTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const timeSpent = Math.floor((Date.now() - startTime) / 1000); // segundos
        trackEvent('time_on_page', {
            category: 'Engagement',
            value: timeSpent,
            label: document.title
        });
    });
});

// Track clicks en botón de registro
document.addEventListener('click', function(e) {
    // Botón "Registrar mi puesto"
    if (e.target.closest('.btn-primary') && e.target.textContent.includes('Registrar mi puesto')) {
        trackEvent('click_register', {
            category: 'Conversión',
            label: 'Botón Hero - Registrar Puesto'
        });
    }

    // Click en "Explorar productos"
    if (e.target.textContent.includes('Explorar productos')) {
        trackEvent('click_explore', {
            category: 'Navegación',
            label: 'Botón Hero - Explorar Productos'
        });
    }

    // Click en productos (para ver detalle)
    if (e.target.closest('.product-card .product-image')) {
        trackEvent('product_view', {
            category: 'Productos',
            label: e.target.closest('.product-card')?.querySelector('.product-title')?.textContent || 'Producto'
        });
    }

    // Click en "Agregar al carrito"
    if (e.target.closest('.btn-add-to-cart-overlay, .btn-add-to-cart-minimal')) {
        trackEvent('add_to_cart', {
            category: 'Conversión',
            label: 'Agregar Producto al Carrito'
        });
    }

    // Click en favoritos
    if (e.target.closest('.btn-favorite')) {
        trackEvent('add_to_favorites', {
            category: 'Engagement',
            label: 'Agregar a Favoritos'
        });
    }

    // Click en WhatsApp (ya detectado en el HTML, pero reforzamos)
    if (e.target.closest('a[href^="https://wa.me"], .btn-whatsapp, .lightbox-whatsapp-modern-btn, .whatsapp-float')) {
        trackEvent('click_whatsapp', {
            category: 'Contacto',
            label: e.target.closest('a')?.href || 'WhatsApp'
        });
    }

    // Click en Facebook
    if (e.target.closest('a[href*="facebook.com"], #vendorSocialsContainer .facebook')) {
        trackEvent('click_facebook', {
            category: 'Redes Sociales',
            label: 'Facebook'
        });
    }

    // Click en Instagram
    if (e.target.closest('a[href*="instagram.com"], #vendorSocialsContainer .instagram')) {
        trackEvent('click_instagram', {
            category: 'Redes Sociales',
            label: 'Instagram'
        });
    }

    // Click en YouTube
    if (e.target.closest('a[href*="youtube.com"], #vendorSocialsContainer .youtube')) {
        trackEvent('click_youtube', {
            category: 'Redes Sociales',
            label: 'YouTube'
        });
    }
});

// Track búsquedas
let searchDebounce;
document.getElementById('productSearchInput')?.addEventListener('input', function(e) {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
        if (e.target.value.trim().length > 2) {
            trackEvent('search', {
                category: 'Búsqueda',
                label: e.target.value.trim()
            });
        }
    }, 2000);
});

// Track cambios de sección
const originalShowSection = window.showSection;
window.showSection = function(sectionId) {
    trackEvent('section_view', {
        category: 'Navegación',
        label: sectionId
    });
    if (originalShowSection) {
        return originalShowSection(sectionId);
    }
};

// Track vista de página de vendedor
const originalShowVendorPage = window.showVendorPage;
window.showVendorPage = async function(vendorId, vendorName) {
    trackEvent('vendor_page_view', {
        category: 'Vendedores',
        label: vendorName || vendorId
    });
    if (originalShowVendorPage) {
        return originalShowVendorPage(vendorId, vendorName);
    }
};

// Track registro exitoso
const originalRegisterMerchant = window.registerMerchant;
window.registerMerchant = async function() {
    const result = originalRegisterMerchant ? await originalRegisterMerchant() : null;
    if (result !== false) { // Si no hubo error
        trackEvent('registration_complete', {
            category: 'Conversión',
            label: 'Registro de Comerciante Exitoso'
        });
    }
    return result;
};

// Track login
const originalLogin = window.login;
window.login = async function() {
    const result = originalLogin ? await originalLogin() : null;
    if (result !== false) {
        trackEvent('user_login', {
            category: 'Autenticación',
            label: 'Login Exitoso'
        });
    }
    return result;
};

// Track creación de producto
const originalSaveProduct = window.saveProduct;
window.saveProduct = async function() {
    const result = originalSaveProduct ? await originalSaveProduct() : null;
    if (result !== false) {
        trackEvent('product_created', {
            category: 'Contenido',
            label: 'Nuevo Producto Creado'
        });
    }
    return result;
};

// Track generación de catálogo
document.getElementById('generate-pdf-btn')?.addEventListener('click', () => {
    trackEvent('catalog_pdf_generated', {
        category: 'Herramientas',
        label: 'Catálogo PDF Generado'
    });
});

document.getElementById('generate-jpg-btn')?.addEventListener('click', () => {
    trackEvent('catalog_jpg_generated', {
        category: 'Herramientas',
        label: 'Ficha de Producto JPG Generada'
    });
});

// Track uso del chatbot
document.getElementById('chatbotToggleBtn')?.addEventListener('click', () => {
    trackEvent('chatbot_opened', {
        category: 'Soporte',
        label: 'Chatbot Abierto'
    });
});

console.log('✅ Sistema de Analytics inicializado');
