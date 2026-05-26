/* SDC V127: menú estable, liviano y sin congelar la página. */
(function(){
  'use strict';

  const STORE_KEY = 'sdc_control_ventas_v90';
  const LOGO = 'assets/logo-sdc.png';
  let bound = false;

  function ensureCss(){ return; }

  function state(){
    try{ return window.SDCStore && window.SDCStore.load ? window.SDCStore.load() : JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); }
    catch(e){ return {products:[],sales:[],quotes:[]}; }
  }
  function n(v){ return Number(v)||0; }
  function money(v){ return 'Lps. ' + n(v).toLocaleString('es-HN',{maximumFractionDigits:0}); }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
  function stock(p){ return Array.isArray(p.colors)&&p.colors.length ? p.colors.reduce((a,r)=>a+n(r.qty),0) : n(p.stock); }
  function totalSale(s){ return n(s.total)||n(s.grandTotal)||(s.items||[]).reduce((a,it)=>a+n(it.total||n(it.price)*n(it.qty||1)),0); }
  function profitSale(s){ return (s.items||[]).reduce((a,it)=>a+(n(it.price)-n(it.cost))*n(it.qty||1),0); }
  function isToday(d){ const a=new Date(d||Date.now()), b=new Date(); return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function toast(msg){ const el=document.getElementById('toast'); if(el){ el.textContent=msg; el.classList.add('show'); clearTimeout(el._v127); el._v127=setTimeout(()=>el.classList.remove('show'),2200); } }

  function removeOldMenu(){
    document.querySelectorAll('.sdc-menu-fab-v116,.sdc-menu-backdrop-v116,.sdc-menu-drawer-v116').forEach(el=>el.remove());
  }
  function openMenu(){ document.body.classList.add('sdc-menu-open-v116'); }
  function closeMenu(){ document.body.classList.remove('sdc-menu-open-v116'); }
  function closePanels(){ document.querySelectorAll('.sdc-menu-modal-v116').forEach(el=>el.remove()); }

  function renderMenu(){
    removeOldMenu();
    document.body.insertAdjacentHTML('beforeend', `
      <button class="sdc-menu-fab-v116 no-print" type="button" data-sdc127="open" aria-label="Abrir menú">☰</button>
      <div class="sdc-menu-backdrop-v116 no-print" data-sdc127="close"></div>
      <aside class="sdc-menu-drawer-v116 no-print" aria-label="Menú rápido">
        <div class="sdc-menu-head-v116">
          <div class="sdc-menu-brand-v116"><img src="${LOGO}" alt="SD"><div><b>SD Comayagua</b><span>Menú rápido</span></div></div>
          <button class="sdc-menu-close-v116" type="button" data-sdc127="close">×</button>
        </div>
        <div class="sdc-menu-grid-v116">
          <button class="sdc-menu-item-v116 primary" type="button" data-sdc127="inicio"><i>⌂</i><span>Inicio</span><small>Panel</small></button>
          <button class="sdc-menu-item-v116 primary" type="button" data-sdc127="productos"><i>▦</i><span>Productos</span><small>Catálogo</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="vender"><i>⚡</i><span>Vender</span><small>Recibo</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="cotizar"><i>▧</i><span>Cotizar</span><small>Cotización</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="ganancias"><i>$</i><span>Ganancias</span><small>Utilidad</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="recibos"><i>▤</i><span>Recibos</span><small>Caja</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="alertas"><i>!</i><span>Alertas</span><small>Inventario</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="cotizaciones"><i>☷</i><span>Cotizaciones</span><small>Guardadas</small></button>
          <button class="sdc-menu-item-v116" type="button" data-sdc127="nuevo"><i>+</i><span>Producto</span><small>Agregar</small></button>
        </div>
      </aside>`);
  }

  function goPage(page){
    closeMenu();
    closePanels();
    if(window.SDCSetPageV97) window.SDCSetPageV97(page,{smooth:false});
    else { localStorage.setItem('sdc_v97_page', page); location.reload(); }
  }

  function findVisibleButton(words){
    const list = Array.from(document.querySelectorAll('button,a,[role="button"]'));
    const targets = words.map(w=>w.toLowerCase());
    for(const el of list){
      if(el.closest('.sdc-menu-drawer-v116,.sdc-menu-modal-v116')) continue;
      const box = el.getBoundingClientRect();
      const visible = box.width > 4 && box.height > 4;
      if(!visible) continue;
      const txt = (el.textContent || el.getAttribute('aria-label') || '').toLowerCase().replace(/\s+/g,' ').trim();
      if(targets.some(w=>txt.includes(w))) return el;
    }
    return null;
  }

  function runHomeButton(words, fallbackMsg){
    closeMenu();
    closePanels();
    goPage('inicio');
    setTimeout(()=>{
      const btn = findVisibleButton(words);
      if(btn) btn.click();
      else toast(fallbackMsg || 'No encontré el botón en Inicio.');
    }, 260);
  }

  function modal(title, html){
    closeMenu();
    closePanels();
    const div = document.createElement('div');
    div.className = 'sdc-menu-modal-v116';
    div.innerHTML = `<section class="sdc-menu-modal-card-v116" role="dialog" aria-modal="true">
      <header class="sdc-menu-modal-head-v116"><h3>${esc(title)}</h3><button type="button" data-sdc127-panel-close>×</button></header>
      <div class="sdc-menu-modal-body-v116">${html}</div>
    </section>`;
    div.addEventListener('click', ev=>{ if(ev.target===div || ev.target.closest('[data-sdc127-panel-close]')) closePanels(); });
    document.body.appendChild(div);
  }

  function openGains(){
    const s=state(), products=s.products||[], sales=s.sales||[];
    const invested = products.reduce((a,p)=>a+n(p.cost)*stock(p),0);
    const estimated = products.reduce((a,p)=>a+(n(p.price)-n(p.cost))*stock(p),0);
    const todayProfit = sales.filter(x=>isToday(x.date)).reduce((a,x)=>a+profitSale(x),0);
    const rows = products.slice(0,25).map(p=>`<div class="sdc-list-row-v116"><div><b>${esc(p.name)}</b><span>Costo ${money(p.cost)} · Venta ${money(p.price)} · Stock ${stock(p)}</span></div><em class="sdc-pill-v116">${money(n(p.price)-n(p.cost))}</em></div>`).join('');
    modal('Ganancias', `<div class="sdc-mini-stats-v116"><div class="sdc-mini-stat-v116"><span>Ganancia estimada</span><b>${money(estimated)}</b></div><div class="sdc-mini-stat-v116"><span>Invertido</span><b>${money(invested)}</b></div><div class="sdc-mini-stat-v116"><span>Ganancia hoy</span><b>${money(todayProfit)}</b></div><div class="sdc-mini-stat-v116"><span>Productos</span><b>${products.length}</b></div></div><div class="sdc-list-v116">${rows || '<div class="sdc-empty-v116">No hay productos.</div>'}</div>`);
  }

  function openReceipts(){
    const s=state(), sales=s.sales||[], todaySales=sales.filter(x=>isToday(x.date));
    const rows = sales.slice(0,40).map(x=>`<div class="sdc-list-row-v116"><div><b>${esc(x.client||'Cliente')}</b><span>${esc(x.id||'Recibo')} · ${new Date(x.date||Date.now()).toLocaleString('es-HN')}</span></div><em class="sdc-pill-v116">${money(totalSale(x))}</em></div>`).join('');
    modal('Recibos / Caja', `<div class="sdc-mini-stats-v116"><div class="sdc-mini-stat-v116"><span>Ventas hoy</span><b>${money(todaySales.reduce((a,x)=>a+totalSale(x),0))}</b></div><div class="sdc-mini-stat-v116"><span>Recibos hoy</span><b>${todaySales.length}</b></div></div><div class="sdc-list-v116">${rows || '<div class="sdc-empty-v116">Todavía no hay recibos.</div>'}</div>`);
  }

  function openAlerts(){
    const s=state(), products=s.products||[], alerts=[];
    products.forEach(p=>{
      if(stock(p)<=0) alerts.push([p.name,'Stock en cero','Agotado']);
      else if(stock(p)<=3) alerts.push([p.name,`Solo ${stock(p)} unidades`,'Bajo stock']);
      if(!String(p.image||p.gallery||'').trim()) alerts.push([p.name,'Agrega imagen','Sin foto']);
      if(n(p.price)-n(p.cost)<10) alerts.push([p.name,`Ganancia ${money(n(p.price)-n(p.cost))}`,'Revisar']);
    });
    const rows=alerts.slice(0,70).map(x=>`<div class="sdc-list-row-v116"><div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div><em class="sdc-pill-v116">${esc(x[2])}</em></div>`).join('');
    modal('Alertas', `<div class="sdc-mini-stats-v116"><div class="sdc-mini-stat-v116"><span>Total alertas</span><b>${alerts.length}</b></div><div class="sdc-mini-stat-v116"><span>Productos</span><b>${products.length}</b></div></div><div class="sdc-list-v116">${rows || '<div class="sdc-empty-v116">No hay alertas.</div>'}</div>`);
  }

  function openQuotes(){
    const q=(state().quotes||[]);
    const rows=q.slice(0,40).map(x=>`<div class="sdc-list-row-v116"><div><b>${esc(x.client||'Cliente')}</b><span>${esc(x.id||'Cotización')} · ${new Date(x.date||Date.now()).toLocaleString('es-HN')}</span></div><em class="sdc-pill-v116">${money(totalSale(x))}</em></div>`).join('');
    modal('Cotizaciones', `<div class="sdc-list-v116">${rows || '<div class="sdc-empty-v116">No hay cotizaciones guardadas.</div>'}</div>`);
  }

  function newProduct(){
    closeMenu();
    closePanels();
    goPage('productos');
    setTimeout(()=>{
      const btn=findVisibleButton(['nuevo producto','+ producto','producto']);
      if(btn) btn.click();
      else toast('No encontré el botón Nuevo producto.');
    }, 300);
  }

  function handle(action){
    if(!action) return;
    if(action==='open') return openMenu();
    if(action==='close') return closeMenu();
    if(action==='inicio') return goPage('inicio');
    if(action==='productos') return goPage('productos');
    if(action==='vender') return runHomeButton(['vender ahora','vender'], 'Abre Inicio y toca Vender ahora.');
    if(action==='cotizar') return runHomeButton(['cotizar'], 'Abre Inicio y toca Cotizar.');
    if(action==='ganancias') return openGains();
    if(action==='recibos') return openReceipts();
    if(action==='alertas') return openAlerts();
    if(action==='cotizaciones') return openQuotes();
    if(action==='nuevo') return newProduct();
  }

  function bind(){
    if(bound) return;
    bound = true;
    document.addEventListener('click', ev=>{
      const node = ev.target.closest('[data-sdc127]');
      if(!node) return;
      ev.preventDefault();
      ev.stopPropagation();
      handle(node.dataset.sdc127);
    }, false);
    document.addEventListener('keydown', ev=>{ if(ev.key==='Escape'){ closeMenu(); closePanels(); } });
  }

  function boot(){
    ensureCss();
    renderMenu();
    bind();
  }

  window.SDCMenuV127 = {boot, openMenu, closeMenu};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
