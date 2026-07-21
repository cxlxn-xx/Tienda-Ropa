// ============================================================
// CONFIGURACIÓN
// ============================================================
const ADMIN_PASSWORD = 'admin123'; // Cambia aquí tu contraseña
const SESSION_KEY = 'admin_session';

// ============================================================
// 1. DATOS DE PRODUCTOS (por defecto)
// ============================================================
const defaultProducts = [
    { id: 1, name: 'Camiseta Básica', category: 'camisetas', price: 19.99, image: 'https://picsum.photos/id/1/200/200', stock: 10, sizes: ['S','M','L','XL'] },
    { id: 2, name: 'Polo Clásico', category: 'camisetas', price: 29.99, image: 'https://picsum.photos/id/2/200/200', stock: 8, sizes: ['S','M','L'] },
    { id: 3, name: 'Vestido Floral', category: 'camisetas', price: 39.99, image: 'https://picsum.photos/id/3/200/200', stock: 5, sizes: ['S','M','L','XL'] },
    { id: 4, name: 'Jeans Ajustados', category: 'pantalones', price: 49.99, image: 'https://picsum.photos/id/4/200/200', stock: 6, sizes: ['28','30','32','34'] },
    { id: 5, name: 'Chaqueta de Cuero', category: 'pantalones', price: 79.99, image: 'https://picsum.photos/id/5/200/200', stock: 3, sizes: ['S','M','L'] },
    { id: 6, name: 'Zapatos Deportivos', category: 'calzado', price: 59.99, image: 'https://picsum.photos/id/6/200/200', stock: 7, sizes: ['39','40','41','42','43'] },
    { id: 7, name: 'Gorra Urbana', category: 'accesorios', price: 24.99, image: 'https://picsum.photos/id/7/200/200', stock: 12, sizes: ['Único'] },
    { id: 8, name: 'Mochila Moderna', category: 'accesorios', price: 45.00, image: 'https://picsum.photos/id/8/200/200', stock: 4, sizes: ['Único'] }
];

// ============================================================
// 2. ESTADO GLOBAL
// ============================================================
let products = [];
let cart = {};
let currentCategory = 'all';

// ============================================================
// 3. REFERENCIAS DOM
// ============================================================
const $ = id => document.getElementById(id);
const productGrid = $('productGrid');
const cartBody = $('cartBody');
const cartFooter = $('cartFooter');
const totalAmountSidebar = $('totalAmountSidebar');
const cartBadge = $('cartBadge');
const cartToggle = $('cartToggle');
const cartClose = $('cartClose');
const cartOverlay = $('cartOverlay');
const cartSidebar = $('cartSidebar');
const checkoutBtnSidebar = $('checkoutBtnSidebar');
const menuToggle = $('menuToggle');
const mainNav = $('mainNav');
const categoryFilters = $('categoryFilters');

// Admin
const adminToggle = $('adminToggle');
const adminClose = $('adminClose');
const adminOverlay = $('adminOverlay');
const adminSidebar = $('adminSidebar');
const adminProductList = $('adminProductList');
const addProductBtn = $('addProductBtn');
const adminLogout = $('adminLogout');

// Login
const loginOverlay = $('loginOverlay');
const loginPassword = $('loginPassword');
const loginBtn = $('loginBtn');
const loginError = $('loginError');

// ============================================================
// 4. LOCALSTORAGE: PRODUCTOS
// ============================================================
function loadProducts() {
    const stored = localStorage.getItem('products');
    if (stored) {
        try {
            products = JSON.parse(stored);
            // Asegurar que todos los campos existan
            products = products.map(p => ({
                ...defaultProducts.find(d => d.id === p.id) || {},
                ...p,
                sizes: p.sizes || ['S','M','L','XL']
            }));
        } catch (e) {
            products = JSON.parse(JSON.stringify(defaultProducts));
        }
    } else {
        products = JSON.parse(JSON.stringify(defaultProducts));
    }
}

function saveProducts() {
    localStorage.setItem('products', JSON.stringify(products));
}

// ============================================================
// 5. LOCALSTORAGE: CARRITO
// ============================================================
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        try { cart = JSON.parse(saved); } catch (e) { cart = {}; }
    }
}

