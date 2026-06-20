(() => {
  'use strict';

  const STORE = {
    products: 'sdc_smart_products_v1',
    receipts: 'sdc_smart_receipts_v1',
    clients: 'sdc_smart_clients_v1',
    quote: 'sdc_smart_quote_v1',
    sale: 'sdc_smart_sale_v1'
  };

  const WHATSAPP_NUMBER = '50431517755';
  const SHIPPING_OUTSIDE_COMAYAGUA = 110;
  const COD_COMMISSION_RATE = 0.10;
  const MONEY = new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 });
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const importInput = document.getElementById('importFile');

  const navItems = [
    ['dashboard', '🏠', 'Inicio', 'Resumen general'],
    ['catalog', '🧾', 'Catálogo', 'Productos y stock'],
    ['quote', '💬', 'Cotizar', 'Mensaje para WhatsApp'],
    ['sell', '🛒', 'Vender', 'Baja inventario'],
    ['receipts', '🧾', 'Recibos', 'Historial de ventas'],
    ['clients', '👥', 'Clientes', 'Compradores'],
    ['admin', '⚙️', 'Admin', 'Editar inventario']
  ];

  const state = {
    route: routeFromHash(),
    products: [],
    receipts: readStore(STORE.receipts, []),
    clients: readStore(STORE.clients, []),
    quoteCart: readStore(STORE.quote, []),
    saleCart: readStore(STORE.sale, []),
    search: '',
    category: 'Todas',
    categoryOpen: false,
    status: 'todos',
    quoteInfo: {
      zone: 'Comayagua', localShipping: '', note: ''
    },
    saleInfo: {
      customer: '', phone: '', zone: 'Comayagua', delivery: 'Entrega local', note: '', payment: 'Efectivo'
    },
    modal: null
  };

  init();

  async function init(){
    bindEvents();
    const storedProducts = readStore(STORE.products, null);
    if (Array.isArray(storedProducts) && storedProducts.length) {
      state.products = storedProducts.map(normalizeProduct);
      render();
      return;
    }
    try {
      const res = await fetch('products_from_xlsx.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar products_from_xlsx.json');
      const data = await res.json();
      state.products = Array.isArray(data) ? data.map(normalizeProduct) : [];
      saveProducts();
    } catch (error) {
      console.error(error);
      state.products = [];
      toast('No se pudo cargar el inventario inicial. Puedes importarlo en Admin.');
    }
    render();
  }

  function bindEvents(){
    window.addEventListener('hashchange', () => {
      state.route = routeFromHash();
      state.modal = null;
      render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.addEventListener('click', (event) => {
      const el = event.target.closest('[data-action],[data-route]');
      if (!el) return;
      const route = el.dataset.route;
      if (route) {
        go(route);
        return;
      }
      const action = el.dataset.action;
      if (!action) return;
      event.preventDefault();
      handleAction(action, el);
    });

    document.addEventListener('input', (event) => {
      const el = event.target;
      if (el.matches('[data-search]')) {
        const pos = el.selectionStart || el.value.length;
        state.search = el.value;
        render();
        requestAnimationFrame(() => {
          const next = document.querySelector('[data-search]');
          if (next) { next.focus(); next.setSelectionRange(pos, pos); }
        });
      }
      if (el.matches('[data-quote-field]')) {
        state.quoteInfo[el.dataset.quoteField] = el.value;
        if (el.dataset.quoteField === 'zone') render();
        else if (el.dataset.quoteField === 'localShipping') updateQuoteLiveUI();
        else renderSoftQuoteMessage();
      }
      if (el.matches('[data-sale-field]')) {
        state.saleInfo[el.dataset.saleField] = el.value;
      }
      if (el.matches('[data-qty]')) {
        setQty(el.dataset.cart, Number(el.dataset.index), Number(el.value || 1));
      }
      if (el.matches('[data-admin-field]')) {
        updateDraftProduct(el);
      }
    });


    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest('.interactive-product[data-id]');
      if (!card) return;
      event.preventDefault();
      openProductDetail(card.dataset.id);
    });

    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (form.matches('[data-admin-form]')) {
        event.preventDefault();
        saveAdminForm(form);
      }
      if (form.matches('[data-client-form]')) {
        event.preventDefault();
        saveClientForm(form);
      }
    });

    document.addEventListener('change', (event) => {
      const el = event.target;
      if (el.matches('[data-status-filter]')) { state.status = el.value || 'todos'; render(); }
      if (el.matches('[data-quote-field]')) { state.quoteInfo[el.dataset.quoteField] = el.value; if (el.dataset.quoteField === 'zone') render(); else if (el.dataset.quoteField === 'localShipping') updateQuoteLiveUI(); else renderSoftQuoteMessage(); }
      if (el.matches('[data-sale-field]')) { state.saleInfo[el.dataset.saleField] = el.value; }
    });

    importInput.addEventListener('change', importProductsFile);
  }

  function handleAction(action, el){
    const id = el.dataset.id;
    const cart = el.dataset.cart;
    switch(action){
      case 'filter-category':
        state.category = el.dataset.category || 'Todas';
        state.categoryOpen = false;
        render();
        break;
      case 'toggle-categories':
        state.categoryOpen = !state.categoryOpen;
        render();
        break;
      case 'filter-status':
        state.status = el.dataset.status || el.value || 'todos';
        render();
        break;
      case 'add-cart':
        addToCart(cart || 'quote', id, 1);
        break;
      case 'add-selected-cart': {
        const select = document.querySelector(`[data-${cart}-select]`);
        const qty = document.querySelector(`[data-${cart}-selected-qty]`);
        if (select && select.value) addToCart(cart, select.value, Number(qty?.value || 1));
        break;
      }
      case 'cart-plus':
        changeQty(cart, Number(el.dataset.index), 1);
        break;
      case 'cart-minus':
        changeQty(cart, Number(el.dataset.index), -1);
        break;
      case 'cart-remove':
        removeFromCart(cart, Number(el.dataset.index));
        break;
      case 'cart-clear':
        clearCart(cart);
        break;
      case 'detail':
        openProductDetail(id);
        break;
      case 'detail-quote':
        state.modal = null;
        addToCart('quote', id, 1);
        break;
      case 'detail-sell':
        state.modal = null;
        addToCart('sale', id, 1);
        break;
      case 'detail-whatsapp':
        copyText(buildSingleProductMessage(id), 'Mensaje del producto copiado.');
        break;
      case 'close-modal':
        state.modal = null;
        render();
        break;
      case 'copy-quote':
        copyText(buildQuoteMessage(el.dataset.mode || quoteDefaultMode()), 'Cotización copiada.');
        break;
      case 'open-whatsapp':
        copyText(buildQuoteMessage(el.dataset.mode || quoteDefaultMode()), 'Cotización copiada.');
        break;
      case 'confirm-sale':
        confirmSale();
        break;
      case 'copy-receipt':
        copyText(buildReceiptText(findReceipt(id)), 'Recibo copiado.');
        break;
      case 'download-receipt':
        downloadReceiptImage(findReceipt(id));
        break;
      case 'delete-receipt':
        deleteReceipt(id);
        break;
      case 'export-products':
        downloadJson('sdc-smart-products.json', state.products);
        break;
      case 'import-products':
        importInput.value = '';
        importInput.click();
        break;
      case 'reset-products':
        if (confirm('¿Restaurar inventario desde products_from_xlsx.json? Se reemplazarán cambios locales.')) resetProductsFromFile();
        break;
      case 'sync-firebase':
        syncFirebaseNow();
        break;
      case 'admin-new':
        state.modal = { type: 'admin-product', id: null, draft: emptyProduct() };
        render();
        break;
      case 'admin-edit':
        state.modal = { type: 'admin-product', id, draft: { ...findProduct(id) } };
        render();
        break;
      case 'admin-toggle':
        toggleProduct(id);
        break;
      case 'admin-delete':
        if (confirm('¿Eliminar este producto del inventario local?')) deleteProduct(id);
        break;
      case 'new-client':
        state.modal = { type: 'client', id: null, draft: emptyClient() };
        render();
        break;
      case 'edit-client':
        state.modal = { type: 'client', id, draft: { ...findClient(id) } };
        render();
        break;
      case 'delete-client':
        if (confirm('¿Eliminar este cliente?')) deleteClient(id);
        break;
      case 'print':
        window.print();
        break;
      default:
        break;
    }
  }

  function render(){
    const page = pageMeta(state.route);
    app.innerHTML = `
      <div class="layout">
        ${renderSidebar()}
        <main class="main">
          <header class="topbar">
            <div>
              <span class="title-kicker">${page.kicker}</span>
              <h1 class="page-title">${page.title}</h1>
              <p class="page-subtitle">${page.subtitle}</p>
            </div>
            <div class="top-actions">${renderTopActions()}</div>
          </header>
          ${renderCurrentPage()}
        </main>
        ${renderMobileNav()}
      </div>
      ${state.modal ? renderModal() : ''}
    `;
    renderSoftQuoteMessage();
  }

  function renderSidebar(){
    return `
      <aside class="sidebar">
        <div class="brand-card">
          <img src="assets/logo-sdc-2026.png" alt="SD Comayagua">
          <div><b>SDC Smart Panel</b><small>Sistema privado de inventario y ventas.</small></div>
        </div>
        <nav class="nav-panel" aria-label="Navegación principal">
          ${navItems.map(([route, icon, label, desc]) => `
            <button class="nav-btn ${state.route === route ? 'active' : ''}" data-route="${route}">
              <span class="nav-icon">${icon}</span>
              <span><b>${label}</b><small style="display:block;color:var(--muted);font-weight:700;margin-top:2px">${desc}</small></span>
              <span>›</span>
            </button>`).join('')}
        </nav>
        <div class="sidebar-note">
          <b>Regla de venta</b>
          Antes de vender, el sistema valida que la cantidad solicitada no supere el inventario disponible.
        </div>
      </aside>
    `;
  }

  function renderMobileNav(){
    const mobile = navItems.filter(([route]) => ['dashboard','catalog','quote','sell','receipts'].includes(route));
    return `<nav class="mobile-nav" aria-label="Navegación móvil">
      ${mobile.map(([route, icon, label]) => `<button class="${state.route === route ? 'active' : ''}" data-route="${route}"><span>${icon}</span>${label}</button>`).join('')}
    </nav>`;
  }

  function renderTopActions(){
    if (state.route === 'catalog') return `<button class="btn primary" data-route="quote">💬 Cotizar</button><button class="btn dark" data-route="admin">⚙️ Admin</button>`;
    if (state.route === 'quote') return `<button class="btn primary" data-action="copy-quote">Copiar cotización</button><button class="btn" data-action="copy-quote" data-mode="both">Copiar ambos</button>`;
    if (state.route === 'sell') return `<button class="btn green" data-action="confirm-sale">Confirmar venta</button>`;
    if (state.route === 'admin') return `<button class="btn primary" data-action="admin-new">＋ Producto</button><button class="btn blue" data-action="sync-firebase">☁️ Actualizar Firebase</button><button class="btn" data-action="export-products">Exportar</button>`;
    if (state.route === 'clients') return `<button class="btn primary" data-action="new-client">＋ Cliente</button>`;
    return `<button class="btn primary" data-route="quote">💬 Nueva cotización</button><button class="btn green" data-route="sell">🛒 Nueva venta</button>`;
  }

  function renderCurrentPage(){
    switch(state.route){
      case 'catalog': return renderCatalog();
      case 'quote': return renderQuote();
      case 'sell': return renderSell();
      case 'receipts': return renderReceipts();
      case 'clients': return renderClients();
      case 'admin': return renderAdmin();
      default: return renderDashboard();
    }
  }

  function renderDashboard(){
    const m = metrics();
    const recent = [...state.receipts].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,5);
    const lowProducts = state.products.filter(p => isActive(p) && Number(p.stock) > 0 && Number(p.stock) <= 5).slice(0,6);
    return `
      <section class="mobile-quick-panel">
        <div>
          <span class="mini-kicker">Panel rápido</span>
          <h2>Inventario listo para vender.</h2>
          <p>Revisa stock, cotiza por WhatsApp y registra ventas sin perder tiempo.</p>
        </div>
        <div class="quick-actions">
          <button class="quick-btn" data-route="quote"><span>💬</span>Cotizar</button>
          <button class="quick-btn" data-route="sell"><span>🛒</span>Vender</button>
          <button class="quick-btn" data-route="catalog"><span>📦</span>Catálogo</button>
        </div>
      </section>
      <section class="hero dashboard-hero">
        <div class="hero-card">
          <span class="hero-pill">⚡ Panel nuevo · Diseño extremo</span>
          <h2>Inventario, cotizaciones y ventas en una sola pantalla.</h2>
          <p>Versión rediseñada desde cero: más limpia, más rápida, responsive y con validación de stock antes de vender.</p>
          <div class="hero-actions">
            <button class="btn primary" data-route="catalog">Ver catálogo</button>
            <button class="btn" data-route="quote">Crear cotización</button>
            <button class="btn green" data-route="sell">Registrar venta</button>
          </div>
        </div>
        <div class="grid cols-2 stat-grid primary-stats">
          ${stat('Productos activos', m.activeProducts, '📦', `${m.totalProducts} productos totales`)}
          ${stat('Unidades', m.units, '🧮', 'Disponibles')}
          ${stat('Ventas del día', lempira(m.todaySales), '💵', `${m.todayReceipts} recibos hoy`)}
          ${stat('Ganancia estimada', lempira(m.profit), '📈', 'Costo vs precio')}
        </div>
      </section>
      <section class="grid cols-4 stat-grid secondary-stats mt-16">
        ${stat('Valor venta total', lempira(m.saleValue), '🏷️', 'Precio x stock')}
        ${stat('Inversión total', lempira(m.investment), '🧾', 'Costo x stock')}
        ${stat('Stock bajo', m.lowStock, '⚠️', 'Con 5 o menos')}
        ${stat('Agotados', m.outStock, '⛔', 'Sin existencia')}
      </section>
      <section class="grid cols-2 dashboard-lists mt-16">
        <div class="panel">
          <div class="panel-header"><div><h2 class="panel-title">Últimos recibos</h2><p class="panel-subtitle">Ventas registradas recientemente.</p></div><button class="btn small" data-route="receipts">Ver todos</button></div>
          ${recent.length ? `<div class="list">${recent.map(renderMiniReceipt).join('')}</div>` : empty('Sin ventas registradas', 'Cuando confirmes una venta aparecerá aquí.')}
        </div>
        <div class="panel stock-panel">
          <div class="panel-header"><div><h2 class="panel-title">Atención de stock</h2><p class="panel-subtitle">Productos que necesitan revisión pronto.</p></div><button class="btn small" data-route="catalog">Catálogo</button></div>
          ${lowProducts.length ? `<div class="list">${lowProducts.map(renderMiniProduct).join('')}</div>` : empty('Stock estable', 'No hay productos activos con stock bajo.')}
        </div>
      </section>
    `;
  }

  function renderCatalog(){
    const categories = categoryStats();
    const products = filteredProducts();
    return `
      ${renderToolbar()}
      ${state.categoryOpen ? `<section class="category-grid category-grid-collapsible">
        ${categories.map(cat => `
          <button class="category-card ${state.category === cat.name ? 'active' : ''}" data-action="filter-category" data-category="${esc(cat.name)}">
            <span class="category-name"><span class="category-icon">${categoryIcon(cat.name)}</span>${esc(cat.name)}</span>
            <span class="category-count">${cat.count} producto${cat.count === 1 ? '' : 's'}</span>
          </button>`).join('')}
      </section>` : ''}
      ${state.category !== 'Todas' ? `<div class="active-filter-pill">Filtrando por <b>${esc(state.category)}</b><button data-action="filter-category" data-category="Todas">Quitar</button></div>` : ''}
      ${products.length ? `<section class="product-grid">${products.map(renderProductCard).join('')}</section>` : empty('No encontré productos', 'Cambia la búsqueda, categoría o filtro de estado.')}
    `;
  }

  function renderToolbar(){
    const showCategories = state.route === 'catalog';
    return `
      <div class="toolbar sticky-controls">
        <input class="field" data-search value="${escAttr(state.search)}" placeholder="Buscar producto, SKU, categoría o marca...">
        ${showCategories ? `<button class="btn category-toggle ${state.categoryOpen ? 'primary' : ''}" data-action="toggle-categories">▦ Categorías</button>` : ''}
        <select class="select" data-status-filter>
          <option value="todos" ${state.status === 'todos' ? 'selected' : ''}>Todos</option>
          <option value="disponible" ${state.status === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="bajo" ${state.status === 'bajo' ? 'selected' : ''}>Stock bajo</option>
          <option value="agotado" ${state.status === 'agotado' ? 'selected' : ''}>Agotados</option>
          <option value="inactivo" ${state.status === 'inactivo' ? 'selected' : ''}>Inactivos</option>
        </select>
        <button class="btn" data-action="filter-category" data-category="Todas">Limpiar</button>
      </div>
    `;
  }

  function renderProductCard(p){
    return `
      <article class="product-card interactive-product" data-action="detail" data-id="${escAttr(p.id)}" tabindex="0" role="button" aria-label="Abrir opciones de ${escAttr(p.name)}">
        <div class="product-media">
          <img src="${escAttr(productImage(p))}" alt="${escAttr(p.name)}" loading="lazy" onerror="this.src='assets/logo-sdc-2026.png'">
        </div>
        <div class="product-body">
          <div class="product-title">${esc(p.name)}</div>
          <div class="product-meta"><span>${esc(p.category)}</span>${statusBadge(p)}</div>
          <div class="product-price">${lempira(p.price)}</div>
          <div class="product-tap-hint">Tocar para cotizar, vender o enviar WhatsApp</div>
        </div>
      </article>
    `;
  }

  function renderQuote(){
    return `
      <section class="cart-layout quote-layout">
        <div class="grid">
          <div class="panel">
            <div class="panel-header"><div><h2 class="panel-title">Productos para cotizar</h2><p class="panel-subtitle">Agrega productos y cantidades. Esto no baja inventario.</p></div><button class="btn small red" data-action="cart-clear" data-cart="quote">Limpiar</button></div>
            ${renderProductSelector('quote')}
            <div class="mt-16">${renderCart('quote')}</div>
          </div>
          <div class="panel">
            <div class="panel-header"><div><h2 class="panel-title">Ubicación de entrega</h2><p class="panel-subtitle">El precio cambia solo si el cliente vive fuera de Comayagua.</p></div></div>
            ${renderQuoteFields()}
          </div>
          ${renderQuoteDeliveryPanel()}
        </div>
        <aside class="panel summary-box">
          <div class="panel-header"><div><h2 class="panel-title">Mensaje listo</h2><p class="panel-subtitle">Copia el mensaje y pegalo en el chat del cliente.</p></div></div>
          <div class="message-preview" id="quoteMessage">${esc(buildQuoteMessage())}</div>
          <div id="quoteTotalsSummary">${renderQuoteSummaryTotals()}</div>
          <div class="whatsapp-actions mt-16">
            <button class="btn green full whatsapp-btn" data-action="copy-quote" data-mode="comayagua">Copiar Comayagua <small>Producto + envío local si lo escribís</small></button>
            <button class="btn primary full whatsapp-btn" data-action="copy-quote" data-mode="normal">Copiar envío normal <small>Productos + Lps. 110</small></button>
            <button class="btn amber full whatsapp-btn" data-action="copy-quote" data-mode="cod">Copiar pagar al recibir <small>Productos + envío + 10%</small></button>
            <button class="btn blue full whatsapp-btn" data-action="copy-quote" data-mode="both">Copiar ambas opciones <small>Envío normal y pagar al recibir</small></button>
            <button class="btn full whatsapp-btn copy" data-action="copy-quote">Copiar mensaje mostrado</button>
          </div>
        </aside>
      </section>
    `;
  }

  function renderSell(){
    const invalid = saleErrors();
    return `
      <section class="cart-layout">
        <div class="grid">
          <div class="panel">
            <div class="panel-header"><div><h2 class="panel-title">Venta real</h2><p class="panel-subtitle">Al confirmar, el stock se descuenta automáticamente.</p></div><button class="btn small red" data-action="cart-clear" data-cart="sale">Limpiar</button></div>
            ${renderProductSelector('sale')}
            <div class="mt-16">${renderCart('sale')}</div>
          </div>
          <div class="panel">
            <div class="panel-header"><div><h2 class="panel-title">Cliente y entrega</h2><p class="panel-subtitle">Se guardará en clientes e historial de recibos.</p></div></div>
            ${renderSaleFields()}
          </div>
        </div>
        <aside class="panel summary-box">
          <div class="panel-header"><div><h2 class="panel-title">Resumen de venta</h2><p class="panel-subtitle">Valida el inventario antes de facturar.</p></div></div>
          ${invalid.length ? `<div class="list">${invalid.map(e => `<div class="badge out">${esc(e)}</div>`).join('')}</div>` : `<div class="badge ok">✅ Stock validado correctamente</div>`}
          <div class="total-line"><span>Productos</span><span>${getCart('sale').reduce((a,i)=>a+i.qty,0)}</span></div>
          <div class="total-line big"><span>Total</span><span>${lempira(cartTotal('sale'))}</span></div>
          <button class="btn green full mt-16" data-action="confirm-sale" ${invalid.length || !getCart('sale').length ? 'disabled' : ''}>Confirmar venta y crear recibo</button>
        </aside>
      </section>
    `;
  }

  function renderProductSelector(cart){
    const products = state.products.filter(p => isActive(p));
    return `
      <div class="form-grid cols-3">
        <div style="grid-column:span 2">
          <label class="label">Producto</label>
          <select class="select" data-${cart}-select>
            <option value="">Selecciona un producto...</option>
            ${products.map(p => `<option value="${escAttr(p.id)}">${esc(p.name)} · ${lempira(p.price)} · Stock ${Number(p.stock || 0)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label">Cantidad</label>
          <input class="field" type="number" min="1" value="1" data-${cart}-selected-qty>
        </div>
      </div>
      <button class="btn primary mt-12" data-action="add-selected-cart" data-cart="${cart}">＋ Agregar</button>
    `;
  }

  function renderCart(cart){
    const items = getCart(cart);
    if (!items.length) return empty('Carrito vacío', 'Agrega productos usando el selector o desde el catálogo.');
    return `<div class="list">${items.map((item, index) => {
      const p = findProduct(item.id) || item.snapshot || emptyProduct();
      const max = Math.max(0, Number(p.stock || 0));
      const blocked = cart === 'sale' && item.qty > max;
      return `<div class="cart-item">
        <img class="mini-thumb" src="${escAttr(productImage(p))}" alt="${escAttr(p.name)}" onerror="this.src='assets/logo-sdc-2026.png'">
        <div>
          <div class="mini-title">${esc(p.name)}</div>
          <div class="mini-meta">${lempira(p.price)} c/u · Stock: ${max}</div>
          ${blocked ? `<div class="badge out mt-12">Cantidad supera el inventario</div>` : ''}
        </div>
        <div class="qty-box">
          <button data-action="cart-minus" data-cart="${cart}" data-index="${index}">−</button>
          <input data-qty data-cart="${cart}" data-index="${index}" type="number" min="1" value="${item.qty}">
          <button data-action="cart-plus" data-cart="${cart}" data-index="${index}">＋</button>
          <button class="btn small red" data-action="cart-remove" data-cart="${cart}" data-index="${index}">Quitar</button>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  function renderQuoteFields(){
    const q = state.quoteInfo;
    const local = !isOutsideComayagua();
    return `<div class="form-grid quote-location-grid">
      <div>
        <label class="label">¿Dónde vive el cliente?</label>
        <select class="select" data-quote-field="zone">
          ${['Comayagua','Fuera de Comayagua'].map(v => `<option ${q.zone === v ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      ${local ? `<div>
        <label class="label">Precio del envío local</label>
        <input class="input" data-quote-field="localShipping" type="number" min="0" inputmode="numeric" placeholder="Ejemplo: 40" value="${escAttr(q.localShipping || '')}">
        <small class="field-help">Solo para Comayagua. Se suma al producto y no lleva comisión.</small>
      </div>` : ''}
      <div style="grid-column:1/-1">
        <label class="label">Nota opcional</label>
        <textarea class="textarea" data-quote-field="note" placeholder="Ejemplo: entrega disponible hoy, precio sujeto al producto y envío cotizado...">${esc(q.note || '')}</textarea>
      </div>
    </div>`;
  }

  function renderQuoteDeliveryPanel(){
    const t = quoteTotals();
    if (!t.outside) {
      return `<div class="panel shipping-panel local-panel" id="quoteDeliveryPanel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Cliente en Comayagua</h2>
            <p class="panel-subtitle">Podés escribir el envío local según la zona del cliente.</p>
          </div>
          <span class="badge ok">Envío manual</span>
        </div>
        <div class="fee-breakdown local-breakdown">
          <div><span>Total productos</span><b>${lempira(t.subtotal)}</b></div>
          ${t.localShipping > 0 ? `<div><span>Envío local</span><b>${lempira(t.localShipping)}</b></div>` : ''}
        </div>
        <div class="local-total-box">
          <span>Total a cobrar</span>
          <b>${lempira(t.localTotal)}</b>
        </div>
        <p class="shipping-note">En Comayagua solo se suma el envío que vos escribás. No se aplica comisión.</p>
      </div>`;
    }
    return `<div class="panel shipping-panel" id="quoteDeliveryPanel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Envío fuera de Comayagua</h2>
          <p class="panel-subtitle">Muestra las dos opciones: depósito o pago al recibir.</p>
        </div>
        <span class="badge info">Envío ${lempira(SHIPPING_OUTSIDE_COMAYAGUA)}</span>
      </div>
      <div class="shipping-options">
        <article class="shipping-option normal">
          <div class="ship-icon">🏦</div>
          <div>
            <strong>Depósito / envío normal</strong>
            <span>Productos + envío</span>
          </div>
          <b>${lempira(t.normalTotal)}</b>
        </article>
        <article class="shipping-option cod">
          <div class="ship-icon">📦</div>
          <div>
            <strong>Pagar al recibir</strong>
            <span>(Productos + envío) + 10%</span>
          </div>
          <b>${lempira(t.codTotal)}</b>
        </article>
      </div>
      <div class="fee-breakdown">
        <div><span>Total productos</span><b>${lempira(t.subtotal)}</b></div>
        <div><span>Envío fuera de Comayagua</span><b>${lempira(t.shipping)}</b></div>
        <div><span>Base para comisión</span><b>${lempira(t.commissionBase)}</b></div>
        <div><span>Comisión 10%</span><b>${lempira(t.commission)}</b></div>
      </div>
      <p class="shipping-note">La comisión del 10% se calcula sobre la suma de productos + envío, porque la empresa maneja el dinero del pedido.</p>
    </div>`;
  }

  function renderQuoteSummaryTotals(){
    const t = quoteTotals();
    if (!t.outside) return `<div class="total-line"><span>Productos</span><span>${lempira(t.subtotal)}</span></div>${t.localShipping > 0 ? `<div class="total-line"><span>Envío local</span><span>${lempira(t.localShipping)}</span></div>` : ''}<div class="total-line big stacked-total"><span>Total a pagar en Comayagua</span><strong>${lempira(t.localTotal)}</strong></div>`;
    return `<div class="quote-total-stack">
      <div class="total-line"><span>Envío normal</span><span>${lempira(t.normalTotal)}</span></div>
      <div class="total-line big"><span>Pagar al recibir</span><span>${lempira(t.codTotal)}</span></div>
    </div>`;
  }

  function renderSaleFields(){
    const s = state.saleInfo;
    return `<div class="form-grid">
      ${inputField('Cliente', 'customer', s.customer, 'sale', 'Nombre del cliente')}
      ${inputField('Teléfono', 'phone', s.phone, 'sale', 'Opcional')}
      ${inputField('Zona / municipio', 'zone', s.zone, 'sale', 'Comayagua')}
      <div><label class="label">Entrega</label><select class="select" data-sale-field="delivery">${['Entrega local','Envío normal','Pagar al recibir','Pasar a recoger'].map(v => `<option ${s.delivery === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div><label class="label">Pago</label><select class="select" data-sale-field="payment">${['Efectivo','Transferencia','Pendiente','Mixto'].map(v => `<option ${s.payment === v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div style="grid-column:1/-1"><label class="label">Nota</label><textarea class="textarea" data-sale-field="note" placeholder="Detalle extra del recibo...">${esc(s.note)}</textarea></div>
    </div>`;
  }

  function renderReceipts(){
    const receipts = [...state.receipts].sort((a,b) => new Date(b.date) - new Date(a.date));
    return `<section class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Historial de recibos</h2><p class="panel-subtitle">Copia, descarga imagen o elimina recibos locales.</p></div><button class="btn" data-action="print">Imprimir</button></div>
      ${receipts.length ? `<div class="grid cols-2">${receipts.map(renderReceiptCard).join('')}</div>` : empty('Sin recibos todavía', 'Confirma una venta para crear tu primer recibo.')}
    </section>`;
  }

  function renderReceiptCard(r){
    return `<article class="receipt-card">
      <div class="receipt-head">
        <div><div class="receipt-id">${esc(r.id)}</div><div class="receipt-meta">${formatDate(r.date)} · ${esc(r.customer || 'Cliente no registrado')}</div></div>
        <span class="badge ok">${lempira(r.total)}</span>
      </div>
      <div class="receipt-products">
        ${r.items.map(item => `<div><span>${esc(item.name)} x${item.qty}</span><b>${lempira(item.price * item.qty)}</b></div>`).join('')}
      </div>
      <div class="receipt-meta">Entrega: ${esc(r.delivery)} · Pago: ${esc(r.payment)} · Zona: ${esc(r.zone || 'Comayagua')}</div>
      <div class="btn-row">
        <button class="btn small" data-action="copy-receipt" data-id="${escAttr(r.id)}">Copiar</button>
        <button class="btn small blue" data-action="download-receipt" data-id="${escAttr(r.id)}">Imagen</button>
        <button class="btn small red" data-action="delete-receipt" data-id="${escAttr(r.id)}">Eliminar</button>
      </div>
    </article>`;
  }

  function renderClients(){
    const clients = [...state.clients].sort((a,b) => (b.totalSpent || 0) - (a.totalSpent || 0));
    return `<section class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Clientes</h2><p class="panel-subtitle">Se actualizan automáticamente cuando confirmas ventas.</p></div><button class="btn primary" data-action="new-client">＋ Cliente</button></div>
      ${clients.length ? `<div class="grid cols-3">${clients.map(renderClientCard).join('')}</div>` : empty('No hay clientes guardados', 'Registra una venta o agrega un cliente manualmente.')}
    </section>`;
  }

  function renderClientCard(c){
    return `<article class="client-card">
      <div class="client-name">${esc(c.name || 'Cliente sin nombre')}</div>
      <div class="client-data">📞 ${esc(c.phone || 'Sin teléfono')}<br>📍 ${esc(c.zone || 'Comayagua')}<br>Compras: ${c.purchases || 0} · Total: <b>${lempira(c.totalSpent || 0)}</b><br>Última compra: ${c.lastPurchase ? formatDate(c.lastPurchase) : 'Sin registro'}</div>
      <div class="btn-row"><button class="btn small" data-action="edit-client" data-id="${escAttr(c.id)}">Editar</button><button class="btn small red" data-action="delete-client" data-id="${escAttr(c.id)}">Eliminar</button></div>
    </article>`;
  }

  function renderAdmin(){
    const products = filteredProducts(true);
    return `<section class="panel">
      <div class="panel-header"><div><h2 class="panel-title">Administrar productos</h2><p class="panel-subtitle">Edita precios, costos, stock, categorías e imágenes. Los cambios quedan en este navegador.</p></div>
        <div class="btn-row"><button class="btn primary" data-action="admin-new">＋ Producto</button><button class="btn blue" data-action="sync-firebase">☁️ Actualizar Firebase</button><button class="btn" data-action="import-products">Importar</button><button class="btn" data-action="export-products">Exportar</button><button class="btn red" data-action="reset-products">Restaurar</button></div>
      </div>
      ${renderToolbar()}
      <div class="table-wrap">
        <table>
          <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>${products.map(p => `<tr>
            <td><b>${esc(p.name)}</b><div class="mini-meta">${esc(p.id)} · ${esc(p.brand || 'Sin marca')}</div></td>
            <td>${esc(p.category)}</td>
            <td>${lempira(p.price)}</td>
            <td>${lempira(p.cost)}</td>
            <td>${Number(p.stock || 0)}</td>
            <td>${statusBadge(p)}</td>
            <td><div class="btn-row"><button class="btn small" data-action="admin-edit" data-id="${escAttr(p.id)}">Editar</button><button class="btn small amber" data-action="admin-toggle" data-id="${escAttr(p.id)}">${p.active === false ? 'Activar' : 'Ocultar'}</button><button class="btn small red" data-action="admin-delete" data-id="${escAttr(p.id)}">Borrar</button></div></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </section>`;
  }

  function openProductDetail(id){
    const product = findProduct(id);
    if (!product) return toast('Producto no encontrado.');
    state.modal = { type: 'detail', product };
    render();
  }

  function renderModal(){
    const m = state.modal;
    if (m.type === 'detail') return renderDetailModal(m.product);
    if (m.type === 'admin-product') return renderAdminModal(m.draft, m.id);
    if (m.type === 'client') return renderClientModal(m.draft, m.id);
    return '';
  }

  function renderDetailModal(p){
    return `<div class="modal-backdrop" data-action="close-modal">
      <section class="modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true">
        <header><div><h3>${esc(p.name)}</h3><p class="panel-subtitle">${esc(p.category)} · ${esc(p.id)}</p></div><button class="close-x" data-action="close-modal">×</button></header>
        <div class="detail-img"><img src="${escAttr(productImage(p))}" alt="${escAttr(p.name)}" onerror="this.src='assets/logo-sdc-2026.png'"></div>
        <div class="grid cols-3">
          ${stat('Precio', lempira(p.price), '🏷️', 'Venta')}
          ${stat('Stock', Number(p.stock || 0), '📦', 'Disponible')}
          ${stat('Ganancia/u', lempira(Number(p.price || 0) - Number(p.cost || 0)), '📈', 'Estimado')}
        </div>
        <p class="mt-16 text-muted">${esc(p.description || 'Producto sin descripción.')}</p>
        <div class="detail-action-grid mt-16">
          <button class="btn primary full" data-action="detail-quote" data-id="${escAttr(p.id)}">💬 COTIZAR</button>
          <button class="btn green full" data-action="detail-sell" data-id="${escAttr(p.id)}" ${canSell(p) ? '' : 'disabled'}>🛒 VENDER</button>
          <button class="btn blue full" data-action="detail-whatsapp" data-id="${escAttr(p.id)}">Copiar WHATSAPP</button>
        </div>
        <div class="btn-row mt-16"><button class="btn small" data-action="admin-edit" data-id="${escAttr(p.id)}">Editar producto</button></div>
      </section>
    </div>`;
  }

  function renderAdminModal(p, id){
    return `<div class="modal-backdrop" data-action="close-modal">
      <section class="modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true">
        <header><div><h3>${id ? 'Editar producto' : 'Nuevo producto'}</h3><p class="panel-subtitle">Completa los datos principales del inventario.</p></div><button class="close-x" data-action="close-modal">×</button></header>
        <form data-admin-form data-id="${escAttr(id || '')}">
          <div class="form-grid">
            ${adminInput('Nombre', 'name', p.name, 'Ejemplo: Dedales V1')}
            ${adminInput('SKU / ID', 'id', p.id, 'SDC-000')}
            ${adminInput('Categoría', 'category', p.category, 'Dedales')}
            ${adminInput('Marca', 'brand', p.brand, 'SD Gamer')}
            ${adminInput('Precio', 'price', p.price, '0', 'number')}
            ${adminInput('Costo', 'cost', p.cost, '0', 'number')}
            ${adminInput('Stock', 'stock', p.stock, '0', 'number')}
            <div><label class="label">Estado</label><select class="select" name="active"><option value="true" ${p.active !== false ? 'selected' : ''}>Activo</option><option value="false" ${p.active === false ? 'selected' : ''}>Inactivo</option></select></div>
            <div style="grid-column:1/-1">${adminInput('Imagen URL', 'image', p.image, 'https://...', 'url')}</div>
            <div style="grid-column:1/-1"><label class="label">Descripción</label><textarea class="textarea" name="description">${esc(p.description || '')}</textarea></div>
          </div>
          <div class="btn-row mt-16"><button class="btn primary" type="submit">Guardar producto</button><button class="btn" type="button" data-action="close-modal">Cancelar</button></div>
        </form>
      </section>
    </div>`;
  }

  function renderClientModal(c, id){
    return `<div class="modal-backdrop" data-action="close-modal">
      <section class="modal" onclick="event.stopPropagation()" role="dialog" aria-modal="true">
        <header><div><h3>${id ? 'Editar cliente' : 'Nuevo cliente'}</h3><p class="panel-subtitle">Datos rápidos para futuras ventas.</p></div><button class="close-x" data-action="close-modal">×</button></header>
        <form data-client-form data-id="${escAttr(id || '')}">
          <div class="form-grid">
            ${adminInput('Nombre', 'name', c.name, 'Nombre completo')}
            ${adminInput('Teléfono', 'phone', c.phone, '+504')}
            ${adminInput('Zona', 'zone', c.zone, 'Comayagua')}
            ${adminInput('Total comprado', 'totalSpent', c.totalSpent || 0, '0', 'number')}
          </div>
          <div class="btn-row mt-16"><button class="btn primary" type="submit">Guardar cliente</button><button class="btn" type="button" data-action="close-modal">Cancelar</button></div>
        </form>
      </section>
    </div>`;
  }

  function inputField(label, key, value, type, placeholder){
    return `<div><label class="label">${label}</label><input class="field" data-${type}-field="${key}" value="${escAttr(value || '')}" placeholder="${escAttr(placeholder || '')}"></div>`;
  }

  function adminInput(label, name, value, placeholder, type = 'text'){
    return `<div><label class="label">${label}</label><input class="field" name="${name}" type="${type}" value="${escAttr(value ?? '')}" placeholder="${escAttr(placeholder || '')}"></div>`;
  }

  function stat(label, value, icon, foot){
    return `<article class="stat-card"><div class="stat-top"><span class="stat-label">${esc(label)}</span><span class="stat-icon">${icon}</span></div><div><div class="stat-value">${esc(String(value))}</div><div class="stat-foot">${esc(foot || '')}</div></div></article>`;
  }

  function empty(title, msg){
    return `<div class="empty-state"><strong>${esc(title)}</strong><span>${esc(msg)}</span></div>`;
  }

  function renderMiniProduct(p){
    return `<div class="mini-row"><img class="mini-thumb" src="${escAttr(productImage(p))}" alt="${escAttr(p.name)}" onerror="this.src='assets/logo-sdc-2026.png'"><div><div class="mini-title">${esc(p.name)}</div><div class="mini-meta">${esc(p.category)} · ${lempira(p.price)}</div></div>${statusBadge(p)}</div>`;
  }

  function renderMiniReceipt(r){
    return `<div class="mini-row"><span class="mini-thumb" style="display:grid;place-items:center">🧾</span><div><div class="mini-title">${esc(r.customer || 'Cliente')}</div><div class="mini-meta">${formatDate(r.date)} · ${r.items.length} producto(s)</div></div><b>${lempira(r.total)}</b></div>`;
  }

  function categoryStats(){
    const map = new Map();
    const base = state.products.filter(p => state.status === 'inactivo' ? true : isActive(p));
    for (const p of base) map.set(p.category, (map.get(p.category) || 0) + 1);
    return [{ name:'Todas', count: base.length }, ...[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'es')).map(([name,count]) => ({name,count}))];
  }

  function categoryIcon(name){
    if (name === 'Todas') return '▦';
    const slug = slugify(name);
    return `<img src="assets/categorias/${slug}.svg" alt="" onerror="this.replaceWith(document.createTextNode('◇'))">`;
  }

  function filteredProducts(includeInactive = false){
    const q = norm(state.search);
    return state.products.filter(p => {
      const activeOk = includeInactive ? true : isActive(p);
      if (!activeOk) return false;
      if (state.category !== 'Todas' && p.category !== state.category) return false;
      if (state.status === 'disponible' && !(isActive(p) && Number(p.stock) > 5)) return false;
      if (state.status === 'bajo' && !(isActive(p) && Number(p.stock) > 0 && Number(p.stock) <= 5)) return false;
      if (state.status === 'agotado' && !(isActive(p) && Number(p.stock) <= 0)) return false;
      if (state.status === 'inactivo' && p.active !== false) return false;
      if (!q) return true;
      return norm(`${p.name} ${p.id} ${p.category} ${p.brand} ${p.description}`).includes(q);
    });
  }

  function addToCart(cart, id, qty = 1){
    const p = findProduct(id);
    if (!p) return toast('Producto no encontrado.');
    if (cart === 'sale' && !canSell(p)) return toast('Este producto no tiene stock disponible.');
    const list = getCart(cart);
    const existing = list.find(i => i.id === id);
    if (existing) existing.qty += Math.max(1, qty || 1);
    else list.push({ id, qty: Math.max(1, qty || 1), snapshot: snapshotProduct(p) });
    saveCart(cart);
    toast(cart === 'sale' ? 'Producto agregado a venta.' : 'Producto agregado a cotización.');
    if (cart === 'quote' && state.route !== 'quote') go('quote');
    else if (cart === 'sale' && state.route !== 'sell') go('sell');
    else render();
  }

  function getCart(cart){ return cart === 'sale' ? state.saleCart : state.quoteCart; }
  function saveCart(cart){ localStorage.setItem(cart === 'sale' ? STORE.sale : STORE.quote, JSON.stringify(getCart(cart))); }
  function changeQty(cart, index, delta){
    const list = getCart(cart);
    if (!list[index]) return;
    list[index].qty = Math.max(1, Number(list[index].qty || 1) + delta);
    saveCart(cart); render();
  }
  function setQty(cart, index, qty){
    const list = getCart(cart);
    if (!list[index]) return;
    list[index].qty = Math.max(1, qty || 1);
    saveCart(cart); render();
  }
  function removeFromCart(cart, index){
    getCart(cart).splice(index, 1);
    saveCart(cart); render();
  }
  function clearCart(cart){
    if (cart === 'sale') state.saleCart = [];
    else state.quoteCart = [];
    saveCart(cart); render();
  }
  function cartTotal(cart){
    return getCart(cart).reduce((sum, item) => {
      const p = findProduct(item.id) || item.snapshot;
      return sum + Number(p?.price || 0) * Number(item.qty || 1);
    },0);
  }

  function quoteDefaultMode(){
    return isOutsideComayagua() ? 'both' : 'comayagua';
  }

  function buildQuoteMessage(mode = quoteDefaultMode()){
    const info = state.quoteInfo;
    const cleanMode = ['comayagua','normal','cod','both'].includes(mode) ? mode : quoteDefaultMode();
    const outsideMode = cleanMode === 'normal' || cleanMode === 'cod' || cleanMode === 'both';
    const totals = quoteTotals(outsideMode);
    const items = getCart('quote');
    const lines = [];

    lines.push('🛍️ *Cotización SD Comayagua*');
    lines.push('');
    lines.push(`📍 *Ubicación:* ${outsideMode ? 'Fuera de Comayagua' : 'Comayagua'}`);
    lines.push('');

    if (!items.length) {
      lines.push('Agrega productos para generar la cotización.');
    } else {
      lines.push('📦 *PRODUCTOS*');
      lines.push('━━━━━━━━━━━━━━━━');
      items.forEach((item, index) => {
        const p = findProduct(item.id) || item.snapshot || emptyProduct();
        const qty = Number(item.qty || 1);
        const price = Number(p.price || 0);
        lines.push(`${index + 1}. *${p.name}*`);
        lines.push(`   Cantidad: *${qty}*`);
        lines.push(`   Precio unidad: *${lempira(price)}*`);
        lines.push(`   Subtotal: *${lempira(price * qty)}*`);
        lines.push('');
      });

      lines.push('━━━━━━━━━━━━━━━━');
      lines.push(`💰 *Total productos:* *${lempira(totals.subtotal)}*`);

      if (!outsideMode) {
        if (totals.localShipping > 0) {
          lines.push(`🏍️ *Envío local:* *${lempira(totals.localShipping)}*`);
          lines.push('');
          lines.push('✅ *Total a pagar en Comayagua:*');
          lines.push(`*${lempira(totals.localTotal)}*`);
        } else {
          lines.push('');
          lines.push('✅ *Total productos en Comayagua:*');
          lines.push(`*${lempira(totals.subtotal)}*`);
        }
      }

      if (cleanMode === 'normal') {
        lines.push(`🚚 *Envío fuera de Comayagua:* *${lempira(totals.shipping)}*`);
        lines.push('');
        lines.push('✅ *Total envío normal:*');
        lines.push(`*${lempira(totals.normalTotal)}*`);
        lines.push('🏦 Pago por depósito o transferencia antes del envío.');
      }

      if (cleanMode === 'cod') {
        lines.push(`🚚 *Envío fuera de Comayagua:* *${lempira(totals.shipping)}*`);
        lines.push(`🧾 *Base productos + envío:* *${lempira(totals.commissionBase)}*`);
        lines.push(`🔟 *Comisión 10%:* *${lempira(totals.commission)}*`);
        lines.push('');
        lines.push('✅ *Total pagar al recibir:*');
        lines.push(`*${lempira(totals.codTotal)}*`);
        lines.push('📦 Esta opción incluye el 10% porque la empresa maneja el dinero del pedido.');
      }

      if (cleanMode === 'both') {
        lines.push(`🚚 *Envío fuera de Comayagua:* *${lempira(totals.shipping)}*`);
        lines.push('');
        lines.push('📌 *Opciones fuera de Comayagua*');
        lines.push('');
        lines.push('1️⃣ *Envío normal / depósito:*');
        lines.push(`   *${lempira(totals.normalTotal)}*`);
        lines.push('   Productos + envío.');
        lines.push('');
        lines.push('2️⃣ *Pagar al recibir:*');
        lines.push(`   *${lempira(totals.codTotal)}*`);
        lines.push(`   Base productos + envío: *${lempira(totals.commissionBase)}*`);
        lines.push(`   Comisión 10%: *${lempira(totals.commission)}*`);
      }
    }

    if (info.note) {
      lines.push('');
      lines.push(`📝 *Nota:* ${info.note}`);
    }
    lines.push('');
    lines.push('ℹ️ Total sujeto al producto seleccionado y al envío cotizado.');
    return lines.join('\n');
  }

  function buildSingleProductMessage(id){
    const p = findProduct(id);
    if (!p) return 'Producto no encontrado.';
    const lines = [];
    lines.push('🛍️ *Producto SD Comayagua*');
    lines.push('');
    lines.push(`📦 *${p.name}*`);
    lines.push(`🏷️ Precio: *${lempira(p.price)}*`);
    lines.push(`📂 Categoría: ${p.category || 'General'}`);
    lines.push(`📦 Stock disponible: ${Number(p.stock || 0)}`);
    lines.push('');
    lines.push('📍 Disponible en Comayagua.');
    lines.push('🚚 Para envío fuera de Comayagua, se puede cotizar envío normal o pagar al recibir.');
    lines.push('');
    lines.push('ℹ️ Total sujeto al producto seleccionado y al envío cotizado.');
    return lines.join('\n');
  }

  function moneyValue(value){
    const n = Number(value || 0);
    return Number.isFinite(n) && n > 0 ? Math.ceil(n) : 0;
  }

  function quoteTotals(outsideOverride){
    const subtotal = cartTotal('quote');
    const outside = typeof outsideOverride === 'boolean' ? outsideOverride : isOutsideComayagua();
    const localShipping = !outside && subtotal > 0 ? moneyValue(state.quoteInfo.localShipping) : 0;
    const shipping = outside && subtotal > 0 ? SHIPPING_OUTSIDE_COMAYAGUA : 0;
    const commissionBase = subtotal + shipping;
    const commission = outside && subtotal > 0 ? Math.ceil(commissionBase * COD_COMMISSION_RATE) : 0;
    return {
      subtotal,
      outside,
      localShipping,
      localTotal: subtotal + localShipping,
      shipping,
      commissionBase,
      commission,
      normalTotal: subtotal + shipping,
      codTotal: subtotal + shipping + commission
    };
  }

  function isOutsideComayagua(){
    return String(state.quoteInfo.zone || '').toLowerCase().includes('fuera');
  }

  function renderSoftQuoteMessage(){
    const box = document.getElementById('quoteMessage');
    if (box) box.textContent = buildQuoteMessage();
  }

  function updateQuoteLiveUI(){
    renderSoftQuoteMessage();
    const delivery = document.getElementById('quoteDeliveryPanel');
    if (delivery) delivery.outerHTML = renderQuoteDeliveryPanel();
    const totals = document.getElementById('quoteTotalsSummary');
    if (totals) totals.innerHTML = renderQuoteSummaryTotals();
  }

  function openWhatsApp(message){
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function saleErrors(){
    const errors = [];
    const items = getCart('sale');
    for (const item of items) {
      const p = findProduct(item.id);
      if (!p) errors.push('Producto no encontrado.');
      else if (!isActive(p)) errors.push(`${p.name} está inactivo.`);
      else if (Number(p.stock || 0) <= 0) errors.push(`${p.name} está agotado.`);
      else if (Number(item.qty || 1) > Number(p.stock || 0)) errors.push(`${p.name}: solo hay ${p.stock} disponibles.`);
    }
    return errors;
  }

  function confirmSale(){
    const items = getCart('sale');
    if (!items.length) return toast('Agrega productos para vender.');
    const errors = saleErrors();
    if (errors.length) return toast(errors[0]);

    const receiptItems = items.map(item => {
      const p = findProduct(item.id);
      return { id: p.id, name: p.name, price: Number(p.price || 0), cost: Number(p.cost || 0), qty: Number(item.qty || 1), category: p.category };
    });

    for (const item of items) {
      const p = findProduct(item.id);
      p.stock = Math.max(0, Number(p.stock || 0) - Number(item.qty || 1));
      p.updatedAt = new Date().toISOString();
    }

    const receipt = {
      id: `SDC-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(state.receipts.length + 1).padStart(4,'0')}`,
      date: new Date().toISOString(),
      customer: state.saleInfo.customer || 'Cliente',
      phone: state.saleInfo.phone || '',
      zone: state.saleInfo.zone || 'Comayagua',
      delivery: state.saleInfo.delivery || 'Entrega local',
      payment: state.saleInfo.payment || 'Efectivo',
      note: state.saleInfo.note || '',
      items: receiptItems,
      total: receiptItems.reduce((sum,i) => sum + i.price * i.qty, 0),
      profit: receiptItems.reduce((sum,i) => sum + (i.price - i.cost) * i.qty, 0)
    };
    state.receipts.push(receipt);
    state.saleCart = [];
    saveProducts();
    writeStore(STORE.receipts, state.receipts);
    saveCart('sale');
    updateClientFromReceipt(receipt);
    toast('Venta confirmada y recibo creado.');
    go('receipts');
  }

  function buildReceiptText(r){
    if (!r) return '';
    const lines = [];
    lines.push('SD COMAYAGUA');
    lines.push(`Recibo: ${r.id}`);
    lines.push(`Fecha: ${formatDate(r.date)}`);
    lines.push(`Cliente: ${r.customer || 'Cliente'}`);
    if (r.phone) lines.push(`Teléfono: ${r.phone}`);
    lines.push(`Zona: ${r.zone || 'Comayagua'}`);
    lines.push(`Entrega: ${r.delivery}`);
    lines.push('');
    r.items.forEach((i, idx) => lines.push(`${idx + 1}. ${i.name} x${i.qty} - ${lempira(i.price * i.qty)}`));
    lines.push('');
    lines.push(`TOTAL: ${lempira(r.total)}`);
    lines.push(`Pago: ${r.payment}`);
    if (r.note) lines.push(`Nota: ${r.note}`);
    lines.push('Gracias por su compra.');
    return lines.join('\n');
  }

  function downloadReceiptImage(r){
    if (!r) return toast('Recibo no encontrado.');
    const canvas = document.createElement('canvas');
    const width = 1080;
    const baseRows = 8 + r.items.length * 2;
    canvas.width = width;
    canvas.height = Math.max(1200, 390 + baseRows * 54);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#0f766e';
    roundRect(ctx, 48, 48, width - 96, 160, 36, true);
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 46px Arial';
    ctx.fillText('SD COMAYAGUA', 88, 118);
    ctx.font = '500 26px Arial';
    ctx.fillText('Recibo de venta', 88, 162);
    ctx.fillStyle = '#102027';
    ctx.font = '800 34px Arial';
    ctx.fillText(r.id, 58, 270);
    ctx.font = '500 26px Arial';
    ctx.fillStyle = '#536874';
    ctx.fillText(formatDate(r.date), 58, 310);
    let y = 375;
    ctx.fillStyle = '#102027';
    ctx.font = '700 30px Arial';
    ctx.fillText(`Cliente: ${r.customer || 'Cliente'}`, 58, y); y += 42;
    ctx.font = '500 26px Arial';
    ctx.fillStyle = '#536874';
    ctx.fillText(`Zona: ${r.zone || 'Comayagua'} · Entrega: ${r.delivery}`, 58, y); y += 56;
    ctx.strokeStyle = '#dfe8ee'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(58,y); ctx.lineTo(width-58,y); ctx.stroke(); y += 50;
    ctx.fillStyle = '#102027';
    ctx.font = '800 30px Arial';
    ctx.fillText('Productos', 58, y); y += 48;
    r.items.forEach((item) => {
      ctx.fillStyle = '#102027'; ctx.font = '700 27px Arial';
      wrapCanvasText(ctx, `${item.name} x${item.qty}`, 58, y, 660, 34);
      ctx.textAlign = 'right'; ctx.fillText(lempira(item.price * item.qty), width - 58, y); ctx.textAlign = 'left';
      y += 72;
    });
    y += 12;
    ctx.strokeStyle = '#dfe8ee'; ctx.beginPath(); ctx.moveTo(58,y); ctx.lineTo(width-58,y); ctx.stroke(); y += 70;
    ctx.fillStyle = '#0f766e'; ctx.font = '900 52px Arial';
    ctx.fillText('TOTAL', 58, y);
    ctx.textAlign = 'right'; ctx.fillText(lempira(r.total), width - 58, y); ctx.textAlign = 'left';
    y += 78;
    ctx.fillStyle = '#536874'; ctx.font = '500 25px Arial';
    ctx.fillText(`Pago: ${r.payment}`, 58, y); y += 42;
    ctx.fillText('Gracias por su compra.', 58, y);
    const link = document.createElement('a');
    link.download = `${r.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Imagen del recibo descargada.');
  }

  function roundRect(ctx, x, y, w, h, r, fill){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
    if (fill) ctx.fill(); else ctx.stroke();
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight){
    const words = String(text).split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else line = testLine;
    }
    ctx.fillText(line, x, y);
  }

  function updateClientFromReceipt(r){
    if (!r.customer && !r.phone) return;
    const key = norm(r.phone || r.customer);
    let c = state.clients.find(item => norm(item.phone || item.name) === key);
    if (!c) {
      c = emptyClient();
      c.id = uid('CLI');
      c.name = r.customer || 'Cliente';
      c.phone = r.phone || '';
      c.zone = r.zone || 'Comayagua';
      state.clients.push(c);
    }
    c.name = r.customer || c.name;
    c.phone = r.phone || c.phone;
    c.zone = r.zone || c.zone;
    c.purchases = Number(c.purchases || 0) + 1;
    c.totalSpent = Number(c.totalSpent || 0) + Number(r.total || 0);
    c.lastPurchase = r.date;
    writeStore(STORE.clients, state.clients);
  }

  function saveAdminForm(form){
    const fd = new FormData(form);
    const originalId = form.dataset.id;
    const item = normalizeProduct(Object.fromEntries(fd.entries()));
    item.id = (fd.get('id') || uid('SDC')).trim();
    item.active = fd.get('active') === 'true';
    item.updatedAt = new Date().toISOString();
    if (!item.name) return toast('El producto necesita nombre.');
    if (originalId) {
      const index = state.products.findIndex(p => p.id === originalId);
      if (index >= 0) state.products[index] = item;
      if (originalId !== item.id) updateCartIds(originalId, item.id);
    } else {
      if (state.products.some(p => p.id === item.id)) return toast('Ya existe un producto con ese SKU.');
      state.products.unshift(item);
    }
    saveProducts();
    state.modal = null;
    toast('Producto guardado.');
    render();
  }

  function updateDraftProduct(){ /* reserved for future inline previews */ }

  function toggleProduct(id){
    const p = findProduct(id);
    if (!p) return;
    p.active = p.active === false;
    p.updatedAt = new Date().toISOString();
    saveProducts(); render();
  }

  function deleteProduct(id){
    state.products = state.products.filter(p => p.id !== id);
    saveProducts(); render();
  }

  function saveClientForm(form){
    const fd = new FormData(form);
    const id = form.dataset.id;
    const c = { ...(id ? findClient(id) : emptyClient()), ...Object.fromEntries(fd.entries()) };
    c.id = id || uid('CLI');
    c.totalSpent = Number(c.totalSpent || 0);
    c.purchases = Number(c.purchases || 0);
    if (!c.name) return toast('El cliente necesita nombre.');
    if (id) {
      const index = state.clients.findIndex(x => x.id === id);
      if (index >= 0) state.clients[index] = c;
    } else state.clients.unshift(c);
    writeStore(STORE.clients, state.clients);
    state.modal = null;
    toast('Cliente guardado.');
    render();
  }

  function deleteClient(id){
    state.clients = state.clients.filter(c => c.id !== id);
    writeStore(STORE.clients, state.clients);
    render();
  }

  async function syncFirebaseNow(){
    try {
      toast('Actualizando Firebase...');
      await waitForFirebaseReady();
      if (typeof window.guardarProductoFirebase !== 'function') {
        throw new Error('No está disponible guardarProductoFirebase.');
      }
      const products = state.products.map(productForFirebase);
      for (const product of products) {
        await window.guardarProductoFirebase(product, product.codigo);
      }
      if (typeof window.respaldarDatosFirebase === 'function') {
        await window.respaldarDatosFirebase({
          productos: products,
          products,
          recibos: state.receipts,
          clientes: state.clients,
          fuente: 'sdc-smart-panel',
          actualizadoEn: new Date().toISOString()
        });
      }
      toast(`Firebase actualizado: ${products.length} producto(s).`);
    } catch (error) {
      console.error(error);
      toast('No se pudo actualizar Firebase. Revisa internet, permisos o configuración.');
    }
  }

  function waitForFirebaseReady(timeout = 9000){
    if (window.SDC_FIREBASE?.ready && typeof window.guardarProductoFirebase === 'function') return Promise.resolve(true);
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const done = () => {
        cleanup();
        resolve(true);
      };
      const cleanup = () => {
        clearInterval(timer);
        window.removeEventListener('sdc-firebase-ready', done);
      };
      window.addEventListener('sdc-firebase-ready', done, { once:true });
      const timer = setInterval(() => {
        if (window.SDC_FIREBASE?.ready && typeof window.guardarProductoFirebase === 'function') return done();
        if (Date.now() - started > timeout) {
          cleanup();
          reject(new Error('Firebase no terminó de cargar.'));
        }
      }, 250);
    });
  }

  function productForFirebase(p){
    const stock = Math.max(0, Number(p.stock || 0));
    const active = p.active !== false;
    return {
      id: p.id,
      codigo: p.id,
      sku: p.id,
      nombre: p.name,
      name: p.name,
      categoria: p.category || 'General',
      categories: p.category || 'General',
      costo: Number(p.cost || 0),
      cost: Number(p.cost || 0),
      precio: Number(p.price || 0),
      price: Number(p.price || 0),
      stock,
      stock_inicial: stock,
      img: p.image || '',
      image: p.image || '',
      descripcion: p.description || '',
      description: p.description || '',
      activo: active,
      active,
      estado: !active ? 'inactivo' : stock <= 0 ? 'agotado' : 'disponible',
      status: !active ? 'inactivo' : stock <= 0 ? 'agotado' : 'disponible',
      actualizadoEn: new Date().toISOString()
    };
  }

  async function resetProductsFromFile(){
    try {
      const res = await fetch('products_from_xlsx.json', { cache: 'no-store' });
      const data = await res.json();
      state.products = data.map(normalizeProduct);
      saveProducts();
      toast('Inventario restaurado.');
      render();
    } catch (error) {
      console.error(error);
      toast('No se pudo restaurar el inventario.');
    }
  }

  function importProductsFile(){
    const file = importInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        let data;
        if (file.name.toLowerCase().endsWith('.csv')) data = parseCSV(text);
        else data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Formato no válido');
        state.products = data.map(normalizeProduct);
        saveProducts();
        toast('Productos importados correctamente.');
        render();
      } catch (error) {
        console.error(error);
        toast('No se pudo importar el archivo. Revisa el formato.');
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function parseCSV(text){
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = splitCSVLine(lines.shift()).map(h => h.trim());
    return lines.map(line => {
      const cells = splitCSVLine(line);
      const obj = {};
      headers.forEach((h,i) => obj[h] = cells[i] || '');
      return obj;
    });
  }

  function splitCSVLine(line){
    const out = [];
    let cur = '', quote = false;
    for (let i=0;i<line.length;i++) {
      const ch = line[i];
      if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quote = !quote;
      else if (ch === ',' && !quote) { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  function deleteReceipt(id){
    state.receipts = state.receipts.filter(r => r.id !== id);
    writeStore(STORE.receipts, state.receipts);
    render();
  }

  function updateCartIds(oldId, newId){
    for (const list of [state.quoteCart, state.saleCart]) {
      list.forEach(item => { if (item.id === oldId) item.id = newId; });
    }
    saveCart('quote'); saveCart('sale');
  }

  function metrics(){
    const active = state.products.filter(isActive);
    const today = new Date().toISOString().slice(0,10);
    const todayReceipts = state.receipts.filter(r => String(r.date).slice(0,10) === today);
    return {
      totalProducts: state.products.length,
      activeProducts: active.length,
      units: active.reduce((a,p) => a + Number(p.stock || 0), 0),
      saleValue: active.reduce((a,p) => a + Number(p.price || 0) * Number(p.stock || 0), 0),
      investment: active.reduce((a,p) => a + Number(p.cost || 0) * Number(p.stock || 0), 0),
      profit: active.reduce((a,p) => a + (Number(p.price || 0) - Number(p.cost || 0)) * Number(p.stock || 0), 0),
      lowStock: active.filter(p => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5).length,
      outStock: active.filter(p => Number(p.stock || 0) <= 0).length,
      todaySales: todayReceipts.reduce((a,r) => a + Number(r.total || 0), 0),
      todayReceipts: todayReceipts.length
    };
  }

  function normalizeProduct(p){
    const categoryRaw = p.category ?? p.categories ?? p.categoria ?? 'General';
    const category = String(categoryRaw || 'General').split(/[|,;]/)[0].trim() || 'General';
    const id = String(p.id ?? p.sku ?? p.SKU ?? uid('SDC')).trim();
    return {
      id,
      name: String(p.name ?? p.nombre ?? 'Producto sin nombre').trim(),
      category,
      categories: category,
      brand: String(p.brand ?? p.marca ?? '').trim(),
      price: asNumber(p.price ?? p.precio),
      cost: asNumber(p.cost ?? p.costo),
      stock: asNumber(p.stock ?? p.inventario ?? p.cantidad),
      colors: String(p.colors ?? '').trim(),
      image: String(p.image ?? p.imagen ?? '').trim(),
      gallery: String(p.gallery ?? '').trim(),
      description: String(p.description ?? p.descripcion ?? '').trim(),
      promos: String(p.promos ?? '').trim(),
      updatedAt: p.updatedAt || new Date().toISOString(),
      active: p.active === false || p.active === 'false' ? false : true
    };
  }

  function emptyProduct(){
    return normalizeProduct({ id: uid('SDC'), name:'', category:'General', brand:'', price:0, cost:0, stock:0, image:'', description:'', active:true });
  }
  function emptyClient(){ return { id: uid('CLI'), name:'', phone:'', zone:'Comayagua', purchases:0, totalSpent:0, lastPurchase:'' }; }
  function snapshotProduct(p){ return { id:p.id, name:p.name, price:Number(p.price||0), cost:Number(p.cost||0), stock:Number(p.stock||0), category:p.category, image:p.image, active:p.active }; }
  function findProduct(id){ return state.products.find(p => p.id === id); }
  function findReceipt(id){ return state.receipts.find(r => r.id === id); }
  function findClient(id){ return state.clients.find(c => c.id === id); }
  function isActive(p){ return p && p.active !== false; }
  function canSell(p){ return isActive(p) && Number(p.stock || 0) > 0; }
  function productImage(p){ return p?.image || 'assets/logo-sdc-2026.png'; }
  function statusBadge(p){
    if (p.active === false) return '<span class="badge info">Inactivo</span>';
    if (Number(p.stock || 0) <= 0) return '<span class="badge out">Agotado</span>';
    if (Number(p.stock || 0) <= 5) return '<span class="badge low">Stock bajo</span>';
    return '<span class="badge ok">Disponible</span>';
  }

  function pageMeta(route){
    const data = {
      dashboard: ['Panel principal','Inicio','Resumen premium de inventario, ventas, inversión y productos importantes.'],
      catalog: ['Productos','Catálogo','Vista visual con categorías modernas, filtros y acciones rápidas.'],
      quote: ['WhatsApp','Cotizar','Crea mensajes claros para enviar al cliente sin descontar inventario.'],
      sell: ['POS','Vender','Registra ventas reales, descuenta stock y genera recibos.'],
      receipts: ['Historial','Recibos','Consulta ventas, copia recibos y descarga imágenes.'],
      clients: ['CRM','Clientes','Base local de compradores y total vendido por cliente.'],
      admin: ['Configuración','Administrar','Control completo del inventario local y datos de productos.']
    }[route] || ['Panel','Inicio',''];
    return { kicker:data[0], title:data[1], subtitle:data[2] };
  }

  function routeFromHash(){
    const route = location.hash.replace('#/','').replace('#','') || 'dashboard';
    return navItems.some(([r]) => r === route) ? route : 'dashboard';
  }
  function go(route){ location.hash = `#/${route}`; if (state.route === route) render(); }
  function saveProducts(){ writeStore(STORE.products, state.products); }
  function readStore(key, fallback){
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  }
  function writeStore(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(error) { console.warn(error); }
  }
  function asNumber(value){
    if (value === null || value === undefined || value === '') return 0;
    const n = Number(String(value).replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function lempira(value){ return `Lps. ${MONEY.format(Number(value || 0))}`; }
  function formatDate(value){
    try { return new Intl.DateTimeFormat('es-HN', { dateStyle:'medium', timeStyle:'short' }).format(new Date(value)); }
    catch { return String(value || ''); }
  }
  function slugify(value){
    return norm(value).replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'categoria';
  }
  function norm(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  function uid(prefix){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`.toUpperCase(); }
  function esc(value){ return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
  function escAttr(value){ return esc(value).replace(/`/g,'&#96;'); }

  async function copyText(text, success){
    try {
      await navigator.clipboard.writeText(text);
      toast(success || 'Copiado.');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      toast(success || 'Copiado.');
    }
  }

  function downloadJson(filename, data){
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 800);
    toast('Archivo exportado.');
  }

  function toast(message){
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }
})();
