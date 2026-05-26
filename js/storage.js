(function(){
  const KEY = 'sdc_control_ventas_v90';
  const BACKUP_KEY = 'sdc_backups_v90';
  const LEGACY_BACKUP_KEYS = ['sdcBackups_v90','sdcBackups_v89','sdc_backups_v89'];
  function safeJSON(raw,fallback){try{return JSON.parse(raw)}catch(e){return fallback}}
  function uid(prefix='SDC'){return `${prefix}-${Date.now().toString().slice(-7)}${Math.floor(Math.random()*90+10)}`}
  function clone(x){return JSON.parse(JSON.stringify(x))}
  function textField(v,fallback=''){
    if(Array.isArray(v)) return v.map(x=>String(x||'').trim()).filter(Boolean).join(', ') || fallback;
    if(v && typeof v==='object') return Object.values(v).map(x=>String(x||'').trim()).filter(Boolean).join(', ') || fallback;
    return String(v ?? fallback);
  }
  function defaultState(){return {version:93,unlocked:false,products:clone(window.SDC_DEFAULT_PRODUCTS||[]),sales:[],quotes:[],clients:[],closings:[],expenses:[],lastReceipt:null,lastQuote:null,settings:clone(window.SDC_CONFIG||{})}}
  function normalizeColorRows(v){
    const cleanRow=(name,qty)=>{
      const n=String(name||'').trim();
      const q=Math.max(0,Math.floor(Number(String(qty??'').replace(/[^0-9.-]/g,''))||0));
      return n?{name:n,qty:q}:null;
    };
    if(Array.isArray(v)) return v.map(x=>{
      if(typeof x==='string'){
        const m=x.match(/^(.+?)(?:[:=]|\s+x\s+|\s+-\s+)\s*([0-9]+(?:[.,][0-9]+)?)$/i);
        return m?cleanRow(m[1],m[2]):cleanRow(x,0);
      }
      return cleanRow(x?.name||x?.color||x?.colour||x?.nombre||x?.label, x?.qty??x?.cantidad??x?.stock??x?.existencia);
    }).filter(Boolean);
    if(v && typeof v==='object') return Object.entries(v).map(([name,qty])=>cleanRow(name,qty)).filter(Boolean);
    const raw=String(v||'').trim();
    if(!raw) return [];
    try{ const parsed=JSON.parse(raw); if(parsed && parsed!==raw) return normalizeColorRows(parsed); }catch(e){}
    return raw.split(/\s*(?:\r?\n|\||;|,)\s*/).map(part=>{
      const txt=String(part||'').trim();
      if(!txt) return null;
      let m=txt.match(/^(.+?)(?:[:=]|\s+x\s+|\s+-\s+)\s*([0-9]+(?:[.,][0-9]+)?)$/i);
      if(!m) m=txt.match(/^([0-9]+(?:[.,][0-9]+)?)\s+(.+)$/);
      return m?(m[2]&&/^\d/.test(m[1])?cleanRow(m[2],m[1]):cleanRow(m[1],m[2])):cleanRow(txt,0);
    }).filter(Boolean);
  }
  function colorRowsTotal(rows){return normalizeColorRows(rows).reduce((a,r)=>a+(Number(r.qty)||0),0)}
  function normalizeProduct(p,i=0){
    const categories = p.categories || p.category || p.categoria || p.etiquetas || 'General';
    const image = p.image || p.imagen || p.imagenes || p.foto || p.fotos || (Array.isArray(p.images)&&p.images[0]) || '';
    const gallery = p.gallery || p.galeria || p.imagenes_extra || p.fotos_extra || p.images || '';
    const colors = normalizeColorRows(p.colors || p.colores || p.colorStock || p.stockColores || p.variantesColor || p.variantes_color || '');
    const rawStock = Number(p.stock??p.existencia??0)||0;
    const colorStock = colorRowsTotal(colors);
    return {
      id:textField(p.id||p.codigo||`SDC-${String(i+1).padStart(3,'0')}`),
      name:textField(p.name||p.nombre||'Producto sin nombre','Producto sin nombre'),
      categories:textField(categories,'General').replace(/^\[object Object\]$/i,'General'),
      price:Number(p.price??p.precio??p.precio_venta??0)||0,
      cost:Number(p.cost??p.costo??p.costo_compra??0)||0,
      stock:colors.length?colorStock:rawStock,
      colors,
      brand:textField(p.brand||p.marca||''),
      image:textField(image,''),
      gallery:Array.isArray(gallery)?gallery.map(x=>textField(x,'')).filter(Boolean).join('\n'):textField(gallery,''),
      description:textField(p.description||p.descripcion||''),
      promos:textField(p.promos||p.promociones||p.preciosCantidad||p.precios_cantidad||p.mayoreo||p.ofertas||''),
      active:!(p.active===false || p.activo===false || String(p.active??p.activo??'1').trim()==='0'),
      updatedAt:textField(p.updatedAt||p.updated_at||p.fecha_actualizacion||'')
    }
  }
  function hasRealProduct(p){if(!p)return false;const name=String(p.name||'').trim();const placeholder=/^producto\s+sin\s+nombre$/i.test(name);const price=Number(p.price||0);const stock=Number(p.stock||0);const img=String(p.image||'').trim();const id=String(p.id||'').trim();if(placeholder&&price<=0&&stock<=0&&!img)return false;return Boolean((name&&!placeholder)||price>0||stock>0||img||(id&&!/^sdc-?\d+$/i.test(id)));}
  function normalizeState(s){
    const d = defaultState();
    const out = Object.assign(d, s||{});
    out.products = (out.products||[]).map(normalizeProduct).filter(hasRealProduct);
    out.sales = Array.isArray(out.sales)?out.sales:[];
    out.quotes = Array.isArray(out.quotes)?out.quotes:[];
    out.clients = Array.isArray(out.clients)?out.clients:[];
    out.closings = Array.isArray(out.closings)?out.closings:[];
    out.expenses = Array.isArray(out.expenses)?out.expenses:[];
    out.settings = Object.assign({}, window.SDC_CONFIG||{}, out.settings||{});
    // La conexión oficial se toma siempre desde js/data.js para que el navegador no use IDs viejos guardados en caché/localStorage.
    const cfg = window.SDC_CONFIG || {};
    ['sheetId','productSheet','webAppUrl','autoSheetSync','firebaseMode','cloudProvider','autoFirebaseSync'].forEach(k=>{
      if(cfg[k] !== undefined && cfg[k] !== null && cfg[k] !== '') out.settings[k] = cfg[k];
    });
    if(cfg.firebaseMode){
      delete out.settings.sheetId;
      out.settings.webAppUrl = '';
      out.settings.productSheet = '';
      out.settings.autoSheetSync = false;
      out.settings.cloudProvider = 'Firebase';
      out.settings.autoFirebaseSync = cfg.autoFirebaseSync !== false;
    }
    return out;
  }
  function isQuotaError(err){
    const msg=String(err && (err.message || err.name) || err || '').toLowerCase();
    return msg.includes('quota') || msg.includes('exceeded') || msg.includes('storage') || msg.includes('ns_error_dom_quota_reached');
  }
  function clearOldBackups(){
    [BACKUP_KEY,...LEGACY_BACKUP_KEYS].forEach(k=>{
      try{ localStorage.removeItem(k); }catch(e){}
    });
  }
  function trimText(v,max=1200){
    const s=String(v||'');
    if(!s) return '';
    if(s.startsWith('data:image/') || s.length>max) return '';
    return s;
  }
  function compactItem(it){
    const x=Object.assign({}, it||{});
    x.image=trimText(x.image,900);
    return x;
  }
  function compactProduct(p){
    const x=normalizeProduct(p||{});
    x.image=trimText(x.image,900);
    x.gallery=trimText(x.gallery,1200);
    return x;
  }
  function compactDoc(doc){
    const x=Object.assign({}, doc||{});
    x.items=Array.isArray(x.items)?x.items.map(compactItem):[];
    x.gifts=Array.isArray(x.gifts)?x.gifts.map(compactItem):[];
    return x;
  }
  function compactForBackup(state){
    const s=normalizeState(state);
    return {
      version:s.version,
      unlocked:s.unlocked,
      products:(s.products||[]).map(compactProduct),
      sales:(s.sales||[]).slice(0,30).map(compactDoc),
      quotes:(s.quotes||[]).slice(0,30).map(compactDoc),
      clients:(s.clients||[]).slice(0,120),
      closings:(s.closings||[]).slice(0,20),
      expenses:(s.expenses||[]).slice(0,80),
      lastReceipt:s.lastReceipt?compactDoc(s.lastReceipt):null,
      lastQuote:s.lastQuote?compactDoc(s.lastQuote):null,
      settings:s.settings||{}
    };
  }
  function safeSetMainState(state){
    const normalized=normalizeState(state);
    const payload=JSON.stringify(normalized);
    try{
      localStorage.setItem(KEY, payload);
      return normalized;
    }catch(err){
      if(!isQuotaError(err)) throw err;
      clearOldBackups();
      localStorage.setItem(KEY, payload);
      return normalized;
    }
  }
  function load(){
    // Limpia respaldos viejos si ya existe el error de cuota en el navegador.
    LEGACY_BACKUP_KEYS.forEach(k=>{try{ if(localStorage.getItem(k)) localStorage.removeItem(k); }catch(e){}});
    return normalizeState(safeJSON(localStorage.getItem(KEY), null) || defaultState())
  }
  function save(state){return safeSetMainState(state)}
  function saveBackup(state,label='Backup manual'){
    const backup={id:uid('BK'),label,date:new Date().toISOString(),state:compactForBackup(state)};
    let backups = safeJSON(localStorage.getItem(BACKUP_KEY),'[]') || [];
    backups = Array.isArray(backups)?backups:[];
    backups.unshift(backup);
    const attempts=[6,3,1];
    for(const limit of attempts){
      try{
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0,limit)));
        return backup;
      }catch(err){
        if(!isQuotaError(err)) break;
      }
    }
    // Nunca bloquea el guardado principal por falta de espacio en respaldos.
    try{ clearOldBackups(); }catch(e){}
    try{ localStorage.setItem(BACKUP_KEY, JSON.stringify([backup])); }catch(e){}
    return backup;
  }
  function listBackups(){
    const current=safeJSON(localStorage.getItem(BACKUP_KEY),'[]') || [];
    const legacy=LEGACY_BACKUP_KEYS.flatMap(k=>safeJSON(localStorage.getItem(k),'[]') || []);
    return [...(Array.isArray(current)?current:[]), ...(Array.isArray(legacy)?legacy:[])].slice(0,8);
  }
  function restoreBackup(id){const b=listBackups().find(x=>x.id===id); if(!b) return null; save(b.state); return normalizeState(b.state)}
  function exportData(state){return JSON.stringify(normalizeState(state),null,2)}
  function importData(json){const s=normalizeState(safeJSON(json,null)); if(!s) throw new Error('Archivo no válido'); save(s); return s}
  window.SDCStore={KEY,load,save,saveBackup,listBackups,restoreBackup,exportData,importData,uid,normalizeProduct,normalizeState,clone};
})();
