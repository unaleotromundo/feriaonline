// === CONFIGURACIÓN DE TEMAS PARA PDF ===
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

// === EXPORTACIÓN A JSON (SOLO PRODUCTOS) ===
window.exportCatalogToJSON = async function() {
    if (!currentUser) return showToast('Debes iniciar sesión para exportar tus productos.', 'error');
    
    showGlobalLoadingOverlay('Preparando exportación...');
    try {
        if (!(await ensureSupabaseAvailable())) {
            hideGlobalLoadingOverlay();
            return showToast('No se puede conectar a Supabase.', 'error');
        }

        const supabaseClient = getSupabase();
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .eq('vendor_id', currentUser.id);

        if (error) throw error;
        if (!products || products.length === 0) {
            hideGlobalLoadingOverlay();
            return showToast('No tienes productos para exportar.', 'error');
        }

        // ✅ Formato limpio: solo datos del producto
        const exportData = products.map(p => ({
            name: p.name,
            price: p.price,
            description: p.description,
            category: p.category || 'otros',
            published: p.published !== false, // por defecto true
            // Incluir ambas formas de imagen (prioridad: URL pública)
            image_url: p.image_url || null,
            image_base64: p.image_base64 || null,
            image_storage_path: p.image_storage_path || null
        }));

        // ✅ Generar archivo
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `productos-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Productos exportados correctamente.', 'success');

    } catch (error) {
        console.error("Error exportando productos:", error);
        showToast('Error al exportar los productos.', 'error');
    } finally {
        hideGlobalLoadingOverlay();
    }
};

// === IMPORTACIÓN DESDE JSON ===
window.handleJsonImport = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    hideModal('backup-options-modal');
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const products = JSON.parse(e.target.result);
            if (!Array.isArray(products) || products.length === 0) {
                showToast('El archivo no contiene productos para importar.', 'error');
                return;
            }
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
};

async function importCatalogFromJSON(products) {
    if (!Array.isArray(products) || products.length === 0) return showToast('El archivo no contiene productos para importar.', 'error');
    
    showToast(`Importando ${products.length} productos...`, 'success');
    try {
        if (!(await ensureSupabaseAvailable())) return showToast('No se puede conectar a Supabase para importar.', 'error');
        
        const rows = products.map(p => {
            // ✅ Solo incluir columnas que existen en la tabla 'products'
            const row = {
                name: p.name || 'Producto sin nombre',
                price: p.price || 0,
                description: p.description || '',
                category: p.category || 'otros',
                published: typeof p.published === 'boolean' ? p.published : true,
                vendor_id: currentUser.id,
                vendor_name: currentMerchantData?.business || 'Mi Negocio',
                created_at: new Date().toISOString()
            };

            // ✅ Solo agregar campos de imagen si existen y son válidos
            if (p.image_url) row.image_url = p.image_url;
            if (p.image_storage_path) row.image_storage_path = p.image_storage_path;
            // ❌ NO incluir 'image_base64' a menos que la tabla lo tenga

            return row;
        });

        const supabaseClient = getSupabase();
        const { error } = await supabaseClient.from('products').insert(rows);
        if (error) throw error;

        showToast(`${products.length} productos importados correctamente.`, 'success');
        loadMyProducts();
        updateUserProfile(currentUser.id);
    } catch (error) {
        console.error("Error durante la importación masiva:", error);
        showToast('Ocurrió un error durante la importación.', 'error');
    }
}

// === GENERACIÓN DE CATÁLOGO PDF CON TEMAS ===
window.showExportModal = function() {
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
};

// === GENERACIÓN DE CATÁLOGO PDF CON TEMAS (CORREGIDO) ===
async function generatePdfWithJsPDF(themeKey) {
    hideModal('exportThemeModal');
    showGlobalLoadingOverlay('Generando catálogo PDF...');
    try {
        let pdfQuery = getSupabase().from('products').select('*').eq('published', true).order('created_at', { ascending: false });
        if (isValidId(currentUser.id)) {
            pdfQuery = getSupabase().from('products').select('*').eq('vendor_id', currentUser.id).eq('published', true).order('created_at', { ascending: false });
        }
        const { data: productsData, error } = await pdfQuery;
        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            showToast('No tienes productos publicados para incluir.', 'error');
            return;
        }
        const products = productsData.map(r => normalizeProductRow(r));
        const theme = PDF_THEMES[themeKey];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        const gutter = 10;
        const contentWidth = pageWidth - (margin * 2);
        const columnWidth = (contentWidth - (gutter * 2)) / 3;
        let currentY = margin;
        let columnIndex = 0;

        // ✅ Precargar logo del puesto si existe
        let logoDataUrl = null;
        if (currentMerchantData?.store_logo) {
            try {
                const logoImg = new Image();
                logoImg.crossOrigin = "anonymous";
                logoImg.src = currentMerchantData.store_logo;
                await new Promise((resolve, reject) => {
                    logoImg.onload = resolve;
                    logoImg.onerror = reject;
                });
                const canvas = document.createElement('canvas');
                canvas.width = Math.min(logoImg.width, 100);
                canvas.height = Math.min(logoImg.height, 100);
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0, canvas.width, canvas.height);
                logoDataUrl = canvas.toDataURL('image/png');
            } catch (e) {
                console.warn('No se pudo cargar el logo para el PDF:', e);
            }
        }

const addHeader = () => {
    currentY = margin;

    // ✅ Logo pequeño a la izquierda (solo si existe)
    let logoWidth = 0;
    let logoHeight = 0;
    if (logoDataUrl) {
        logoWidth = 24;   // Pequeño: 24mm ≈ 90px
        logoHeight = 24;
        const logoX = margin;
        const logoY = currentY;
        doc.addImage(logoDataUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);
    }

    // ✅ Nombre del negocio al lado del logo (o centrado si no hay logo)
    const textX = logoDataUrl ? (margin + logoWidth + 6) : (pageWidth / 2);
    const textAlign = logoDataUrl ? 'left' : 'center';
    
    doc.setFontSize(28);
    doc.setTextColor(theme.headerColor);
    doc.text(String(currentMerchantData.business || ''), textX, currentY + 16, { align: textAlign });
    
    // ✅ Descripción debajo del nombre
    currentY += 28; // Altura del nombre + margen
    doc.setFontSize(11);
    doc.setTextColor('#666');
    const descLines = doc.splitTextToSize(String(currentMerchantData.description || ''), contentWidth - (logoDataUrl ? logoWidth + 12 : 0));
    doc.text(descLines, textX, currentY, { align: textAlign });
    currentY += (descLines.length * 5) + 10;

    // ✅ Línea divisoria
    doc.setDrawColor(theme.headerColor);
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 12;
};
        const addFooter = (pageNumber) => {
            const footerY = pageHeight - 10;
            doc.setFontSize(9); doc.setTextColor('#999');
            doc.text(`Catálogo de ${currentMerchantData.business} | Página ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
        };

        addHeader();
        let pageCount = 1;
        addFooter(pageCount);

        // ✅ PRE-CARGAR TODAS LAS IMÁGENES DE PRODUCTOS
        const imagePromises = products.map(product => {
            return new Promise((resolve) => {
                const imgSrc = product.imageUrl || product.imageBase64;
                if (!imgSrc) {
                    resolve({ product, img: null });
                    return;
                }
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve({ product, img });
                img.onerror = () => resolve({ product, img: null });
                img.src = imgSrc;
            });
        });

        const loadedProducts = await Promise.all(imagePromises);

        for (const { product, img } of loadedProducts) {
            const productBlockHeight = 140;
            if (columnIndex > 2) { columnIndex = 0; currentY += productBlockHeight; }
            if (currentY + productBlockHeight > pageHeight - margin) {
                doc.addPage(); pageCount++; addHeader(); addFooter(pageCount);
               currentY = margin + (logoDataUrl ? 50 : 38); // Ajuste fino según el nuevo header
                columnIndex = 0;
            }
            const columnX = margin + (columnIndex * (columnWidth + gutter));
            
            if (img) {
                try {
                    const boxW = columnWidth, boxH = 80;
                    let w = img.width, h = img.height;
                    if (w > boxW) { h = (boxW / w) * h; w = boxW; }
                    if (h > boxH) { w = (boxH / h) * w; h = boxH; }
                    const x = columnX + (boxW - w) / 2;
                    const y = currentY + (boxH - h) / 2;
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imgData = canvas.toDataURL('image/jpeg', 0.8);
                    doc.addImage(imgData, 'JPEG', x, y, w, h);
                } catch (e) { 
                    console.error("Error al añadir imagen:", e); 
                }
            }
            
            let textY = currentY + 90;
            doc.setFontSize(18); doc.setTextColor(theme.headerColor);
            doc.text(doc.splitTextToSize(String(product.name || ''), columnWidth), columnX, textY);
            textY += (doc.splitTextToSize(String(product.name || ''), columnWidth).length * 7) + 3;
            doc.setFontSize(20); doc.setTextColor(theme.accentColor);
            doc.text(`$${(product.price || 0).toFixed(2)}`, columnX, textY);
            textY += 10;
            if (product.category && product.category !== 'otros') {
                doc.setFontSize(12); doc.setTextColor('#555');
                doc.text(`Categoría: ${product.category}`, columnX, textY);
                textY += 8;
            }
            doc.setFontSize(11); doc.setTextColor('#333');
            doc.text(doc.splitTextToSize(String(product.description || ''), columnWidth), columnX, textY);
            columnIndex++;
        }
        
        doc.save(`catalogo-${currentMerchantData.business.replace(/\s+/g, '-')}.pdf`);
        showToast('Catálogo PDF generado correctamente.', 'success');    } catch (error) {
        console.error("Error generando PDF:", error);
        showToast("Hubo un error al generar el catálogo.", "error");
    } finally {
        hideGlobalLoadingOverlay();
    }
}

