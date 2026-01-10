// API endpoint для сохранения заказов в Airtable

export default async function handler(req, res) {
    // Разрешаем CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;
    const TABLE_NAME = 'Orders';

    if (!AIRTABLE_TOKEN || !BASE_ID) {
        console.error('Missing Airtable credentials');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const orderData = req.body;

        if (!orderData || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({ error: 'No items in order' });
        }

        // Формируем данные для Airtable
        const itemsList = orderData.items.map(item => 
            `${item.name} (${item.price}₽)`
        ).join('\n');

        const linksList = orderData.items.map(item => item.refLink).join('\n');
        
        const sellersSet = new Set(orderData.items.map(item => item.seller));
        const sellersStr = Array.from(sellersSet).join(', ');

        const total = orderData.items.reduce((sum, item) => sum + (item.price || 0), 0);

        const airtableData = {
            fields: {
                "Client_Name": orderData.clientName || 'Аноним',
                "Client_Username": orderData.clientUsername || 'Скрыт',
                "Total": total,
                "Items": itemsList,
                "Links": linksList,
                "Sellers": sellersStr,
                "Status": "New"
            }
        };

        const response = await fetch(
            `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${AIRTABLE_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(airtableData)
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Airtable error:', errorText);
            throw new Error(`Airtable API error: ${response.status}`);
        }

        const result = await response.json();

        return res.status(200).json({ 
            success: true, 
            orderId: result.id 
        });

    } catch (error) {
        console.error('Error creating order:', error);
        return res.status(500).json({ error: 'Failed to create order' });
    }
}
