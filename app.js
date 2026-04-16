// ============================================
// 営業CRM - app.js
// ============================================

// ============================================
// CONSTANTS
// ============================================
const STATUS_CONFIG = {
 not_visited: { label: '未営業',   emoji: '', color: '#9ca3af' },
 visited:   { label: '訪問済み',  emoji: '', color: '#3b82f6' },
 considering: { label: '検討中',   emoji: '', color: '#eab308' },
 promising:  { label: '見込みあり', emoji: '', color: '#f97316' },
 revisit:   { label: '再訪予定',  emoji: '', color: '#8b5cf6' },
 contracted:  { label: '契約済み',  emoji: '', color: '#22c55e' },
 declined:   { label: '見送り',   emoji: '', color: '#ef4444' },
};

const BU_CONFIG = {
 harigae:  { label: '張り替え王', color: '#f97316' },
 logikingu: { label: 'ロジキング', color: '#3b82f6' },
};

// ============================================
// STATE
// ============================================
let state = {
 currentBU: 'harigae',
 currentView: 'list',  // list | map | settings
 filterStatus: 'all',
 stores: [],
 editingStore: null,  // null = 新規, object = 編集中
 detailStore: null,
 mapInstance: null,
 detailMapInstance: null,
 markersLayer: null,
};

// ============================================
// LOCAL STORAGE (Phase1 DB)
// ============================================
const STORAGE_KEY = 'eigyo_crm_stores';

function loadStores() {
 try {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
 } catch (e) {
  return [];
 }
}

function saveStores(stores) {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(stores));
 state.stores = stores;
}

function getAllStores() {
 return state.stores;
}

function getStoresByBU(bu) {
 return state.stores.filter(s => s.businessUnit === bu);
}

function getStoreById(id) {
 return state.stores.find(s => s.id === id);
}

function addStore(store) {
 const newStore = {
  id: 'store_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  visits: [],
  ...store,
 };
 const stores = [...state.stores, newStore];
 saveStores(stores);
 return newStore;
}

function updateStore(id, updates) {
 const stores = state.stores.map(s =>
  s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
 );
 saveStores(stores);
}

function deleteStore(id) {
 const stores = state.stores.filter(s => s.id !== id);
 saveStores(stores);
}

function addVisit(storeId, visit) {
 const store = getStoreById(storeId);
 if (!store) return;
 const visits = [
  { id: 'v_' + Date.now(), date: new Date().toISOString().split('T')[0], ...visit },
  ...(store.visits || []),
 ];
 updateStore(storeId, { visits });
}

// ============================================
// GEOCODING (Nominatim)
// ============================================
async function geocodeAddress(address) {
  const fetchGeocode = async (query) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=jp&email=contact@local.app`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'ja' } });
      const data = await res.json();
      if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (e) {}
    return null;
  };

  // 1. 基本的な不要文字の除去（郵便番号、改行など）
  let cleanAddress = address.replace(/〒?\s?\d{3}-\d{4}/g, '').replace(/\r?\n/g, ' ').trim();

  // 2. まずはそのままで検索
  let result = await fetchGeocode(cleanAddress);
  if (result) return result;

  // 3. スペースで区切られている場合、最初の部分（住所本体）のみで検索
  const parts = cleanAddress.split(/[\s　]+/);
  if (parts.length > 1) {
    result = await fetchGeocode(parts[0]);
    if (result) return result;
  }

  // 4. 強力な切り詰め: 階・ビル名などを削り、番地・号くらいまでに絞る
  const numberMatch = cleanAddress.match(/^([^0-9０-９]+[0-9０-９一二三四五六七八九十]+(?:[丁目番地号\-\－]+[0-9０-９]*)*)/);
  if (numberMatch && numberMatch[1] !== cleanAddress && numberMatch[1] !== parts[0]) {
    result = await fetchGeocode(numberMatch[1]);
    if (result) return result;
  }
  
  // 5. 最終フォールバック：市区町村の部分のみで検索（大雑把な位置でも地図上にピンを立てるため）
  const broadMatch = cleanAddress.match(/^(.+?[都道府県].+?[市区町村])/);
  if (broadMatch && broadMatch[1] !== cleanAddress && broadMatch[1] !== numberMatch?.[1]) {
    result = await fetchGeocode(broadMatch[1]);
    if (result) return result;
  }

  return null;
}

// ============================================
// MAP
// ============================================
function initMainMap() {
 if (state.mapInstance) {
  state.mapInstance.remove();
  state.mapInstance = null;
 }
 const el = document.getElementById('leaflet-map');
 if (!el) return;

 state.mapInstance = L.map('leaflet-map', {
  center: [36.0, 138.0],
  zoom: 6,
  zoomControl: true,
 });

 L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '© OpenStreetMap & CARTO',
  maxZoom: 19,
 }).addTo(state.mapInstance);

 state.markersLayer = L.layerGroup().addTo(state.mapInstance);
 updateMapMarkers();
}

function updateMapMarkers() {
 if (!state.markersLayer) return;
 state.markersLayer.clearLayers();

 const stores = getStoresByBU(state.currentBU).filter(s => s.lat && s.lng);
 if (stores.length === 0) return;

 const bounds = [];
 stores.forEach(store => {
  const cfg = STATUS_CONFIG[store.status] || STATUS_CONFIG.not_visited;
  const markerHtml = `
   <div style="
    width:32px; height:32px;
    background:${cfg.color};
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
    display:flex; align-items:center; justify-content:center;
   ">
    <span style="transform:rotate(45deg); font-size:13px; line-height:1;">${cfg.emoji}</span>
   </div>`;

  const icon = L.divIcon({
   html: markerHtml,
   className: '',
   iconSize: [32, 32],
   iconAnchor: [16, 32],
   popupAnchor: [0, -36],
  });

  const marker = L.marker([store.lat, store.lng], { icon });
  marker.bindPopup(`
   <div style="min-width:160px;">
    <div class="map-popup-name">${store.name}</div>
    <div class="map-popup-status">${cfg.emoji} ${cfg.label}</div>
    <button class="map-popup-btn" onclick="openDetail('${store.id}')">詳細を見る</button>
   </div>
  `);
  state.markersLayer.addLayer(marker);
  bounds.push([store.lat, store.lng]);
 });

 if (bounds.length > 0 && !state._mapFitted) {
  state.mapInstance.fitBounds(bounds, { padding: [40, 40] });
  state._mapFitted = true;
 }
}

function initDetailMap(store) {
 if (!store.lat || !store.lng) return;
 setTimeout(() => {
  const el = document.getElementById('detail-map');
  if (!el) return;

  if (state.detailMapInstance) {
   state.detailMapInstance.remove();
   state.detailMapInstance = null;
  }

  state.detailMapInstance = L.map('detail-map', {
   center: [store.lat, store.lng],
   zoom: 15,
   zoomControl: false,
   dragging: false,
   scrollWheelZoom: false,
   touchZoom: false,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
   attribution: '',
   maxZoom: 19,
  }).addTo(state.detailMapInstance);

  const cfg = STATUS_CONFIG[store.status] || STATUS_CONFIG.not_visited;
  const markerHtml = `
   <div style="
    width:32px; height:32px;
    background:${cfg.color};
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    border:3px solid #fff;
    box-shadow:0 2px 6px rgba(0,0,0,0.3);
   "></div>`;
  const icon = L.divIcon({ html: markerHtml, className: '', iconSize: [32,32], iconAnchor:[16,32] });
  L.marker([store.lat, store.lng], { icon }).addTo(state.detailMapInstance);
 }, 100);
}