// === FICHA DE PRODUCTO INDIVIDUAL (JPG) - CORREGIDO ===
window.loadUserProductsForSelection = async function() {
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
            // ✅ USAR imageUrl O imageBase64
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
};

async function generateProductJPG(product) {
    showToast('Generando ficha de producto...', 'success');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 800, canvasHeight = 800;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fondo y membretado
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const themeCyan = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim();
    ctx.fillStyle = themeCyan || '#06b6d4';
    ctx.fillRect(0, 0, canvasWidth, 100);
    ctx.font = 'bold 36px "Segoe UI", sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(currentMerchantData.business || "Mi Tienda", canvasWidth / 2, 65);

    // ✅ CARGAR IMAGEN (imageUrl o imageBase64)
    const productImage = new Image();
    productImage.crossOrigin = "anonymous";
    const imgSrc = product.imageUrl || product.imageBase64 || 'https://placehold.co/700x400/e2e8f0/a0aec0?text=Producto+sin+imagen';
    productImage.src = imgSrc;
    
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

        // Textos
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        ctx.font = 'bold 32px "Segoe UI", sans-serif';
        ctx.fillText(product.name, 50, 580);

        const themeSuccess = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
        ctx.font = 'bold 48px "Segoe UI", sans-serif';
        ctx.fillStyle = themeSuccess || '#10b981';
        ctx.textAlign = 'right';
        ctx.fillText(`$${(product.price || 0).toFixed(2)}`, 750, 580);

        // Categoría y descripción
        if (product.category && product.category !== 'otros') {
            ctx.font = '20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#555555';
            ctx.textAlign = 'left';
            ctx.fillText(`Categoría: ${product.category}`, 50, 620);
            wrapText(ctx, product.description || 'Sin descripción.', 50, 660, 700, 24);
        } else {
            ctx.font = '20px "Segoe UI", sans-serif';
            ctx.fillStyle = '#555555';
            ctx.textAlign = 'left';
            wrapText(ctx, product.description || 'Sin descripción.', 50, 630, 700, 24);
        }

        // Descarga
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `ficha-${product.name.replace(/\s+/g, '-')}.jpg`;
        link.click();
        showToast('Ficha generada correctamente.', 'success');
    };
    
    productImage.onerror = () => {
        console.error('Error cargando imagen:', imgSrc);
        showToast("Error al cargar la imagen del producto.", "error");
    };
}

