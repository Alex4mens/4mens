const AIRTABLE_TOKEN = 'pat5N4CqgXAwZElAT.b8463357d882ad2069a5f2856a0473a8ce14fe405da14e4497be9e26daa85ee0';
const BASE_ID = 'appxIrQj687aVwaEF';
const TABLE_NAME = 'Sheet1';

const tg = window.Telegram.WebApp;
tg.expand();

// Инициализация корзины
let cart = {}; // Храним товары в формате { "id_товара": {данные} }
let allProducts = [];

// Настраиваем Главную Кнопку Telegram (синяя внизу)
tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#000000'; // Черный цвет под стиль бренда

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
        document.getElementById('product-grid').innerHTML = '<p style="padding:20px; text-align:center">Ошибка связи</p>';
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
        if (cat === 'Все') btn.classList.add('active'); // По умолчанию активна "Все"
        
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
        const id = record.id; // Уникальный ID строки из Airtable
        
        if (filter !== 'Все' && f.Category !== filter) return;

        // Фото: берем прямую ссылку (твои сжатые фото)
        let imgUrl = 'https://via.placeholder.com/300x400?text=No+Img';
        if (f.Photo && f.Photo.length > 0) {
            // Если есть миниатюра - берем её, если нет - оригинал
            imgUrl = f.Photo[0].thumbnails?.large?.url || f.Photo[0].url;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Проверяем, есть ли уже этот товар в корзине, чтобы покрасить кнопку
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

// Функция добавления/удаления из корзины
window.toggleCart = function(id) {
    const btn = document.getElementById(`btn-${id}`);
    const product = allProducts.find(p => p.id === id);

    if (cart[id]) {
        // Если товар уже в корзине -> удаляем
        delete cart[id];
        btn.innerText = 'В корзину';
        btn.classList.remove('added');
    } else {
        // Если товара нет -> добавляем
        cart[id] = product;
        btn.innerText = 'Добавлено';
        btn.classList.add('added');
    }

    updateMainButton();
}

// Обновление главной кнопки Telegram
function updateMainButton() {
    const count = Object.keys(cart).length;
    
    if (count > 0) {
        tg.MainButton.setText(`ОФОРМИТЬ ЗАКАЗ (${count})`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// Обработка нажатия на главную кнопку
tg.MainButton.onClick(function() {
    // Пока просто выводим алерт, следующий шаг - экран заказа
    tg.showAlert(`Выбрано товаров: ${Object.keys(cart).length}. Переход к оформлению...`);
});

loadProducts();