// Global helper for map popup button
window.openDetail = function(storeId) {
 const store = getStoreById(storeId);
 if (store) showDetail(store);
};

// ============================================
// CSV IMPORT
// ============================================
function parseCSV(text) {
 const lines = text.trim().split('\n');
 if (lines.length < 2) return [];
 const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
 return lines.slice(1).map(line => {
  const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
  const obj = {};
  headers.forEach((h, i) => obj[h] = values[i] || '');
  return obj;
 }).filter(r => r['店舗名'] || r['name']);
}

function csvRowToStore(row, bu) {
 const nameMap = {
  name:      row['店舗名'] || row['name'] || '',
  address:    row['住所'] || row['address'] || '',
  contact:    row['担当者'] || row['contact'] || '',
  status:     row['ステータス'] || row['status'] || 'not_visited',
  notes:     row['メモ'] || row['notes'] || '',
  nextAction:   row['次回アクション'] || row['nextAction'] || '',
  nextActionDate: row['次回日付'] || row['nextActionDate'] || '',
  businessUnit:  bu,
 };
 // Normalize status
 const statusMap = {
  '未営業':'not_visited','訪問済み':'visited','検討中':'considering',
  '見込みあり':'promising','再訪予定':'revisit','契約済み':'contracted','見送り':'declined',
 };
 if (statusMap[nameMap.status]) nameMap.status = statusMap[nameMap.status];
 if (!STATUS_CONFIG[nameMap.status]) nameMap.status = 'not_visited';
 return nameMap;
}

// ============================================
// TOAST
// ============================================
function showToast(msg) {
 const existing = document.querySelector('.toast');
 if (existing) existing.remove();
 const toast = document.createElement('div');
 toast.className = 'toast';
 toast.textContent = msg;
 document.body.appendChild(toast);
 setTimeout(() => toast.remove(), 2500);
}


// ============================================
// RENDER (Tailwind Chic Edition)
// ============================================

function render() {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = '';

  const header = renderHeader();
  const content = document.createElement('main');
  content.className = 'px-5 pt-2 pb-24';
  
  if (state.currentView === 'map') {
    content.className = 'w-full h-[calc(100vh-64px-64px)] bg-surface relative';
  }

  const nav = renderBottomNav();

  app.appendChild(header);
  app.appendChild(content);
  app.appendChild(nav);

  if (state.currentView === 'detail' && state.detailStore) {
    content.innerHTML = renderDetailView(state.detailStore);
    attachDetailEvents(content, state.detailStore);
    initDetailMap(state.detailStore);
  } else if (state.currentView === 'add' || state.currentView === 'edit') {
    content.className = 'max-w-5xl mx-auto mt-6 px-4 md:px-8 pb-32';
    content.innerHTML = renderFormView(state.editingStore);
    attachFormEvents(content);
  } else if (state.currentView === 'map') {
    content.innerHTML = `<div class="absolute inset-0 z-0"><div id="leaflet-map"></div></div><div class="absolute inset-0 bg-gradient-to-b from-surface/20 via-transparent to-surface/20 pointer-events-none z-10"></div>`;
    setTimeout(() => initMainMap(), 50);
  } else if (state.currentView === 'settings') {
    content.className = 'pt-6 pb-32 px-6 max-w-7xl mx-auto';
    content.innerHTML = renderSettingsView();
    attachSettingsEvents(content);
  } else {
    // Default list view
    content.innerHTML = renderListView();
    attachListEvents(content);
  }

  attachNavEvents(nav);
  attachHeaderEvents(header);
}

