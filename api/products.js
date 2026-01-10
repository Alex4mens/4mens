// API endpoint для получения товаров из Airtable
// Ключи берутся из переменных окружения Vercel, не из клиентского кода

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = 'Sheet1';

    if (!AIRTABLE_TOKEN || !BASE_ID) {
        console.error('Missing Airtable credentials');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        let allRecords = [];
        let offset = null;

        // Airtable возвращает максимум 100 записей за раз, нужна пагинация
        do {
            const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`);
            
            // Фильтруем только опубликованные товары
            url.searchParams.append('filterByFormula', '{Status} = "Опубликован"');
            
            if (offset) {
                url.searchParams.append('offset', offset);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Airtable error:', errorText);
                throw new Error(`Airtable API error: ${response.status}`);
            }

            const data = await response.json();
            allRecords = allRecords.concat(data.records || []);
            offset = data.offset;

        } while (offset);

        // Форматируем данные для фронтенда
        const products = allRecords.map(record => ({
            id: record.id,
            name: record.fields.Name || '',
            type: record.fields.Type || '',
            category: record.fields.Category || '',
            brand: record.fields.Brand || '',
            seller: record.fields.Seller || '',
            price: record.fields.Price || 0,
            oldPrice: record.fields.OldPrice || null,
            link: record.fields.Link || '',
            refLink: record.fields.RefLink || record.fields.Link || '',
            description: record.fields.Description || '',
            composition: record.fields.Composition || '',
            photos: record.fields.Photos ? record.fields.Photos.split(',').map(url => url.trim()) : [],
            // Fallback на первое фото для превью
            photo: record.fields.Photos ? record.fields.Photos.split(',')[0].trim() : ''
        }));

        return res.status(200).json({ 
            success: true, 
            products,
            count: products.length 
        });

    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
    }
}
