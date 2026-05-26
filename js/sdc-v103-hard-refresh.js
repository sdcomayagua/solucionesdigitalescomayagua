/* SDC V147: MENU y ACTUALIZAR FIREBASE arriba del encabezado. */
(function(){
  'use strict';
  const VERSION='108-refresh-top-tools';
  const STAMP='sdc_refresh_stamp';

  function toast(msg){
    const el=document.getElementById('toast');
    if(el){
      el.textContent=msg;
      el.classList.add('show');
      clearTimeout(el._sdcRefreshTimer);
      el._sdcRefreshTimer=setTimeout(()=>el.classList.remove('show'),2400);
    }else{
      console.log(msg);
    }
  }

  function utilityHTML(){
    return `<nav class="sdc-utility-tabs-v105 sdc-top-tools-v108 sdc-top-tools-v147 no-print" data-sdc-utility-tabs="1" aria-label="Acciones del sistema">
      <button type="button" class="sdc-sync-tab-v105 sdc-menu-tab-v147" data-sdc127="open" title="Abrir menú">
        <i>☰</i><span>Menú</span>
      </button>
      <button type="button" class="sdc-refresh-tab-v105 sdc-refresh-tab-v147" data-action="sync" data-sdc-utility-sync="1" title="Actualizar Firebase" aria-label="Actualizar Firebase">
        <i class="sdc-refresh-icon-v103">↻</i><span class="sdc-refresh-text-v103">Actualizar Firebase</span>
      </button>
    </nav>`;
  }

  function cleanOldButtons(){
    document.querySelectorAll('.topbar [data-sdc-hard-refresh], .topbar-v87 [data-sdc-hard-refresh], [data-sdc-page-tabs] [data-sdc-hard-refresh]').forEach(btn=>btn.remove());
    document.querySelectorAll('[data-sdc-utility-tabs]').forEach((row,idx)=>{ if(idx>0) row.remove(); });
  }

  function ensureButton(){
    cleanOldButtons();
    const top=document.querySelector('.topbar,.topbar-v87');
    if(!top) return;
    let row=document.querySelector('[data-sdc-utility-tabs]');
    if(!row){
      top.insertAdjacentHTML('beforebegin',utilityHTML());
    }else if(row.nextElementSibling!==top){
      top.parentNode.insertBefore(row, top);
      row.classList.add('sdc-top-tools-v108');
    }
  }

  async function clearBrowserCaches(){
    const jobs=[];
    try{
      if('caches' in window){
        const names=await caches.keys();
        jobs.push(...names.map(name=>caches.delete(name)));
      }
    }catch(err){ console.warn('No se pudo limpiar CacheStorage',err); }
    try{
      if('serviceWorker' in navigator){
        const regs=await navigator.serviceWorker.getRegistrations();
        jobs.push(...regs.map(reg=>reg.unregister()));
      }
    }catch(err){ console.warn('No se pudo quitar service worker',err); }
    await Promise.allSettled(jobs);
  }

  function cleanLocalRuntimeCache(){
    try{
      const keepExact=new Set(['sdc_v83_theme','sdc_v97_page','sdc_inventory_layout','sdc_card_view']);
      Object.keys(localStorage).forEach(key=>{
        if(keepExact.has(key)) return;
        if(/cache|version|stamp|boot|assets|build|refresh/i.test(key)) localStorage.removeItem(key);
      });
      Object.keys(sessionStorage).forEach(key=>sessionStorage.removeItem(key));
      localStorage.setItem(STAMP,VERSION+'-'+Date.now());
      localStorage.setItem('sdc_v83_theme','light');
    }catch(err){ console.warn('No se pudo limpiar storage temporal',err); }
  }

  async function hardRefresh(){
    const btn=document.querySelector('[data-sdc-hard-refresh]');
    if(btn){
      btn.disabled=true;
      btn.classList.add('is-updating');
      const text=btn.querySelector('.sdc-refresh-text-v103');
      if(text) text.textContent='Actualizando';
    }
    toast('Actualizando sistema y borrando caché...');
    await clearBrowserCaches();
    cleanLocalRuntimeCache();
    const url=new URL(window.location.href);
    url.searchParams.set('v','108');
    url.searchParams.set('t',Date.now().toString());
    window.location.replace(url.toString());
  }

  document.addEventListener('click',ev=>{
    const btn=ev.target.closest('[data-sdc-hard-refresh]');
    if(!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    hardRefresh();
  },true);

  document.addEventListener('click',ev=>{
    const syncBtn=ev.target.closest('[data-sdc-utility-sync]');
    if(!syncBtn) return;
    ev.preventDefault();
    ev.stopPropagation();
    const target=[...document.querySelectorAll('[data-action="sync"]')].find(btn=>btn!==syncBtn);
    if(target){ target.click(); return; }
    toast('Actualizando Firebase...');
  },true);

  document.addEventListener('DOMContentLoaded',ensureButton,{passive:true});
  window.addEventListener('load',ensureButton,{passive:true});
  const mo=new MutationObserver(ensureButton);
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();