// ==== HEADER ====
function renderHeader() {
  const header = document.createElement('header');
  header.className = 'w-full sticky top-0 z-50 bg-surface/90 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-outline shadow-sm';

  const isDeep = ['detail', 'add', 'edit'].includes(state.currentView);
  
  if (isDeep) {
    const label = state.currentView === 'add' ? '店舗を追加' :
                  state.currentView === 'edit' ? '店舗を編集' :
                  state.detailStore?.name || '詳細';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <button id="btn-back" class="material-symbols-outlined text-text-sub hover:text-on-surface transition-colors">arrow_back</button>
        <h1 class="text-[17px] font-bold text-on-surface font-['Inter'] tracking-tight">${label}</h1>
      </div>
      <div class="flex items-center gap-4">
        ${state.currentView === 'detail' ? '<button id="btn-edit-store" class="material-symbols-outlined text-text-sub hover:text-primary">edit</button>' : ''}
      </div>`;
  } else {
    // List or map or settings
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-text-sub">explore</span>
        <h1 class="text-[17px] font-bold text-on-surface font-['Inter'] tracking-tight">Territory</h1>
      </div>
      <div class="flex items-center gap-4">
        ${state.currentView === 'list' || state.currentView === 'map' ? `
          <div class="flex bg-surface-container-high rounded-md p-0.5 view-toggle">
            <button class="view-toggle-btn px-3 py-1 text-xs font-medium rounded transition-all ${state.currentView === 'map' ? 'bg-surface text-on-surface shadow-sm' : 'text-text-sub hover:text-on-surface'}" data-view="map">Map</button>
            <button class="view-toggle-btn px-3 py-1 text-xs font-medium rounded transition-all ${state.currentView === 'list' ? 'bg-surface text-on-surface shadow-sm' : 'text-text-sub hover:text-on-surface'}" data-view="list">List</button>
          </div>
        ` : ''}
        <div class="w-8 h-8 rounded-full overflow-hidden border border-outline">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuArn4-bYQJAbok2lIzPRfW5bg8asTL1Hqv5BCvCuxC0y_TaEvhHWlrqyRl6bSOQKDaX7KDP8MHK0GU3yuBm7xNDfaR7riyr2f65d-gFK94HsVB1suAb5hNhwaTtdP1LiNj41KADMOTA2uTH_3CbIAXwU7XE8NsoFO7mlmyUUCadcjC-qpI21I7kEb86KaYIsDBW2rKKPWd5S9sWR3b9n6UNJcv8vwEABCebntZViUkQKY3hhDQroOTt-03ykIT-kGVluyNZZcGG1VU" class="w-full h-full object-cover">
        </div>
      </div>`;
  }
  return header;
}

