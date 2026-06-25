/**
 * globe.js — ZENITH Map & Location Logic
 * Handles: Leaflet map init, location search, click events, marker placement
 */
 
document.addEventListener('DOMContentLoaded', () => {
 
  /* ----------------------------------------------------------
     1. DEFINE ALL MAP VIEW LAYERS
  ---------------------------------------------------------- */
  const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });
 
  const satelliteLayer = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 19
  });
 
  const hybridLayer = L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ),
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 19 }
    )
  ]);
 
  const darkLayer = L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  });
 
  /* ----------------------------------------------------------
     2. INITIALIZE MAP
  ---------------------------------------------------------- */
  const map = L.map('globe-container', {
    center: [20, 0],
    zoom: 2,
    layers: [defaultLayer],
    zoomControl: true
  });
 
  let marker = null;
 
  /* ----------------------------------------------------------
     3. ANIMATED GLOWING RADAR MARKER
  ---------------------------------------------------------- */
  const customPulseIcon = L.divIcon({
    className: 'custom-pulse-marker',
    html: `<div class="pulse-core"></div><div class="pulse-ring"></div><div class="pulse-ring pulse-ring-2"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
 
  /* ----------------------------------------------------------
     4. LAYER CONTROL TOGGLE
  ---------------------------------------------------------- */
  const baseMaps = {
    "🗺️ Default": defaultLayer,
    "🛰️ Satellite": satelliteLayer,
    "🌐 Hybrid": hybridLayer,
    "🌌 Dark Radar": darkLayer
  };
 
  L.control.layers(baseMaps, null, { position: 'topright', collapsed: true }).addTo(map);
 
  /* ----------------------------------------------------------
     5. CORE UPDATE FUNCTION
  ---------------------------------------------------------- */
  const updateMapLocation = (lat, lng, locationName = "Target Acquired") => {
    const fLat = parseFloat(parseFloat(lat).toFixed(4));
    const fLng = parseFloat(parseFloat(lng).toFixed(4));
 
    const latEl = document.getElementById('lat-display');
    const lngEl = document.getElementById('lng-display');
    if (latEl) latEl.textContent = fLat.toFixed(4);
    if (lngEl) lngEl.textContent = fLng.toFixed(4);
 
    if (marker) map.removeLayer(marker);
 
    marker = L.marker([fLat, fLng], { icon: customPulseIcon }).addTo(map);
 
    marker.bindPopup(`
      <div style="text-align:center;font-family:sans-serif;padding:4px 2px;">
        <strong style="color:#d9a24f;font-size:13px;">📍 ${locationName}</strong><br>
        <span style="font-size:11px;color:#888;">[${fLat}, ${fLng}]</span>
      </div>
    `).openPopup();
 
    // Call the master data loader from api.js
    if (typeof window.fetchAllData === 'function') {
      window.fetchAllData(fLat, fLng);
    }
  };
 
  // Expose for use from other scripts (e.g. best-sky panel)
  window.updateMapLocation = updateMapLocation;
 
  /* ----------------------------------------------------------
     6. MAP CLICK HANDLER
  ---------------------------------------------------------- */
  map.on('click', (e) => {
    map.panTo(e.latlng);
    updateMapLocation(e.latlng.lat, e.latlng.lng, "Selected Point");
  });
 
  /* ----------------------------------------------------------
     7. SEARCH BAR
  ---------------------------------------------------------- */
  const searchBtn = document.getElementById('search-btn');
  const locationInput = document.getElementById('location-input');
 
  if (searchBtn && locationInput) {
    const doSearch = async () => {
      const query = locationInput.value.trim();
      if (!query) return;
 
      searchBtn.disabled = true;
      const btnSpan = searchBtn.querySelector('span');
      if (btnSpan) btnSpan.textContent = 'Scanning...';
 
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
 
        if (!data || data.length === 0) {
          alert('Location not found. Try a different city name or coordinates.');
          return;
        }
 
        const { lat, lon: lng, display_name } = data[0];
        const shortName = display_name.split(',')[0].trim();
 
        map.flyTo([parseFloat(lat), parseFloat(lng)], 8, {
          animate: true,
          duration: 2.0
        });
 
        updateMapLocation(lat, lng, shortName);
 
      } catch (err) {
        console.error('[ZENITH] Search error:', err);
        alert('Search failed. Check your internet connection.');
      } finally {
        searchBtn.disabled = false;
        if (btnSpan) btnSpan.textContent = 'Scan Location';
      }
    };
 
    searchBtn.addEventListener('click', doSearch);
    locationInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSearch();
    });
  }
 
  /* ----------------------------------------------------------
     8. PULSE MARKER CSS (injected once)
  ---------------------------------------------------------- */
  if (!document.getElementById('pulse-marker-styles')) {
    const style = document.createElement('style');
    style.id = 'pulse-marker-styles';
    style.textContent = `
      .custom-pulse-marker {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pulse-core {
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #d9a24f;
        box-shadow: 0 0 8px 2px rgba(217,162,79,0.9);
        z-index: 2;
      }
      .pulse-ring {
        position: absolute;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 2px solid rgba(217,162,79,0.7);
        animation: pulseRingAnim 1.6s ease-out infinite;
        z-index: 1;
      }
      .pulse-ring-2 {
        animation-delay: 0.8s;
      }
      @keyframes pulseRingAnim {
        0%   { transform: scale(0.5); opacity: 1; }
        100% { transform: scale(2.2); opacity: 0; }
      }
      .leaflet-popup-content-wrapper {
        background: rgba(10,13,18,0.95) !important;
        border: 1px solid rgba(217,162,79,0.4) !important;
        border-radius: 10px !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
        color: #f5efe6 !important;
      }
      .leaflet-popup-tip {
        background: rgba(10,13,18,0.95) !important;
      }
      .leaflet-popup-close-button {
        color: #d9a24f !important;
      }
      .leaflet-control-layers {
        background: rgba(10,13,18,0.92) !important;
        border: 1px solid rgba(255,255,255,0.12) !important;
        color: #f5efe6 !important;
        border-radius: 10px !important;
      }
      .leaflet-control-layers label {
        color: #f5efe6 !important;
        font-family: 'Manrope', sans-serif !important;
        font-size: 12px !important;
      }
      .leaflet-control-layers-toggle {
        background-color: rgba(10,13,18,0.9) !important;
        border: 1px solid rgba(217,162,79,0.4) !important;
        border-radius: 6px !important;
      }
      .leaflet-bar a {
        background: rgba(10,13,18,0.9) !important;
        color: #d9a24f !important;
        border-color: rgba(255,255,255,0.12) !important;
      }
      .leaflet-bar a:hover {
        background: rgba(25,30,40,0.95) !important;
      }
    `;
    document.head.appendChild(style);
  }
 
});