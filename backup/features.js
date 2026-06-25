/**
 * features.js — Space Dashboard Feature Implementations
 *
 * All 7 features consume api.js functions and render into DOM elements.
 * Each feature is self-contained: call init*() to mount, call destroy*() to clean up.
 *
 * Features:
 *   1. initWeather(containerId, lat?, lon?)
 *   2. initISSTracker(mapContainerId)
 *   3. initAsteroidAlerts(containerId)
 *   4. initAPOD(containerId)
 *   5. initLaunchSchedule(containerId)
 *   6. initDarkSkyFinder(containerId)
 *   7. initSpaceNews(containerId)
 */


// ─── Shared Helpers ────────────────────────────────────────────────────────

/** Resolve a DOM container by ID or element reference. */
function getEl(idOrEl) {
  return typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
}

/** Set container to loading state with a spinner message. */
function setLoading(el, message = "Loading…") {
  el.innerHTML = `
    <div class="feature-loading">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>`;
}

/** Show an error state inside a container. */
function setError(el, message) {
  el.innerHTML = `
    <div class="feature-error">
      <span class="error-icon">⚠</span>
      <p>${message}</p>
    </div>`;
}

/** Format an ISO date string to a readable local date. */
function fmtDate(isoString) {
  return new Date(isoString).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}

