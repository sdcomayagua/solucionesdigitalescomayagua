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

function colorTextFromVariants(rows){
    return (rows || []).map(r => `${r.nombre || r.name || 'General'}:${Math.max(0, Math.floor(asNumber(r.stock ?? r.qty ?? r.cantidad ?? 0)))}`).join(' | ');
}

function productoFirestorePayload(producto = {}){
    const codigo = cleanString(producto.id || producto.codigo || producto.sku || producto.nombre || producto.name || `SDC-${Date.now()}`).replace(/[\/\s]+/g, '-').slice(0, 90);
    const variantes = normalizeVariantRows(producto);
    const stockTotal = variantes.reduce((sum, row) => sum + Math.max(0, Math.floor(asNumber(row.stock))), 0);
    const categorias = cleanString(producto.categories || producto.categorias || producto.categoria || producto.category || 'General', 'General');
    const img = cleanString(producto.img || producto.image || producto.imagen || '');
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
        descripcion: cleanString(producto.descripcion || producto.description || ''),
        variantes,
        colores: colorTextFromVariants(variantes),
        stock_inicial: stockTotal,
        stock: stockTotal,
        promos: producto.promos || producto.promociones || '',
        activo: producto.activo !== false && producto.active !== false,
        active: producto.activo !== false && producto.active !== false,
        actualizadoEn: new Date().toISOString()
    };
}

function productoDesdeFirestore(id, data = {}){
    const variantes = normalizeVariantRows(data);
    const stockTotal = variantes.reduce((sum, row) => sum + Math.max(0, Math.floor(asNumber(row.stock))), 0);
    return {
        id: cleanString(data.codigo || id),
        codigo: cleanString(data.codigo || id),
        nombre: cleanString(data.nombre || data.name || 'Producto sin nombre', 'Producto sin nombre'),
        categoria: cleanString(data.categoria || data.category || data.categorias || 'General', 'General'),
        categorias: cleanString(data.categorias || data.categoria || 'General', 'General'),
        costo: asNumber(data.costo ?? data.cost),
        precio: asNumber(data.precio ?? data.price),
        img: cleanString(data.img || data.image || data.imagen || ''),
        galeria: cleanString(data.galeria || data.gallery || ''),
        descripcion: cleanString(data.descripcion || data.description || ''),
        variantes,
        colores: cleanString(data.colores || colorTextFromVariants(variantes)),
        stock: Math.max(stockTotal, Math.floor(asNumber(data.stock ?? data.stock_inicial ?? 0))),
        promos: data.promos || data.promociones || '',
        activo: data.activo !== false && data.active !== false,
        updatedAt: cleanString(data.actualizadoEn || data.updatedAt || '')
    };
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
    await setDoc(doc(db, "productos", String(idProducto)), {
        activo: false,
        active: false,
        actualizadoEn: new Date().toISOString()
    }, { merge: true });
    return true;
};

window.actualizarStockFirebase = async function(idProducto, producto) {
    if(!idProducto) return false;
    const payload = productoFirestorePayload({ ...(producto || {}), id: idProducto });
    await setDoc(doc(db, "productos", payload.codigo), {
        variantes: payload.variantes,
        colores: payload.colores,
        stock_inicial: payload.stock_inicial,
        stock: payload.stock,
        actualizadoEn: new Date().toISOString()
    }, { merge: true });
    return true;
};

// Compatibilidad con la versión anterior del helper.
window.guardarNuevoFirebase = async function(nombre, categoria, costo, precio, img, variantes, promos) {
    const payload = productoFirestorePayload({ nombre, categoria, costo, precio, img, variantes, promos });
    const docRef = await addDoc(collection(db, "productos"), payload);
    return docRef.id;
};

window.actualizarFirebase = async function(idProducto, datosNuevos) {
    const referenciaDocumento = doc(db, "productos", idProducto);
    await updateDoc(referenciaDocumento, datosNuevos);
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
