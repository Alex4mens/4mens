// ========================================
// 4MENS - Main Script v2
// ========================================

// --- ИНИЦИАЛИЗАЦИЯ TELEGRAM ---
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Цвета кнопок
tg.MainButton.textColor = '#FFFFFF';
tg.MainButton.color = '#1d1d1f';

// --- СОСТОЯНИЕ ПРИЛОЖЕНИЯ ---
let allProducts = [];
let filteredProducts = [];
let cart = {};
let favorites = {};
let currentType = null;
let currentCategory = 'Все';
let currentProductId = null;
let currentSlide = 1;
let previousView = 'home';
let isProductsLoaded = false;

// Слайдер
let sliderCurrentIndex = 0;
let sliderPhotos = [];
let touchStartX = 0;
let touchEndX = 0;

// Фильтры
let activeFilters = {
    categories: [],
    priceMin: null,
    priceMax: null,
    brands: [],
    sellers: []
};

// --- ЗАГРУЗКА ДАННЫХ ---
async function loadProducts() {
    try {
        setLoadingState(true);
        
        const response = await fetch('/api/products');
        const data = await response.json();
        
        if (data.success && data.products) {
            allProducts = data.products;
            isProductsLoaded = true;
            console.log('Товары загружены:', allProducts.length);
        } else {
            throw new Error(data.error || 'Ошибка загрузки');
        }
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        tg.showAlert('Не удалось загрузить товары. Попробуйте позже.');
    } finally {
        setLoadingState(false);
    }
}

// Управление состоянием загрузки на главной странице
function setLoadingState(isLoading) {
    const menuCards = document.querySelectorAll('.menu-card[data-type]');
    
    menuCards.forEach(card => {
        if (isLoading) {
            card.classList.add('loading');
            card.style.pointerEvents = 'none';
        } else {
            card.classList.remove('loading');
            card.style.pointerEvents = 'auto';
        }
    });
    
    const loadingIndicator = document.getElementById('home-loading');
    if (loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
    }
}

function showLoading(show) {
    const grid = document.getElementById('product-grid');
    if (grid && show) {
        grid.innerHTML = '<div class="loading-spinner">Загрузка...</div>';
    }
}

// --- ОНБОРДИНГ ---
function checkOnboarding() {
    const seen = localStorage.getItem('4mens_onboarding_v2');
    if (!seen) {
        document.getElementById('onboarding-overlay').classList.add('active');
    }
}

function nextSlide() {
    if (currentSlide < 3) {
        document.getElementById(`slide-${currentSlide}`).classList.remove('active');
        document.getElementById(`dot-${currentSlide}`).classList.remove('active');
        currentSlide++;
        document.getElementById(`slide-${currentSlide}`).classList.add('active');
        document.getElementById(`dot-${currentSlide}`).classList.add('active');

        if (currentSlide === 3) {
            document.getElementById('next-btn').innerText = 'Начать';
        }
    } else {
        finishOnboarding();
    }
}

function finishOnboarding() {
    document.getElementById('onboarding-overlay').classList.remove('active');
    localStorage.setItem('4mens_onboarding_v2', 'true');
}

// --- НАВИГАЦИЯ ---
function showView(viewId) {
    const views = ['home-view', 'catalog-view', 'product-view', 'favorites-view', 'cart-view', 'order-confirmed-view'];
    views.forEach(id => {
        document.getElementById(id).style.display = id === viewId ? 'block' : 'none';
    });
    
    if (viewId === 'home-view') {
        tg.BackButton.hide();
    } else {
        tg.BackButton.show();
    }
    
    updateMainButton();
    updateBadges();
}

function showHome() {
    previousView = 'home';
    showView('home-view');
}

function showCatalog(typeName) {
    if (!isProductsLoaded) {
        tg.showAlert('Подождите, товары загружаются...');
        return;
    }
    
    currentType = typeName;
    currentCategory = 'Все';
    previousView = 'catalog';
    
    // Сбрасываем фильтры при входе в новую категорию
    activeFilters = {
        categories: [],
        priceMin: null,
        priceMax: null,
        brands: [],
        sellers: []
    };
    
    document.getElementById('catalog-title').innerText = typeName;
    
    // Закрываем панель фильтров если была открыта
    const panel = document.getElementById('filters-panel');
    const btn = document.getElementById('filters-toggle-btn');
    if (panel) panel.style.display = 'none';
    if (btn) btn.classList.remove('active');
    
    renderSubCategories();
    applyFilters();
    renderProducts();
    showView('catalog-view');
}

