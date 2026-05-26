/* SDC Error Guard: muestra un diagnóstico claro si GitHub Pages deja la pantalla en blanco. */
(function(){
  'use strict';
  var startedAt = Date.now();
  var captured = [];

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});
  }

  function hasContent(){
    var app = document.getElementById('app');
    if(!app) return false;
    var html = app.innerHTML.trim();
    if(!html) return false;
    if(app.querySelector('[data-sdc-loading="1"]')) return false;
    return true;
  }

  function show(title, message, extra){
    var app = document.getElementById('app');
    if(!app) return;
    if(hasContent()) return;

    var missing = [];
    if(!window.SDC_CONFIG) missing.push('js/data.js');
    if(!window.SDCStore) missing.push('js/storage.js');

    var details = captured.slice(-4).map(function(e){
      return '<li><b>'+esc(e.type)+':</b> '+esc(e.message || e.reason || '')+'</li>';
    }).join('');

    app.className = 'sdc-safe-error-wrap';
    app.innerHTML = ''+
      '<section class="sdc-safe-error-card">'+
        '<div class="sdc-safe-pill">SDC · revisión de carga</div>'+
        '<h1>'+esc(title || 'La página no cargó completa')+'</h1>'+
        '<p>'+esc(message || 'GitHub Pages abrió el archivo, pero algún recurso no terminó de cargar.')+'</p>'+
        '<div class="sdc-safe-box">'+
          '<b>Arreglo recomendado:</b>'+
          '<ol>'+ 
            '<li>Sube los archivos en la raíz del repositorio, no dentro de otra carpeta.</li>'+ 
            '<li>Confirma que existan las carpetas <code>css</code>, <code>js</code> y <code>assets</code>.</li>'+ 
            '<li>Abre la página con <code>?v=2</code> al final o presiona Ctrl + F5.</li>'+ 
          '</ol>'+ 
        '</div>'+ 
        (missing.length ? '<div class="sdc-safe-warn"><b>Detectado como faltante:</b> '+esc(missing.join(', '))+'</div>' : '')+
        (details ? '<details class="sdc-safe-details" open><summary>Error detectado</summary><ul>'+details+'</ul></details>' : '')+
        '<button type="button" class="sdc-safe-btn" onclick="location.reload()">Volver a cargar</button>'+ 
      '</section>';
  }

  window.SDC_SHOW_SAFE_ERROR = show;

  window.addEventListener('error', function(ev){
    captured.push({type:'Error', message: ev.message || 'Error de carga', reason: ev.filename ? ev.filename + ':' + ev.lineno : ''});
    setTimeout(function(){ show('Error al iniciar SDC', ev.message || 'Revisa que todos los archivos se hayan subido completos.'); }, 80);
  }, true);

  window.addEventListener('unhandledrejection', function(ev){
    captured.push({type:'Promesa', message: (ev.reason && (ev.reason.message || ev.reason.toString())) || 'Error interno'});
    setTimeout(function(){ show('Error interno al cargar', (ev.reason && ev.reason.message) || 'Algo falló al iniciar el panel.'); }, 80);
  });

  window.addEventListener('load', function(){
    setTimeout(function(){
      if(!hasContent()){
        show('SDC quedó detenido al cargar', 'Pasaron '+Math.round((Date.now()-startedAt)/1000)+' segundos y el panel no se dibujó.');
      }
    }, 1600);
  });
})();
