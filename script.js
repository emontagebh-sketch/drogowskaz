// DROGOWSKAZ - PWA-ready with local editor (no backend).
// Allows adding punkt/linia/obszar stored in localStorage and export/import JSON.
const miasta = [
  { id: 'tomaszow', name: 'Tomaszów Mazowiecki', coords: [51.5310, 20.0087] },
  { id: 'piotrkow', name: 'Piotrków Trybunalski', coords: [51.4055, 19.7030] },
  { id: 'lodz', name: 'Łódź', coords: [51.7592, 19.4560] }
];

// default sample data (will be merged with saved)
const defaultUtr = {
  'tomaszow': [
    {id:1,type:'punkt',title:'Remont ul. Warszawskiej',desc:'Objazd przez ul. Słowackiego',coords:[51.532,20.01]},
    {id:2,type:'linia',title:'Część ul. Piłsudskiego',desc:'Ruch wahadłowy',coords:[[51.531,20.008],[51.532,20.010]]},
    {id:3,type:'obszar',title:'Plac budowy',desc:'Zamknięty teren',coords:[[51.531,20.008],[51.532,20.008],[51.532,20.009],[51.531,20.009]]}
  ]
};

// load saved or default
function loadData(){
  try{
    const raw = localStorage.getItem('drogowskaz_data_v1');
    if(raw) return JSON.parse(raw);
  }catch(e){ console.warn('bad saved data',e) }
  return JSON.parse(JSON.stringify(defaultUtr));
}

function saveData(d){
  localStorage.setItem('drogowskaz_data_v1', JSON.stringify(d));
}

let sampleUtrudnienia = loadData();

// Helpers to generate ID
function nextIdFor(city){
  const list = sampleUtrudnienia[city] || [];
  return list.reduce((m,i)=> Math.max(m,i.id||0),0) + 1;
}

// DOM
const miastoSelect = document.getElementById('miasto');
const utrList = document.getElementById('utrudnieniaList');
const themeToggle = document.getElementById('themeToggle');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const utype = document.getElementById('utype');
const utitle = document.getElementById('utitle');
const udesc = document.getElementById('udesc');
const ucoords = document.getElementById('ucoords');
const saveU = document.getElementById('saveU');
const cancelU = document.getElementById('cancelU');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

// populate select
miasta.forEach(m => {
  const opt = document.createElement('option');
  opt.value = m.id; opt.textContent = m.name;
  miastoSelect.appendChild(opt);
});

// restore last selected
const last = localStorage.getItem('wybraneMiasto') || miasta[0].id;
miastoSelect.value = last;

// theme
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('drogowskaz_theme', t);
}
const savedTheme = localStorage.getItem('drogowskaz_theme') || 'light';
applyTheme(savedTheme);
themeToggle.addEventListener('click', ()=>{
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  applyTheme(cur === 'light' ? 'dark' : 'light');
});

// init Leaflet map
const startCity = miasta.find(m=>m.id===last) || miasta[0];
const map = L.map('map').setView(startCity.coords, 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap'
}).addTo(map);

let markersLayer = L.layerGroup().addTo(map);

function coordsFromInput(str, type){
  // parse "lat,lng;lat2,lng2" -> array or single
  if(!str) return null;
  const parts = str.split(';').map(s=>s.trim()).filter(Boolean);
  const parsed = parts.map(p=>{
    const [lat,lng] = p.split(',').map(x=>parseFloat(x.trim()));
    if(Number.isFinite(lat) && Number.isFinite(lng)) return [lat,lng];
    return null;
  }).filter(Boolean);
  if(type==='punkt') return parsed[0]||null;
  return parsed;
}

function renderUtrudnienia(miastoId){
  markersLayer.clearLayers();
  utrList.innerHTML = '';
  const data = sampleUtrudnienia[miastoId] || [];
  data.forEach(u => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${u.title}</strong><div>${u.desc}</div>`;
    utrList.appendChild(li);
    if(u.type === 'punkt' && Array.isArray(u.coords)){
      const m = L.marker(u.coords).bindPopup(`<strong>${u.title}</strong><br>${u.desc}`);
      markersLayer.addLayer(m);
    } else if(u.type === 'linia' && Array.isArray(u.coords)){
      const poly = L.polyline(u.coords, {color:'red', weight:5}).bindPopup(`<strong>${u.title}</strong><br>${u.desc}`);
      markersLayer.addLayer(poly);
    } else if(u.type === 'obszar' && Array.isArray(u.coords)){
      const polyG = L.polygon(u.coords, {color:'orange', fillColor:'orange', fillOpacity:0.45}).bindPopup(`<strong>${u.title}</strong><br>${u.desc}`);
      markersLayer.addLayer(polyG);
    }
  });
}

function centerOnCity(miastoId){
  const m = miasta.find(x=>x.id===miastoId);
  if(m){ map.setView(m.coords, 13); }
}

miastoSelect.addEventListener('change', ()=>{
  const id = miastoSelect.value;
  localStorage.setItem('wybraneMiasto', id);
  renderUtrudnienia(id);
  centerOnCity(id);
});

// modal handling
addBtn.addEventListener('click', ()=>{
  modal.setAttribute('aria-hidden','false');
  utitle.value=''; udesc.value=''; ucoords.value='';
});
cancelU.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'));

saveU.addEventListener('click', ()=>{
  const city = miastoSelect.value;
  const type = utype.value;
  const title = utitle.value.trim() || 'Bez tytułu';
  const desc = udesc.value.trim() || '';
  const rawcoords = coordsFromInput(ucoords.value, type);
  if(!rawcoords || (type!=='punkt' && rawcoords.length===0)){ alert('Nieprawidłowe współrzędne'); return; }
  const id = nextIdFor(city);
  const entry = {id, type, title, desc, coords: rawcoords};
  if(!sampleUtrudnienia[city]) sampleUtrudnienia[city]=[];
  sampleUtrudnienia[city].push(entry);
  saveData(sampleUtrudnienia);
  renderUtrudnienia(city);
  modal.setAttribute('aria-hidden','true');
});

// export / import
exportBtn.addEventListener('click', ()=>{
  const dataStr = JSON.stringify(sampleUtrudnienia,null,2);
  const blob = new Blob([dataStr], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'drogowskaz-data.json'; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', ()=> importFile.click());
importFile.addEventListener('change', (e)=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      // simple merge: overwrite cities in parsed
      Object.keys(parsed).forEach(k=> sampleUtrudnienia[k]=parsed[k]);
      saveData(sampleUtrudnienia);
      renderUtrudnienia(miastoSelect.value);
      alert('Import zakończony');
    }catch(err){ alert('Nie udało się zaimportować pliku'); }
  };
  reader.readAsText(f);
});

// initial render and centering
renderUtrudnienia(last);
centerOnCity(last);

// register service worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('service-worker.js').then(()=>console.log('SW zarejestrowany'));
}