// ============================================================
// 6. REDIMENSIONAR IMAGEN
// ============================================================
function resizeImage(file, maxWidth = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ratio = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * ratio;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ============================================================
// 7. RENDERIZAR PRODUCTOS (tienda)
// ============================================================
function renderProducts(category = 'all') {
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    productGrid.innerHTML = '';
    filtered.forEach(p => {
        const totalInCart = Object.keys(cart)
            .filter(key => key.startsWith(p.id + '-'))
            .reduce((sum, key) => sum + cart[key], 0);
        const available = p.stock - totalInCart;

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="image-wrapper" data-id="${p.id}">
                <img src="${p.image}" alt="${p.name}" loading="lazy" />
                <div class="image-overlay">Cambiar foto</div>
            </div>
            <h3>${p.name}</h3>
            <div class="price">$${p.price.toFixed(2)}</div>
            <div class="stock-info">Stock: ${available > 0 ? available : 'Agotado'}</div>
            <select class="size-selector" data-id="${p.id}">
                ${p.sizes.map(s => `<option value="${s}">Talle ${s}</option>`).join('')}
            </select>
            <button data-id="${p.id}" ${available <= 0 ? 'disabled' : ''}>
                ${available > 0 ? 'Agregar' : 'Sin stock'}
            </button>
        `;
        productGrid.appendChild(card);

        // Subir imagen (solo si está autenticado)
        if (isAdminAuthenticated()) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';
            fileInput.dataset.id = p.id;
            card.appendChild(fileInput);

            const wrapper = card.querySelector('.image-wrapper');
            wrapper.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const dataUrl = await resizeImage(file, 300);
                    const idx = products.findIndex(prod => prod.id === p.id);
                    if (idx !== -1) {
                        products[idx].image = dataUrl;
                        saveProducts();
                        const img = wrapper.querySelector('img');
                        img.src = dataUrl;
                        wrapper.style.border = '3px solid #25D366';
                        setTimeout(() => wrapper.style.border = 'none', 1500);
                        if (adminSidebar.classList.contains('open')) renderAdminProducts();
                    }
                } catch (err) {
                    alert('Error al cargar la imagen.');
                }
                fileInput.value = '';
            });
        }
    });

    // Eventos botones agregar
    document.querySelectorAll('.product-card button').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const select = btn.closest('.product-card').querySelector('.size-selector');
            addToCart(id, select.value);
        });
    });
}

// ============================================================
// 8. FUNCIONES DEL CARRITO
// ============================================================
function addToCart(productId, size) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const totalInCart = Object.keys(cart)
        .filter(key => key.startsWith(productId + '-'))
        .reduce((sum, key) => sum + cart[key], 0);
    if (totalInCart >= product.stock) {
        alert('No hay suficiente stock disponible.');
        return;
    }
    const key = `${productId}-${size}`;
    cart[key] = (cart[key] || 0) + 1;
    saveCart();
    updateCartUI();
    updateProductButtons();
}

function changeQuantity(productId, size, delta) {
    const key = `${productId}-${size}`;
    if (!cart[key]) return;
    const newQty = cart[key] + delta;
    if (newQty <= 0) {
        delete cart[key];
    } else {
        const product = products.find(p => p.id === productId);
        if (!product) return;
        const totalInCart = Object.keys(cart)
            .filter(k => k.startsWith(productId + '-'))
            .reduce((sum, k) => sum + (k === key ? newQty : cart[k]), 0);
        if (totalInCart > product.stock) {
            alert('Stock insuficiente.');
            return;
        }
        cart[key] = newQty;
    }
    saveCart();
    updateCartUI();
    updateProductButtons();
}

function removeItem(productId, size) {
    const key = `${productId}-${size}`;
    delete cart[key];
    saveCart();
    updateCartUI();
    updateProductButtons();
}

// ============================================================
// 9. ACTUALIZAR UI (carrito)
// ============================================================
function updateCartUI() {
    const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    cartBadge.textContent = totalItems;
    const hasItems = totalItems > 0;
    cartFooter.style.display = hasItems ? 'block' : 'none';
    if (!hasItems) {
        cartBody.innerHTML = `<div class="cart-empty">No hay productos en el carrito.</div>`;
        return;
    }
    let html = '';
    let totalPrice = 0;
    for (const [key, qty] of Object.entries(cart)) {
        const [idStr, size] = key.split('-');
        const id = parseInt(idStr);
        const prod = products.find(p => p.id === id);
        if (!prod) continue;
        totalPrice += prod.price * qty;
        html += `
            <div class="cart-item">
                <img src="${prod.image}" alt="${prod.name}" />
                <div class="cart-item-details">
                    <div class="name">${prod.name}</div>
                    <span class="size">${size}</span>
                    <div class="price">$${prod.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" data-id="${prod.id}" data-size="${size}" data-delta="-1">−</button>
                    <span class="qty">${qty}</span>
                    <button class="qty-btn" data-id="${prod.id}" data-size="${size}" data-delta="1">+</button>
                    <button class="remove-btn" data-id="${prod.id}" data-size="${size}">✕</button>
                </div>
            </div>
        `;
    }
    cartBody.innerHTML = html;
    totalAmountSidebar.textContent = `$${totalPrice.toFixed(2)}`;

    // Eventos
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            changeQuantity(id, btn.dataset.size, parseInt(btn.dataset.delta));
        });
    });
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            removeItem(parseInt(btn.dataset.id), btn.dataset.size);
        });
    });
}

// ============================================================
// 10. ACTUALIZAR BOTONES DE PRODUCTOS (stock)
// ============================================================
function updateProductButtons() {
    document.querySelectorAll('.product-card button').forEach(btn => {
        const id = parseInt(btn.dataset.id);
        const product = products.find(p => p.id === id);
        if (!product) return;
        const totalInCart = Object.keys(cart)
            .filter(key => key.startsWith(id + '-'))
            .reduce((sum, key) => sum + cart[key], 0);
        const available = product.stock - totalInCart;
        const stockInfo = btn.closest('.product-card').querySelector('.stock-info');
        if (stockInfo) stockInfo.textContent = `Stock: ${available > 0 ? available : 'Agotado'}`;
        btn.disabled = available <= 0;
        btn.textContent = available > 0 ? 'Agregar' : 'Sin stock';
    });
}

// ============================================================
// 11. CARRITO: ABRIR/CERRAR
// ============================================================
function openCart() {
    cartSidebar.classList.add('open');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeCart() {
    cartSidebar.classList.remove('open');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}
cartToggle.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

// ============================================================
// 12. MENÚ HAMBURGUESA
// ============================================================
menuToggle.addEventListener('click', () => mainNav.classList.toggle('open'));

// ============================================================
// 13. FILTROS DE CATEGORÍA
// ============================================================
categoryFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    renderProducts(currentCategory);
    updateProductButtons();
});

// ============================================================
// 14. ADMIN: SEGURIDAD Y SESIÓN
// ============================================================
function isAdminAuthenticated() {
    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return false;
    try {
        const data = JSON.parse(session);
        // Sesión válida por 1 hora
        return true; // (Date.now() - data.timestamp) < 3600000;
    } catch { return false; }
}

function setAdminSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ timestamp: Date.now() }));
}

function clearAdminSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ============================================================
// 15. ADMIN: LOGIN
// ============================================================
function showLoginModal() {
    loginOverlay.classList.add('active');
    loginPassword.value = '';
    loginError.classList.remove('show');
    loginPassword.focus();
}

function hideLoginModal() {
    loginOverlay.classList.remove('active');
}

loginBtn.addEventListener('click', () => {
    if (loginPassword.value === ADMIN_PASSWORD) {
        setAdminSession();
        hideLoginModal();
        openAdmin();
    } else {
        loginError.classList.add('show');
        loginPassword.value = '';
        loginPassword.focus();
    }
});

loginPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

// ============================================================
// 16. ADMIN: ABRIR/CERRAR PANEL
// ============================================================
function openAdmin() {
    if (!isAdminAuthenticated()) {
        showLoginModal();
        return;
    }
    adminSidebar.classList.add('open');
    adminOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderAdminProducts();
}

function closeAdmin() {
    adminSidebar.classList.remove('open');
    adminOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

adminToggle.addEventListener('click', openAdmin);
adminClose.addEventListener('click', closeAdmin);
adminOverlay.addEventListener('click', closeAdmin);

// Cerrar sesión
adminLogout.addEventListener('click', () => {
    clearAdminSession();
    closeAdmin();
    alert('Sesión cerrada. El acceso al panel requiere contraseña.');
});

// ============================================================
// 17. ADMIN: RENDERIZAR PRODUCTOS EN EL PANEL
// ============================================================
function renderAdminProducts() {
    adminProductList.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'admin-product-item';
        div.innerHTML = `
            <div class="admin-product-fields">
                <label>Nombre: <input type="text" class="admin-name" value="${p.name}" /></label>
                <label>Precio: <input type="number" step="0.01" class="admin-price" value="${p.price}" /></label>
                <label>Stock: <input type="number" class="admin-stock" value="${p.stock}" /></label>
                <label>Categoría: <input type="text" class="admin-category" value="${p.category}" /></label>
                <label style="grid-column:1/-1;">Talles (separados por comas):
                    <input type="text" class="admin-sizes" value="${p.sizes.join(',')}" />
                </label>
                <label style="grid-column:1/-1;">URL imagen:
                    <input type="text" class="admin-image" value="${p.image}" />
                </label>
            </div>
            <div class="admin-product-actions">
                <button class="btn-save-product" data-id="${p.id}">Guardar cambios</button>
                <button class="btn-delete-product" data-id="${p.id}">Eliminar</button>
            </div>
        `;
        adminProductList.appendChild(div);

        // Guardar cambios
        div.querySelector('.btn-save-product').addEventListener('click', () => {
            const id = parseInt(div.querySelector('.btn-save-product').dataset.id);
            const index = products.findIndex(prod => prod.id === id);
            if (index === -1) return;
            const name = div.querySelector('.admin-name').value.trim();
            const price = parseFloat(div.querySelector('.admin-price').value);
            const stock = parseInt(div.querySelector('.admin-stock').value);
            const category = div.querySelector('.admin-category').value.trim();
            const sizesStr = div.querySelector('.admin-sizes').value.trim();
            const image = div.querySelector('.admin-image').value.trim();
            if (!name || isNaN(price) || isNaN(stock) || !category || !sizesStr) {
                alert('Completa todos los campos correctamente.');
                return;
            }
            const sizes = sizesStr.split(',').map(s => s.trim()).filter(s => s);
            products[index] = { ...products[index], name, price, stock, category, sizes, image };
            saveProducts();
            renderAdminProducts();
            renderProducts(currentCategory);
            updateProductButtons();
            updateCartUI();
        });

        // Eliminar
        div.querySelector('.btn-delete-product').addEventListener('click', () => {
            const id = parseInt(div.querySelector('.btn-delete-product').dataset.id);
            if (confirm('¿Eliminar este producto?')) {
                products = products.filter(p => p.id !== id);
                saveProducts();
                renderAdminProducts();
                renderProducts(currentCategory);
                updateProductButtons();
                updateCartUI();
            }
        });
    });
}

// ============================================================
// 18. ADMIN: AGREGAR PRODUCTO
// ============================================================
addProductBtn.addEventListener('click', () => {
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newProduct = {
        id: maxId + 1,
        name: 'Nuevo Producto',
        price: 29.99,
        stock: 5,
        category: 'camisetas',
        sizes: ['S','M','L','XL'],
        image: 'https://picsum.photos/200/200?random=' + Date.now()
    };
    products.push(newProduct);
    saveProducts();
    renderAdminProducts();
    renderProducts(currentCategory);
    updateProductButtons();
});

// ============================================================
// 19. WHATSAPP
// ============================================================
function sendOrderToWhatsApp() {
    const items = Object.entries(cart);
    if (items.length === 0) {
        alert('El carrito está vacío.');
        return;
    }
    let message = 'Pedido Estilo Cool\n\n';
    let total = 0;
    for (const [key, qty] of items) {
        const [idStr, size] = key.split('-');
        const prod = products.find(p => p.id === parseInt(idStr));
        if (!prod) continue;
        total += prod.price * qty;
        message += `${prod.name} (Talle ${size}) x${qty} → $${(prod.price * qty).toFixed(2)}\n`;
    }
    message += `\nTotal: $${total.toFixed(2)}`;
    message += '\n\nGracias por tu compra!';
    const encoded = encodeURIComponent(message);
    const phone = ''; // Tu número aquí
    const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, '_blank');
}
checkoutBtnSidebar.addEventListener('click', sendOrderToWhatsApp);

// ============================================================
// 20. INICIALIZACIÓN
// ============================================================
loadProducts();
loadCart();
renderProducts('all');
updateCartUI();
updateProductButtons();

// Si la sesión admin está activa, mostrar el botón admin con estilo
//if (isAdminAuthenticated()) {
//    adminToggle.style.borderColor = '#25D366';
}
