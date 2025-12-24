const AIRTABLE_TOKEN = 'pat5N4CqgXAwZElAT.b8463357d882ad2069a5f2856a0473a8ce14fe405da14e4497be9e26daa85ee0';
const BASE_ID = 'appxIrQj687aVwaEF';
const TABLE_NAME = 'Sheet1';

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let allProducts = [];

// Эта функция загружает данные из твоей таблицы Airtable
async function loadProducts() {
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_TOKEN}` }
        });
        const data = await response.json();
        
        if (data.records) {
            allProducts = data.records;
            renderCategories();
            renderProducts('Все');
        } else {
            throw new Error('Данные не найдены в Airtable');
        }
    } catch (e) {
        console.error('Ошибка:', e);
        document.getElementById('product-grid').innerHTML = `<p style="padding:20px;">Ошибка загрузки. Проверьте связь с базой.</p>`;
    }
}

// Эта функция создает кнопки категорий (Куртки/Пуховики и т.д.)
function renderCategories() {
    const categories = new Set(['Все']);
    allProducts.forEach(record => {
        const cat = record.fields.Category;
        if (cat) categories.add(cat);
    });

    const nav = document.getElementById('categories');
    if (!nav) return;
    
    nav.innerHTML = '';
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.innerText = cat;
        btn.onclick = () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(cat);
        };
        nav.appendChild(btn);
    });
    if (nav.firstChild) nav.firstChild.classList.add('active');
}

// Эта функция рисует карточки товаров
function renderProducts(filter) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    allProducts.forEach(record => {
        const f = record.fields;
        
        // Фильтр по категориям
        if (filter !== 'Все' && f.Category !== filter) return;

        // Получаем ссылку на фото (ищем в полях Photo или photo)
        const photoField = f.Photo || f.photo || f.Image;
        const imgUrl = (photoField && photoField.length > 0) 
            ? photoField[0].url 
            : 'https://via.placeholder.com/300x400?text=Нет+фото';

        const card = document.createElement('div');
        card.className = 'product-card';
        
        // В коде ниже мы добавили referrerpolicy="no-referrer", 
        // чтобы телефоны не блокировали картинки из Airtable
        card.innerHTML = `
            <div class="img-container">
                <img src="${imgUrl}" 
                     class="product-img" 
                     alt="Product" 
                     referrerpolicy="no-referrer"
                     onerror="this.src='https://via.placeholder.com/300x400?text=Ошибка+загрузки';">
            </div>
            <div class="product-info">
                <div class="product-brand">${f.Brand || ''}</div>
                <div class="product-name">${f.Name || ''}</div>
                <div class="product-seller">Продавец: ${f.Seller || ''}</div>
                <div class="price-row">
                    <span class="price-new">${f.Price ? f.Price.toLocaleString() : 0} ₽</span>
                    ${f.OldPrice ? `<span class="price-old">${f.OldPrice.toLocaleString()} ₽</span>` : ''}
                </div>
                <button class="buy-btn" onclick="tg.openLink('${f.Link || '#'}')">Купить</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Запускаем процесс загрузки
loadProducts();
