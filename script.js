const SHEET_ID = '1oSnxa9HEbHwy9VOq0kN0hKnbKBHVBHFrrEVZXPE_q2Q';
const SHEET_NAME = 'Sheet1'; 

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

async function loadProducts() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;
        
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '';

        rows.forEach(row => {
            const seller = row.c[1]?.v || '';    
            const brand = row.c[2]?.v || '';     
            const name = row.c[3]?.v || '';      
            const priceNew = row.c[4]?.v || '';  
            const priceOld = row.c[5]?.v || null; 
            
            const photoValue = row.c[6]?.v ? String(row.c[6].v) : '';
            const firstPhotoId = photoValue.split(',')[0].trim();
            
            // Прямой путь к фото, раз мы знаем, что расширения маленькие
            const imgUrl = firstPhotoId ? `photos/${firstPhotoId}.jpg` : 'https://via.placeholder.com/300x400?text=4MENS';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x400?text=Ошибка+фото'">
                <div class="product-info">
                    <div class="product-brand">${brand}</div>
                    <div class="product-name">${name}</div>
                    <div class="product-seller">Продавец: ${seller}</div>
                    <div class="product-prices">
                        <span class="price-new">${priceNew} ₽</span>
                        ${priceOld ? `<span class="price-old">${priceOld} ₽</span>` : ''}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        console.error('Ошибка:', e);
    }
}

loadProducts();