function showProduct(productId) {
    currentProductId = productId;
    const product = allProducts.find(p => p.id === productId);
    
    if (!product) {
        tg.showAlert('Товар не найден');
        return;
    }
    
    renderProductDetails(product);
    showView('product-view');
}

function showFavorites() {
    previousView = 'favorites';
    renderFavorites();
    showView('favorites-view');
}

function showCart() {
    previousView = 'cart';
    renderCart();
    showView('cart-view');
}

function goBack() {
    const currentView = getCurrentView();
    
    switch (currentView) {
        case 'product-view':
            if (previousView === 'favorites') {
                showFavorites();
            } else if (previousView === 'cart') {
                showCart();
            } else {
                showCatalog(currentType);
            }
            break;
        case 'catalog-view':
            showHome();
            break;
        case 'favorites-view':
        case 'cart-view':
            showHome();
            break;
        case 'order-confirmed-view':
            showHome();
            break;
        default:
            showHome();
    }
}

function getCurrentView() {
    const views = ['home-view', 'catalog-view', 'product-view', 'favorites-view', 'cart-view', 'order-confirmed-view'];
    for (const id of views) {
        if (document.getElementById(id).style.display !== 'none') {
            return id;
        }
    }
    return 'home-view';
}

// --- КАТЕГОРИИ ---
function renderSubCategories() {
    const nav = document.getElementById('categories');
    nav.innerHTML = '';
    
    const subCategories = new Set(['Все']);
    allProducts.forEach(p => {
        if (p.type === currentType && p.category) {
            subCategories.add(p.category);
        }
    });

    subCategories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn' + (cat === currentCategory ? ' active' : '');
        btn.innerText = cat;
        btn.onclick = () => selectCategory(cat);
        nav.appendChild(btn);
    });
}

function selectCategory(category) {
    currentCategory = category;
    
    // Синхронизируем с фильтрами
    if (category === 'Все') {
        activeFilters.categories = [];
    } else {
        activeFilters.categories = [category];
    }
    
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === category);
    });
    
    applyFilters();
    renderProducts();
}

// --- ФИЛЬТРЫ ---
function toggleFilters() {
    const panel = document.getElementById('filters-panel');
    const btn = document.getElementById('filters-toggle-btn');
    
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.classList.add('active');
        renderFilterOptions();
    } else {
        panel.style.display = 'none';
        btn.classList.remove('active');
    }
}

function renderFilterOptions() {
    // КАТЕГОРИИ - только для текущего типа (Одежда/Обувь/Аксессуары)
    const categories = new Set();
    allProducts.forEach(p => {
        if (p.type === currentType && p.category) {
            categories.add(p.category);
        }
    });
    
    const categoriesContainer = document.getElementById('category-filters');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = '';
        
        if (categories.size > 0) {
            categories.forEach(category => {
                const chip = document.createElement('span');
                chip.className = 'filter-chip' + (activeFilters.categories.includes(category) ? ' active' : '');
                chip.innerText = category;
                chip.onclick = () => toggleFilterChip('categories', category, chip);
                categoriesContainer.appendChild(chip);
            });
        } else {
            categoriesContainer.innerHTML = '<span class="filter-empty">Нет категорий</span>';
        }
    }
    
    // БРЕНДЫ - только для текущего типа
    const brands = new Set();
    allProducts.forEach(p => {
        if (p.type === currentType && p.brand) {
            brands.add(p.brand);
        }
    });
    
    const brandsContainer = document.getElementById('brand-filters');
    brandsContainer.innerHTML = '';
    brands.forEach(brand => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip' + (activeFilters.brands.includes(brand) ? ' active' : '');
        chip.innerText = brand;
        chip.onclick = () => toggleFilterChip('brands', brand, chip);
        brandsContainer.appendChild(chip);
    });
    
    // ПРОДАВЦЫ - только для текущего типа
    const sellers = new Set();
    allProducts.forEach(p => {
        if (p.type === currentType && p.seller) {
            sellers.add(p.seller);
        }
    });
    
    const sellersContainer = document.getElementById('seller-filters');
    sellersContainer.innerHTML = '';
    sellers.forEach(seller => {
        const chip = document.createElement('span');
        chip.className = 'filter-chip' + (activeFilters.sellers.includes(seller) ? ' active' : '');
        chip.innerText = seller;
        chip.onclick = () => toggleFilterChip('sellers', seller, chip);
        sellersContainer.appendChild(chip);
    });
    
    // Цены
    document.getElementById('price-min').value = activeFilters.priceMin || '';
    document.getElementById('price-max').value = activeFilters.priceMax || '';
}

