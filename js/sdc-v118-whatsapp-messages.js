/* SDC V128: WhatsApp estable. Sin MutationObserver infinito. */
(function(){
  'use strict';

  if(window.SDCV128WhatsAppStable) return;
  window.SDCV128WhatsAppStable = true;

  const BUSINESS='SD COMAYAGUA';
  const WA=' +504 3151-7755';

  function t(v){return String(v??'').replace(/\s+/g,' ').trim();}
  function text(sel,root=document){return t(root.querySelector(sel)?.textContent||'');}
  function val(sel,root=document){return t(root.querySelector(sel)?.value||'');}
  function moneyText(v){const raw=t(v); return raw?raw.replace(/Lps\.?\s*/i,'Lps. '):'Lps. 0';}
  function cleanPhone(v){const n=String(v||'').replace(/\D/g,''); if(!n)return ''; if(n.length===8)return '504'+n; if(n.length===11&&n.startsWith('504'))return n; return n;}
  function openWA(phone,msg){const num=cleanPhone(phone); const url=num?`https://wa.me/${num}?text=${encodeURIComponent(msg)}`:`https://wa.me/?text=${encodeURIComponent(msg)}`; window.open(url,'_blank','noopener');}
  function copy(msg){try{navigator.clipboard?.writeText(msg);}catch(e){}}
  function toast(msg){const el=document.getElementById('toast'); if(el){el.textContent=msg;el.classList.add('show');clearTimeout(el._v128);el._v128=setTimeout(()=>el.classList.remove('show'),2400);}}

  function isSaleModal(){return /venta|factura|recibo/i.test(text('.quote-head h3,#modalRoot .modal-head h3')+' '+text('.quote-status'));}
  function docKind(){return isSaleModal()?'recibo':'cotización';}
  function totalFromSummary(){const c=[...document.querySelectorAll('#totalsMini .summary-total b:last-child,.summary-total b:last-child,.grand b:last-child')].map(x=>t(x.textContent)).filter(Boolean); return moneyText(c[c.length-1]||'Lps. 0');}
  function summaryValue(label){const rows=[...document.querySelectorAll('#totalsMini .summary-row,.summary-row')]; const row=rows.find(r=>t(r.textContent).toLowerCase().includes(label.toLowerCase())); if(!row)return 'Lps. 0'; const bs=row.querySelectorAll('b'); return moneyText(t(bs[bs.length-1]?.textContent||''));}
  function getItems(){return [...document.querySelectorAll('#cartList .cart-row')].map(r=>{const name=t(r.querySelector('.cart-info b,b')?.textContent||'Producto'); const line=t(r.querySelector('.cart-info span,span')?.textContent||''); const qty=t(r.querySelector('.qtybox input')?.value||'1'); return {name,line,qty};}).filter(x=>x.name&&!/agrega productos/i.test(x.name));}
  function customerInfo(){return {client:val('[data-k="client"]')||'Cliente',phone:val('[data-k="phone"]'),dep:val('[data-k="department"]'),mun:val('[data-k="municipality"]'),ref:val('[data-k="reference"]'),type:val('[data-k="shippingType"]'),company:val('[data-k="company"]')};}
  function deliveryLabel(type){const v=t(type).toLowerCase(); if(v.includes('cod'))return 'Pagar al recibir'; if(v.includes('local'))return 'Envío local / por definir'; return 'Depósito o Tigo Money';}

  function buildDocMessage(){
    const sale=isSaleModal();
    const kind=sale?'RECIBO DE COMPRA':'COTIZACIÓN';
    const c=customerInfo();
    const items=getItems();
    const subtotal=summaryValue('Productos');
    const envio=summaryValue('Envío');
    const comision=summaryValue('Comisión');
    const total=totalFromSummary();
    const date=new Date().toLocaleString('es-HN',{day:'2-digit',month:'long',year:'numeric',hour:'numeric',minute:'2-digit'});
    const lines=[];
    lines.push(`*${kind} - ${BUSINESS}*`,'');
    lines.push(`Hola ${c.client||'cliente'}, le compartimos el detalle ${sale?'de su compra':'de su cotización'}:`,'');
    lines.push('*Productos:*');
    if(items.length){items.forEach((it,i)=>{lines.push(`${i+1}. ${it.name}`);lines.push(`   Cantidad: ${it.qty}`);if(it.line)lines.push(`   ${it.line}`);});}
    else lines.push('1. Producto pendiente de confirmar');
    lines.push('','*Resumen:*',`Subtotal productos: ${subtotal}`,`Envío: ${envio}`);
    if(!/0$/.test(comision)) lines.push(`Comisión: ${comision}`);
    lines.push(`*TOTAL A PAGAR: ${total}*`,'','*Entrega / pago:*',`Modalidad: ${deliveryLabel(c.type)}`);
    if(c.company) lines.push(`Empresa o entrega: ${c.company}`);
    if(c.dep||c.mun) lines.push(`Ubicación: ${[c.dep,c.mun].filter(Boolean).join(' / ')}`);
    if(c.ref) lines.push(`Referencia: ${c.ref}`);
    lines.push('');
    if(sale){lines.push('✅ Su pedido queda registrado con los datos anteriores.','Por favor confirme que nombre, teléfono, ubicación y forma de entrega están correctos.');}
    else{lines.push('✅ Esta cotización está sujeta a disponibilidad de inventario.','Para reservar o facturar, confirme por este medio.');}
    lines.push('',`Fecha: ${date}`,BUSINESS,`WhatsApp:${WA}`);
    return lines.join('\n');
  }

  function buildProductMessage(){
    const root=document.getElementById('modalRoot')||document;
    const title=text('h2,h3',root)||text('.product-title',root)||'Producto SD Comayagua';
    const price=[...root.querySelectorAll('b,strong,span')].map(x=>t(x.textContent)).find(x=>/Lps\.?/i.test(x))||'';
    const desc=text('.product-description,.product-detail p,p',root);
    return [`*PRODUCTO - ${BUSINESS}*`,'',`Producto: ${title}`,price?`Precio: ${moneyText(price)}`:'Precio: por confirmar',desc?`Descripción: ${desc}`:'','','Opciones de entrega:','• Depósito / Tigo Money','• Pagar al recibir','• Envío local según zona','','✅ Precio sujeto a disponibilidad.',BUSINESS,`WhatsApp:${WA}`].filter(Boolean).join('\n');
  }

  function intercept(){
    document.addEventListener('click',ev=>{
      const wa=ev.target.closest('#waText');
      if(wa){ev.preventDefault();ev.stopImmediatePropagation();const msg=buildDocMessage();copy(msg);openWA(customerInfo().phone,msg);toast(`${docKind()} copiada y WhatsApp abierto.`);return;}
      const prod=ev.target.closest('#v53WhatsAppProduct,[data-action="sendProductWhatsApp"]');
      if(prod){ev.preventDefault();ev.stopImmediatePropagation();const phone=prompt('Número WhatsApp del cliente. Déjelo vacío para elegir el chat manualmente:',''); if(phone===null)return; const msg=buildProductMessage();copy(msg);openWA(phone,msg);toast('Mensaje de producto copiado y WhatsApp abierto.');}
    },true);
  }

  function setText(id,label){
    const el=document.getElementById(id);
    if(!el) return;
    if(t(el.textContent)===label) return;
    el.textContent=label;
  }
  function renameButtons(){
    setText('waText','Enviar WhatsApp');
    setText('downloadDoc','Descargar imagen');
    setText('shortReceipt','Recibo corto');
    const finish=document.getElementById('finishSale');
    if(finish && !/guardar|finalizar/i.test(finish.textContent)) finish.textContent='Finalizar venta';
  }

  function boot(){
    intercept();
    renameButtons();
    // Observador liviano y limitado: NO modifica HTML si no hace falta.
    const root=document.getElementById('modalRoot');
    if(root){
      let scheduled=false;
      new MutationObserver(()=>{
        if(scheduled) return;
        scheduled=true;
        setTimeout(()=>{scheduled=false;renameButtons();},80);
      }).observe(root,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