// ==== LIST VIEW ====
function renderListView() {
  let stores = getStoresByBU(state.currentBU);
  const allCount = stores.length;
  
  if (state.filterStatus !== 'all') {
    stores = stores.filter(s => s.status === state.filterStatus);
  }

  if (state.filterArea && state.filterArea.trim() !== '') {
    const term = state.filterArea.trim().toLowerCase();
    stores = stores.filter(s => s.address && s.address.toLowerCase().includes(term));
  }

  // Sort
  stores.sort((a, b) => {
    const today = new Date().toISOString().split('T')[0];
    const aUrgent = a.nextActionDate && a.nextActionDate <= today ? 0 : 1;
    const bUrgent = b.nextActionDate && b.nextActionDate <= today ? 0 : 1;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Project Tabs
  const buTabsHtml = Object.entries(BU_CONFIG).map(([key, cfg]) => `
    <button class="bu-tab pb-3 text-sm font-semibold transition-colors ${state.currentBU === key ? 'text-on-surface border-b-2 border-primary' : 'text-text-sub hover:text-on-surface'}" data-bu="${key}">
      ${cfg.label}
    </button>
  `).join('');

  // Filter Chips
  const filterChips = [
    { key: 'all', label: '全て', count: allCount },
    ...Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
      key, label: cfg.label, count: getStoresByBU(state.currentBU).filter(s => s.status === key).length
    }))
  ];

  const chipsHtml = filterChips.map(c => `
    <button class="filter-chip flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${state.filterStatus === c.key ? 'bg-surface border border-primary text-primary' : 'bg-surface border border-outline hover:bg-surface-container-high'}" data-status="${c.key}">
      <span class="text-xs font-semibold ${state.filterStatus === c.key ? 'text-primary' : 'text-text-sub'}">${c.label}</span>
      <span class="text-[10px] px-1.5 py-0.5 bg-surface-container-high rounded-full ${state.filterStatus === c.key ? 'text-primary bg-primary/10' : 'text-text-sub'}">${c.count}</span>
    </button>
  `).join('');

  // Cards
  const cardsHtml = stores.length === 0 ? `
    <div class="py-12 text-center text-text-muted">
      <span class="material-symbols-outlined text-4xl mb-2">inbox</span>
      <p class="text-sm">データがありません</p>
    </div>` : stores.map(store => {
    const cfg = STATUS_CONFIG[store.status] || STATUS_CONFIG.not_visited;
    return `
      <div class="store-card group bg-surface border border-outline rounded-xl px-4 py-3 shadow-card active:scale-[0.99] transition-transform cursor-pointer border-l-4" style="border-left-color: ${cfg.color}" data-id="${store.id}">
        <div class="flex justify-between items-center mb-1">
          <h3 class="font-bold text-on-surface text-[15px] group-hover:text-primary transition-colors truncate w-full pr-2">${store.name}</h3>
          <div class="flex items-center px-1.5 py-0.5 rounded bg-surface-container-low shrink-0 border border-outline/50">
            <span class="text-[10px] font-semibold text-text-sub">${cfg.label}</span>
          </div>
        </div>
        <div class="flex items-center gap-4 mt-2">
          ${store.address ? `
          <div class="flex items-center gap-1 text-text-sub truncate">
            <span class="material-symbols-outlined text-[13px]">location_on</span>
            <span class="text-[12px] truncate">${store.address}</span>
          </div>` : ''}
          ${store.contact ? `
          <div class="flex items-center gap-1 text-text-sub truncate">
            <span class="material-symbols-outlined text-[13px]">person</span>
            <span class="text-[12px] truncate">${store.contact}</span>
          </div>` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="mb-5 mt-2">
      <h2 class="text-2xl font-bold tracking-tight text-on-surface font-['Inter']">Target Accounts</h2>
    </div>
    <div class="flex gap-6 mb-5 border-b border-outline">
      ${buTabsHtml}
    </div>
    
    <div class="mb-5 relative">
      <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[18px]">search</span>
      <input type="text" id="filter-area" class="w-full bg-surface border border-outline rounded-lg py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all text-on-surface placeholder:text-text-muted" placeholder="住所エリアで検索..." value="${state.filterArea || ''}">
    </div>

    <div class="flex gap-2.5 overflow-x-auto pb-4 no-scrollbar">
      ${chipsHtml}
    </div>
    <div class="space-y-4">
      ${cardsHtml}
    </div>
    <button id="btn-add-floating" class="fixed right-6 bottom-24 w-14 h-14 bg-primary text-white rounded-full shadow-deep flex items-center justify-center active:scale-95 transition-transform z-40">
      <span class="material-symbols-outlined text-3xl">add</span>
    </button>
  `;
}

// ==== DETAIL VIEW ====
function renderDetailView(store) {
  const cfg = STATUS_CONFIG[store.status] || STATUS_CONFIG.not_visited;
  const visits = store.visits || [];

  const visitHtml = visits.map((v, i) => `
    <div class="relative">
      <div class="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full ${i > 0 ? 'bg-text-muted' : 'bg-primary'} ring-4 ring-surface"></div>
      <div class="space-y-1.5 ${i > 0 ? 'opacity-80' : ''}">
        <p class="text-xs font-semibold text-text-sub">${v.date} ${v.person ? `· ${v.person}` : ''}</p>
        <div class="bg-surface border border-outline p-3 rounded-lg shadow-sm">
          <p class="text-[13px] text-on-surface leading-relaxed">${v.note || ''}</p>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="space-y-6 max-w-4xl mx-auto py-2">
      <section class="space-y-2 px-1 mb-8">
        <h2 class="text-[32px] font-bold tracking-tight text-on-surface leading-tight">${store.name}</h2>
        <p class="text-text-sub text-sm">
          ${store.businessUnit === 'harigae' ? '張り替え王' : 'ロジキング'} · 最終更新: ${new Date(store.updatedAt).toLocaleDateString()}
        </p>
      </section>
      
      <!-- Basic Info -->
      <section class="bg-surface rounded-xl p-6 shadow-card border border-outline">
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-sm font-semibold text-on-surface">基本情報</h3>
          <span class="bg-surface-container-low border border-outline px-2 py-1 rounded text-xs font-semibold text-text-sub">${cfg.label}</span>
        </div>
        <div class="space-y-5">
          ${store.address ? `
          <div class="flex items-start gap-4">
            <span class="material-symbols-outlined text-text-muted mt-0.5">location_on</span>
            <div class="flex-1 border-b border-outline pb-4">
               <p class="text-[11px] text-text-muted font-medium mb-1 relative top-0.5">所在地</p>
              <p class="text-[15px] text-on-surface">${store.address}</p>
            </div>
          </div>
          ` : ''}
          ${store.contact ? `
          <div class="flex items-start gap-4">
            <span class="material-symbols-outlined text-text-muted mt-0.5">person</span>
            <div class="flex-1 border-b border-outline pb-4">
              <p class="text-[11px] text-text-muted font-medium mb-1 relative top-0.5">担当者</p>
              <p class="text-[15px] text-on-surface">${store.contact}</p>
            </div>
          </div>
          ` : ''}
          ${store.notes ? `
          <div class="flex items-start gap-4">
            <span class="material-symbols-outlined text-text-muted mt-0.5">notes</span>
            <div class="flex-1">
              <p class="text-[11px] text-text-muted font-medium mb-1 relative top-0.5">備考</p>
              <p class="text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap">${store.notes}</p>
            </div>
          </div>
          ` : ''}
        </div>
      </section>

      <!-- Map Block -->
      ${store.lat && store.lng ? `
        <section class="bg-surface rounded-xl p-2 shadow-card border border-outline h-56 relative overflow-hidden">
          <div id="detail-map" class="w-full h-full rounded-lg"></div>
        </section>
      ` : ''}

       <!-- Visit History -->
      <section class="bg-surface rounded-xl p-6 shadow-card border border-outline mb-8">
        <div class="flex justify-between items-center mb-8">
          <h3 class="text-sm font-semibold text-on-surface">訪問履歴</h3>
          <button id="btn-add-visit" class="bg-surface border border-outline hover:bg-surface-container-low text-on-surface text-xs font-semibold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 transition-colors">
            <span class="material-symbols-outlined text-[16px]">add</span> 記録を追加
          </button>
        </div>
        <div class="relative pl-6 space-y-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline">
          ${visits.length > 0 ? visitHtml : '<p class="text-sm text-text-muted">記録がありません</p>'}
        </div>
      </section>

      <div class="flex justify-center mt-8 pb-12">
        <button id="btn-delete-store" class="text-error text-sm font-medium hover:underline opacity-80">この店舗を削除する</button>
      </div>
    </div>
  `;
}

// ==== ADD/EDIT STORE VIEW ====
function renderFormView(store) {
  const isEdit = !!store;
  const s = store || {};

  const statusOptions = Object.entries(STATUS_CONFIG).map(([key, cfg]) => 
    `<option value="${key}" ${(s.status || 'not_visited') === key ? 'selected' : ''}>${cfg.label}</option>`
  ).join('');
  const buOptions = Object.entries(BU_CONFIG).map(([key, cfg]) => 
    `<option value="${key}" ${(s.businessUnit || state.currentBU) === key ? 'selected' : ''}>${cfg.label}</option>`
  ).join('');

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-8">
      <aside class="lg:col-span-12 xl:col-span-6 xl:col-start-4 bg-surface rounded-xl p-8 shadow-card border border-outline">
        <div class="mb-8 p-1">
           <h2 class="text-[32px] font-bold text-on-surface tracking-tight">${isEdit ? '店舗を編集' : '店舗を追加'}</h2>
        </div>
        
        ${!isEdit ? `
        <!-- Smart Bulk Input -->
        <div class="mb-10 p-5 bg-surface-container-high rounded-xl border border-outline shadow-inner">
          <label class="block text-sm font-semibold text-on-surface mb-2 flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px]">auto_awesome</span> スマート・一括入力
          </label>
          <textarea id="f-smart-input" rows="4" class="w-full p-4 bg-surface rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary/30 text-[14px] placeholder:text-text-muted transition-all" placeholder="Googleマップ等からコピーした複数店舗の情報を貼り付けると、自動処理されます。"></textarea>
          <div class="mt-4 flex justify-end">
            <button id="btn-smart-parse" type="button" class="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold hover:bg-opacity-90 active:scale-95 shadow-sm transition-all flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px]">magic_button</span> 読み込む
            </button>
          </div>
        </div>
        ` : ''}

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-text-sub mb-2">事業部</label>
            <select id="f-bu" class="w-full bg-surface border border-outline rounded-lg py-2.5 px-3 text-[15px] focus:ring-1 focus:ring-primary/20 focus:border-primary text-on-surface">
              ${buOptions}
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-sub mb-2">店舗名 *</label>
            <input id="f-name" type="text" class="w-full bg-surface border border-outline rounded-lg py-2.5 px-3 focus:border-primary focus:ring-1 focus:ring-primary/20 text-[15px] text-on-surface placeholder:text-text-muted transition-all" placeholder="例: 表参道メインオフィス" value="${s.name || ''}" />
          </div>
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label class="block text-sm font-medium text-text-sub mb-2">ステータス</label>
              <select id="f-status" class="w-full bg-surface border border-outline rounded-lg py-2.5 px-3 text-[15px] focus:ring-1 focus:ring-primary/20 focus:border-primary text-on-surface">
                ${statusOptions}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-sub mb-2">住所</label>
              <div class="flex items-center gap-3 bg-surface border border-outline rounded-lg py-1.5 px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <span class="material-symbols-outlined text-text-muted text-[18px]">location_on</span>
                <input id="f-address" type="text" class="flex-1 bg-transparent border-none p-0 py-1 focus:ring-0 text-[15px] text-on-surface placeholder:text-text-muted" placeholder="東京都渋谷区..." value="${s.address || ''}" />
              </div>
              <div id="geocode-status" class="text-xs mt-2 ml-1 text-primary"></div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-sub mb-2">連絡先・担当者</label>
              <div class="flex items-center gap-3 bg-surface border border-outline rounded-lg py-1.5 px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-all">
                <span class="material-symbols-outlined text-text-muted text-[18px]">person</span>
                <input id="f-contact" type="text" class="flex-1 bg-transparent border-none p-0 py-1 focus:ring-0 text-[15px] text-on-surface placeholder:text-text-muted" placeholder="名前や電話番号" value="${s.contact || ''}" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-text-sub mb-2">メモ (次回アクション等)</label>
              <textarea id="f-notes" rows="4" class="w-full p-4 bg-surface rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary/20 text-[15px] leading-relaxed placeholder:text-text-muted text-on-surface" placeholder="詳細...">${s.notes || ''}</textarea>
            </div>
          </div>
          <div class="pt-6 border-t border-outline/50 mt-8">
            <button id="btn-save-store" class="w-full bg-primary text-white py-3 rounded-md font-semibold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              <span class="material-symbols-outlined text-[18px]">check</span>
              ${isEdit ? '変更を保存' : '店舗を追加する'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  `;
}

// ==== SMART PARSE ALGORITHM ====
function parseSmartInput(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').map(l => l.trim());
  const results = [];
  
  let currentStore = null;

  const isAddress = (str) => {
    return str.match(/〒|都|道|府|県|市区町村|区|市|町|村/) && str.match(/[0-9０-９一二三四五六七八九十]/);
  };

  const isPhone = (str) => {
    return str.match(/^[0-9０-９][0-9０-９\-\(\)\s]{8,}$/);
  };

  const pushStore = () => {
    if (currentStore && (currentStore.name || currentStore.address)) {
      if (!currentStore.name && currentStore.address) currentStore.name = '店舗名未設定';
      results.push(currentStore);
    }
    currentStore = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      pushStore(); // 空行は別店舗の区切りとする
      continue;
    }

    if (!currentStore) {
      currentStore = { name: '', address: '', contact: '', notes: '' };
    }

    // 行が住所っぽいと判定された場合
    if (isAddress(line)) {
      // 既に現在の店舗ブロックに住所が入っている場合、新しい店舗の情報と見なす（住所一覧のコピペ等）
      if (currentStore.address) {
        pushStore();
        currentStore = { name: '', address: line.replace(/〒?\s?\d{3}-\d{4}\s?/, '').trim(), contact: '', notes: '' };
      } else {
        currentStore.address = line.replace(/〒?\s?\d{3}-\d{4}\s?/, '').trim();
      }
    } 
    // 行が電話番号っぽいと判定された場合
    else if (isPhone(line)) {
      if (currentStore.contact) {
        currentStore.notes += (currentStore.notes ? '\n' : '') + line;
      } else {
        currentStore.contact = line;
      }
    } 
    // それ以外（店舗名、またはメモ）
    else {
      // まだ名前も住所もない場合は、第一行目なので名前として扱う
      if (!currentStore.name && !currentStore.address) {
        currentStore.name = line;
      } 
      // 住所が先に入っていて名前が空の場合も、名前として扱う
      else if (!currentStore.name && currentStore.address) {
        currentStore.name = line;
      } 
      // それ以外はすべてメモに結合
      else {
        currentStore.notes += (currentStore.notes ? '\n' : '') + line;
      }
    }
  }
  pushStore(); // 最後の1件をプッシュ

  return results;
}

// ==== SETTINGS VIEW ====
function renderSettingsView() {
  const allStores = getAllStores();
  const harigaeStores = allStores.filter(s => s.businessUnit === 'harigae');
  const logiStores = allStores.filter(s => s.businessUnit === 'logikingu');
  
  // Overall Metrics
  const activeCount = allStores.filter(s => ['considering', 'promising', 'revisit'].includes(s.status)).length;
  const contractedCount = allStores.filter(s => s.status === 'contracted').length;

  const generateStatusRows = (stores) => {
    return Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
      const count = stores.filter(s => s.status === key).length;
      return `
        <div class="flex justify-between items-center py-3 border-b border-outline last:border-0">
          <span class="text-[14px] text-text-sub flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cfg.color}"></span>
            ${cfg.label}
          </span>
          <span class="text-[14px] font-semibold ${count > 0 ? 'text-on-surface' : 'text-text-muted'}">${count}</span>
        </div>
      `;
    }).join('');
  };

  return `
    <div class="max-w-4xl mx-auto space-y-8">
      <div class="mb-4">
        <h1 class="text-[32px] font-bold tracking-tight text-on-surface mb-1">Dashboards</h1>
        <p class="text-text-sub">分析データとワークスペース設定</p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline flex flex-col justify-center">
          <span class="text-[12px] uppercase tracking-wider text-text-sub font-medium mb-1 block">Total Stores</span>
          <span class="text-[32px] font-bold text-on-surface">${allStores.length}</span>
        </div>
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline flex flex-col justify-center">
          <span class="text-[12px] uppercase tracking-wider text-text-sub font-medium mb-1 block">Active Deals</span>
          <span class="text-[32px] font-bold text-on-surface">${activeCount}</span>
        </div>
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline flex flex-col justify-center">
          <span class="text-[12px] uppercase tracking-wider text-text-sub font-medium mb-1 block">Won Target</span>
          <span class="text-[32px] font-bold text-primary">${contractedCount}</span>
        </div>
      </div>

      <!-- Business Unit Breakdown -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- 張り替え王 -->
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline">
          <div class="flex justify-between items-end mb-4 border-b border-outline pb-4">
            <div>
              <h3 class="text-lg font-bold text-on-surface">張り替え王</h3>
              <p class="text-xs text-text-sub mt-1">案件ステータス</p>
            </div>
            <span class="text-2xl font-bold text-on-surface">${harigaeStores.length}</span>
          </div>
          <div class="space-y-1">
            ${generateStatusRows(harigaeStores)}
          </div>
        </div>

        <!-- ロジキング -->
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline">
          <div class="flex justify-between items-end mb-4 border-b border-outline pb-4">
            <div>
              <h3 class="text-lg font-bold text-on-surface">ロジキング</h3>
              <p class="text-xs text-text-sub mt-1">案件ステータス</p>
            </div>
            <span class="text-2xl font-bold text-on-surface">${logiStores.length}</span>
          </div>
          <div class="space-y-1">
            ${generateStatusRows(logiStores)}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline">
          <h3 class="text-[16px] font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span class="material-symbols-outlined text-primary">database</span>データ出力・入出
          </h3>
          <div class="space-y-2">
            <input type="file" id="f-csv-upload" accept=".csv" class="hidden" />
            <div id="btn-csv-import" class="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer border border-transparent hover:border-outline">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-text-sub">file_upload</span>
                <div>
                  <p class="font-medium text-sm text-on-surface">CSVインポート</p>
                </div>
              </div>
            </div>
            <div id="btn-csv-export" class="flex items-center justify-between p-3 hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer border border-transparent hover:border-outline">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-text-sub">file_download</span>
                <div>
                  <p class="font-medium text-sm text-on-surface">CSVエクスポート</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="bg-surface rounded-xl p-6 shadow-card border border-outline">
          <h3 class="text-[16px] font-bold mb-4 flex items-center gap-2 text-on-surface">
            <span class="material-symbols-outlined text-primary">cloud</span>クラウド連携
          </h3>
          <div class="flex items-center justify-between p-3 rounded-lg border border-outline bg-surface-container-low">
            <div class="flex items-center gap-3">
              <span class="material-symbols-outlined text-text-sub">sync</span>
              <div>
                <p class="font-medium text-sm text-on-surface">Firebase Sync</p>
                <p class="text-[11px] text-text-muted mt-0.5">未設定</p>
              </div>
            </div>
            <span class="px-2 py-1 bg-surface border border-outline rounded text-[10px] font-semibold text-text-sub">Phase 2</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==== BOTTOM NAV ====
function renderBottomNav() {
  const nav = document.createElement('nav');
  nav.className = 'fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-2.5 bg-surface/90 backdrop-blur-md border-t border-outline shadow-[0px_-4px_20px_rgba(0,0,0,0.02)] z-50';
  
  nav.innerHTML = `
    <button class="flex flex-col items-center justify-center tap-highlight-transparent px-3 py-1 rounded-md transition-all active:scale-95 ${state.currentView === 'list' ? 'text-primary' : 'text-text-sub hover:text-on-surface'}" data-nav="list">
      <span class="material-symbols-${state.currentView === 'list' ? 'filled' : 'outlined'} mb-1 text-[22px]">list</span>
      <span class="font-['Inter'] text-[10px] font-medium">List</span>
    </button>
    <button class="flex flex-col items-center justify-center tap-highlight-transparent px-3 py-1 rounded-md transition-all active:scale-95 ${state.currentView === 'map' ? 'text-primary' : 'text-text-sub hover:text-on-surface'}" data-nav="map">
      <span class="material-symbols-${state.currentView === 'map' ? 'filled' : 'outlined'} mb-1 text-[22px]">map</span>
      <span class="font-['Inter'] text-[10px] font-medium">Map</span>
    </button>
    <button class="flex flex-col items-center justify-center tap-highlight-transparent px-3 py-1 rounded-md transition-all active:scale-95 ${state.currentView === 'settings' ? 'text-primary' : 'text-text-sub hover:text-on-surface'}" data-nav="settings">
      <span class="material-symbols-${state.currentView === 'settings' ? 'filled' : 'outlined'} mb-1 text-[22px]">bar_chart</span>
      <span class="font-['Inter'] text-[10px] font-medium">Stats</span>
    </button>
  `;
  return nav;
}

// Event hooks override for new DOM
function attachHeaderEvents(header) {
  const back = header.querySelector('#btn-back');
  if (back) {
    back.addEventListener('click', () => {
      if (state.currentView === 'detail') {
        state.currentView = 'list';
        state.detailStore = null;
      } else {
        state.currentView = state.detailStore ? 'detail' : 'list';
        state.editingStore = null;
      }
      render();
    });
  }
  const edit = header.querySelector('#btn-edit-store');
  if (edit) {
    edit.addEventListener('click', () => {
      state.editingStore = state.detailStore;
      state.currentView = 'edit';
      render();
    });
  }
  header.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentView = btn.dataset.view;
      render();
    });
  });
}

