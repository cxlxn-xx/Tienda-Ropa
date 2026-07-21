// ============================================================
// 1. DATOS DE PRODUCTOS (por defecto con categorías)
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
// 2. CARGAR PRODUCTOS DESDE LOCALSTORAGE
// ============================================================
let products = [];
let currentCategory = 'all';

function loadProducts() {
    const stored = localStorage.getItem('products');
    if (stored) {
        try {
            products = JSON.parse(stored);
            products = products.map(p => ({
                ...p,
                image: p.image || defaultProducts.find(d => d.id === p.id)?.image || ''
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
// 3. ESTADO DEL CARRITO
// ============================================================
let cart = {};

// ============================================================
// 4. REFERENCIAS DOM
// ============================================================
const productGrid = document.getElementById('productGrid');
const cartBody = document.getElementById('cartBody');
const cartFooter = document.getElementById('cartFooter');
const totalAmountSidebar = document.getElementById('totalAmountSidebar');
const cartBadge = document.getElementById('cartBadge');
const cartToggle = document.getElementById('cartToggle');
const cartClose = document.getElementById('cartClose');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const checkoutBtnSidebar = document.getElementById('checkoutBtnSidebar');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const categoryFilters = document.getElementById('categoryFilters');

// Admin
const adminToggle = document.getElementById('adminToggle');
const adminClose = document.getElementById('adminClose');
const adminOverlay = document.getElementById('adminOverlay');
const adminSidebar = document.getElementById('adminSidebar');
const adminProductList = document.getElementById('adminProductList');
const addProductBtn = document.getElementById('addProductBtn');

// ============================================================
// 5. LOCALSTORAGE CARRITO
// ============================================================
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

// ============================================================
// 6. REDIMENSIONAR IMAGEN
// ============================================================
function resizeImage(file, maxWidth = 300) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
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
// 7. RENDERIZAR CATÁLOGO (con filtro)
// ============================================================
function renderProducts(category = 'all') {
    const filtered = category === 'all' ? products : products.filter(p => p.category === category);
    productGrid.innerHTML = '';
    filtered.forEach((p) => {
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

        // Subir imagen
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        fileInput.dataset.id = p.id;
        card.appendChild(fileInput);

        const wrapper = card.querySelector('.image-wrapper');
        wrapper.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const dataUrl = await resizeImage(file, 300);
                const productIndex = products.findIndex(prod => prod.id === parseInt(fileInput.dataset.id));
                if (productIndex !== -1) {
                    products[productIndex].image = dataUrl;
                    saveProducts();
                    const img = wrapper.querySelector('img');
                    img.src = dataUrl;
                    wrapper.style.border = '3px solid #25D366';
                    setTimeout(() => {
                        wrapper.style.border = 'none';
                    }, 1500);
                    // Actualizar admin si está abierto
                    if (adminSidebar.classList.contains('open')) {
                        renderAdminProducts();
                    }
                }
            } catch (err) {
                alert('Error al cargar la imagen.');
                console.error(err);
            }
            fileInput.value = '';
        });
    });

    document.querySelectorAll('.product-card button').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const card = btn.closest('.product-card');
            const select = card.querySelector('.size-selector');
            const size = select.value;
            addToCart(id, size);
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
// 9. ACTUALIZAR UI
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
        const subtotal = prod.price * qty;
        totalPrice += subtotal;
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
    document.querySelectorAll('.qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const size = btn.dataset.size;
            const delta = parseInt(btn.dataset.delta);
            changeQuantity(id, size, delta);
        });
    });
    document.querySelectorAll('.remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const size = btn.dataset.size;
            removeItem(id, size);
        });
    });
}

// ============================================================
// 10. ACTUALIZAR BOTONES DE PRODUCTOS
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
        if (stockInfo) {
            stockInfo.textContent = `Stock: ${available > 0 ? available : 'Agotado'}`;
        }
        if (available <= 0) {
            btn.disabled = true;
            btn.textContent = 'Sin stock';
        } else {
            btn.disabled = false;
            btn.textContent = 'Agregar';
        }
    });
}

// ============================================================
// 11. ABRIR / CERRAR CARRITO
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
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
});

// ============================================================
// 12. MENÚ HAMBURGUESA
// ============================================================
menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('open');
});

// ============================================================
// 13. FILTROS DE CATEGORÍA
// ============================================================
categoryFilters.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const category = btn.dataset.category;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = category;
    renderProducts(category);
    updateProductButtons();
});

// ============================================================
// 14. ADMIN: ABRIR / CERRAR
// ============================================================
function openAdmin() {
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

// ============================================================
// 15. ADMIN: RENDERIZAR PRODUCTOS EN EL PANEL
// ============================================================
function renderAdminProducts() {
    adminProductList.innerHTML = '';
    products.forEach(p => {
        const div = document.createElement('div');
        div.className = 'admin-product-item';
        div.innerHTML = `
            <div class="admin-product-fields">
                <label>Nombre:
                    <input type="text" class="admin-name" value="${p.name}" />
                </label>
                <label>Precio:
                    <input type="number" step="0.01" class="admin-price" value="${p.price}" />
                </label>
                <label>Stock:
                    <input type="number" class="admin-stock" value="${p.stock}" />
                </label>
                <label>Categoría:
                    <input type="text" class="admin-category" value="${p.category}" />
                </label>
                <label style="grid-column: 1 / -1;">Talles (separados por comas):
                    <input type="text" class="admin-sizes" value="${p.sizes.join(',')}" />
                </label>
                <label style="grid-column: 1 / -1;">URL de imagen:
                    <input type="text" class="admin-image" value="${p.image}" />
                </label>
            </div>
            <div class="admin-product-actions">
                <button class="btn-save-product" data-id="${p.id}">Guardar cambios</button>
                <button class="btn-delete-product" data-id="${p.id}">Eliminar</button>
            </div>
        `;
        adminProductList.appendChild(div);

        // Evento guardar
        const saveBtn = div.querySelector('.btn-save-product');
        saveBtn.addEventListener('click', () => {
            const id = parseInt(saveBtn.dataset.id);
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
            renderAdminProducts(); // refresca el panel
            renderProducts(currentCategory);
            updateProductButtons();
            updateCartUI(); // por si cambió el precio
        });

        // Evento eliminar
        const deleteBtn = div.querySelector('.btn-delete-product');
        deleteBtn.addEventListener('click', () => {
            const id = parseInt(deleteBtn.dataset.id);
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
// 16. ADMIN: AGREGAR PRODUCTO
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
// 17. WHATSAPP
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
        const id = parseInt(idStr);
        const prod = products.find(p => p.id === id);
        if (!prod) continue;
        const subtotal = prod.price * qty;
        total += subtotal;
        message += `${prod.name} (Talle ${size}) x${qty} → $${subtotal.toFixed(2)}\n`;
    }
    message += `\nTotal: $${total.toFixed(2)}`;
    message += '\n\nGracias por tu compra!';
    const encodedMessage = encodeURIComponent(message);
    const phoneNumber = ''; // <-- PON AQUÍ TU NÚMERO
    const url = phoneNumber
        ? `https://wa.me/${phoneNumber}?text=${encodedMessage}`
        : `https://api.whatsapp.com/send?text=${encodedMessage}`;
    window.open(url, '_blank');
}
checkoutBtnSidebar.addEventListener('click', sendOrderToWhatsApp);

// ============================================================
// 18. INICIALIZACIÓN
// ============================================================
loadProducts();
loadCart();
renderProducts('all');
updateCartUI();
updateProductButtons();