function toggleFilterChip(type, value, chip) {
    const index = activeFilters[type].indexOf(value);
    if (index > -1) {
        activeFilters[type].splice(index, 1);
        chip.classList.remove('active');
    } else {
        activeFilters[type].push(value);
        chip.classList.add('active');
    }
}

function applyFiltersFromUI() {
    activeFilters.priceMin = document.getElementById('price-min').value ? parseInt(document.getElementById('price-min').value) : null;
    activeFilters.priceMax = document.getElementById('price-max').value ? parseInt(document.getElementById('price-max').value) : null;
    
    // Обновляем currentCategory на основе выбранных категорий в фильтрах
    if (activeFilters.categories.length === 0) {
        currentCategory = 'Все';
    } else if (activeFilters.categories.length === 1) {
        currentCategory = activeFilters.categories[0];
    } else {
        currentCategory = 'Фильтр';
    }
    
    // Обновляем кнопки категорий
    document.querySelectorAll('.cat-btn').forEach(btn => {
        if (activeFilters.categories.length === 0) {
            btn.classList.toggle('active', btn.innerText === 'Все');
        } else {
            btn.classList.toggle('active', activeFilters.categories.includes(btn.innerText));
        }
    });
    
    applyFilters();
    renderProducts();
    toggleFilters();
}

function resetFilters() {
    activeFilters = {
        categories: [],
        priceMin: null,
        priceMax: null,
        brands: [],
        sellers: []
    };
    
    currentCategory = 'Все';
    
    // Обновляем кнопки категорий
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === 'Все');
    });
    
    renderFilterOptions();
    applyFilters();
    renderProducts();
}

function applyFilters() {
    filteredProducts = allProducts.filter(p => {
        // Фильтр по типу
        if (p.type !== currentType) return false;
        
        // Фильтр по категориям
        if (activeFilters.categories.length > 0 && !activeFilters.categories.includes(p.category)) return false;
        
        // Фильтр по цене
        if (activeFilters.priceMin && p.price < activeFilters.priceMin) return false;
        if (activeFilters.priceMax && p.price > activeFilters.priceMax) return false;
        
        // Фильтр по бренду
        if (activeFilters.brands.length > 0 && !activeFilters.brands.includes(p.brand)) return false;
        
        // Фильтр по продавцу
        if (activeFilters.sellers.length > 0 && !activeFilters.sellers.includes(p.seller)) return false;
        
        return true;
    });
}

// --- ОТРИСОВКА ТОВАРОВ ---
function renderProducts() {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="loading-spinner">Товары не найдены</div>';
        return;
    }
    
    filteredProducts.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.onclick = () => showProduct(product.id);
    
    const isFavorite = favorites[product.id];
    const imgUrl = product.photo || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23f5f5f7" width="100" height="100"/></svg>';
    
    const oldPriceHtml = product.oldPrice 
        ? `<span class="price-old">${product.oldPrice.toLocaleString('ru-RU')} ₽</span>` 
        : '';
    
    const favIcon = isFavorite 
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    
    card.innerHTML = `
        <div class="img-container">
            <img src="${imgUrl}" class="product-img" alt="${product.name}" loading="lazy">
            <span class="favorite-indicator ${isFavorite ? 'active' : ''}">${favIcon}</span>
        </div>
        <div class="product-info">
            <div class="product-brand">${product.brand}</div>
            <div class="product-name">${product.name}</div>
            <div class="product-seller">${product.seller}</div>
            <div class="price-row">
                <span class="price-new">${product.price.toLocaleString('ru-RU')} ₽</span>
                ${oldPriceHtml}
            </div>
        </div>
    `;
    
    return card;
}

