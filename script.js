// Данные таблицы
const SHEET_ID = '1oSnxa9HEbHwy9VOq0kN0hKnbKBHVBHFrrEVZXPE_q2Q';
const SHEET_NAME = 'Sheet1'; // Если в таблице лист называется иначе, поправь тут

const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

async function loadProducts() {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${SHEET_NAME}`;
    
    try {
        const response = await fetch(url);
        const text = await response.text();
        // Чистим JSON от лишнего мусора Google Sheets
        const json = JSON.parse(text.substr(47).slice(0, -2));
        const rows = json.table.rows;
        
        const grid = document.getElementById('product-grid');
        grid.innerHTML = '';

        rows.forEach(row => {
            // Маппинг колонок (A=0, B=1, C=2...)
            // Предположим: B - Имя, C - Цена, D - Старая цена, E - Фото
            const name = row.c[1]?.v || 'Товар';
            const priceNew = row.c[2]?.v || '0';
            const priceOld = row.c[3]?.v || '';
            const imgUrl = row.c[4]?.v || '';

            const card = document.createElement('div');
            card.className = 'product-card';
            card.innerHTML = `
                <img src="${imgUrl}" class="product-img" onerror="this.src='https://via.placeholder.com/300x400?text=4MENS'">
                <div class="product-info">
                    <div class="product-name">${name}</div>
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
        document.getElementById('product-grid').innerHTML = 'Ошибка загрузки данных. Проверьте доступ к таблице.';
    }
}

loadProducts();
