document.addEventListener("DOMContentLoaded", () => {
  const bootScreen = document.getElementById("bootScreen");
  const mainApp = document.getElementById("mainApp");
  const bootTerminal = document.getElementById("bootTerminal");
  const bootProgressBar = document.getElementById("bootProgressBar");
  const bootStatus = document.getElementById("bootStatus");

  const latInput = document.getElementById("latInput");
  const lngInput = document.getElementById("lngInput");
  const scanBtn = document.getElementById("scanBtn");
  const useLocationBtn = document.getElementById("use-location-btn");
  const copyCoordinatesBtn = document.getElementById("copy-coordinates-btn");
  const searchInput = document.getElementById("location-input");
  const searchBtn = document.getElementById("search-btn");

  const latDisplay = document.getElementById("lat-display");
  const lngDisplay = document.getElementById("lng-display");
  const reportBox = document.getElementById("reportBox");
  const statusText = document.getElementById("statusText");

  const scoreValue = document.getElementById("orbit-score-value");
  const scoreFill = document.getElementById("score-ring-fill");
  const scoreDescription = document.getElementById("score-description");

  let map;
  let marker;

  let currentLocation = {
    lat: 13.0827,
    lng: 80.2707,
    label: "Chennai Coordinate Zone"
  };

  let currentSkyData = {
    satellites: [],
    planets: [],
    constellations: []
  };

  const CRATERS = [
    { name: "Lonar", lat: 19.98, lng: 76.51, dia: "1.8 km", age: "50K yrs" },
    { name: "Barringer", lat: 35.027, lng: -111.022, dia: "1.2 km", age: "50K yrs" },
    { name: "Chicxulub", lat: 21.4, lng: -89.5, dia: "180 km", age: "66M yrs" },
    { name: "Vredefort", lat: -27.0, lng: 27.5, dia: "300 km", age: "2.02B yrs" },
    { name: "Ries", lat: 48.9, lng: 10.6, dia: "24 km", age: "15M yrs" },
    { name: "Manicouagan", lat: 51.38, lng: -68.7, dia: "100 km", age: "214M yrs" }
  ];

  function openApp() {
    if (bootScreen) {
      bootScreen.classList.add("hide");
      bootScreen.style.display = "none";
    }

    if (mainApp) {
      mainApp.classList.add("show");
      mainApp.style.opacity = "1";
      mainApp.style.transform = "scale(1)";
    }

    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 300);
  }

  function runBootSequence() {
    if (!bootTerminal || !bootProgressBar || !bootStatus) {
      setTimeout(openApp, 1000);
      return;
    }

    const lines = [
      "[ZENITH] Core system online",
      "[MAP] Earth coordinate radar initializing",
      "[ISS] Orbital feed linked",
      "[NOAA] Space weather channel ready",
      "[NASA] Threat watch layer armed",
      "[SKY] Planet and constellation module ready",
      "[DOME] 3D sky dome lazy-load enabled",
      "[SYSTEM] Coordinate intelligence ready"
    ];

    let index = 0;
    let progress = 0;

    const bootTimer = setInterval(() => {
      if (index < lines.length) {
        const line = document.createElement("div");
        line.textContent = lines[index];
        bootTerminal.appendChild(line);
        bootTerminal.scrollTop = bootTerminal.scrollHeight;

        progress += 100 / lines.length;
        bootProgressBar.style.width = `${Math.min(progress, 100)}%`;
        bootStatus.textContent = lines[index];
        index++;
      } else {
        clearInterval(bootTimer);
        bootProgressBar.style.width = "100%";
        bootStatus.textContent = "System ready.";
        setTimeout(openApp, 450);
      }
    }, 280);
  }

  function initMap() {
    const worldBounds = L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180));

    map = L.map("globe-container", {
      center: [currentLocation.lat, currentLocation.lng],
      zoom: 4,
      minZoom: 2,
      maxZoom: 18,
      maxBounds: worldBounds,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      noWrap: true,
      bounds: worldBounds,
      attribution: "© OpenStreetMap"
    }).addTo(map);

    marker = L.marker([currentLocation.lat, currentLocation.lng]).addTo(map);
    marker.bindPopup("ZENITH coordinate lock").openPopup();

    map.on("click", (event) => {
      updateLocation(
        event.latlng.lat,
        event.latlng.lng,
        "Selected Map Coordinate",
        true
      );
    });

    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function formatNumber(value) {
    return Number(value).toFixed(4);
  }

  function toRad(value) {
    return (value * Math.PI) / 180;
  }

  function calculateDistanceKm(lat1, lng1, lat2, lng2) {
    const radius = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
  }

  function getNearestCrater(lat, lng) {
    let nearest = CRATERS[0];
    let nearestDistance = calculateDistanceKm(lat, lng, nearest.lat, nearest.lng);

    for (let i = 1; i < CRATERS.length; i++) {
      const crater = CRATERS[i];
      const distance = calculateDistanceKm(lat, lng, crater.lat, crater.lng);

      if (distance < nearestDistance) {
        nearest = crater;
        nearestDistance = distance;
      }
    }

    return {
      crater: nearest,
      distance: nearestDistance
    };
  }

  function getHemisphere(lat, lng) {
    const northSouth = lat >= 0 ? "Northern" : "Southern";
    const eastWest = lng >= 0 ? "Eastern" : "Western";
    return `${northSouth} / ${eastWest}`;
  }

  function calculateZenithScore(lat, lng, kpValue) {
    const absLat = Math.abs(lat);
    let score = 68;

    if (absLat >= 20 && absLat <= 40) score += 10;
    if (absLat > 55) score += 8;
    if (Math.abs(lng) < 120) score += 5;
    if (kpValue >= 4) score += 6;

    score += Math.floor(Math.random() * 8);

    return Math.max(45, Math.min(96, score));
  }

  function updateScore(score) {
    if (scoreValue) scoreValue.textContent = score;

    if (scoreFill) {
      const circumference = 301.59;
      const offset = circumference - (score / 100) * circumference;
      scoreFill.style.strokeDashoffset = offset;
    }

    if (scoreDescription) {
      if (score >= 85) {
        scoreDescription.textContent =
          "High-value coordinate profile for sky observation.";
      } else if (score >= 70) {
        scoreDescription.textContent =
          "Stable coordinate profile for orbital observation.";
      } else {
        scoreDescription.textContent =
          "Moderate coordinate profile. Observation may vary.";
      }
    }
  }

  function updateBasicCardsLoading() {
    setText("satellite-count", "Scanning");
    setText("satellite-detail", "Calculating sky traffic profile");

    setText("kp-index", "Scanning");
    setText("kp-detail", "Reading NOAA space weather channel");

    setText("crater-name", "Scanning");
    setText("crater-detail", "Finding nearest known impact profile");

    setText("neo-count", "Scanning");
    setText("neo-detail", "Reading current threat watch feed");

    setText("iss-pass-time", "Scanning");
    setText("iss-detail", "Reading ISS orbital position");

    setText("aurora-probability", "Scanning");
    setText("aurora-detail", "Estimating aurora visibility");
  }

  function updateFragments(lat, lng, label, kpValue, neoCount, issDistance) {
    setText("fragmentOne", `Coordinate lock: ${formatNumber(lat)}, ${formatNumber(lng)}.`);
    setText("fragmentTwo", `ISS range estimate: ${Math.round(issDistance)} km from selected zone.`);
    setText("fragmentThree", `Geomagnetic Kp index: ${kpValue}.`);
    setText("fragmentFour", `Near-Earth object feed: ${neoCount} tracked today.`);
    setText("fragmentFive", `Sky module loaded for ${getHemisphere(lat, lng)} hemisphere.`);
    setText("fragmentSix", `3D dome ready for ${label}.`);
  }

  function updateReport(lat, lng, label, kpValue, neoCount, satelliteCount) {
    if (!reportBox) return;

    reportBox.innerHTML = `
      <strong>${label}</strong><br>
      Coordinate lock established at <strong>${formatNumber(lat)}</strong>,
      <strong>${formatNumber(lng)}</strong>. ZENITH detected ${satelliteCount}
      estimated overhead satellite tracks, Kp index ${kpValue}, and ${neoCount}
      near-Earth objects in the current threat watch feed.
    `;
  }

  function updateLocation(lat, lng, label = "Selected Coordinate", moveMap = false) {
    lat = Number(lat);
    lng = Number(lng);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert("Please enter valid latitude and longitude.");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Latitude must be -90 to 90 and longitude must be -180 to 180.");
      return;
    }

    currentLocation = { lat, lng, label };

    if (latInput) latInput.value = formatNumber(lat);
    if (lngInput) lngInput.value = formatNumber(lng);
    if (latDisplay) latDisplay.textContent = formatNumber(lat);
    if (lngDisplay) lngDisplay.textContent = formatNumber(lng);

    if (marker) {
      marker.setLatLng([lat, lng]);
      marker.bindPopup(label).openPopup();
    }

    if (map && moveMap) {
      map.setView([lat, lng], 5);
    }

    if (statusText) {
      statusText.textContent = "SCANNING COORDINATE";
    }

    updateBasicCardsLoading();
    updateSkyOverheadFeatures(lat, lng);
    updateLiveData(lat, lng, label);
  }

  async function updateLiveData(lat, lng, label) {
    let kpValue = 2;
    let neoCount = 0;
    let issDistance = 12000;

    try {
      const kpResponse = await fetch(
        "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json"
      );

      const kpData = await kpResponse.json();

      if (Array.isArray(kpData) && kpData.length > 0) {
        const latest = kpData[kpData.length - 1];
        kpValue = Number(latest.kp_index || latest.Kp || latest.estimated_kp || 2);
      }
    } catch (error) {
      kpValue = 2;
    }

    try {
      const issResponse = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      const issData = await issResponse.json();

      if (issData && issData.latitude && issData.longitude) {
        issDistance = calculateDistanceKm(
          lat,
          lng,
          Number(issData.latitude),
          Number(issData.longitude)
        );

        setText("iss-pass-time", `${Math.round(issDistance)} km`);
        setText(
          "iss-detail",
          `Current ISS position: ${Number(issData.latitude).toFixed(2)}, ${Number(issData.longitude).toFixed(2)}.`
        );
      } else {
        setText("iss-pass-time", "Online");
        setText("iss-detail", "ISS channel connected. Exact position delayed.");
      }
    } catch (error) {
      issDistance = 9000 + Math.random() * 8000;
      setText("iss-pass-time", "Fallback");
      setText("iss-detail", "ISS live feed delayed. Using orbital estimate.");
    }

    try {
      const today = new Date().toISOString().slice(0, 10);
      const neoUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`;

      const neoResponse = await fetch(neoUrl);
      const neoData = await neoResponse.json();

      if (
        neoData &&
        neoData.near_earth_objects &&
        neoData.near_earth_objects[today]
      ) {
        neoCount = neoData.near_earth_objects[today].length;
      }
    } catch (error) {
      neoCount = 3 + Math.floor(Math.random() * 7);
    }

    const nearestData = getNearestCrater(lat, lng);
    const crater = nearestData.crater;
    const craterDistance = nearestData.distance;

    setText("kp-index", kpValue.toFixed(1));
    setText(
      "kp-detail",
      kpValue >= 5
        ? "Elevated geomagnetic activity detected."
        : "Space weather is currently stable."
    );

    setText("neo-count", neoCount);
    setText(
      "neo-detail",
      `${neoCount} near-Earth objects tracked in today's threat watch layer.`
    );

    setText("crater-name", crater.name);
    setText(
      "crater-detail",
      `${Math.round(craterDistance)} km away. Diameter ${crater.dia}, age ${crater.age}.`
    );

    const aurora = calculateAuroraProbability(lat, kpValue);

    setText("aurora-probability", `${aurora}%`);
    setText(
      "aurora-detail",
      aurora >= 55
        ? "High-latitude aurora conditions are possible."
        : "Aurora probability is limited for this coordinate."
    );

    const satelliteCount = currentSkyData.satellites.length || 8;

    setText("satellite-count", satelliteCount);
    setText(
      "satellite-detail",
      `${satelliteCount} estimated orbital paths are active above this coordinate zone.`
    );

    const score = calculateZenithScore(lat, lng, kpValue);

    updateScore(score);
    updateReport(lat, lng, label, kpValue.toFixed(1), neoCount, satelliteCount);
    updateFragments(lat, lng, label, kpValue.toFixed(1), neoCount, issDistance);

    if (statusText) {
      statusText.textContent = "SYSTEM ONLINE";
    }
  }

  function calculateAuroraProbability(lat, kpValue) {
    const absLat = Math.abs(lat);
    let probability = 5;

    if (absLat > 65) probability += 45;
    else if (absLat > 55) probability += 28;
    else if (absLat > 45) probability += 12;

    probability += kpValue * 7;

    return Math.max(2, Math.min(96, Math.round(probability)));
  }

  function updateSkyOverheadFeatures(lat, lng) {
    const satellites = getEstimatedSatellites(lat, lng);
    const planets = getEstimatedPlanets(lat, lng);
    const constellations = getEstimatedConstellations(lat, lng);

    currentSkyData = { satellites, planets, constellations };

    setText("overhead-satellite-count", satellites.length);
    setText(
      "overhead-satellite-detail",
      `${satellites.join(", ")}. Estimated active overhead orbital tracks.`
    );

    setText("planet-overhead-count", planets.length);
    setText(
      "planet-overhead-detail",
      `Likely planetary targets: ${planets.join(", ")}. Visibility depends on local time.`
    );

    setText("constellation-count", constellations.length);
    setText(
      "constellation-detail",
      `Estimated sky region: ${constellations.join(", ")}.`
    );
  }

  function getEstimatedSatellites(lat, lng) {
    const absLat = Math.abs(lat);
    const hour = new Date().getUTCHours();

    const equatorial = ["ISS", "NOAA-19", "Terra", "Aqua", "Sentinel-2A", "Landsat 8"];
    const mid = ["Starlink Track", "Sentinel-1A", "NOAA-20", "MetOp-B", "WorldView"];
    const polar = ["Polar Orbiter", "NOAA-21", "Suomi NPP", "Cosmos Track", "Iridium Track"];

    let base;

    if (absLat < 25) {
      base = equatorial;
    } else if (absLat < 55) {
      base = mid;
    } else {
      base = polar;
    }

    const shift = Math.abs(Math.floor((lat + lng + hour) % base.length));
    const rotated = base.slice(shift).concat(base.slice(0, shift));

    return rotated.slice(0, 4 + Math.floor(Math.random() * 2));
  }

  function getEstimatedPlanets(lat, lng) {
    const hour = new Date().getUTCHours();
    const selector = Math.abs(Math.floor((lat * 2 + lng + hour) % 6));

    const planetSets = [
      ["Venus", "Jupiter"],
      ["Mars", "Saturn"],
      ["Jupiter", "Saturn", "Mars"],
      ["Venus", "Mercury"],
      ["Mars", "Jupiter"],
      ["Saturn", "Jupiter", "Venus"]
    ];

    return planetSets[selector];
  }

  function getEstimatedConstellations(lat, lng) {
    const month = new Date().getUTCMonth();

    const northWinter = ["Orion", "Taurus", "Gemini"];
    const northSummer = ["Cygnus", "Lyra", "Aquila"];
    const northAll = ["Ursa Major", "Cassiopeia", "Draco"];

    const equatorial = ["Orion", "Scorpius", "Pegasus"];
    const south = ["Crux", "Centaurus", "Carina"];
    const southAlt = ["Pavo", "Tucana", "Eridanus"];

    if (lat > 25) {
      if (month >= 10 || month <= 2) return northWinter;
      if (month >= 5 && month <= 8) return northSummer;
      return northAll;
    }

    if (lat < -25) {
      if (month >= 3 && month <= 8) return south;
      return southAlt;
    }

    return equatorial;
  }

  async function searchLocation() {
    const query = searchInput ? searchInput.value.trim() : "";

    if (!query) {
      alert("Enter a city or place name.");
      return;
    }

    if (statusText) {
      statusText.textContent = "SEARCHING MAP";
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=1`;

      const response = await fetch(url);
      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        alert("Location not found. Try another name.");
        if (statusText) statusText.textContent = "SYSTEM ONLINE";
        return;
      }

      const result = data[0];
      const lat = Number(result.lat);
      const lng = Number(result.lon);
      const label = result.display_name.split(",").slice(0, 2).join(",");

      updateLocation(lat, lng, label, true);
    } catch (error) {
      alert("Search failed. Check internet connection.");
      if (statusText) statusText.textContent = "SYSTEM ONLINE";
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported in this browser.");
      return;
    }

    if (statusText) {
      statusText.textContent = "ACCESSING DEVICE LOCATION";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateLocation(
          position.coords.latitude,
          position.coords.longitude,
          "Device Location",
          true
        );
      },
      () => {
        alert("Location permission denied or unavailable.");
        if (statusText) statusText.textContent = "SYSTEM ONLINE";
      }
    );
  }

  async function copyCoordinates() {
    const text = `${formatNumber(currentLocation.lat)}, ${formatNumber(currentLocation.lng)}`;

    try {
      await navigator.clipboard.writeText(text);

      if (statusText) statusText.textContent = "COORDINATES COPIED";

      setTimeout(() => {
        if (statusText) statusText.textContent = "SYSTEM ONLINE";
      }, 1200);
    } catch (error) {
      alert(`Coordinates: ${text}`);
    }
  }

  window.runTimeMachine = function () {
    const dateInput = document.getElementById("tm-date");
    const locationInput = document.getElementById("tm-location");
    const result = document.getElementById("tm-result");

    if (!result) return;

    const dateValue =
      dateInput && dateInput.value ? dateInput.value : "selected historical date";

    const locationLabel =
      locationInput && locationInput.value.trim()
        ? locationInput.value.trim()
        : currentLocation.label;

    const planets = getEstimatedPlanets(currentLocation.lat, currentLocation.lng);
    const constellations = getEstimatedConstellations(
      currentLocation.lat,
      currentLocation.lng
    );

    result.innerHTML = `
      <strong>Historical sky profile generated.</strong><br>
      Location: ${locationLabel}<br>
      Date: ${dateValue}<br>
      Estimated visible planet targets: ${planets.join(", ")}.<br>
      Estimated constellation zone: ${constellations.join(", ")}.
    `;
  };

  window.findBestSky = function () {
    const result = document.getElementById("best-sky-result");

    if (!result) return;

    result.innerHTML = `
      <div class="best-sky-results">
        <div class="best-sky-card" onclick="window.updateMapLocation(32.78, 78.96, 'Hanle Observatory Region', true)">
          <div>
            <div class="best-sky-name">Hanle Observatory Region, India</div>
            <div class="best-sky-reasons">High altitude · dark sky region · observatory profile</div>
          </div>
          <span class="best-sky-score">91</span>
        </div>

        <div class="best-sky-card" onclick="window.updateMapLocation(-23.5, -68.5, 'Atacama Desert, Chile', true)">
          <div>
            <div class="best-sky-name">Atacama Desert, Chile</div>
            <div class="best-sky-reasons">Dry atmosphere · low cloud cover · strong sky clarity</div>
          </div>
          <span class="best-sky-score">89</span>
        </div>

        <div class="best-sky-card" onclick="window.updateMapLocation(19.8, -155.5, 'Mauna Kea, Hawaii', true)">
          <div>
            <div class="best-sky-name">Mauna Kea, Hawaii</div>
            <div class="best-sky-reasons">High elevation · observatory region · stable sky profile</div>
          </div>
          <span class="best-sky-score">87</span>
        </div>
      </div>
    `;
  };

  window.updateMapLocation = function (lat, lng, label, moveMap) {
    updateLocation(lat, lng, label, moveMap);
  };

  window.openSkyDome = async function () {
    const modal = document.getElementById("skyDomeModal");
    const locationText = document.getElementById("skyDomeLocation");

    if (modal) modal.classList.add("show");

    if (locationText) {
      locationText.textContent = `${currentLocation.label} · ${formatNumber(
        currentLocation.lat
      )}, ${formatNumber(currentLocation.lng)}`;
    }

    setText("domeSatelliteText", currentSkyData.satellites.join(", "));
    setText("domePlanetText", currentSkyData.planets.join(", "));
    setText("domeConstellationText", currentSkyData.constellations.join(", "));

    await loadSkyDomeScript();

    if (
      window.ZenithSkyDome &&
      typeof window.ZenithSkyDome.start === "function"
    ) {
      window.ZenithSkyDome.start({
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        label: currentLocation.label,
        satellites: currentSkyData.satellites,
        planets: currentSkyData.planets,
        constellations: currentSkyData.constellations
      });
    }
  };

  window.closeSkyDome = function () {
    const modal = document.getElementById("skyDomeModal");

    if (modal) modal.classList.remove("show");

    if (
      window.ZenithSkyDome &&
      typeof window.ZenithSkyDome.stop === "function"
    ) {
      window.ZenithSkyDome.stop();
    }
  };

  function loadSkyDomeScript() {
    return new Promise((resolve, reject) => {
      if (window.ZenithSkyDome) {
        resolve();
        return;
      }

      const existing = document.querySelector("script[data-skydome='true']");

      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject());
        return;
      }

      const script = document.createElement("script");
      script.src = "skydome.js";
      script.dataset.skydome = "true";
      script.onload = () => resolve();
      script.onerror = () => {
        alert("Could not load skydome.js. Make sure the file exists in the same folder.");
        reject();
      };

      document.body.appendChild(script);
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      updateLocation(latInput.value, lngInput.value, "Manual Coordinate Scan", true);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", searchLocation);
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        searchLocation();
      }
    });
  }

  if (useLocationBtn) {
    useLocationBtn.addEventListener("click", useCurrentLocation);
  }

  if (copyCoordinatesBtn) {
    copyCoordinatesBtn.addEventListener("click", copyCoordinates);
  }

  initMap();
  updateLocation(currentLocation.lat, currentLocation.lng, currentLocation.label, false);
  runBootSequence();

  setTimeout(openApp, 4500);
});
