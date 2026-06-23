document.addEventListener("DOMContentLoaded", () => {
  /* ================= ELEMENTS ================= */

  const bootScreen = document.getElementById("bootScreen");
  const mainApp = document.getElementById("mainApp");
  const bootTerminal = document.getElementById("bootTerminal");
  const bootProgressBar = document.getElementById("bootProgressBar");
  const bootStatus = document.getElementById("bootStatus");

  const latInput = document.getElementById("latInput");
  const lngInput = document.getElementById("lngInput");
  const scanBtn = document.getElementById("scanBtn");
  const statusText = document.getElementById("statusText");
  const reportBox = document.getElementById("reportBox");

  const signalValue = document.getElementById("signalValue");

  const fragmentOne = document.getElementById("fragmentOne");
  const fragmentTwo = document.getElementById("fragmentTwo");
  const fragmentThree = document.getElementById("fragmentThree");
  const fragmentFour = document.getElementById("fragmentFour");
  const fragmentFive = document.getElementById("fragmentFive");
  const fragmentSix = document.getElementById("fragmentSix");

  const latDisplay = document.getElementById("lat-display");
  const lngDisplay = document.getElementById("lng-display");

  const searchBtn = document.getElementById("search-btn");
  const locationInput = document.getElementById("location-input");

  const useLocationBtn = document.getElementById("use-location-btn");
  const copyCoordinatesBtn = document.getElementById("copy-coordinates-btn");

  let activeLatitude = null;
  let activeLongitude = null;
  let marker = null;
  let map = null;

  /* ================= BOOT SCREEN ================= */

  const bootLines = [
    "Loading ZENITH core system...",
    "Activating orbital coordinate engine...",
    "Establishing satellite communication layer...",
    "Mapping planetary surface grid...",
    "Synchronizing live intelligence fragments...",
    "HUD interface online.",
    "Welcome, operator."
  ];

  let bootIndex = 0;
  let progress = 0;

  function runBootSequence() {
    const bootInterval = setInterval(() => {
      if (bootIndex < bootLines.length) {
        const line = document.createElement("p");
        line.textContent = bootLines[bootIndex];
        bootTerminal.appendChild(line);

        progress += Math.floor(100 / bootLines.length);
        bootProgressBar.style.width = Math.min(progress, 100) + "%";
        bootStatus.textContent = bootLines[bootIndex];

        bootIndex++;
      } else {
        bootProgressBar.style.width = "100%";
        bootStatus.textContent = "ZENITH SYSTEM ONLINE";

        clearInterval(bootInterval);

        setTimeout(() => {
          bootScreen.classList.add("hide");
          mainApp.classList.add("show");

          setTimeout(() => {
            if (map) {
              map.invalidateSize();
            }
          }, 600);
        }, 900);
      }
    }, 650);
  }

  /* ================= MAP SETUP ================= */

  if (typeof L !== "undefined") {
    const defaultLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19
    });

    const satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri",
        maxZoom: 19
      }
    );

    const hybridLayer = L.layerGroup([
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 19
        }
      ),
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19
        }
      )
    ]);

    const darkLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO",
      maxZoom: 19
    });

    map = L.map("globe-container", {
      center: [20, 0],
      zoom: 2,
      layers: [darkLayer],
      zoomControl: true
    });

    const baseMaps = {
      "Default View": defaultLayer,
      "Satellite Mode": satelliteLayer,
      "Hybrid Mode": hybridLayer,
      "Dark Radar": darkLayer
    };

    L.control.layers(baseMaps, null, {
      position: "topright",
      collapsed: true
    }).addTo(map);

    map.on("click", (event) => {
      updateMapLocation(
        event.latlng.lat,
        event.latlng.lng,
        "Selected Point",
        true
      );
    });
  }

  const customPulseIcon = L.divIcon({
    className: "custom-pulse-marker",
    html: '<div class="pulse-core"></div><div class="pulse-ring"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });

  /* ================= HELPER FUNCTIONS ================= */

  function updateText(element, text) {
    if (element) {
      element.textContent = text;
    }
  }

  function validateCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (latitude === "" || longitude === "") return false;
    if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
    if (lat < -90 || lat > 90) return false;
    if (lng < -180 || lng > 180) return false;

    return true;
  }

  function getRiskLevel(latitude, longitude) {
    const lat = Math.abs(Number(latitude));
    const lng = Math.abs(Number(longitude));
    const score = Math.round((lat + lng) % 100);

    if (score < 30) {
      return {
        level: "Low",
        signal: "97%",
        pattern: "Stable Surface",
        radius: "25 km"
      };
    }

    if (score < 65) {
      return {
        level: "Moderate",
        signal: "91%",
        pattern: "Variable Zone",
        radius: "50 km"
      };
    }

    return {
      level: "High",
      signal: "84%",
      pattern: "Unstable Pattern",
      radius: "75 km"
    };
  }

  function getHemisphere(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    const northSouth = lat >= 0 ? "Northern" : "Southern";
    const eastWest = lng >= 0 ? "Eastern" : "Western";

    return `${northSouth} / ${eastWest}`;
  }

  function updateCoordinateDisplays(latitude, longitude) {
    const formattedLat = Number(latitude).toFixed(4);
    const formattedLng = Number(longitude).toFixed(4);

    activeLatitude = formattedLat;
    activeLongitude = formattedLng;

    updateText(latDisplay, formattedLat);
    updateText(lngDisplay, formattedLng);

    latInput.value = formattedLat;
    lngInput.value = formattedLng;
  }

  function showErrorReport() {
    updateText(statusText, "SIGNAL LOST — INVALID COORDINATES");
    updateText(signalValue, "Failed");

    updateText(fragmentThree, "Rejected");
    updateText(fragmentFour, "Invalid Input");
    updateText(fragmentFive, "Not Locked");
    updateText(fragmentSix, "Standby");

    reportBox.innerHTML = `
      <p class="panel-tag">MISSION REPORT</p>
      <h2 class="danger">Coordinate Error</h2>
      <p>
        Enter valid latitude and longitude values.
        Latitude must be between -90 and 90.
        Longitude must be between -180 and 180.
      </p>
    `;
  }

  function updateFragments(latitude, longitude, risk) {
    updateText(fragmentOne, "Linked");
    updateText(fragmentTwo, "Readable");
    updateText(fragmentThree, "96% Verified");
    updateText(fragmentFour, risk.pattern);
    updateText(fragmentFive, getHemisphere(latitude, longitude));
    updateText(fragmentSix, risk.radius);
    updateText(signalValue, risk.signal);
  }

  function updateMapLocation(latitude, longitude, locationName = "Target Acquired", fly = false) {
    if (!validateCoordinates(String(latitude), String(longitude))) {
      showErrorReport();
      return;
    }

    const formattedLat = Number(latitude).toFixed(4);
    const formattedLng = Number(longitude).toFixed(4);

    updateCoordinateDisplays(formattedLat, formattedLng);

    const risk = getRiskLevel(formattedLat, formattedLng);

    updateText(statusText, "TARGET LOCKED — SURFACE SCAN COMPLETE");
    updateFragments(formattedLat, formattedLng, risk);

    if (marker) {
      map.removeLayer(marker);
    }

    marker = L.marker([Number(formattedLat), Number(formattedLng)], {
      icon: customPulseIcon
    }).addTo(map);

    marker.bindPopup(`
      <div style="text-align:center; font-family:Arial, sans-serif;">
        <strong style="color:#00eaff;">${locationName}</strong><br>
        <span style="font-size:11px; color:#555;">
          ${formattedLat}, ${formattedLng}
        </span>
      </div>
    `).openPopup();

    if (fly) {
      map.flyTo([Number(formattedLat), Number(formattedLng)], 10, {
        animate: true,
        duration: 2
      });
    } else {
      map.setView([Number(formattedLat), Number(formattedLng)], 10);
    }

    reportBox.innerHTML = `
      <p class="panel-tag">MISSION REPORT</p>
      <h2>Target Intelligence Summary</h2>

      <div class="report-grid">
        <div class="report-item">
          <span>Location</span>
          <strong>${locationName}</strong>
        </div>

        <div class="report-item">
          <span>Latitude</span>
          <strong>${formattedLat}</strong>
        </div>

        <div class="report-item">
          <span>Longitude</span>
          <strong>${formattedLng}</strong>
        </div>

        <div class="report-item">
          <span>Risk Level</span>
          <strong>${risk.level}</strong>
        </div>

        <div class="report-item">
          <span>Signal Accuracy</span>
          <strong>${risk.signal}</strong>
        </div>

        <div class="report-item">
          <span>Hemisphere</span>
          <strong>${getHemisphere(formattedLat, formattedLng)}</strong>
        </div>
      </div>

      <p>
        Coordinates verified. Map view, marker lock, and live fragments are updated.
      </p>
    `;

    if (typeof fetchAllData === "function") {
      fetchAllData(Number(formattedLat), Number(formattedLng));
    }

    window.dispatchEvent(
      new CustomEvent("zenith:scan", {
        detail: {
          latitude: formattedLat,
          longitude: formattedLng,
          locationName: locationName,
          riskLevel: risk.level,
          signalAccuracy: risk.signal,
          hemisphere: getHemisphere(formattedLat, formattedLng)
        }
      })
    );
  }

  /* ================= MAIN SCAN BUTTON ================= */

  scanBtn.addEventListener("click", () => {
    const latitude = latInput.value.trim();
    const longitude = lngInput.value.trim();

    if (!validateCoordinates(latitude, longitude)) {
      showErrorReport();
      return;
    }

    updateText(statusText, "TARGET LOCKED — SCANNING SURFACE");

    scanBtn.disabled = true;
    scanBtn.querySelector("span").textContent = "SCANNING...";

    updateText(fragmentThree, "Processing");
    updateText(fragmentFour, "Analysing");
    updateText(fragmentFive, "Calculating");
    updateText(fragmentSix, "Expanding");

    reportBox.innerHTML = `
      <p class="panel-tag">MISSION REPORT</p>
      <h2>Scanning Target...</h2>
      <p>
        ZENITH is analysing the entered coordinate zone.
        Surface fragments are being decoded.
      </p>
    `;

    setTimeout(() => {
      updateMapLocation(latitude, longitude, "Manual Target", true);

      scanBtn.disabled = false;
      scanBtn.querySelector("span").textContent = "INITIATE SCAN";
    }, 1500);
  });

  /* ================= SEARCH FEATURE ================= */

  searchBtn.addEventListener("click", async () => {
    const query = locationInput.value.trim();

    if (!query) {
      updateText(statusText, "SEARCH FAILED — ENTER A LOCATION");
      return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "SCANNING...";

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.length === 0) {
        updateText(statusText, "LOCATION NOT FOUND");
        alert("Location not found. Try a different city or place name.");
        return;
      }

      const latitude = data[0].lat;
      const longitude = data[0].lon;
      const displayName = data[0].display_name;
      const shortName = displayName.split(",")[0];

      updateMapLocation(latitude, longitude, shortName, true);
    } catch (error) {
      console.error("Search error:", error);
      updateText(statusText, "SEARCH FAILED — CHECK INTERNET CONNECTION");
      alert("Search failed. Check your internet connection.");
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "SEARCH MAP";
    }
  });

  locationInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      searchBtn.click();
    }
  });

  /* ================= USE MY LOCATION ================= */

  useLocationBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser.");
      return;
    }

    updateText(statusText, "ACCESSING DEVICE LOCATION...");
    useLocationBtn.disabled = true;
    useLocationBtn.textContent = "LOCATING...";

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        updateMapLocation(latitude, longitude, "Current Device Location", true);

        useLocationBtn.disabled = false;
        useLocationBtn.textContent = "USE MY LOCATION";
      },
      () => {
        updateText(statusText, "LOCATION ACCESS DENIED");
        alert("Location access was denied.");

        useLocationBtn.disabled = false;
        useLocationBtn.textContent = "USE MY LOCATION";
      }
    );
  });

  /* ================= COPY COORDINATES ================= */

  copyCoordinatesBtn.addEventListener("click", async () => {
    if (!activeLatitude || !activeLongitude) {
      alert("No coordinates selected yet.");
      return;
    }

    const coordinateText = `${activeLatitude}, ${activeLongitude}`;

    try {
      await navigator.clipboard.writeText(coordinateText);

      updateText(statusText, "COORDINATES COPIED TO CLIPBOARD");
      copyCoordinatesBtn.textContent = "COPIED";

      setTimeout(() => {
        copyCoordinatesBtn.textContent = "COPY COORDINATES";
      }, 1200);
    } catch (error) {
      console.error("Copy failed:", error);
      alert(`Copy these coordinates: ${coordinateText}`);
    }
  });

  /* ================= LIVE FRAGMENT MOVEMENT ================= */

  function updateIdleFragments() {
    const satelliteStates = ["Stable", "Strong", "Linked", "Tracking"];
    const atmosphereStates = ["Nominal", "Clear", "Readable", "Mild Distortion"];

    fragmentOne.textContent =
      satelliteStates[Math.floor(Math.random() * satelliteStates.length)];

    fragmentTwo.textContent =
      atmosphereStates[Math.floor(Math.random() * atmosphereStates.length)];

    if (!activeLatitude || !activeLongitude) {
      updateText(signalValue, "Standby");
      return;
    }

    const randomSignal = Math.floor(Math.random() * 8) + 90;
    updateText(signalValue, randomSignal + "%");
  }

  runBootSequence();
  setInterval(updateIdleFragments, 2200);
});
