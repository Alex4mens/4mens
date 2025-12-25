const AIRTABLE_TOKEN = 'pat5N4CqgXAwZElAT.b8463357d882ad2069a5f2856a0473a8ce14fe405da14e4497be9e26daa85ee0';
const BASE_ID = 'appxIrQj687aVwaEF';
const CATALOG_TABLE = 'Sheet1';
const ORDERS_TABLE = 'Orders';

const tg = window.Telegram.WebApp;
tg.expand();

let cart = {}; 
let allProducts = [];
let currentType = null; // Запоминаем, в каком мы разделе (Одежда/Обувь)

tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#000000';

// Умная кнопка НАЗАД
tg.BackButton.onClick(() => { 
    if (document.getElementById('cart-view').style.display !== 'none') {
        // Если мы в корзине -> идем в каталог
        showCatalog(currentType);
    } else if (document.getElementById('catalog-view').style.display !== 'none') {
        // Если мы в каталоге -> идем на главную
        showHome();
    }
});

async function loadProducts() {
    // Грузим товары сразу при старте, но показываем Главную
    const cacheBuster = Date.now();
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(CATALOG_TABLE)}?cacheBust=${cacheBuster}`;
    
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
        const data = await response.json();
        if (data.records) {
            allProducts = data.records;
            // Товары загружены, пользователь на Главной и готов кликать
        }
    } catch (e) {
        console.error(e);
    }
}

// 1. ОТКРЫТИЕ ГЛАВНОЙ
function showHome() {
    document.getElementById('home-view').style.display = 'flex';
    document.getElementById('catalog-view').style.display = 'none';
    document.getElementById('cart-view').style.display = 'none';
    tg.BackButton.hide();
    updateMainButton(); // Скрываем кнопку заказа на главной
}

// 2. ОТКРЫТИЕ РАЗДЕЛА (Одежда, Обувь...)
window.openCategoryType = function(typeName) {
    currentType = typeName; // Запоминаем выбор
    
    // Фильтруем товары только этого типа
    const filteredProducts = allProducts.filter(p => p.fields.Type === typeName);

    if (filteredProducts.length === 0) {
        tg.showAlert(`Раздел "${typeName}" пока пуст. Скоро здесь появится много всего хорошего!`);
        return;
    }

    // Если товары есть - переходим в каталог
    showCatalog(typeName);
}

// 3. ПОКАЗ КАТАЛОГА
function showCatalog(typeName) {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('catalog-view').style.display = 'block';
    
    document.getElementById('catalog-title').innerText = typeName; // Меняем заголовок
    tg.BackButton.show();

    // Рендерим подкатегории (чипсы) только для этого типа
    renderSubCategories(typeName);
    // Показываем товары
    renderProducts(typeName, 'Все');
    updateMainButton();
}

// Рендер кнопок подкатегорий
function renderSubCategories(typeName) {
    const nav = document.getElementById('categories');
    nav.innerHTML = '';

    // Собираем уникальные подкатегории (Category) только из товаров выбранного Type
    const subCategories = new Set(['Все']);
    allProducts.forEach(r => { 
        if (r.fields.Type === typeName && r.fields.Category) {
            subCategories.add(r.fields.Category); 
        }
    });

    subCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.innerText = cat;
        if (cat === 'Все') btn.classList.add('active'); 
        
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(typeName, cat); // Фильтруем и по типу, и по подкатегории
        };
        nav.appendChild(btn);
    });
}

// Рендер товаров
function renderProducts(typeName, subCategoryFilter) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    const productsToShow = allProducts.filter(r => {
        const f = r.fields;
        // Главный фильтр: Тип должен совпадать
        if (f.Type !== typeName) return false;
        // Вторичный фильтр: Подкатегория (если не "Все")
        if (subCategoryFilter !== 'Все' && f.Category !== subCategoryFilter) return false;
        return true;
    });

    if (productsToShow.length === 0) {
        grid.innerHTML = '<p style="padding:40px; text-align:center; grid-column: 1/-1; color:#999;">В этой категории пока пусто</p>';
        return;
    }

    productsToShow.forEach(record => {
        const f = record.fields;
        const id = record.id;
        
        let imgUrl = f.Photo_Link ? f.Photo_Link : 'https://via.placeholder.com/300x400?text=Нет+фото';
        const oldPriceHtml = f.OldPrice ? `<span class="price-old">${f.OldPrice.toLocaleString()} ₽</span>` : '';

        const card = document.createElement('div');
        card.className = 'product-card';
        
        const isAdded = cart[id] ? true : false;
        const btnText = isAdded ? 'Добавлено' : 'В корзину';
        const btnClass = isAdded ? 'buy-btn added' : 'buy-btn';

        card.innerHTML = `
            <div class="img-container">
                <img data-src="${imgUrl}" class="product-img lazy-load" referrerpolicy="no-referrer">
            </div>
            <div class="product-info">
                <div class="product-brand">${f.Brand || ''}</div>
                <div class="product-name">${f.Name || ''}</div>
                <div class="product-seller">${f.Seller || ''}</div>
                <div class="price-row">
                    <span class="price-new">${f.Price ? f.Price.toLocaleString() : 0} ₽</span>
                    ${oldPriceHtml}
                </div>
                <button class="${btnClass}" id="btn-${id}" onclick="toggleCart('${id}')">
                    ${btnText}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    observeImages();
}