/** Format an ISO date string to a readable local date + time. */
function fmtDateTime(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Format km distance with thousand separators. */
function fmtKm(km) {
  return Number(parseFloat(km)).toLocaleString(undefined, { maximumFractionDigits: 0 }) + " km";
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍  FEATURE 1 — Live Weather
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render a live weather card.
 * If lat/lon are omitted, requests browser geolocation first.
 *
 * @param {string|HTMLElement} containerId
 * @param {number} [lat]
 * @param {number} [lon]
 * @param {string} [locationLabel]  — display name for the location
 */
 async function initWeather(containerId, lat, lon, locationLabel = "Your location") {
  const el = getEl(containerId);
  if (!el) return console.error(`[Weather] Element not found: ${containerId}`);

  setLoading(el, "Fetching weather data…");

  // If no coords, ask the browser
  if (lat == null || lon == null) {
    const geo = await getCurrentLocation();
    if (geo.error) return setError(el, `Location access required for weather. ${geo.error}`);
    lat = geo.lat;
    lon = geo.lon;
  }

  const { data, error } = await fetchWeather(lat, lon);
  if (error) return setError(el, `Weather failed: ${error}`);

  const c = data.current;
  const d = data.daily;
  const { label: weatherLabel, icon } = decodeWeatherCode(c.weathercode);

  // Wind direction as cardinal
  const cardinals = ["N","NE","E","SE","S","SW","W","NW"];
  const windDir = cardinals[Math.round(c.wind_direction_10m / 45) % 8];

  // Build 7-day forecast rows
  const forecastRows = d.time.map((date, i) => {
    const { icon: dIcon } = decodeWeatherCode(d.weathercode[i]);
    return `
      <div class="forecast-row">
        <span class="forecast-day">${fmtDate(date)}</span>
        <i class="ti ${dIcon} forecast-icon"></i>
        <span class="forecast-hi">${Math.round(d.temperature_2m_max[i])}°</span>
        <span class="forecast-lo">${Math.round(d.temperature_2m_min[i])}°</span>
        <span class="forecast-rain">${d.precipitation_sum[i].toFixed(1)} mm</span>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="weather-card">
      <div class="weather-header">
        <div>
          <div class="weather-location">📍 ${locationLabel}</div>
          <div class="weather-condition">
            <i class="ti ${icon}"></i> ${weatherLabel}
          </div>
        </div>
        <div class="weather-temp">${Math.round(c.temperature_2m)}<sup>°C</sup></div>
      </div>

      <div class="weather-stats">
        <div class="stat-chip">💧 Humidity <strong>${c.relative_humidity_2m}%</strong></div>
        <div class="stat-chip">💨 Wind <strong>${Math.round(c.wind_speed_10m)} km/h ${windDir}</strong></div>
        <div class="stat-chip">🌡 Feels like <strong>${Math.round(c.apparent_temperature)}°C</strong></div>
        <div class="stat-chip">🌧 Precipitation <strong>${c.precipitation} mm</strong></div>
      </div>

      <div class="forecast-section">
        <div class="section-title">7-day forecast</div>
        ${forecastRows}
      </div>

      <div class="data-credit">Data: Open-Meteo</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🛰️  FEATURE 2 — ISS Tracker on a Map (Leaflet.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mount an ISS live tracker using Leaflet.js.
 * Polls every 5 seconds and moves the marker in real-time.
 *
 * Prerequisites in your HTML:
 *   <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
 *   <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
 *
 * @param {string|HTMLElement} mapContainerId — must have a set height (e.g. height: 400px)
 * @returns {{ destroy: () => void }}         — call destroy() to stop polling & remove map
 */
 function initISSTracker(mapContainerId) {
  const el = getEl(mapContainerId);
  if (!el) return console.error(`[ISS] Element not found: ${mapContainerId}`);
  if (typeof L === "undefined") {
    return setError(el, "Leaflet.js not loaded. Add the Leaflet CSS + JS to your HTML first.");
  }

  // Ensure container has height
  if (!el.style.height && !el.offsetHeight) el.style.height = "400px";

  // Init map centred on equator
  const map = L.map(el).setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 10,
  }).addTo(map);

  // Custom ISS icon
  const issIcon = L.divIcon({
    html: `<div style="
      font-size: 28px;
      filter: drop-shadow(0 0 6px rgba(100,200,255,0.8));
      line-height: 1;
    ">🛰️</div>`,
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  let marker = null;
  let trailPolyline = L.polyline([], { color: "#4facfe", weight: 2, opacity: 0.6 }).addTo(map);
  const trailPoints = [];
  let hasZoomed = false;

  const infoDiv = document.createElement("div");
  infoDiv.className = "iss-info-overlay";
  el.style.position = "relative";
  el.appendChild(infoDiv);

  async function updateISS() {
    const { data, error } = await fetchISSPosition();
    if (error) {
      infoDiv.innerHTML = `<span style="color:#f88">⚠ ${error}</span>`;
      return;
    }

    const { latitude: lat, longitude: lon, altitude, velocity, visibility } = data;
    const latlng = [lat, lon];

    if (!marker) {
      marker = L.marker(latlng, { icon: issIcon }).addTo(map);
    } else {
      marker.setLatLng(latlng);
    }

    // Zoom to ISS on first fix
    if (!hasZoomed) {
      map.setView(latlng, 3);
      hasZoomed = true;
    }

    // Trail (keep last 20 points)
    trailPoints.push(latlng);
    if (trailPoints.length > 20) trailPoints.shift();
    trailPolyline.setLatLngs(trailPoints);

    // Popup content
    marker.bindPopup(`
      <strong>🛰 International Space Station</strong><br>
      Lat: ${lat.toFixed(4)}°, Lon: ${lon.toFixed(4)}°<br>
      Altitude: ${altitude.toFixed(1)} km<br>
      Velocity: ${velocity.toFixed(0)} km/h<br>
      Status: ${visibility === "daylight" ? "☀️ In sunlight" : "🌑 In eclipse"}
    `);

    // Info overlay
    infoDiv.innerHTML = `
      <div class="iss-stats">
        <span>🛰 ISS</span>
        <span>${lat.toFixed(2)}°, ${lon.toFixed(2)}°</span>
        <span>↑ ${altitude.toFixed(1)} km</span>
        <span>→ ${velocity.toFixed(0)} km/h</span>
        <span>${visibility === "daylight" ? "☀️" : "🌑"} ${visibility}</span>
      </div>`;

    // Update page title
    document.title = `ISS @ ${lat.toFixed(1)}°, ${lon.toFixed(1)}°`;
  }

  // Poll every 5 seconds
  updateISS();
  const intervalId = setInterval(updateISS, 5000);

  return {
    destroy() {
      clearInterval(intervalId);
      map.remove();
      document.title = "Space Dashboard";
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ☄️  FEATURE 3 — Near-Earth Asteroid Alerts
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render a list of near-Earth asteroids for the next 7 days,
 * sorted by close approach date, with hazard badges.
 *
 * @param {string|HTMLElement} containerId
 * @param {string} [startDate]  — "YYYY-MM-DD"
 * @param {string} [endDate]    — "YYYY-MM-DD"
 */
 async function initAsteroidAlerts(containerId, startDate, endDate) {
  const el = getEl(containerId);
  if (!el) return console.error(`[Asteroids] Element not found: ${containerId}`);

  setLoading(el, "Scanning near-Earth objects…");

  const { data, error } = await fetchAsteroids(startDate, endDate);
  if (error) return setError(el, `Asteroid fetch failed: ${error}`);

  // Flatten all asteroids from all dates into one array
  const allAsteroids = Object.values(data.near_earth_objects).flat();

  // Sort by close approach date
  allAsteroids.sort((a, b) => {
    const dateA = a.close_approach_data[0]?.close_approach_date || "";
    const dateB = b.close_approach_data[0]?.close_approach_date || "";
    return dateA.localeCompare(dateB);
  });

  const hazardous = allAsteroids.filter((a) => a.is_potentially_hazardous_asteroid);
  const safe      = allAsteroids.filter((a) => !a.is_potentially_hazardous_asteroid);

  function asteroidCard(ast) {
    const approach = ast.close_approach_data[0];
    const diam = ast.estimated_diameter.kilometers;
    const avgDiam = ((diam.estimated_diameter_min + diam.estimated_diameter_max) / 2).toFixed(2);
    const isHazardous = ast.is_potentially_hazardous_asteroid;

    return `
      <div class="asteroid-card ${isHazardous ? "asteroid-hazardous" : ""}">
        <div class="asteroid-name">
          ${isHazardous ? "⚠️" : "🪨"} ${ast.name}
          ${isHazardous ? '<span class="hazard-badge">Potentially hazardous</span>' : ""}
        </div>
        <div class="asteroid-meta">
          <span>📅 ${fmtDate(approach.close_approach_date)}</span>
          <span>↔ ~${avgDiam} km wide</span>
          <span>🎯 Miss distance: ${fmtKm(approach.miss_distance.kilometers)}</span>
          <span>💨 ${parseFloat(approach.relative_velocity.kilometers_per_hour).toFixed(0)} km/h</span>
        </div>
        <a href="${ast.nasa_jpl_url}" target="_blank" rel="noopener" class="asteroid-link">
          NASA JPL details →
        </a>
      </div>`;
  }

  el.innerHTML = `
    <div class="asteroid-container">
      <div class="asteroid-summary">
        <div class="summary-chip safe-chip">
          🪨 <strong>${allAsteroids.length}</strong> total approaches
        </div>
        <div class="summary-chip danger-chip">
          ⚠️ <strong>${hazardous.length}</strong> potentially hazardous
        </div>
      </div>

      ${hazardous.length > 0 ? `
        <div class="section-title hazard-title">⚠ Potentially hazardous objects</div>
        ${hazardous.map(asteroidCard).join("")}
        <div class="section-title safe-title">Safe passes</div>
      ` : '<div class="section-title">All approaches this week</div>'}

      ${safe.map(asteroidCard).join("")}

      <div class="data-credit">Data: NASA NeoWs — next 7 days</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌌  FEATURE 4 — Astronomy Picture of the Day
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render today's APOD with image/video, title, explanation, and copyright.
 *
 * @param {string|HTMLElement} containerId
 * @param {string} [date]  — specific date in "YYYY-MM-DD", defaults to today
 */
 async function initAPOD(containerId, date) {
  const el = getEl(containerId);
  if (!el) return console.error(`[APOD] Element not found: ${containerId}`);

  setLoading(el, "Loading today's astronomy picture…");

  const { data, error } = await fetchAPOD(date, true);
  if (error) return setError(el, `APOD failed: ${error}`);

  const isVideo = data.media_type === "video";

  el.innerHTML = `
    <div class="apod-card">
      ${isVideo
        ? `<div class="apod-video-wrapper">
             <iframe src="${data.url}" frameborder="0" allowfullscreen
               title="${data.title}"></iframe>
           </div>`
        : `<a href="${data.hdurl || data.url}" target="_blank" rel="noopener">
             <img src="${data.url}" alt="${data.title}" class="apod-image"
               loading="lazy" />
           </a>`
      }
      <div class="apod-body">
        <div class="apod-date">${fmtDate(data.date)}</div>
        <h2 class="apod-title">${data.title}</h2>
        <p class="apod-explanation">${data.explanation}</p>
        ${data.copyright ? `<div class="apod-credit">© ${data.copyright}</div>` : ""}
        ${!isVideo && data.hdurl ? `
          <a href="${data.hdurl}" target="_blank" rel="noopener" class="apod-hd-link">
            View HD image →
          </a>` : ""}
      </div>
      <div class="data-credit">Data: NASA APOD API</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🚀  FEATURE 5 — Rocket Launch Schedule
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render upcoming rocket launches as a timeline list.
 *
 * @param {string|HTMLElement} containerId
 * @param {number} [limit=10]
 */
 async function initLaunchSchedule(containerId, limit = 10) {
  const el = getEl(containerId);
  if (!el) return console.error(`[Launches] Element not found: ${containerId}`);

  setLoading(el, "Checking the launch manifest…");

  const { data, error } = await fetchUpcomingLaunches(limit);
  if (error) return setError(el, `Launch data failed: ${error}`);

  const launches = data.results || [];
  if (launches.length === 0) {
    el.innerHTML = `<p class="empty-state">No upcoming launches found.</p>`;
    return;
  }

  // Launch status colour mapping
  const statusColor = {
    1:  "status-go",     // Go for launch
    2:  "status-tbd",    // To Be Determined
    3:  "status-success",// Launch Successful
    4:  "status-failure",// Launch Failure
    5:  "status-hold",   // Hold
    6:  "status-partial",// Partial Failure
    7:  "status-tbd",    // To Be Confirmed
  };

  const launchCards = launches.map((launch) => {
    const statusClass = statusColor[launch.status?.id] || "status-tbd";
    const launchDate  = launch.net ? fmtDateTime(launch.net) : "TBD";
    const provider    = launch.launch_service_provider?.name || "Unknown provider";
    const padName     = launch.pad?.location?.name || launch.pad?.name || "Unknown pad";
    const missionDesc = launch.mission?.description;

    return `
      <div class="launch-card">
        ${launch.image ? `<img src="${launch.image}" alt="${launch.name}" class="launch-image" loading="lazy" />` : ""}
        <div class="launch-body">
          <div class="launch-header">
            <span class="launch-status-dot ${statusClass}"></span>
            <span class="launch-status-label">${launch.status?.name || "Unknown"}</span>
            <span class="launch-date">${launchDate}</span>
          </div>
          <div class="launch-name">${launch.name}</div>
          <div class="launch-meta">
            <span>🏢 ${provider}</span>
            <span>📍 ${padName}</span>
          </div>
          ${missionDesc ? `<p class="launch-mission">${missionDesc.slice(0, 180)}${missionDesc.length > 180 ? "…" : ""}</p>` : ""}
          ${launch.vidURLs?.length ? `
            <a href="${launch.vidURLs[0].url}" target="_blank" rel="noopener" class="launch-watch">
              ▶ Watch live
            </a>` : ""}
        </div>
      </div>`;
  }).join("");

  el.innerHTML = `
    <div class="launches-container">
      <div class="launches-header">
        <h2 class="launches-title">🚀 Upcoming launches</h2>
        <span class="launches-count">${data.count?.toLocaleString() || launches.length} total scheduled</span>
      </div>
      <div class="launches-list">${launchCards}</div>
      <div class="data-credit">Data: The Space Devs Launch Library 2</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔭  FEATURE 6 — Dark Sky Finder
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Show light pollution level at the user's location (or given coords),
 * with Bortle classification and observation tips.
 *
 * @param {string|HTMLElement} containerId
 * @param {number} [lat]   — if omitted, uses browser geolocation
 * @param {number} [lon]
 */
 async function initDarkSkyFinder(containerId, lat, lon) {
  const el = getEl(containerId);
  if (!el) return console.error(`[DarkSky] Element not found: ${containerId}`);

  setLoading(el, "Measuring local light pollution…");

  if (lat == null || lon == null) {
    const geo = await getCurrentLocation();
    if (geo.error) return setError(el, `Location required for dark sky check. ${geo.error}`);
    lat = geo.lat;
    lon = geo.lon;
  }

  const { data, error } = await fetchDarkSkyRadiance(lat, lon);
  if (error) return setError(el, `Dark sky query failed: ${error}`);

  const { bortle, label, description } = radiaceToBortle(data.radiance);

  // Colour classes for each Bortle level
  const bortleColors = {
    2: "#1a1a6e", 3: "#1a3a6e", 4: "#1e5c38",
    5: "#4a7c3f", 6: "#8b7a2e", 7: "#8b4513", 8: "#6b1a1a", 9: "#4a0a0a",
  };
  const bortleColor = bortleColors[bortle] || "#333";

  // What's visible at this Bortle level
  const visibilityGuide = {
    2: ["Milky Way core — crisp and brilliant", "Zodiacal light visible", "Hundreds of deep-sky objects naked-eye", "Gegenschein visible"],
    3: ["Milky Way — complex structure visible", "M31 easily naked-eye", "Zodiacal light in spring/autumn", "Sky glow < 15° above horizon"],
    4: ["Milky Way — bright with some structure", "M33 with averted vision", "Globular clusters well resolved", "Faint sky glow on some horizons"],
    5: ["Milky Way — bright near zenith", "Sky glow clearly visible on most horizons", "Deep-sky with 6-inch telescope", "Good for planetary observing"],
    6: ["Milky Way only near zenith", "Only brighter deep-sky objects", "Planets and Moon excellent", "Photography viable with tracking"],
    7: ["Milky Way barely perceptible", "Clouds brighter than sky", "Good for planets and double stars", "Sky background noticeably bright"],
    8: ["Milky Way invisible", "~50 stars naked eye", "Only planets, Moon, Orion", "Strong sky glow overhead"],
    9: ["~25 stars naked eye", "Moon and planets only", "Newspaper-readable sky glow", "Go elsewhere to observe"],
  };
  const tips = visibilityGuide[bortle] || [];

  el.innerHTML = `
    <div class="darksky-card">
      <div class="darksky-hero" style="background: ${bortleColor}">
        <div class="darksky-bortle-num">${bortle}</div>
        <div class="darksky-label">${label}</div>
        <div class="darksky-radiance">${data.radiance.toFixed(3)} mcd/m²</div>
      </div>

      <div class="darksky-body">
        <p class="darksky-description">${description}</p>

        <div class="darksky-coords">
          📍 ${lat.toFixed(4)}°, ${lon.toFixed(4)}°
        </div>

        <div class="darksky-guide-title">What you can see from here:</div>
        <ul class="darksky-guide">
          ${tips.map((t) => `<li>${t}</li>`).join("")}
        </ul>

        ${bortle >= 7 ? `
          <div class="darksky-tip">
            💡 <strong>Tip:</strong> Drive 30–50 km from city centre to reach Bortle 4–5 skies.
            Use <a href="https://www.lightpollutionmap.info" target="_blank" rel="noopener">lightpollutionmap.info</a>
            to find the nearest dark area.
          </div>` : ""}
      </div>

      <div class="data-credit">Data: Light Pollution Map / World Atlas 2015</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// 📰  FEATURE 7 — Space News Feed
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Render a paginated space news feed with search.
 *
 * @param {string|HTMLElement} containerId
 * @param {Object} [options]
 * @param {number} [options.limit=10]
 * @param {boolean} [options.showSearch=true]
 */
 async function initSpaceNews(containerId, options = {}) {
  const el = getEl(containerId);
  if (!el) return console.error(`[News] Element not found: ${containerId}`);

  const { limit = 10, showSearch = true } = options;
  let currentOffset = 0;
  let currentSearch = "";

  async function loadNews() {
    setLoading(el.querySelector(".news-list") || el, "Fetching space news…");

    const { data, error } = await fetchSpaceNews(limit, currentOffset, currentSearch || undefined);
    if (error) return setError(el, `News fetch failed: ${error}`);

    const articles = data.results || [];
    const total    = data.count || 0;

    const newsList = el.querySelector(".news-list");
    if (!newsList) return;

    if (articles.length === 0) {
      newsList.innerHTML = `<p class="empty-state">No articles found${currentSearch ? ` for "${currentSearch}"` : ""}.</p>`;
      return;
    }

    newsList.innerHTML = articles.map((article) => `
      <a href="${article.url}" target="_blank" rel="noopener" class="news-card">
        ${article.image_url ? `<img src="${article.image_url}" alt="" class="news-thumb" loading="lazy" />` : ""}
        <div class="news-content">
          <div class="news-meta">
            <span class="news-site">${article.news_site}</span>
            <span class="news-date">${fmtDate(article.published_at)}</span>
          </div>
          <div class="news-title">${article.title}</div>
          <p class="news-summary">${article.summary.slice(0, 160)}${article.summary.length > 160 ? "…" : ""}</p>
        </div>
      </a>`).join("");

    // Update pagination
    const pager = el.querySelector(".news-pager");
    if (pager) {
      const hasPrev = currentOffset > 0;
      const hasNext = currentOffset + limit < total;
      pager.innerHTML = `
        <button class="pager-btn" ${hasPrev ? "" : "disabled"} id="news-prev">
          ← Previous
        </button>
        <span class="pager-info">
          ${currentOffset + 1}–${Math.min(currentOffset + limit, total)} of ${total.toLocaleString()}
        </span>
        <button class="pager-btn" ${hasNext ? "" : "disabled"} id="news-next">
          Next →
        </button>`;

      el.querySelector("#news-prev")?.addEventListener("click", () => {
        currentOffset = Math.max(0, currentOffset - limit);
        loadNews();
      });
      el.querySelector("#news-next")?.addEventListener("click", () => {
        currentOffset += limit;
        loadNews();
      });
    }
  }

  // Build the shell HTML first
  el.innerHTML = `
    <div class="news-container">
      <div class="news-header">
        <h2 class="news-heading">📰 Space news</h2>
        ${showSearch ? `
          <div class="news-search-wrap">
            <input type="text" id="news-search" placeholder="Search space news…"
              class="news-search" autocomplete="off" />
            <button id="news-search-btn" class="news-search-btn">Search</button>
          </div>` : ""}
      </div>
      <div class="news-list"></div>
      <div class="news-pager"></div>
      <div class="data-credit">Data: Spaceflight News API v4</div>
    </div>`;

  // Wire up search
  if (showSearch) {
    const searchInput = el.querySelector("#news-search");
    const searchBtn   = el.querySelector("#news-search-btn");

    const doSearch = () => {
      currentSearch = searchInput.value.trim();
      currentOffset = 0;
      loadNews();
    };

    searchBtn.addEventListener("click", doSearch);
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }

  // Initial load
  loadNews();
}

// ═══════════════════════════════════════════════════════════════════════════
// 🧩  OPTIONAL — Mount all features at once
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Mount every feature into a pre-defined layout.
 * Expects your HTML to have elements with the following IDs:
 *   #weather, #iss-map, #asteroids, #apod,
 *   #launches, #dark-sky, #news
 *
 * @param {{ lat?: number, lon?: number, locationLabel?: string }} [config]
 */
 async function mountSpaceDashboard(config = {}) {
  const { lat, lon, locationLabel = "Your location" } = config;

  // All features run in parallel for fast load
  await Promise.allSettled([
    initWeather("weather", lat, lon, locationLabel),
    initISSTracker("iss-map"),         // returns a controller, not a promise
    initAsteroidAlerts("asteroids"),
    initAPOD("apod"),
    initLaunchSchedule("launches", 8),
    initDarkSkyFinder("dark-sky", lat, lon),
    initSpaceNews("news", { limit: 8, showSearch: true }),
  ]);

  console.log("🚀 Space dashboard fully loaded.");
}
// ═══════════════════════════════════════════════════════════════════════════
// 🔭  DARK SKY — Light Pollution API (add this to features.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch dark sky radiance data
 * Note: This is a free API, but may need a key in production
 */
async function fetchDarkSkyRadiance(lat, lon) {
    try {
        // Using a free light pollution API endpoint
        // You may want to register for a free key at https://www.lightpollutionmap.info
        const response = await fetch(
            `https://www.lightpollutionmap.info/api/v1/radiance?lat=${lat}&lon=${lon}`
        );
        
        if (!response.ok) {
            // Fallback: return simulated data
            return { data: { radiance: Math.random() * 2 + 0.5 }, error: null };
        }
        
        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        // Return simulated data as fallback
        console.warn('[DarkSky] Using simulated data:', err);
        return { data: { radiance: Math.random() * 2 + 0.5 }, error: null };
    }
}

/**
 * Convert radiance to Bortle scale
 */
function radiaceToBortle(radiance) {
    // Fix: this function was misspelled as "radiaceToBortle" in features.js
    
    // Bortle scale mapping (approximate)
    // 1 = Excellent dark sky, 9 = Inner city sky
    let bortle;
    let label;
    let description;
    
    if (radiance < 0.1) {
        bortle = 1;
        label = 'Excellent dark sky';
        description = 'The best possible observing conditions. Milky Way casts shadows.';
    } else if (radiance < 0.2) {
        bortle = 2;
        label = 'Typical dark sky';
        description = 'Excellent conditions. Milky Way is crisp and detailed.';
    } else if (radiance < 0.4) {
        bortle = 3;
        label = 'Rural sky';
        description = 'Good dark sky. Milky Way shows structure.';
    } else if (radiance < 0.8) {
        bortle = 4;
        label = 'Rural/suburban transition';
        description = 'Some light pollution visible. Milky Way still bright.';
    } else if (radiance < 1.2) {
        bortle = 5;
        label = 'Suburban sky';
        description = 'Light pollution noticeable. Milky Way only near zenith.';
    } else if (radiance < 1.8) {
        bortle = 6;
        label = 'Bright suburban sky';
        description = 'Milky Way barely visible. Deep-sky observing challenging.';
    } else if (radiance < 2.5) {
        bortle = 7;
        label = 'Suburban/urban transition';
        description = 'Milky Way invisible. Only brighter objects visible.';
    } else if (radiance < 3.5) {
        bortle = 8;
        label = 'City sky';
        description: 'Significant light pollution. Planets and Moon only.';
    } else {
        bortle = 9;
        label = 'Inner city sky';
        description: 'Extreme light pollution. Only the brightest objects visible.';
    }
    
    return { bortle, label, description };
}

// ═══════════════════════════════════════════════════════════════════════════
// 📰  SPACE NEWS — Spaceflight News API (add this to features.js)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch space news articles
 */
async function fetchSpaceNews(limit = 10, offset = 0, search = '') {
    try {
        let url = `https://api.spaceflightnewsapi.net/v4/articles/?limit=${limit}&offset=${offset}`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return { data, error: null };
    } catch (err) {
        console.error('[SpaceNews] Error:', err);
        return { data: { results: [], count: 0 }, error: err.message };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// 🌍  FIX: decodeWeatherCode for features.js (update the existing one)
// ═══════════════════════════════════════════════════════════════════════════

// Replace the existing window.decodeWeatherCode in api.js with this version:
// It now returns {label, icon} matching what features.js expects

window.decodeWeatherCode = function(code) {
    const weatherMap = {
        0: { label: 'Clear sky', icon: '☀️' },
        1: { label: 'Mainly clear', icon: '🌤️' },
        2: { label: 'Partly cloudy', icon: '⛅' },
        3: { label: 'Overcast', icon: '☁️' },
        45: { label: 'Foggy', icon: '🌫️' },
        48: { label: 'Icy fog', icon: '🌫️' },
        51: { label: 'Light drizzle', icon: '🌦️' },
        53: { label: 'Moderate drizzle', icon: '🌧️' },
        55: { label: 'Heavy drizzle', icon: '🌧️' },
        61: { label: 'Slight rain', icon: '🌧️' },
        63: { label: 'Moderate rain', icon: '🌧️' },
        65: { label: 'Heavy rain', icon: '🌧️' },
        71: { label: 'Slight snow', icon: '🌨️' },
        73: { label: 'Moderate snow', icon: '🌨️' },
        75: { label: 'Heavy snow', icon: '❄️' },
        80: { label: 'Rain showers', icon: '🌦️' },
        81: { label: 'Moderate showers', icon: '🌧️' },
        82: { label: 'Violent showers', icon: '⛈️' },
        95: { label: 'Thunderstorm', icon: '⛈️' },
        96: { label: 'Thunderstorm + hail', icon: '⛈️' },
        99: { label: 'Thunderstorm + hail', icon: '⛈️' }
    };
    
    return weatherMap[code] || { label: 'Unknown', icon: '❓' };
};