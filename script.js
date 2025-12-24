const AIRTABLE_TOKEN = 'pat5N4CqgXAwZElAT.b8463357d882ad2069a5f2856a0473a8ce14fe405da14e4497be9e26daa85ee0';
const BASE_ID = 'appxIrQj687aVwaEF';
const TABLE_NAME = 'Sheet1';

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

let allProducts = [];

async function loadProducts() {
    const cacheBuster = Date.now();
    const url = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?cacheBust=${cacheBuster}`;
    
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
            throw new Error('Данные не найдены');
        }
    } catch (e) {
        console.error('Ошибка:', e);
        document.getElementById('product-grid').innerHTML = `<p style="padding:20px;">Ошибка: ${e.message}</p>`;
    }
}

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

function renderProducts(filter) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    allProducts.forEach(record => {
        const f = record.fields;
        if (filter !== 'Все' && f.Category !== filter) return;

        let imgHtml = '';

        if (f.Photo && f.Photo.length > 0) {
            const originalUrl = f.Photo[0].url;
            
            // МАГИЯ ЗДЕСЬ:
            // 1. encodeURIComponent(originalUrl) - упаковывает ссылку, чтобы она не ломалась
            // 2. wsrv.nl - превращает её в обычную картинку, которую Telegram не блокирует
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&w=400&output=jpg`;
            
            // Если прокси не сработает, onerror попробует загрузить оригинал
            imgHtml = `<img src="${proxyUrl}" 
                            class="product-img" 
                            loading="lazy"
                            alt="Photo"
                            onerror="this.onerror=null; this.src='${originalUrl}';">`;
        } else {
            imgHtml = `<img src="https://via.placeholder.com/300x400?text=No+Photo" class="product-img">`;
        }

        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="img-container">
                ${imgHtml}
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

loadProducts();