// --- КАРТОЧКА ТОВАРА ---
function renderProductDetails(product) {
    document.getElementById('product-header-title').innerText = product.brand;
    
    // Собираем все фото
    sliderPhotos = product.photos.length > 0 ? product.photos : [product.photo || ''];
    sliderCurrentIndex = 0;
    
    // Рендерим слайдер
    renderGallerySlider();
    
    document.getElementById('product-brand').innerText = product.brand;
    document.getElementById('product-title').innerText = product.name;
    document.getElementById('product-seller').innerText = `Продавец: ${product.seller}`;
    document.getElementById('product-price').innerText = `${product.price.toLocaleString('ru-RU')} ₽`;
    
    const oldPriceEl = document.getElementById('product-old-price');
    if (product.oldPrice) {
        oldPriceEl.innerText = `${product.oldPrice.toLocaleString('ru-RU')} ₽`;
        oldPriceEl.style.display = 'inline';
    } else {
        oldPriceEl.style.display = 'none';
    }
    
    const descBlock = document.getElementById('product-description-block');
    if (product.description) {
        document.getElementById('product-description').innerText = product.description;
        descBlock.style.display = 'block';
    } else {
        descBlock.style.display = 'none';
    }
    
    const compBlock = document.getElementById('product-composition-block');
    if (product.composition) {
        document.getElementById('product-composition').innerText = product.composition;
        compBlock.style.display = 'block';
    } else {
        compBlock.style.display = 'none';
    }
    
    updateProductButtons(product);
}

// --- СЛАЙДЕР ГАЛЕРЕИ ---
function renderGallerySlider() {
    const slidesContainer = document.getElementById('gallery-slides');
    const dotsContainer = document.getElementById('gallery-dots');
    
    // Очищаем
    slidesContainer.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    // Создаём слайды
    sliderPhotos.forEach((url, index) => {
        const slide = document.createElement('div');
        slide.className = 'gallery-slide';
        slide.innerHTML = `<img src="${url}" alt="Фото ${index + 1}">`;
        slidesContainer.appendChild(slide);
    });
    
    // Создаём точки (если больше 1 фото)
    if (sliderPhotos.length > 1) {
        sliderPhotos.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'gallery-dot' + (index === 0 ? ' active' : '');
            dot.onclick = () => goToSlide(index);
            dotsContainer.appendChild(dot);
        });
    }
    
    // Устанавливаем позицию
    updateSliderPosition();
    
    // Добавляем обработчики свайпа
    setupSliderTouch();
}

function setupSliderTouch() {
    const slider = document.getElementById('gallery-slider');
    
    slider.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    slider.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Свайп влево - следующий слайд
            if (sliderCurrentIndex < sliderPhotos.length - 1) {
                sliderCurrentIndex++;
                updateSliderPosition();
            }
        } else {
            // Свайп вправо - предыдущий слайд
            if (sliderCurrentIndex > 0) {
                sliderCurrentIndex--;
                updateSliderPosition();
            }
        }
    }
}

function goToSlide(index) {
    sliderCurrentIndex = index;
    updateSliderPosition();
}

function updateSliderPosition() {
    const slidesContainer = document.getElementById('gallery-slides');
    slidesContainer.style.transform = `translateX(-${sliderCurrentIndex * 100}%)`;
    
    // Обновляем точки
    const dots = document.querySelectorAll('.gallery-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === sliderCurrentIndex);
    });
}

