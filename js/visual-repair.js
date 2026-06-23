// V7: reparación visual ligera para móvil (encabezado y nombres de productos)
(() => {
  'use strict';
  const BRAND_CLASS = 'sdc-mobile-brand-fix';
  let timer = 0;

  function clean(text){
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function visibleText(el){
    return clean(el ? el.innerText : '');
  }

  function ensureHeader(){
    const root = document.querySelector('.main, main, #app');
    if (!root || root.querySelector('.' + BRAND_CLASS)) return;
    const brand = document.createElement('div');
    brand.className = BRAND_CLASS;
    brand.innerHTML = '<div class="brand-dot">SD</div><div><strong>SD COMAYAGUA</strong><span>Inventario · ventas · catálogo</span></div>';
    const first = root.firstElementChild;
    root.insertBefore(brand, first || null);
  }

  function getCardName(card){
    const data = card.dataset || {};
    let name = clean(data.name || data.title || data.productName || data.product || '');
    if (!name) name = clean(card.getAttribute('aria-label') || '').replace(/^Abrir opciones de\s*/i, '');
    if (!name) {
      const img = card.querySelector('img[alt]');
      if (img && !/logo|imagen/i.test(img.alt || '')) name = clean(img.alt);
    }
    if (!name) {
      const title = card.querySelector('.product-title,.product-name,.item-title,h3,h4');
      if (title) name = clean(title.textContent);
    }
    return name;
  }

  function ensureProductNames(){
    const cards = document.querySelectorAll('.product-grid .product-card,.product-grid article,.products-grid .product-card,.products-grid article,.catalog-grid .product-card,.catalog-grid article,.interactive-product[data-id]');
    cards.forEach(card => {
      const name = getCardName(card);
      if (!name) return;
      const existing = card.querySelector('.product-title,.product-name,.item-title,.sdc-product-name-fix');
      if (existing) {
        if (!clean(existing.textContent)) existing.textContent = name;
        existing.style.display = '';
        existing.style.visibility = 'visible';
        existing.style.opacity = '1';
        return;
      }
      if (visibleText(card).length > 2) return;
      const box = document.createElement('div');
      box.className = 'sdc-product-info-fix';
      const title = document.createElement('div');
      title.className = 'sdc-product-name-fix';
      title.textContent = name;
      const hint = document.createElement('div');
      hint.className = 'sdc-product-hint-fix';
      hint.textContent = 'Tocar para ver opciones';
      box.append(title, hint);
      card.appendChild(box);
    });
  }

  function run(){
    ensureHeader();
    ensureProductNames();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();

  const target = document.getElementById('app') || document.body;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 70);
  }).observe(target, { childList:true, subtree:true });
})();
