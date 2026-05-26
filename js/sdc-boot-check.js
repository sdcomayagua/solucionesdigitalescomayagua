/* SDC Boot Check: evita pantalla vacía y muestra qué archivo falta si algo no carga. */
(function(){
  'use strict';
  function showProblem(){
    const app = document.getElementById('app');
    if(!app || app.innerHTML.trim()) return;

    const missing = [];
    if(!window.SDC_CONFIG) missing.push('js/data.js');
    if(!window.SDCStore) missing.push('js/storage.js');

    app.innerHTML = `
      <section style="max-width:620px;margin:36px auto;padding:18px;border-radius:24px;background:#071827;color:#f4fbff;border:1px solid rgba(37,223,255,.35);font-family:Arial,sans-serif;box-shadow:0 18px 45px rgba(0,0,0,.35)">
        <h1 style="margin:0 0 8px;font-size:24px;letter-spacing:.04em">SDC no cargó completo</h1>
        <p style="margin:0 0 12px;color:#bdd6e7;line-height:1.4">La página quedó vacía porque faltan archivos o no se subieron en la carpeta correcta.</p>
        <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:12px;margin:12px 0">
          <b>Revisa que existan exactamente:</b>
          <ul style="margin:8px 0 0;padding-left:20px;line-height:1.7">
            <li>css/styles.css</li>
            <li>js/data.js</li>
            <li>js/storage.js</li>
            <li>js/app.js</li>
            <li>assets/logo-sdc-2026.png</li>
          </ul>
        </div>
        <p style="margin:10px 0 0;color:#8fb1c7;font-size:13px">${missing.length ? 'Detectado como faltante: ' + missing.join(', ') : 'Si los archivos están, vuelve a subir el paquete completo y limpia caché.'}</p>
      </section>`;
  }
  window.addEventListener('load', function(){ setTimeout(showProblem, 1200); });
})();