function updateProductButtons(product) {
    const favBtn = document.getElementById('add-to-favorites-btn');
    const cartBtn = document.getElementById('add-to-cart-btn');
    const headerFavBtn = document.getElementById('product-favorite-btn');
    
    const isFavorite = favorites[product.id];
    const inCart = cart[product.id];
    
    const heartIcon = isFavorite
        ? '<svg class="btn-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'
        : '<svg class="btn-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';
    
    favBtn.innerHTML = isFavorite 
        ? `${heartIcon}<span>В избранном</span>`
        : `${heartIcon}<span>В избранное</span>`;
    favBtn.classList.toggle('active', isFavorite);
    
    headerFavBtn.classList.toggle('active', isFavorite);
    
    cartBtn.innerHTML = inCart
        ? '<span class="btn-icon">✓</span> В корзине'
        : '<span class="btn-icon">🛒</span> В корзину';
}

// --- ИЗБРАННОЕ ---
function loadFavorites() {
    try {
        const saved = localStorage.getItem('4mens_favorites');
        if (saved) {
            favorites = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Ошибка загрузки избранного:', e);
    }
}

function saveFavorites() {
    localStorage.setItem('4mens_favorites', JSON.stringify(favorites));
}

function toggleFavorite(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (favorites[productId]) {
        delete favorites[productId];
    } else {
        favorites[productId] = product;
    }
    
    saveFavorites();
    updateBadges();
    
    if (currentProductId === productId) {
        updateProductButtons(product);
    }
}

function renderFavorites() {
    const grid = document.getElementById('favorites-grid');
    const empty = document.getElementById('favorites-empty');
    
    const favList = Object.values(favorites);
    
    if (favList.length === 0) {
        grid.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }
    
    grid.style.display = 'grid';
    empty.style.display = 'none';
    grid.innerHTML = '';
    
    favList.forEach(product => {
        const card = createProductCard(product);
        grid.appendChild(card);
    });
}

// --- КОРЗИНА ---
function loadCart() {
    try {
        const saved = localStorage.getItem('4mens_cart');
        if (saved) {
            cart = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Ошибка загрузки корзины:', e);
    }
}

function saveCart() {
    localStorage.setItem('4mens_cart', JSON.stringify(cart));
}

function toggleCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    if (cart[productId]) {
        delete cart[productId];
    } else {
        cart[productId] = product;
    }
    
    saveCart();
    updateBadges();
    updateMainButton();
    
    if (currentProductId === productId) {
        updateProductButtons(product);
    }
}

function removeFromCart(productId) {
    delete cart[productId];
    saveCart();
    renderCart();
    updateBadges();
    updateMainButton();
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const footer = document.getElementById('cart-footer');
    
    const cartList = Object.values(cart);
    
    if (cartList.length === 0) {
        container.innerHTML = '';
        empty.style.display = 'flex';
        footer.style.display = 'none';
        return;
    }
    
    empty.style.display = 'none';
    footer.style.display = 'block';
    container.innerHTML = '';
    
    let total = 0;
    
    cartList.forEach(product => {
        total += product.price;
        
        const item = document.createElement('div');
        item.className = 'cart-item';
        item.innerHTML = `
            <div class="cart-item-image" onclick="showProduct('${product.id}')">
                <img src="${product.photo}" alt="${product.name}">
            </div>
            <div class="cart-item-info" onclick="showProduct('${product.id}')">
                <div class="cart-item-brand">${product.brand}</div>
                <div class="cart-item-name">${product.name}</div>
                <div class="cart-item-seller">${product.seller}</div>
                <div class="cart-item-price">${product.price.toLocaleString('ru-RU')} ₽</div>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart('${product.id}')">Удалить</button>
        `;
        container.appendChild(item);
    });
    
    document.getElementById('total-price').innerText = `${total.toLocaleString('ru-RU')} ₽`;
}

// --- ОФОРМЛЕНИЕ ЗАКАЗА ---
async function submitOrder() {
    const cartList = Object.values(cart);
    if (cartList.length === 0) return;
    
    tg.MainButton.showProgress();
    
    try {
        const user = tg.initDataUnsafe.user || {};
        const orderData = {
            clientName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Аноним',
            clientUsername: user.username ? `@${user.username}` : 'Скрыт',
            items: cartList.map(p => ({
                name: p.name,
                price: p.price,
                seller: p.seller,
                refLink: p.refLink
            }))
        };
        
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showOrderConfirmed(cartList);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        tg.showAlert('Не удалось оформить заказ. Попробуйте позже.');
    } finally {
        tg.MainButton.hideProgress();
    }
}

function showOrderConfirmed(items) {
    const linksContainer = document.getElementById('order-links');
    linksContainer.innerHTML = '';
    
    const bySeller = {};
    items.forEach(item => {
        if (!bySeller[item.seller]) {
            bySeller[item.seller] = [];
        }
        bySeller[item.seller].push(item);
    });
    
    Object.keys(bySeller).forEach(seller => {
        const sellerItems = bySeller[seller];
        sellerItems.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'order-link-btn';
            btn.innerText = `${item.name} → ${seller}`;
            btn.onclick = () => tg.openLink(item.refLink);
            linksContainer.appendChild(btn);
        });
    });
    
    cart = {};
    saveCart();
    updateBadges();
    
    showView('order-confirmed-view');
    tg.MainButton.hide();
}

