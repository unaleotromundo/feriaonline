import React, { useState } from 'react';
import { CheckCircle, AlertCircle, TrendingUp, Users, ShoppingCart, Star, Search, Filter, Package, Heart, Share2, Bell, MessageCircle, Eye, Download, Upload, Edit, Trash2, Plus, X } from 'lucide-react';

const FeriaImprovements = () => {
  const [activeTab, setActiveTab] = useState('ux');

  const improvements = {
    ux: [
      {
        priority: 'Alta',
        title: 'Onboarding para nuevos usuarios',
        description: 'Tour guiado para comerciantes que se registran por primera vez',
        icon: <Users className="w-5 h-5" />,
        code: `// Agregar en initializeApp()
if (isFirstVisit) {
  showOnboardingTour();
}

function showOnboardingTour() {
  const steps = [
    { element: '#register', title: '¡Bienvenido!', text: 'Registra tu puesto aquí' },
    { element: '#products', title: 'Explora', text: 'Descubre productos locales' },
    { element: '#cartIcon', title: 'Carrito', text: 'Guarda productos para contactar' }
  ];
  // Implementar con una librería como Intro.js o Driver.js
}`
      },
      {
        priority: 'Alta',
        title: 'Vista previa antes de publicar productos',
        description: 'Mostrar cómo se verá el producto antes de guardarlo',
        icon: <Eye className="w-5 h-5" />,
        code: `// En el modal de producto
<button onclick="previewProduct()">
  <i class="fas fa-eye"></i> Vista Previa
</button>

function previewProduct() {
  const tempProduct = {
    name: document.getElementById('productName').value,
    price: document.getElementById('productPrice').value,
    // ... resto de datos
  };
  // Renderizar en un modal temporal
}`
      },
      {
        priority: 'Media',
        title: 'Confirmación visual al agregar al carrito',
        description: 'Toast mejorado con imagen del producto',
        icon: <ShoppingCart className="w-5 h-5" />,
        code: `function showCartToast(product) {
  const toast = document.createElement('div');
  toast.className = 'cart-toast';
  toast.innerHTML = \`
    <img src="\${product.imageUrl}" alt="">
    <div>
      <strong>\${product.name}</strong>
      <p>Agregado al carrito</p>
    </div>
    <button onclick="toggleCart()">Ver carrito</button>
  \`;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
}`
      },
      {
        priority: 'Media',
        title: 'Favoritos/Lista de deseos',
        description: 'Permitir guardar productos sin agregarlos al carrito',
        icon: <Heart className="w-5 h-5" />,
        code: `// Agregar botón de favorito en cada producto
<button class="btn-favorite" onclick="toggleFavorite('$\{product.id}')">
  <i class="fas fa-heart"></i>
</button>

// Sistema de favoritos con localStorage
let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

function toggleFavorite(productId) {
  if (favorites.includes(productId)) {
    favorites = favorites.filter(id => id !== productId);
  } else {
    favorites.push(productId);
  }
  localStorage.setItem('favorites', JSON.stringify(favorites));
  updateFavoriteUI();
}`
      }
    ],
    features: [
      {
        priority: 'Alta',
        title: 'Sistema de valoraciones y reseñas',
        description: 'Permitir a los usuarios calificar productos y vendedores',
        icon: <Star className="w-5 h-5" />,
        code: `// Nueva tabla en Supabase: product_reviews
{
  id: uuid,
  product_id: uuid,
  user_email: text,
  rating: integer (1-5),
  comment: text,
  created_at: timestamp
}

// Mostrar estrellas en productos
<div class="product-rating">
  <span class="stars">★★★★☆</span>
  <span class="rating-count">(24 reseñas)</span>
</div>`
      },
      {
        priority: 'Alta',
        title: 'Notificaciones push (opcional)',
        description: 'Alertar sobre nuevos productos de vendedores favoritos',
        icon: <Bell className="w-5 h-5" />,
        code: `// Pedir permiso para notificaciones
if ('Notification' in window) {
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      // Guardar token de notificación
      subscribeToVendor(vendorId);
    }
  });
}`
      },
      {
        priority: 'Media',
        title: 'Compartir productos en redes sociales',
        description: 'Botones para compartir en WhatsApp, Facebook, Twitter',
        icon: <Share2 className="w-5 h-5" />,
        code: `function shareProduct(product) {
  const url = window.location.origin + '?product=' + product.id;
  const text = \`Mira este producto: \${product.name} por $\${product.price}\`;
  
  // WhatsApp
  window.open(\`https://wa.me/?text=\${encodeURIComponent(text + ' ' + url)}\`);
  
  // Web Share API (móviles)
  if (navigator.share) {
    navigator.share({ title: product.name, text, url });
  }
}`
      },
      {
        priority: 'Media',
        title: 'Chat en vivo (Chatbot mejorado)',
        description: 'Asistente para ayudar a encontrar productos',
        icon: <MessageCircle className="w-5 h-5" />,
        code: `// Ya tienes Botpress, mejorar las respuestas:
// 1. Buscar productos por texto
// 2. Recomendar categorías
// 3. Ayuda con el registro
// 4. FAQs automatizadas`
      },
      {
        priority: 'Baja',
        title: 'Historial de pedidos',
        description: 'Guardar qué productos contactó cada usuario',
        icon: <Package className="w-5 h-5" />,
        code: `// Nueva tabla: order_history
{
  id: uuid,
  user_email: text,
  vendor_id: uuid,
  products: jsonb,
  contacted_at: timestamp
}

// Guardar cuando se contacta por WhatsApp
function saveOrderHistory(vendorId, items) {
  supabase.from('order_history').insert({
    user_email: currentUser?.email || 'anonymous',
    vendor_id: vendorId,
    products: items,
    contacted_at: new Date().toISOString()
  });
}`
      }
    ],
    performance: [
      {
        priority: 'Alta',
        title: 'Lazy loading de imágenes',
        description: 'Cargar imágenes solo cuando sean visibles',
        icon: <TrendingUp className="w-5 h-5" />,
        code: `// Ya tienes loading="lazy" en algunas imágenes, aplicarlo a TODAS

// Además, agregar Intersection Observer para productos
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      observer.unobserve(img);
    }
  });
});

document.querySelectorAll('.product-image[data-src]').forEach(img => {
  observer.observe(img);
});`
      },
      {
        priority: 'Alta',
        title: 'Caché de productos',
        description: 'No recargar productos si ya están en memoria',
        icon: <Download className="w-5 h-5" />,
        code: `// Ya tienes dataCache, pero no lo usas efectivamente
async function loadProducts(containerId = 'productsGrid', filter = {}) {
  const cacheKey = JSON.stringify(filter);
  const cached = dataCache.products[cacheKey];
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('📦 Usando productos en caché');
    renderProducts(cached.data);
    return;
  }
  
  // Cargar de Supabase solo si no hay caché válido
  const { data } = await supabase.from('products').select('*');
  dataCache.products[cacheKey] = { data, timestamp: Date.now() };
  renderProducts(data);
}`
      },
      {
        priority: 'Media',
        title: 'Paginación de productos',
        description: 'Cargar productos de 20 en 20 en lugar de todos',
        icon: <Filter className="w-5 h-5" />,
        code: `let currentPage = 1;
const PRODUCTS_PER_PAGE = 20;

async function loadProducts(page = 1) {
  const from = (page - 1) * PRODUCTS_PER_PAGE;
  const to = from + PRODUCTS_PER_PAGE - 1;
  
  const { data, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .range(from, to);
  
  renderProducts(data);
  renderPagination(count);
}

// Botones de paginación
function renderPagination(totalCount) {
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);
  // Crear botones 1, 2, 3... Anterior, Siguiente
}`
      },
      {
        priority: 'Media',
        title: 'Service Worker para modo offline',
        description: 'Funcionar sin internet (mostrar productos en caché)',
        icon: <Upload className="w-5 h-5" />,
        code: `// service-worker.js
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('feria-v1').then(cache => {
      return cache.addAll([
        '/',
        '/style.css',
        '/script.js',
        '/products.js',
        '/cart.js',
        '/catalog.js'
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

// Registrar en index.html
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js');
}`
      }
    ],
    security: [
      {
        priority: 'Crítica',
        title: 'Validación de inputs',
        description: 'Sanitizar todos los datos del usuario',
        icon: <AlertCircle className="w-5 h-5" />,
        code: `// Crear función de sanitización
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Aplicar en todos los formularios
const productName = sanitizeInput(document.getElementById('productName').value);

// Validar precios
function validatePrice(price) {
  const num = parseFloat(price);
  if (isNaN(num) || num < 0) {
    throw new Error('Precio inválido');
  }
  return num;
}`
      },
      {
        priority: 'Alta',
        title: 'Rate limiting',
        description: 'Limitar peticiones a Supabase para evitar abusos',
        icon: <AlertCircle className="w-5 h-5" />,
        code: `// Implementar throttle/debounce
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Aplicar en búsqueda
const debouncedSearch = debounce(filterProducts, 300);
document.getElementById('productSearchInput').oninput = debouncedSearch;`
      },
      {
        priority: 'Media',
        title: 'Verificación de email',
        description: 'Confirmar email antes de permitir publicar',
        icon: <AlertCircle className="w-5 h-5" />,
        code: `// Supabase ya tiene esto con confirmEmail: true
// Mostrar mensaje si no está verificado
if (!currentUser.email_verified) {
  showToast('Por favor verifica tu email para publicar productos', 'warning');
  // Bloquear botón de nuevo producto
}`
      }
    ]
  };

  const tabs = [
    { id: 'ux', label: 'UX/UI', icon: <Users className="w-4 h-4" /> },
    { id: 'features', label: 'Funcionalidades', icon: <Package className="w-4 h-4" /> },
    { id: 'performance', label: 'Rendimiento', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'security', label: 'Seguridad', icon: <AlertCircle className="w-4 h-4" /> }
  ];

  const priorityColors = {
    'Crítica': 'bg-red-100 text-red-800 border-red-300',
    'Alta': 'bg-orange-100 text-orange-800 border-orange-300',
    'Media': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Baja': 'bg-blue-100 text-blue-800 border-blue-300'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🎯 Plan de Mejoras - Feria Virtual
          </h1>
          <p className="text-slate-600">
            Recomendaciones priorizadas para hacer tu plataforma más profesional y práctica
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Improvements Grid */}
        <div className="grid gap-4">
          {improvements[activeTab].map((item, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-slate-800">{item.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColors[item.priority]}`}>
                      {item.priority}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-4">{item.description}</p>
                  <details className="bg-slate-50 rounded-lg p-4">
                    <summary className="cursor-pointer font-medium text-slate-700 hover:text-blue-600">
                      Ver código de ejemplo
                    </summary>
                    <pre className="mt-3 p-4 bg-slate-800 text-green-400 rounded-lg overflow-x-auto text-sm">
                      <code>{item.code}</code>
                    </pre>
                  </details>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Wins Section */}
        <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Quick Wins - Implementa Hoy
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <span>Corregir encoding UTF-8 en todos los archivos (reemplaza "Ã" por caracteres correctos)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <span>Agregar loading="lazy" a TODAS las imágenes de productos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <span>Implementar debounce en el buscador para reducir queries</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <span>Agregar meta tags Open Graph para compartir en redes sociales</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-xl">✅</span>
              <span>Crear página de "Cómo funciona" para nuevos usuarios</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FeriaImprovements;