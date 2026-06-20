// Firebase web-sdcomayagua
// Esta versión usa imports CDN porque el proyecto corre directo en navegador sin build/npm.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyDenfEHylza_0JVHDprJL7Z4tjzlbpXb_c",
    authDomain: "sdcomayagua-746c6.firebaseapp.com",
    projectId: "sdcomayagua-746c6",
    storageBucket: "sdcomayagua-746c6.firebasestorage.app",
    messagingSenderId: "375047857881",
    appId: "1:375047857881:web:15fc0ed10bcec0538300c8",
    measurementId: "G-R3TL0ZCNDX"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.SDC_FIREBASE = {
    nickname: "web-sdcomayagua",
    appId: firebaseConfig.appId,
    projectId: firebaseConfig.projectId,
    app,
    db,
    analyticsEnabled: false,
    ready: true
};

analyticsIsSupported()
    .then((supported) => {
        if(!supported) return;
        window.SDC_FIREBASE.analytics = getAnalytics(app);
        window.SDC_FIREBASE.analyticsEnabled = true;
    })
    .catch((error) => console.warn("Analytics no disponible en este entorno:", error));

window.sdcSetCloudStatus?.('online', 'Nube: Firebase conectada');

function asNumber(value){
    const n = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

function cleanString(value, fallback = ''){
    if(Array.isArray(value)) return value.map(v => cleanString(v)).filter(Boolean).join('\n') || fallback;
    if(value && typeof value === 'object') return Object.values(value).map(v => cleanString(v)).filter(Boolean).join(', ') || fallback;
    return String(value ?? fallback).trim();
}

function normalizeKey(value){
    return cleanString(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

function normalizeVariantRows(producto){
    const direct = producto.variantes || producto.colors || producto.colores || producto.colorStock || [];
    if(Array.isArray(direct) && direct.length){
        return direct.map(v => ({
            nombre: cleanString(v.nombre || v.name || v.color || v.label || 'General', 'General'),
            stock: Math.max(0, Math.floor(asNumber(v.stock ?? v.qty ?? v.cantidad ?? 0))),
            img: cleanString(v.img || v.image || '')
        })).filter(v => v.nombre);
    }
    const stock = Math.max(0, Math.floor(asNumber(producto.stock ?? producto.stock_inicial ?? 0)));
    return [{ nombre: 'General', stock, img: '' }];
}

function zeroVariantRows(rows){
    const source = Array.isArray(rows) && rows.length ? rows : [{ nombre: 'General', stock: 0, img: '' }];
    return source.map(row => ({
        nombre: cleanString(row.nombre || row.name || row.color || row.label || 'General', 'General'),
        stock: 0,
        img: cleanString(row.img || row.image || '')
    }));
}

function colorTextFromVariants(rows){
    return (rows || []).map(r => `${r.nombre || r.name || 'General'}:${Math.max(0, Math.floor(asNumber(r.stock ?? r.qty ?? r.cantidad ?? 0)))}`).join(' | ');
}

function isSampleProduct(producto = {}){
    return producto.muestra === true || producto.soloMuestra === true || producto.sample === true || producto.demo === true || producto.tipoInventario === 'muestra' || producto.inventoryType === 'sample';
}

function productStatus(producto = {}, stockTotal = 0){
    const raw = cleanString(producto.estado || producto.status || producto.estatus || '').toLowerCase();
    if(raw) return raw;
    if(producto.agotado === true || producto.soldOut === true || stockTotal <= 0) return 'agotado';
    return 'disponible';
}

function productoFirestorePayload(producto = {}){
    const codigo = cleanString(producto.id || producto.codigo || producto.sku || producto.nombre || producto.name || `SDC-${Date.now()}`).replace(/[\/\s]+/g, '-').slice(0, 90);
    let variantes = normalizeVariantRows(producto);
    let stockTotal = variantes.reduce((sum, row) => sum + Math.max(0, Math.floor(asNumber(row.stock))), 0);
    const categorias = cleanString(producto.categories || producto.categorias || producto.categoria || producto.category || 'General', 'General');
    const img = cleanString(producto.img || producto.image || producto.imagen || '');
    const muestra = isSampleProduct(producto);
    const estado = productStatus(producto, stockTotal);
    const activo = producto.activo !== false && producto.active !== false;
    if(estado === 'agotado'){
        variantes = zeroVariantRows(variantes);
        stockTotal = 0;
    }
    return {
        codigo,
        nombre: cleanString(producto.nombre || producto.name || 'Producto sin nombre', 'Producto sin nombre'),
        categoria: categorias.split(/[;,|/]+/).map(x => x.trim()).filter(Boolean)[0] || 'General',
        categorias,
        costo: asNumber(producto.costo ?? producto.cost),
        precio: asNumber(producto.precio ?? producto.price),
        img,
        image: img,
        galeria: cleanString(producto.gallery || producto.galeria || ''),
        gallery: cleanString(producto.gallery || producto.galeria || ''),
        descripcion: cleanString(producto.descripcion || producto.description || ''),
        variantes,
        colores: colorTextFromVariants(variantes),
        stock_inicial: stockTotal,
        stock: stockTotal,
        promos: producto.promos || producto.promociones || '',
        activo,
        active: activo,
        estado,
        status: estado,
        agotado: estado === 'agotado' || stockTotal <= 0,
        muestra,
        soloMuestra: muestra,
        sample: muestra,
        tipoInventario: muestra ? 'muestra' : 'inventario',
        inventoryType: muestra ? 'sample' : 'stock',
        cotizable: producto.cotizable !== false,
        actualizadoEn: new Date().toISOString()
    };
}

function productoDesdeFirestore(id, data = {}){
    let variantes = normalizeVariantRows(data);
    let stockTotal = variantes.reduce((sum, row) => sum + Math.max(0, Math.floor(asNumber(row.stock))), 0);
    const muestra = isSampleProduct(data);
    const estado = productStatus(data, stockTotal);
    if(estado === 'agotado'){
        variantes = zeroVariantRows(variantes);
        stockTotal = 0;
    }
    return {
        id: cleanString(data.codigo || id),
        codigo: cleanString(data.codigo || id),
        firebaseId: id,
        docId: id,
        nombre: cleanString(data.nombre || data.name || 'Producto sin nombre', 'Producto sin nombre'),
        categoria: cleanString(data.categoria || data.category || data.categorias || 'General', 'General'),
        categorias: cleanString(data.categorias || data.categoria || 'General', 'General'),
        costo: muestra ? 0 : asNumber(data.costo ?? data.cost),
        precio: asNumber(data.precio ?? data.price),
        img: cleanString(data.img || data.image || data.imagen || ''),
        image: cleanString(data.image || data.img || data.imagen || ''),
        galeria: cleanString(data.galeria || data.gallery || ''),
        descripcion: cleanString(data.descripcion || data.description || ''),
        variantes,
        colores: colorTextFromVariants(variantes),
        stock: (muestra || estado === 'agotado') ? 0 : stockTotal,
        stockReal: stockTotal,
        promos: data.promos || data.promociones || '',
        activo: data.activo !== false && data.active !== false,
        estado,
        status: estado,
        agotado: estado === 'agotado' || stockTotal <= 0,
        muestra,
        soloMuestra: muestra,
        sample: muestra,
        tipoInventario: muestra ? 'muestra' : 'inventario',
        inventoryType: muestra ? 'sample' : 'stock',
        cotizable: data.cotizable !== false,
        updatedAt: cleanString(data.actualizadoEn || data.updatedAt || '')
    };
}

async function findProductDocs(idProducto, producto = {}){
    const targetKeys = new Set([
        normalizeKey(idProducto),
        normalizeKey(producto.codigo),
        normalizeKey(producto.id),
        normalizeKey(producto.sku),
        normalizeKey(producto.nombre),
        normalizeKey(producto.name)
    ].filter(Boolean));
    const querySnapshot = await getDocs(collection(db, "productos"));
    const hits = [];
    querySnapshot.forEach((documento) => {
        const data = documento.data() || {};
        const keys = [
            documento.id,
            data.codigo,
            data.id,
            data.sku,
            data.nombre,
            data.name
        ].map(normalizeKey).filter(Boolean);
        if(keys.some(key => targetKeys.has(key))) hits.push({ id: documento.id, data });
    });
    if(!hits.length && idProducto) hits.push({ id: String(idProducto), data: {} });
    return hits;
}

async function patchProductDocuments(idProducto, producto = {}, patch = {}){
    const hits = await findProductDocs(idProducto, producto);
    await Promise.all(hits.map(hit => setDoc(doc(db, "productos", hit.id), patch, { merge: true })));
    return hits.map(hit => hit.id);
}

window.cargarDesdeFirebase = async function() {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const productosDescargados = [];
    querySnapshot.forEach((documento) => {
        const producto = productoDesdeFirestore(documento.id, documento.data());
        if(producto.activo !== false) productosDescargados.push(producto);
    });
    productosDescargados.sort((a, b) => String(a.id).localeCompare(String(b.id), 'es', { numeric: true }));
    return productosDescargados;
};

window.guardarProductoFirebase = async function(producto, previousId = '') {
    const payload = productoFirestorePayload(producto);
    await setDoc(doc(db, "productos", payload.codigo), payload, { merge: true });
    const oldId = cleanString(previousId);
    if(oldId && oldId !== payload.codigo){
        try{ await deleteDoc(doc(db, "productos", oldId)); }catch(error){ console.warn('No se pudo borrar el producto anterior en Firebase:', error); }
    }
    return payload.codigo;
};

window.ocultarProductoFirebase = async function(idProducto) {
    if(!idProducto) return false;
    await patchProductDocuments(idProducto, {}, {
        activo: false,
        active: false,
        actualizadoEn: new Date().toISOString()
    });
    return true;
};

window.actualizarStockFirebase = async function(idProducto, producto) {
    if(!idProducto) return false;
    const payload = productoFirestorePayload({ ...(producto || {}), id: idProducto, codigo: idProducto });
    await patchProductDocuments(idProducto, producto || {}, {
        variantes: payload.variantes,
        colores: payload.colores,
        stock_inicial: payload.stock_inicial,
        stock: payload.stock,
        estado: payload.estado,
        status: payload.status,
        agotado: payload.agotado,
        activo: payload.activo,
        active: payload.active,
        muestra: payload.muestra,
        soloMuestra: payload.soloMuestra,
        sample: payload.sample,
        tipoInventario: payload.tipoInventario,
        inventoryType: payload.inventoryType,
        actualizadoEn: new Date().toISOString()
    });
    return true;
};

window.marcarProductoEstadoFirebase = async function(idProducto, estado = 'disponible', producto = {}) {
    if(!idProducto) return false;
    const cleanEstado = cleanString(estado, 'disponible').toLowerCase();
    const muestra = isSampleProduct(producto) || cleanEstado === 'muestra';
    let baseRows = normalizeVariantRows(producto);
    if(cleanEstado === 'agotado') baseRows = zeroVariantRows(baseRows);
    const stockTotal = baseRows.reduce((sum, row) => sum + Math.max(0, Math.floor(asNumber(row.stock))), 0);
    const patch = {
        estado: cleanEstado,
        status: cleanEstado,
        agotado: cleanEstado === 'agotado',
        muestra,
        soloMuestra: muestra,
        sample: muestra,
        tipoInventario: muestra ? 'muestra' : 'inventario',
        inventoryType: muestra ? 'sample' : 'stock',
        stock: cleanEstado === 'agotado' ? 0 : stockTotal,
        stock_inicial: cleanEstado === 'agotado' ? 0 : stockTotal,
        variantes: baseRows,
        colores: colorTextFromVariants(baseRows),
        actualizadoEn: new Date().toISOString()
    };
    await patchProductDocuments(idProducto, producto, patch);
    return true;
};

window.marcarProductoMuestraFirebase = async function(idProducto, producto = {}, muestra = true) {
    if(!idProducto) return false;
    const patch = {
        muestra: !!muestra,
        soloMuestra: !!muestra,
        sample: !!muestra,
        tipoInventario: muestra ? 'muestra' : 'inventario',
        inventoryType: muestra ? 'sample' : 'stock',
        estado: muestra ? 'muestra' : (producto.estado || producto.status || 'disponible'),
        status: muestra ? 'muestra' : (producto.estado || producto.status || 'disponible'),
        actualizadoEn: new Date().toISOString()
    };
    if(muestra){
        patch.costo = 0;
        patch.cost = 0;
    }
    await patchProductDocuments(idProducto, producto, patch);
    return true;
};

// Compatibilidad con la versión anterior del helper.
window.guardarNuevoFirebase = async function(nombre, categoria, costo, precio, img, variantes, promos) {
    const payload = productoFirestorePayload({ nombre, categoria, costo, precio, img, variantes, promos });
    const docRef = await addDoc(collection(db, "productos"), payload);
    return docRef.id;
};

window.actualizarFirebase = async function(idProducto, datosNuevos) {
    const patch = {
        ...datosNuevos,
        actualizadoEn: new Date().toISOString()
    };
    await patchProductDocuments(idProducto, datosNuevos || {}, patch);
};

window.registrarVentaFirebase = async function(datosOrden) {
    const docRef = await addDoc(collection(db, "ventas"), {
        ...datosOrden,
        fuente: datosOrden?.fuente || 'sdc-pos-firebase',
        actualizadoEn: new Date().toISOString()
    });
    return docRef.id;
};

window.actualizarVentaFirebase = async function(idVenta, datosNuevos) {
    const referenciaDocumento = doc(db, "ventas", idVenta);
    await updateDoc(referenciaDocumento, {
        ...datosNuevos,
        actualizadoEn: new Date().toISOString()
    });
};

window.cargarVentasFirebase = async function() {
    const querySnapshot = await getDocs(collection(db, "ventas"));
    const ventas = [];
    querySnapshot.forEach((documento) => {
        ventas.push({ id: documento.id, ...documento.data() });
    });
    ventas.sort((a, b) => {
        const fechaA = a.fecha?.seconds ? a.fecha.seconds * 1000 : new Date(a.fecha || a.date || 0).getTime();
        const fechaB = b.fecha?.seconds ? b.fecha.seconds * 1000 : new Date(b.fecha || b.date || 0).getTime();
        return fechaB - fechaA;
    });
    return ventas;
};

window.respaldarDatosFirebase = async function(datos) {
    const referencia = doc(db, "respaldos", "ultimo_estado");
    await setDoc(referencia, {
        ...datos,
        app: "web-sdcomayagua",
        actualizadoEn: new Date().toISOString()
    }, { merge: true });
};

window.dispatchEvent(new CustomEvent('sdc-firebase-ready', { detail: window.SDC_FIREBASE }));