// --- MAIN BUTTON ---
function updateMainButton() {
    const currentView = getCurrentView();
    const cartCount = Object.keys(cart).length;
    
    if (currentView === 'cart-view' && cartCount > 0) {
        tg.MainButton.setText('ОФОРМИТЬ ЗАКАЗ');
        tg.MainButton.show();
    } else if (currentView === 'catalog-view' && cartCount > 0) {
        tg.MainButton.setText(`КОРЗИНА (${cartCount})`);
        tg.MainButton.show();
    } else if (currentView === 'product-view' && cartCount > 0) {
        tg.MainButton.setText(`КОРЗИНА (${cartCount})`);
        tg.MainButton.show();
    } else {
        tg.MainButton.hide();
    }
}

// --- BADGES ---
function updateBadges() {
    const favCount = Object.keys(favorites).length;
    const cartCount = Object.keys(cart).length;
    
    const homeFavBadge = document.getElementById('favorites-badge');
    if (homeFavBadge) {
        homeFavBadge.innerText = favCount;
        homeFavBadge.style.display = favCount > 0 ? 'inline' : 'none';
    }
    
    const headerFavBadge = document.getElementById('header-favorites-badge');
    if (headerFavBadge) {
        headerFavBadge.innerText = favCount;
        headerFavBadge.style.display = favCount > 0 ? 'inline' : 'none';
    }
}

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    loadFavorites();
    loadCart();
    
    checkOnboarding();
    
    showHome();
    updateBadges();
    
    setupEventListeners();
    
    await loadProducts();
}

function setupEventListeners() {
    document.getElementById('next-btn').addEventListener('click', nextSlide);
    
    document.querySelectorAll('.menu-card[data-type]').forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            showCatalog(type);
        });
    });
    
    document.getElementById('favorites-btn').addEventListener('click', showFavorites);
    
    document.getElementById('catalog-back-btn').addEventListener('click', goBack);
    document.getElementById('product-back-btn').addEventListener('click', goBack);
    document.getElementById('favorites-back-btn').addEventListener('click', goBack);
    document.getElementById('cart-back-btn').addEventListener('click', goBack);
    document.getElementById('order-back-btn').addEventListener('click', () => {
        cart = {};
        saveCart();
        showHome();
    });
    
    document.getElementById('header-favorites-btn').addEventListener('click', showFavorites);
    
    document.getElementById('filters-toggle-btn').addEventListener('click', toggleFilters);
    document.getElementById('filter-apply-btn').addEventListener('click', applyFiltersFromUI);
    document.getElementById('filter-reset-btn').addEventListener('click', resetFilters);
    
    document.getElementById('add-to-favorites-btn').addEventListener('click', () => {
        if (currentProductId) toggleFavorite(currentProductId);
    });
    document.getElementById('product-favorite-btn').addEventListener('click', () => {
        if (currentProductId) toggleFavorite(currentProductId);
    });
    document.getElementById('add-to-cart-btn').addEventListener('click', () => {
        if (currentProductId) toggleCart(currentProductId);
    });
    
    tg.BackButton.onClick(goBack);
    
    tg.MainButton.onClick(() => {
        const currentView = getCurrentView();
        if (currentView === 'cart-view') {
            submitOrder();
        } else {
            showCart();
        }
    });
}

// Запуск
document.addEventListener('DOMContentLoaded', init);
