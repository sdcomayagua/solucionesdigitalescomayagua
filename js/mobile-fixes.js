(() => {
  'use strict';

  const STORE = {
    products: 'sdc_smart_products_v1',
    quote: 'sdc_smart_quote_v1',
    sale: 'sdc_smart_sale_v1'
  };

  function read(key, fallback){
    try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  }

  function write(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); } catch(error) { console.warn(error); }
  }

  function findProduct(id){
    return read(STORE.products, []).find(p => p && p.id === id);
  }

  function snapshot(p){
    return { id:p.id, name:p.name, price:Number(p.price||0), cost:Number(p.cost||0), stock:Number(p.stock||0), category:p.category, image:p.image, active:p.active };
  }

  function addToCart(cart, id){
    const p = findProduct(id);
    if (!p) return false;
    const key = cart === 'sale' ? STORE.sale : STORE.quote;
    const items = read(key, []);
    const found = items.find(item => item.id === id);
    if (found) found.qty = Math.max(1, Number(found.qty || 1) + 1);
    else items.push({ id, qty:1, snapshot:snapshot(p) });
    write(key, items);
    return true;
  }

  async function copyText(text){
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function lempira(value){
    return `Lps. ${new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  }

  function productMessage(id){
    const p = findProduct(id);
    if (!p) return 'Producto no encontrado.';
    return [
      '🛍️ *Producto SD Comayagua*',
      '',
      `📦 *${p.name}*`,
      `🏷️ Precio: *${lempira(p.price)}*`,
      `📂 Categoría: ${p.category || 'General'}`,
      `📦 Stock disponible: ${Number(p.stock || 0)}`,
      '',
      '📍 Disponible en Comayagua.',
      '🚚 Para envío fuera de Comayagua, se puede cotizar envío normal o pagar al recibir.',
      '',
      'ℹ️ Total sujeto al producto seleccionado y al envío cotizado.'
    ].join('\n');
  }

  function showToast(message){
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._mobileFixTimer);
    toast._mobileFixTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function go(route){
    location.hash = `#/${route}`;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function ensureAdminButton(){
    if (document.querySelector('.mobile-admin-fab')) return;
    const btn = document.createElement('button');
    btn.className = 'mobile-admin-fab';
    btn.type = 'button';
    btn.dataset.route = 'admin';
    btn.innerHTML = '⚙️ Admin';
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      go('admin');
    });
    document.body.appendChild(btn);
  }

  // Agrega Admin al menú inferior en celular aunque el render original solo muestre 5 botones.
  function patchMobileNav(){
    const nav = document.querySelector('.mobile-nav');
    if (!nav || nav.querySelector('[data-route="admin"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.route = 'admin';
    btn.innerHTML = '<span>⚙️</span>Admin';
    if (location.hash.replace('#/','') === 'admin') btn.classList.add('active');
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      go('admin');
    });
    nav.appendChild(btn);
  }

  // Hace que los botones del modal sí lleven al usuario a la pantalla correcta.
  document.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (!id) return;

    if (action === 'detail-quote') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (addToCart('quote', id)) {
        showToast('Producto agregado a cotización.');
        go('quote');
      }
    }

    if (action === 'detail-sell') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (addToCart('sale', id)) {
        showToast('Producto agregado a venta.');
        go('sell');
      }
    }

    if (action === 'detail-whatsapp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      await copyText(productMessage(id));
      showToast('Mensaje del producto copiado.');
    }

    if (action === 'admin-edit') {
      event.preventDefault();
      event.stopImmediatePropagation();
      showToast('Abriendo administrador para editar producto.');
      go('admin');
    }
  }, true);

  const observer = new MutationObserver(() => {
    ensureAdminButton();
    patchMobileNav();
  });

  window.addEventListener('DOMContentLoaded', () => {
    ensureAdminButton();
    patchMobileNav();
    observer.observe(document.body, { childList:true, subtree:true });
  });
})();
