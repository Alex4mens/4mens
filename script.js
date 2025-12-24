const SHEET_ID = '1oSnxa9HEbHwy9VOq0kN0hKnbKBHVBHFrrEVZXPE_q2Q';
const SHEET_NAME = 'Sheet1'; 

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let allProducts = [];

async function loadProducts() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        allProducts = json.table.rows;
        
        renderCategories();
        renderProducts('Все');
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        document.getElementById('product-grid').innerHTML = 'Ошибка загрузки данных.';
    }
}

function renderCategories() {
    const categories = new Set(['Все']);
    allProducts.forEach(row => {
        const cat = row.c[0]?.v; // Берем категорию из столбца A
        if (cat) categories.add(cat);
    });

    const nav = document.getElementById('categories');
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

function renderProducts(filter) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    allProducts.forEach(row => {
        const cat = row.c[0]?.v || 'Без категории';
        if (filter !== 'Все' && cat !== filter) return;

        const seller = row.c[1]?.v || '';    
        const brand = row.c[2]?.v || '';     
        const name = row.c[3]?.v || '';      
        const priceNew = row.c[4]?.v || '';  
        const priceOld = row.c[5]?.v || null; 
        const link = row.c[8]?.v || '#'; 
        
        const photoValue = row.c[6]?.v ? String(row.c[6].v) : '';
        const firstPhotoId = photoValue.split(',')[0].trim();
        
        // Попытка забрать фото. Если по-прежнему 404, мы сменим стратегию на след. шаге
        const imgUrl = firstPhotoId ? `photos/${firstPhotoId}.jpg` : 'https://via.placeholder.com/300x400?text=4MENS';

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="img-container">
                <img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x400?text=Загрузка+фото...';">
            </div>
            <div class="product-info">
                <div class="product-brand">${brand}</div>
                <div class="product-name">${name}</div>
                <div class="product-seller">Продавец: ${seller}</div>
                <div class="price-row">
                    <span class="price-new">${priceNew} ₽</span>
                    ${priceOld ? `<span class="price-old">${priceOld} ₽</span>` : ''}
                </div>
                <button class="buy-btn" onclick="tg.openLink('${link}')">Купить</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

loadProducts();
