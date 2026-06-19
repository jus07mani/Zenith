/* ============================================================
   ORBIT — globe.js
   This is Person 1's file.
   Job: Show an interactive map. When the user clicks anywhere
   on it, capture the latitude and longitude, then call
   fetchAllData(lat, lng) which is Person 2's function.
   ============================================================ */


/* ============================================================
   STEP 1: LOAD LEAFLET
   Leaflet is a free map library. We load it from a CDN
   (a server that hosts the library for us for free).
   We add these two lines into index.html <head>:

   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

   IMPORTANT: Add those two lines to index.html before this script loads.
   ============================================================ */


/* ============================================================
   STEP 2: WAIT FOR THE PAGE TO FULLY LOAD
   We wrap everything in this function so the map only
   initializes after the HTML is ready.
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {

  /* ----------------------------------------------------------
     CREATE THE MAP
     L.map('globe-container') tells Leaflet to put the map
     inside the div with id="globe-container" (in index.html).
     setView([lat, lng], zoomLevel) sets where it starts.
     We start centered on the world at zoom level 2.
  ---------------------------------------------------------- */
  const map = L.map('globe-container').setView([20, 0], 2);

  /* ----------------------------------------------------------
     ADD THE MAP TILES
     Tiles are the actual map images (the dark space-style layer).
     We use CartoDB Dark Matter — it looks like a space radar map.
     attribution is the legal credit line Leaflet requires.
  ---------------------------------------------------------- */
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap © CARTO',
    maxZoom: 19
  }).addTo(map);

  /* ----------------------------------------------------------
     MARKER VARIABLE
     We'll store the red pin marker here.
     Starting as null means "no marker yet".
  ---------------------------------------------------------- */
  let marker = null;

  /* ----------------------------------------------------------
     CLICK EVENT
     When the user clicks anywhere on the map:
     1. e.latlng gives us the coordinates of the click
     2. We update the display at the top (LAT / LNG)
     3. We move the marker to that spot
     4. We call fetchAllData() — Person 2's function
        that fetches all the space data for those coordinates
  ---------------------------------------------------------- */
  map.on('click', function(e) {

    // Get the coordinates from the click event
    const lat = e.latlng.lat.toFixed(4);  // toFixed(4) rounds to 4 decimal places
    const lng = e.latlng.lng.toFixed(4);

    // Update the coordinate display in the header
    // These are the <strong> tags with those ids in index.html
    document.getElementById('lat-display').textContent = lat;
    document.getElementById('lng-display').textContent = lng;

    // Remove old marker if one exists, then place a new one
    if (marker) {
      map.removeLayer(marker);
    }
    marker = L.marker([lat, lng]).addTo(map);

    // Call Person 2's function with the coordinates
    // If Person 2 hasn't written it yet, this will error — that's ok for now
    if (typeof fetchAllData === 'function') {
      fetchAllData(parseFloat(lat), parseFloat(lng));
    }

  });

  /* ----------------------------------------------------------
     SEARCH BAR FUNCTIONALITY
     When the user types a city name and clicks "Scan Sky":
     1. We use a free geocoding API (Nominatim from OpenStreetMap)
        to convert the city name to lat/lng
     2. Then we move the map there and trigger the same data fetch
  ---------------------------------------------------------- */
  document.getElementById('search-btn').addEventListener('click', function() {

    // Get what the user typed
    const query = document.getElementById('location-input').value.trim();

    // If they typed nothing, do nothing
    if (!query) return;

    // Change button text to show loading state
    this.textContent = 'Scanning...';
    const btn = this;

    // Call Nominatim — a free city-name-to-coordinates service
    // encodeURIComponent makes the city name URL-safe (spaces become %20 etc)
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`)
      .then(response => response.json())  // convert response to JSON
      .then(data => {

        if (data.length === 0) {
          // No results found
          alert('Location not found. Try a different city name.');
          btn.textContent = 'Scan Sky';
          return;
        }

        // Get the lat/lng from the first result
        const lat = parseFloat(data[0].lat).toFixed(4);
        const lng = parseFloat(data[0].lon).toFixed(4);

        // Move the map to that location and zoom in
        map.setView([lat, lng], 6);

        // Update the coordinate display
        document.getElementById('lat-display').textContent = lat;
        document.getElementById('lng-display').textContent = lng;

        // Remove old marker, add new one
        if (marker) {
          map.removeLayer(marker);
        }
        marker = L.marker([lat, lng]).addTo(map);

        // Call Person 2's data fetching function
        if (typeof fetchAllData === 'function') {
          fetchAllData(parseFloat(lat), parseFloat(lng));
        }

        // Reset button text
        btn.textContent = 'Scan Sky';

      })
      .catch(error => {
        // Something went wrong with the network request
        console.error('Search error:', error);
        alert('Search failed. Check your internet connection.');
        btn.textContent = 'Scan Sky';
      });

  });

  /* ----------------------------------------------------------
     ALSO TRIGGER SEARCH ON ENTER KEY
     So the user can press Enter instead of clicking the button.
  ---------------------------------------------------------- */
  document.getElementById('location-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('search-btn').click();
    }
  });

});
