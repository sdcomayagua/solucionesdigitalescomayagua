(() => {
  'use strict';

  const STORE = { products: 'sdc_smart_products_v1', quote: 'sdc_smart_quote_v1', sale: 'sdc_smart_sale_v1' };
  const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.warn(e); } };
  const products = () => read(STORE.products, []);
  const findProduct = id => products().find(p => p && p.id === id);
  const lempira = value => `Lps. ${new Intl.NumberFormat('es-HN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function snapshot(p){ return { id:p.id, name:p.name, price:Number(p.price||0), cost:Number(p.cost||0), stock:Number(p.stock||0), category:p.category, image:p.image, active:p.active }; }
  function addToCart(cart, id){ const p = findProduct(id); if (!p) return false; const key = cart === 'sale' ? STORE.sale : STORE.quote; const items = read(key, []); const found = items.find(item => item.id === id); if (found) found.qty = Math.max(1, Number(found.qty || 1) + 1); else items.push({ id, qty:1, snapshot:snapshot(p) }); write(key, items); return true; }
  async function copyText(text){ try { await navigator.clipboard.writeText(text); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } }
  function showToast(message){ const toast = document.getElementById('toast'); if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(toast._mobileFixTimer); toast._mobileFixTimer = setTimeout(() => toast.classList.remove('show'), 2400); }
  function go(route){ location.hash = `#/${route}`; window.dispatchEvent(new HashChangeEvent('hashchange')); }
  function patchMobileNav(){ const nav = document.querySelector('.mobile-nav'); if (!nav || nav.querySelector('[data-route="admin"]')) return; const btn = document.createElement('button'); btn.type='button'; btn.dataset.route='admin'; btn.innerHTML='<span>⚙️</span>Admin'; if (location.hash.replace('#/','') === 'admin') btn.classList.add('active'); btn.addEventListener('click', e => { e.preventDefault(); go('admin'); }); nav.appendChild(btn); }
  function productMessage(id){ const p = findProduct(id); if (!p) return 'Producto no encontrado.'; return ['🛍️ *Producto SD Comayagua*','',`📦 *${p.name}*`,`🏷️ Precio: *${lempira(p.price)}*`,`📂 Categoría: ${p.category || 'General'}`,`📦 Stock disponible: ${Number(p.stock || 0)}`,'','📍 Disponible en Comayagua.','🚚 Para envío fuera de Comayagua, se puede cotizar envío normal o pagar al recibir.','','ℹ️ Total sujeto al producto seleccionado y al envío cotizado.'].join('\n'); }

  function patchProductSelectors(){
    ['quote','sale'].forEach(cart => {
      const nativeSelect = document.querySelector(`select[data-${cart}-select]`);
      if (!nativeSelect || nativeSelect.dataset.smartReady === '1') return;
      nativeSelect.dataset.smartReady = '1';
      const all = products().filter(p => p && p.active !== false);
      const categories = [...new Set(all.map(p => p.category || 'General'))].sort((a,b)=>a.localeCompare(b,'es'));
      const box = document.createElement('div');
      box.className = 'smart-selector';
      box.innerHTML = `<div class="smart-selector-row"><div><label>Categoría</label><select data-smart-category="${cart}"><option value="">Selecciona categoría...</option>${categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div><div><label>Producto</label><select data-smart-product="${cart}"><option value="">Primero elige categoría...</option></select></div></div><small>Elegí categoría y después producto para evitar el listado completo.</small>`;
      nativeSelect.closest('.form-grid')?.before(box);
      nativeSelect.closest('.form-grid').style.display = 'none';
      const catSel = box.querySelector(`[data-smart-category="${cart}"]`);
      const prodSel = box.querySelector(`[data-smart-product="${cart}"]`);
      catSel.addEventListener('change', () => { const subset = all.filter(p => !catSel.value || (p.category || 'General') === catSel.value); prodSel.innerHTML = `<option value="">Selecciona producto...</option>` + subset.map(p => `<option value="${esc(p.id)}">${esc(p.name)} · ${lempira(p.price)} · Stock ${Number(p.stock || 0)}</option>`).join(''); nativeSelect.value = ''; });
      prodSel.addEventListener('change', () => { nativeSelect.value = prodSel.value; });
    });
  }

  function quoteItems(){ return read(STORE.quote, []).map(item => ({...item, product: findProduct(item.id) || item.snapshot || {}})); }
  function subtotal(items){ return items.reduce((sum,i)=>sum + Number(i.product.price || 0) * Number(i.qty || 1), 0); }
  function buildOutsideQuote(mode){
    const items = quoteItems(); const sub = subtotal(items); const shipping = sub > 0 ? 110 : 0; const normal = sub + shipping; const commission = sub > 0 ? Math.ceil(normal * 0.10) : 0; const cod = normal + commission;
    const lines = ['🛍️ *Cotización SD Comayagua*','','📍 *Ubicación:* Fuera de Comayagua','','📦 *PRODUCTOS*','━━━━━━━━━━━━━━━━'];
    items.forEach((item, index) => { const p = item.product; const qty = Number(item.qty || 1); const price = Number(p.price || 0); lines.push(`${index + 1}. *${p.name || 'Producto'}*`,`   Cantidad: *${qty}*`,`   Precio unidad: *${lempira(price)}*`,`   Subtotal: *${lempira(price * qty)}*`, ''); });
    lines.push('━━━━━━━━━━━━━━━━',`💰 *Total productos:* *${lempira(sub)}*`,'🚚 *Envío fuera de Comayagua:*',`*${lempira(shipping)}*`,'');
    if (mode === 'normal') lines.push('✅ *Total envío normal:*',`*${lempira(normal)}*`,'🏦 Pago por depósito o transferencia antes del envío.');
    else if (mode === 'cod') lines.push(`🧾 *Base productos + envío:* *${lempira(normal)}*`,`🔟 *Comisión 10%:* *${lempira(commission)}*`,'','✅ *Total pagar al recibir:*',`*${lempira(cod)}*`,'📦 Esta opción incluye el 10% porque la empresa maneja el dinero del pedido.');
    else lines.push('📌 *Opciones fuera de Comayagua*','','1️⃣ *Envío normal / depósito:*',`   *${lempira(normal)}*`,'   Productos + envío.','','2️⃣ *Pagar al recibir:*',`   *${lempira(cod)}*`,`   Base productos + envío: *${lempira(normal)}*`,`   Comisión 10%: *${lempira(commission)}*`);
    lines.push('','ℹ️ Total sujeto al producto seleccionado y al envío cotizado.'); return lines.join('\n');
  }

  document.addEventListener('click', async event => {
    const btn = event.target.closest('[data-action]'); if (!btn) return; const action = btn.dataset.action; const id = btn.dataset.id;
    if (action === 'copy-quote' && ['normal','cod','both'].includes(btn.dataset.mode || '')) { event.preventDefault(); event.stopImmediatePropagation(); await copyText(buildOutsideQuote(btn.dataset.mode)); showToast('Cotización copiada.'); return; }
    if (!id) return;
    if (action === 'detail-quote') { event.preventDefault(); event.stopImmediatePropagation(); if (addToCart('quote', id)) { showToast('Producto agregado a cotización.'); go('quote'); } }
    if (action === 'detail-sell') { event.preventDefault(); event.stopImmediatePropagation(); if (addToCart('sale', id)) { showToast('Producto agregado a venta.'); go('sell'); } }
    if (action === 'detail-whatsapp') { event.preventDefault(); event.stopImmediatePropagation(); await copyText(productMessage(id)); showToast('Mensaje del producto copiado.'); }
    if (action === 'admin-edit') { event.preventDefault(); event.stopImmediatePropagation(); showToast('Abriendo administrador para editar producto.'); go('admin'); }
  }, true);

  const observer = new MutationObserver(() => { document.querySelectorAll('.mobile-admin-fab').forEach(el => el.remove()); patchMobileNav(); patchProductSelectors(); });
  window.addEventListener('DOMContentLoaded', () => { document.querySelectorAll('.mobile-admin-fab').forEach(el => el.remove()); patchMobileNav(); patchProductSelectors(); observer.observe(document.body, { childList:true, subtree:true }); });
})();