function attachListEvents(content) {
  content.querySelectorAll('.bu-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentBU = btn.dataset.bu;
      state.filterStatus = 'all';
      render();
    });
  });
  content.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.filterStatus = chip.dataset.status;
      render();
    });
  });

  const searchArea = content.querySelector('#filter-area');
  if (searchArea) {
    searchArea.addEventListener('change', (e) => {
      state.filterArea = e.target.value;
      render();
    });
    // Optional: submit on Enter
    searchArea.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        state.filterArea = e.target.value;
        render();
      }
    });
  }
  content.querySelectorAll('.store-card').forEach(card => {
    card.addEventListener('click', () => {
      const store = getStoreById(card.dataset.id);
      if (store) showDetail(store);
    });
  });
  const addBtn = content.querySelector('#btn-add-floating');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      state.editingStore = null;
      state.currentView = 'add';
      render();
    });
  }
}

function attachFormEvents(content) {
  const saveBtn = content.querySelector('#btn-save-store');
  const smartParseBtn = content.querySelector('#btn-smart-parse');
  const addressInput = content.querySelector('#f-address');
  const geocodeStatus = content.querySelector('#geocode-status');
  let geocodeResult = state.editingStore ? { lat: state.editingStore.lat, lng: state.editingStore.lng } : null;

  if (smartParseBtn) {
    smartParseBtn.addEventListener('click', async () => {
      const text = content.querySelector('#f-smart-input').value.trim();
      if (!text) return;

      const parsed = parseSmartInput(text);
      if (parsed.length === 0) {
        showToast('店舗情報を抽出できませんでした');
        return;
      }

      if (parsed.length === 1) {
        // Single entity: copy directly to form
        if (parsed[0].name) content.querySelector('#f-name').value = parsed[0].name;
        if (parsed[0].address) content.querySelector('#f-address').value = parsed[0].address;
        if (parsed[0].contact) content.querySelector('#f-contact').value = parsed[0].contact;
        if (parsed[0].notes) content.querySelector('#f-notes').value = parsed[0].notes;
        showToast('フォームに自動入力しました');
        
        // Trigger blur on address to fetch map pin
        if (parsed[0].address && addressInput) {
          const evt = new Event('blur');
          addressInput.dispatchEvent(evt);
        }
      } else {
        // Bulk import!
        if (!confirm(`${parsed.length}件の店舗を抽出しました。一括で追加しますか？`)) return;
        
        smartParseBtn.textContent = '追加中...';
        smartParseBtn.disabled = true;

        const baseBu = content.querySelector('#f-bu').value;
        const baseStatus = content.querySelector('#f-status').value;
        
        let count = 0;
        for (const p of parsed) {
          showToast(`${p.name || '店舗'} を処理中...`);
          let coords = null;
          if (p.address) {
            coords = await geocodeAddress(p.address);
            // Nominatim limit: 1 request per second
            await new Promise(r => setTimeout(r, 1000));
          }
          const storeData = {
            businessUnit: baseBu,
            status: baseStatus,
            name: p.name || '名称未設定',
            address: p.address || '',
            contact: p.contact || '',
            notes: p.notes || ''
          };
          if (coords) {
            storeData.lat = coords.lat;
            storeData.lng = coords.lng;
          }
          addStore(storeData);
          count++;
        }
        
        showToast(`${count}件の店舗を追加しました`);
        state.currentView = 'list';
        render();
      }
    });

    // Also auto-parse on paste if the smart input is focused, after small delay to let text paint
    const smartInputArea = content.querySelector('#f-smart-input');
    smartInputArea.addEventListener('paste', () => {
       setTimeout(() => {
         if (smartInputArea.value.trim().length > 10) {
           smartParseBtn.classList.add('animate-pulse');
         }
       }, 50);
    });
  }

  if (addressInput) {
    addressInput.addEventListener('blur', async () => {
      const val = addressInput.value.trim();
      if (!val) return;
      geocodeStatus.textContent = '地図情報を検索中...';
      const coords = await geocodeAddress(val);
      if (coords) {
        geocodeResult = coords;
        geocodeStatus.textContent = '✓ 地図情報を取得しました';
        
        // Bonus: Clean up address field if we know the canonical form or just to acknowledge "Banchi"
        // But since we don't have canonical fallback without reverse-geocoding, we'll leave it as is or strip zip code.
        const cleaned = val.replace(/〒?\s?\d{3}-\d{4}\s?/, '').trim();
        if (addressInput.value !== cleaned) {
             addressInput.value = cleaned;
        }

      } else {
        geocodeStatus.textContent = '⚠ 地図情報が見つかりませんでした';
        geocodeResult = null;
      }
    });
  }
  
  if (!saveBtn) return;
  saveBtn.addEventListener('click', () => {
    const data = {
      businessUnit: content.querySelector('#f-bu').value,
      name: content.querySelector('#f-name').value.trim(),
      status: content.querySelector('#f-status').value,
      address: content.querySelector('#f-address').value.trim(),
      contact: content.querySelector('#f-contact').value.trim(),
      notes: content.querySelector('#f-notes').value.trim(),
    };
    if(geocodeResult) {
      data.lat = geocodeResult.lat;
      data.lng = geocodeResult.lng;
    }
    if (!data.name) {
      alert('店舗名を入力してください');
      return;
    }
    if (state.editingStore) {
      updateStore(state.editingStore.id, data);
    } else {
      addStore(data);
    }
    state.currentView = 'list';
    render();
    showToast('保存しました');
  });
}