// === FICHA DE PRODUCTO INDIVIDUAL (JPG) - CORREGIDO COMPLETO ===
window.loadUserProductsForSelection = async function() {
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
        
        // ✅ Obtener productos con normalización
        const supabaseClient = getSupabase();
        let q = supabaseClient.from('products').select('*').order('created_at', { ascending: false });
        if (isValidId(currentUser.id)) {
            q = q.eq('vendor_id', currentUser.id);
        }
        const { data, error } = await q;
        
        if (error) {
            console.error('Error fetching products:', error);
            container.innerHTML = '<p>Error al cargar productos.</p>';
            return;
        }
        
        const products = (data || []).map(r => normalizeProductRow(r));
        
        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p>No tienes productos para seleccionar.</p>';
            return;
        }
        
        products.forEach(product => {
            const productElement = document.createElement('div');
            productElement.className = 'product-selection-item';
            
            // ✅ PRIORIDAD: imageUrl > imageBase64 > placeholder
            let imgSrc = 'https://placehold.co/120x80/e2e8f0/a0aec0?text=Sin+Imagen';
            
            if (product.imageUrl) {
                imgSrc = product.imageUrl;
                console.log('📸 Usando imageUrl:', product.name, product.imageUrl);
            } else if (product.imageBase64) {
                imgSrc = product.imageBase64;
                console.log('📸 Usando imageBase64:', product.name);
            } else {
                console.warn('⚠️ Sin imagen para:', product.name);
            }
            
            productElement.innerHTML = `
                <img src="${imgSrc}" alt="${product.name}" loading="lazy" crossorigin="anonymous">
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
};


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

// === GENERACIÓN DE CATÁLOGO COMPLETO CON html2canvas (OPCIONAL) ===
window.generateCatalogJPG = async function() {
    if (!currentUser) return showToast('Debes iniciar sesión para generar imágenes.', 'error');
    if (!(await ensureSupabaseAvailable())) return;
    showGlobalLoadingOverlay('Generando imágenes del catálogo...');
    try {
        const supabaseClient = getSupabase();
        let q = supabaseClient.from('products').select('*');
        if (isValidId(currentUser.id)) q = q.eq('vendor_id', currentUser.id);
        const { data: productsData, error } = await q;
        if (error) throw error;
        if (!productsData || productsData.length === 0) {
            hideGlobalLoadingOverlay();
            return showToast('No tienes productos para generar imágenes.', 'error');
        }
        const products = productsData.map(r => normalizeProductRow(r));

        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '800px';
        tempDiv.style.background = '#fff';
        tempDiv.style.padding = '20px';
        tempDiv.innerHTML = '<h2>Catálogo de Productos</h2>';

        products.forEach((product, idx) => {
            const prodDiv = document.createElement('div');
            prodDiv.style.border = '1px solid #ccc';
            prodDiv.style.margin = '10px 0';
            prodDiv.style.padding = '10px';
            prodDiv.innerHTML = `<strong>${idx + 1}. ${product.name || 'Sin nombre'}</strong><br>
                Precio: $${product.price || 'N/A'}<br>
                Categoría: ${product.category || 'otros'}<br>
                Descripción: ${product.description || ''}<br>`;
            if (product.imageBase64) {
                const img = document.createElement('img');
                img.src = product.imageBase64;
                img.style.maxWidth = '200px';
                img.style.display = 'block';
                prodDiv.appendChild(img);
            }
            tempDiv.appendChild(prodDiv);
        });

        document.body.appendChild(tempDiv);

        if (window.html2canvas) {
            const canvas = await window.html2canvas(tempDiv);
            const imgData = canvas.toDataURL('image/jpeg');
            const a = document.createElement('a');
            a.href = imgData;
            a.download = `catalogo-feria-virtual-${new Date().toISOString().slice(0, 10)}.jpg`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast('Imagen JPG generada correctamente.', 'success');
        } else {
            showToast('No se encontró html2canvas. No se puede generar la imagen.', 'error');
        }
        document.body.removeChild(tempDiv);
    } catch (error) {
        console.error('Error generando JPG:', error);
        showToast('Hubo un error al generar la imagen.', 'error');
    } finally {
        hideGlobalLoadingOverlay();
    }
};