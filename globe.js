document.addEventListener('DOMContentLoaded', () => {

  /* ----------------------------------------------------------
     1. DEFINE ALL MAP VIEW LAYERS
  ---------------------------------------------------------- */
  const defaultLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  });

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri',
    maxZoom: 19
  });

  const hybridLayer = L.layerGroup([
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 }),
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', { maxZoom: 19 })
  ]);

  const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  });

  /* ----------------------------------------------------------
     2. INITIALIZE MAP
  ---------------------------------------------------------- */
  const map = L.map('globe-container', {
    center: [20, 0],
    zoom: 2,
    layers: [defaultLayer]
  });

  let marker = null;

  /* ----------------------------------------------------------
     3. NEW: ANIMATED GLOWING RADAR MARKER
  ---------------------------------------------------------- */
  const customPulseIcon = L.divIcon({
    className: 'custom-pulse-marker',
    html: '<div class="pulse-core"></div><div class="pulse-ring"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
  });

  /* ----------------------------------------------------------
     4. LAYER CONTROL TOGGLE
  ---------------------------------------------------------- */
  const baseMaps = {
    "🗺️ Default View": defaultLayer,
    "🛰️ Satellite Mode": satelliteLayer,
    "🌐 Hybrid Mode": hybridLayer,
    "🌌 Dark Radar": darkLayer
  };

  L.control.layers(baseMaps, null, { position: 'topright', collapsed: false }).addTo(map);

  /* ----------------------------------------------------------
     5. UPGRADED REUSABLE UPDATE FUNCTION
  ---------------------------------------------------------- */
  const updateMapLocation = (lat, lng, locationName = "Target Acquired") => {
    const formattedLat = parseFloat(lat).toFixed(4);
    const formattedLng = parseFloat(lng).toFixed(4);

    document.getElementById('lat-display').textContent = formattedLat;
    document.getElementById('lng-display').textContent = formattedLng;

    if (marker) map.removeLayer(marker);
    
    // Using our custom neon icon instead of standard blue pin
    marker = L.marker([formattedLat, formattedLng], { icon: customPulseIcon }).addTo(map);

    // Dynamic clean text popup styling
    marker.bindPopup(`
      <div style="text-align: center; font-family: sans-serif;">
        <strong style="color: #ff0055;">📍 ${locationName}</strong><br>
        <span style="font-size: 11px; color: #666;">[${formattedLat}, ${formattedLng}]</span>
      </div>
    `).openPopup();

    if (typeof fetchAllData === 'function') {
      fetchAllData(parseFloat(formattedLat), parseFloat(formattedLng));
    }
  };

  /* ----------------------------------------------------------
     6. INTERACTION EVENTS
  ---------------------------------------------------------- */
  map.on('click', (e) => {
    map.panTo(e.latlng); // Smoothly center map frame over click point
    updateMapLocation(e.latlng.lat, e.latlng.lng, "Selected Point");
  });

  const searchBtn = document.getElementById('search-btn');
  const locationInput = document.getElementById('location-input');

  searchBtn.addEventListener('click', async () => {
    const query = locationInput.value.trim();
    if (!query) return;

    searchBtn.disabled = true;
    searchBtn.textContent = 'Scanning...';

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.length === 0) {
        alert('Location not found. Try a different city name.');
        return;
      }

      const { lat, lon: lng, display_name } = data[0];
      const shortName = display_name.split(',')[0]; // Grabs just city name prefix

      // ATTRACTIVE: Multi-second cinematic flight zoom travel animation
      map.flyTo([lat, lng], 10, {
        animate: true,
        duration: 2.0 
      });

      updateMapLocation(lat, lng, shortName);

    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Check your internet connection.');
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Search Map';
    }
  });

  locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
  });
});