function observeImages() {
    const images = document.querySelectorAll('img.lazy-load');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src; 
                img.onload = () => img.classList.add('loaded');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: "50px" });
    images.forEach(img => observer.observe(img));
}

window.toggleCart = function(id) {
    const btn = document.getElementById(`btn-${id}`);
    const product = allProducts.find(p => p.id === id);

    if (cart[id]) {
        delete cart[id];
        if (btn) { btn.innerText = 'В корзину'; btn.classList.remove('added'); }
    } else {
        cart[id] = product;
        if (btn) { btn.innerText = 'Добавлено'; btn.classList.add('added'); }
    }
    updateMainButton();
}

function updateMainButton() {
    const count = Object.keys(cart).length;
    // Кнопку показываем только в каталоге или корзине (не на главной)
    const isHome = document.getElementById('home-view').style.display !== 'none';
    const isCartView = document.getElementById('cart-view').style.display !== 'none';

    if (count > 0 && !isHome) {
        tg.MainButton.show();
        if (isCartView) {
            tg.MainButton.setText('ПОДТВЕРДИТЬ ЗАКАЗ');
            tg.MainButton.color = '#2ea043';
        } else {
            tg.MainButton.setText(`ОФОРМИТЬ ЗАКАЗ (${count})`);
            tg.MainButton.color = '#000000';
        }
    } else {
        tg.MainButton.hide();
    }
}

function showCart() {
    document.getElementById('catalog-view').style.display = 'none';
    document.getElementById('cart-view').style.display = 'block';
    tg.BackButton.show();
    renderCartItems(false);
    updateMainButton();
}

function renderCartItems(showLinks = false) {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let totalPrice = 0;

    Object.values(cart).forEach(item => {
        const f = item.fields;
        const id = item.id;
        let imgUrl = f.Photo_Link ? f.Photo_Link : 'https://via.placeholder.com/100';
        const price = f.Price || 0;
        totalPrice += price;
        const sellerName = f.Seller || 'магазин';
        
        const buyBtnStyle = showLinks ? 'display: block;' : 'display: none;';
        const deleteBtnStyle = showLinks ? 'display: none;' : 'display: block;';

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-main-row">
                <div class="cart-img-wrap">
                    <img src="${imgUrl}" class="cart-img" referrerpolicy="no-referrer">
                </div>
                <div class="cart-info">
                    <div class="cart-name">${f.Name}</div>
                    <div class="cart-price">${price.toLocaleString()} ₽</div>
                </div>
            </div>
            <div class="cart-actions">
                <button class="cart-link-btn" style="${buyBtnStyle}" onclick="tg.openLink('${f.Link}')">
                    Купить на ${sellerName}
                </button>
                <button class="cart-delete" style="${deleteBtnStyle}" onclick="removeFromCartInView('${id}')">Удалить</button>
            </div>
        `;
        container.appendChild(el);
    });

    document.getElementById('total-price').innerText = totalPrice.toLocaleString() + ' ₽';
}

window.removeFromCartInView = function(id) {
    delete cart[id];
    if (Object.keys(cart).length === 0) {
        // Если корзина пуста, возвращаемся в текущий каталог
        showCatalog(currentType);
    } else { 
        renderCartItems(false); 
        updateMainButton(); 
    }
}

async function sendOrderToAirtable() {
    tg.MainButton.showProgress();
    const user = tg.initDataUnsafe.user || {};
    const username = user.username ? `@${user.username}` : 'Скрыт';
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Аноним';

    const itemsList = Object.values(cart).map(i => `${i.fields.Name} (${i.fields.Price}р)`).join('\n');
    const linksList = Object.values(cart).map(i => i.fields.Link).join('\n');
    const total = Object.values(cart).reduce((sum, i) => sum + (i.fields.Price || 0), 0);

    const orderData = {
        fields: {
            "Client_Name": name,
            "Client_Username": username,
            "Total": total,
            "Items": itemsList,
            "Links": linksList,
            "Status": "New"
        }
    };

    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${ORDERS_TABLE}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            tg.MainButton.hideProgress();
            tg.showAlert('Заказ зафиксирован! Перейдите в магазины по кнопкам.');
            renderCartItems(true);
            tg.MainButton.setText('НА ГЛАВНУЮ');
            tg.MainButton.color = '#000000';
            tg.MainButton.onClick(() => { window.location.reload(); });
        } else {
            throw new Error('Ошибка Airtable');
        }
    } catch (e) {
        tg.MainButton.hideProgress();
        tg.showAlert(`Ошибка: ${e.message}`);
    }
}

tg.MainButton.onClick(function() {
    if (tg.MainButton.text === 'НА ГЛАВНУЮ') { window.location.reload(); return; }
    const isCartView = document.getElementById('cart-view').style.display !== 'none';
    if (isCartView) { sendOrderToAirtable(); } else { showCart(); }
});

showHome(); // Стартуем с главной
loadProducts();
