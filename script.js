const AIRTABLE_TOKEN = 'pat5N4CqgXAwZElAT.b8463357d882ad2069a5f2856a0473a8ce14fe405da14e4497be9e26daa85ee0';
const BASE_ID = 'appxIrQj687aVwaEF';
const TABLE_NAME = 'Sheet1';

const tg = window.Telegram.WebApp;
tg.expand();

let cart = {}; 
let allProducts = [];

// Настройки главной кнопки
tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#000000';

// Обработка кнопки "Назад" (системная стрелочка Telegram)
tg.BackButton.onClick(() => {
    showCatalog();
});

async function loadProducts() {
    const cacheBuster = Date.now();
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?cacheBust=${cacheBuster}`;
    
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` } });
        const data = await response.json();
        
        if (data.records) {
            allProducts = data.records;
            renderCategories();
            renderProducts('Все');
        } else {
            document.getElementById('product-grid').innerHTML = '<p style="padding:20px; text-align:center">Каталог пуст</p>';
        }
    } catch (e) {
        console.error(e);
    }
}

function renderCategories() {
    const categories = new Set(['Все']);
    allProducts.forEach(r => { if (r.fields.Category) categories.add(r.fields.Category); });

    const nav = document.getElementById('categories');
    if (!nav) return;
    nav.innerHTML = '';
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.innerText = cat;
        if (cat === 'Все') btn.classList.add('active'); 
        
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(cat);
        };
        nav.appendChild(btn);
    });
}

function renderProducts(filter) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    allProducts.forEach(record => {
        const f = record.fields;
        const id = record.id;
        
        if (filter !== 'Все' && f.Category !== filter) return;

        let imgUrl = 'https://via.placeholder.com/300x400?text=No+Img';
        if (f.Photo && f.Photo.length > 0) {
            imgUrl = f.Photo[0].thumbnails?.large?.url || f.Photo[0].url;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        
        const isAdded = cart[id] ? true : false;
        const btnText = isAdded ? 'Добавлено' : 'В корзину';
        const btnClass = isAdded ? 'buy-btn added' : 'buy-btn';

        card.innerHTML = `
            <div class="img-container">
                <img src="${imgUrl}" class="product-img" loading="lazy" referrerpolicy="no-referrer">
            </div>
            <div class="product-info">
                <div class="product-brand">${f.Brand || ''}</div>
                <div class="product-name">${f.Name || ''}</div>
                <div class="product-seller">${f.Seller || ''}</div>
                <div class="price-row">
                    <span class="price-new">${f.Price ? f.Price.toLocaleString() : 0} ₽</span>
                </div>
                <button class="${btnClass}" id="btn-${id}" onclick="toggleCart('${id}')">
                    ${btnText}
                </button>
            </div>
        `;
        grid.appendChild(card);
    });
}

window.toggleCart = function(id) {
    const btn = document.getElementById(`btn-${id}`);
    const product = allProducts.find(p => p.id === id);

    if (cart[id]) {
        delete cart[id];
        if (btn) {
            btn.innerText = 'В корзину';
            btn.classList.remove('added');
        }
    } else {
        cart[id] = product;
        if (btn) {
            btn.innerText = 'Добавлено';
            btn.classList.add('added');
        }
    }
    updateMainButton();
}

function updateMainButton() {
    const count = Object.keys(cart).length;
    
    // Если мы сейчас в Корзине - кнопка называется "Отправить"
    // Если мы в Каталоге - кнопка называется "Оформить (N)"
    const isCartView = document.getElementById('cart-view').style.display !== 'none';

    if (count > 0) {
        tg.MainButton.show();
        if (isCartView) {
            tg.MainButton.setText('ОТПРАВИТЬ ЗАКАЗ');
            tg.MainButton.color = '#2ea043'; // Зеленая для отправки
        } else {
            tg.MainButton.setText(`ОФОРМИТЬ ЗАКАЗ (${count})`);
            tg.MainButton.color = '#000000';
        }
    } else {
        tg.MainButton.hide();
    }
}

// ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ
function showCart() {
    document.getElementById('product-grid').style.display = 'none';
    document.getElementById('categories-nav').style.display = 'none'; // Скрываем категории
    document.getElementById('cart-view').style.display = 'block';
    
    // Включаем кнопку "Назад"
    tg.BackButton.show();
    
    renderCartItems();
    updateMainButton();
}

function showCatalog() {
    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('product-grid').style.display = 'grid';
    document.getElementById('categories-nav').style.display = 'block';
    
    // Выключаем кнопку "Назад"
    tg.BackButton.hide();
    
    updateMainButton();
}

// Отрисовка товаров ВНУТРИ корзины
function renderCartItems() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    
    let totalPrice = 0;

    Object.values(cart).forEach(item => {
        const f = item.fields;
        const id = item.id;
        
        let imgUrl = 'https://via.placeholder.com/100';
        if (f.Photo && f.Photo.length > 0) {
            imgUrl = f.Photo[0].thumbnails?.small?.url || f.Photo[0].url; // Берем маленькую картинку
        }

        const price = f.Price || 0;
        totalPrice += price;

        const el = document.createElement('div');
        el.className = 'cart-item';
        el.innerHTML = `
            <div class="cart-img-wrap">
                <img src="${imgUrl}" class="cart-img" referrerpolicy="no-referrer">
            </div>
            <div class="cart-info">
                <div class="cart-name">${f.Name}</div>
                <div class="cart-price">${price.toLocaleString()} ₽</div>
            </div>
            <button class="cart-delete" onclick="removeFromCartInView('${id}')">Удалить</button>
        `;
        container.appendChild(el);
    });

    document.getElementById('total-price').innerText = totalPrice.toLocaleString() + ' ₽';
}

// Удаление товара прямо из экрана корзины
window.removeFromCartInView = function(id) {
    delete cart[id];
    
    // Если удалили всё - возвращаем в каталог
    if (Object.keys(cart).length === 0) {
        showCatalog();
    } else {
        renderCartItems(); // Перерисовываем список
        updateMainButton();
    }
}

// ОБРАБОТКА НАЖАТИЯ ГЛАВНОЙ КНОПКИ
tg.MainButton.onClick(function() {
    const isCartView = document.getElementById('cart-view').style.display !== 'none';

    if (isCartView) {
        // ЭТО ФИНАЛ: Тут мы позже отправим данные боту
        tg.showAlert('Заказ сформирован! (Это демо)');
    } else {
        // Переходим в корзину
        showCart();
    }
});

loadProducts();