function attachSettingsEvents(content) {
  // ==== CSV EXPORT ====
  const escapeCSV = (str) => {
    if (str == null) return '';
    const s = String(str).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  const btnExport = content.querySelector('#btn-csv-export');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const rawChoice = prompt('エクスポートする対象を入力してください（数字）\\n\\n1: すべての全データ\\n2: 張り替え王のみ\\n3: ロジキングのみ', '1');
      if (!['1', '2', '3'].includes(rawChoice)) {
        if(rawChoice !== null) showToast('キャンセルしました');
        return;
      }
      
      let stores = getAllStores();
      if (rawChoice === '2') stores = stores.filter(s => s.businessUnit === 'harigae');
      if (rawChoice === '3') stores = stores.filter(s => s.businessUnit === 'logikingu');

      if (stores.length === 0) {
        showToast('エクスポートするデータがありません');
        return;
      }
      
      // マッピング用データ(緯度経度)等を除く、営業向けの実践的スキーマ
      const headers = ['ID', '事業部', 'ステータス', '店舗名', '住所', '連絡先', 'メモ・備考', '最新更新日'];
      const rows = stores.map(s => [
        s.id,
        BU_CONFIG[s.businessUnit]?.label || s.businessUnit,
        STATUS_CONFIG[s.status]?.label || s.status,
        s.name,
        s.address,
        s.contact,
        s.notes,
        new Date(s.updatedAt).toLocaleDateString()
      ]);
      
      // 添加BOM以防Excel文字化け (UTF-8 with BOM) — Ensures perfect cell parsing in Excel (Mac/Windows) and Google Sheets
      let csvContent = '\uFEFF' + headers.join(',') + '\n';
      rows.forEach(r => {
        csvContent += r.map(escapeCSV).join(',') + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `crm-export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('CSVをエクスポートしました');
    });
  }

  // ==== CSV IMPORT ====
  const btnImport = content.querySelector('#btn-csv-import');
  const fileInput = content.querySelector('#f-csv-upload');
  
  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        
        // シンプルなCSVパーサ関数（ダブルクォートやカンマのエッジケース対応）
        const parseRow = (line) => {
          const result = [];
          let cur = '';
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && line[i+1] === '"') {
              cur += '"'; i++;
            } else if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(cur);
              cur = '';
            } else {
              cur += char;
            }
          }
          result.push(cur);
          return result;
        };

        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        if (lines.length <= 1) {
          showToast('データがありません');
          return;
        }

        const headers = parseRow(lines[0]).map(h => h.trim());
        const getIdx = (candidates) => {
          for (let c of candidates) {
            const idx = headers.findIndex(h => h.includes(c));
            if (idx !== -1) return idx;
          }
          return -1;
        };

        const idxID = getIdx(['ID', 'id']);
        const idxName = getIdx(['店舗名', '名称', 'Name']);
        const idxAddr = getIdx(['住所', '所在地', 'Address']);
        const idxContact = getIdx(['連絡先', '担当', '電話', 'Contact']);
        const idxNotes = getIdx(['メモ', '備考', 'Notes']);
        const idxStatus = getIdx(['ステータス', 'Status']);
        const idxBU = getIdx(['事業部', '事業', '組織', 'BU']);
        const idxLat = getIdx(['緯度', 'Lat']);
        const idxLng = getIdx(['経度', 'Lng']);

        if (idxName === -1 && idxAddr === -1) {
          showToast('サポートされていないCSV形式です（列名を判別できません）');
          return;
        }

        let added = 0;
        let updated = 0;
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const row = parseRow(lines[i]);
          
          let parsedStore = {
            name: idxName !== -1 && row[idxName] ? row[idxName] : '店舗名未設定',
            address: idxAddr !== -1 ? (row[idxAddr] || '') : '',
            contact: idxContact !== -1 ? (row[idxContact] || '') : '',
            notes: idxNotes !== -1 ? (row[idxNotes] || '') : '',
            businessUnit: state.currentBU,
            status: 'not_visited',
            lat: idxLat !== -1 && row[idxLat] ? parseFloat(row[idxLat]) : null,
            lng: idxLng !== -1 && row[idxLng] ? parseFloat(row[idxLng]) : null
          };

          if (idxStatus !== -1 && row[idxStatus]) {
             const rawStatus = row[idxStatus].trim();
             const statusKey = Object.keys(STATUS_CONFIG).find(k => k === rawStatus || STATUS_CONFIG[k].label === rawStatus);
             if (statusKey) parsedStore.status = statusKey;
          }
          
          if (idxBU !== -1 && row[idxBU]) {
             const rawBU = row[idxBU].trim();
             const buKey = Object.keys(BU_CONFIG).find(k => k === rawBU || BU_CONFIG[k].label === rawBU);
             if (buKey) parsedStore.businessUnit = buKey;
          }

          const existingId = idxID !== -1 ? row[idxID] : null;
          const existingStore = existingId ? getStoreById(existingId) : null;
          
          if (existingStore) {
             updateStore(existingStore.id, parsedStore);
             updated++;
          } else {
             addStore(parsedStore);
             added++;
          }
        }
        showToast(`${added}件追加、${updated}件更新しました`);
        
        fileInput.value = '';
        render();
      };
      reader.readAsText(file);
    });
  }
}
// Render trigger
// Removed self-invoking render as it's called at the end of app.js logic


// Init
render();
try { initMainMap(); } catch(e){}

function attachNavEvents(nav) {
  nav.querySelectorAll('button[data-nav], a[data-nav]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentView = btn.dataset.nav;
      state.detailStore = null;
      state.editingStore = null;
      render();
    });
  });
}

function showDetail(store) {
  state.detailStore = store;
  state.currentView = 'detail';
  render();
}

function attachDetailEvents(content, store) {
  const addVisitBtn = content.querySelector('#btn-add-visit');
  if (addVisitBtn) {
    addVisitBtn.addEventListener('click', () => {
      const person = prompt('担当者 (省略可)');
      if (person === null) return;
      const note = prompt('訪問内容・メモ');
      if (note === null) return;
      addVisit(store.id, { person, note });
      state.detailStore = getStoreById(store.id);
      render();
      showToast('訪問記録を追加しました');
    });
  }

  const deleteBtn = content.querySelector('#btn-delete-store');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('この店舗を削除しますか？')) {
        deleteStore(store.id);
        state.currentView = 'list';
        state.detailStore = null;
        render();
        showToast('削除しました');
      }
    });
  }
}
