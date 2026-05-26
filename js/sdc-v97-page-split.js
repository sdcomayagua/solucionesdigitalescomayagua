/* SDC V151: puente sin duplicar barras antiguas. */
(function(){
  'use strict';
  const VALID=new Set(['inicio','panel','productos']);
  function clean(page){ return VALID.has(page)?page:(page==='catalog'?'inicio':'inicio'); }
  function setPage(page, opts={}){
    const target=clean(page);
    try{
      localStorage.setItem('sdc_v150_page',target);
      localStorage.setItem('sdc_v97_page',target==='panel'?'inicio':target);
    }catch(e){}
    if(typeof window.SDCSetPageV150==='function'){
      window.SDCSetPageV150(target);
    }else{
      document.body.dataset.sdcPageV150=target;
    }
    if(target==='productos' && opts.focusSearch){
      setTimeout(()=>{
        const search=document.querySelector('#inventorySearchInput') || document.querySelector('#searchInput');
        search?.scrollIntoView({behavior:'smooth',block:'center'});
        setTimeout(()=>search?.focus({preventScroll:true}),180);
      },120);
    }
  }
  document.addEventListener('click',ev=>{
    const pageBtn=ev.target.closest('[data-sdc-page-target]');
    if(pageBtn){ ev.preventDefault(); ev.stopImmediatePropagation(); setPage(pageBtn.dataset.sdcPageTarget); return; }
    const btn=ev.target.closest('[data-action]');
    if(!btn) return;
    if(btn.dataset.action==='catalog'){ ev.preventDefault(); ev.stopImmediatePropagation(); setPage('inicio'); }
    if(btn.dataset.action==='focusSearch'){ ev.preventDefault(); ev.stopImmediatePropagation(); setPage('productos',{focusSearch:true}); }
  },true);
  window.SDCSetPageV97=setPage;
})();
