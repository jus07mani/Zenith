const API_KEYS = {
  NASA: "DEMO_KEY"
};

const BASE = {
  OPEN_METEO: "https://api.open-meteo.com/v1",
  ISS: "https://api.wheretheiss.at/v1/satellites/25544",
  NASA_NEOWS: "https://api.nasa.gov/neo/rest/v1",
  NOAA_SWPC: "https://services.swpc.noaa.gov",
  NOMINATIM: "https://nominatim.openstreetmap.org"
};

async function apiFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      return {
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();

    return {
      data,
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error.message || "Network error"
    };
  }
}

function buildUrl(base, params = {}) {
  const url = new URL(base);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

/* ================= WEATHER ================= */

async function fetchWeather(lat, lng) {
  const url = buildUrl(`${BASE.OPEN_METEO}/forecast`, {
    latitude: lat,
    longitude: lng,
    current:
      "temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,weathercode,apparent_temperature,precipitation"
  });

  return apiFetch(url);
}

/* ================= ISS ================= */

async function fetchISSData(userLat, userLng) {
  const { data, error } = await apiFetch(BASE.ISS);

  if (error || !data) {
    return {
      data: null,
      error: error || "ISS data unavailable"
    };
  }

  const issLat = Number(data.latitude);
  const issLng = Number(data.longitude);

  return {
    data: {
      latitude: issLat,
      longitude: issLng,
      altitude: Math.round(data.altitude),
      velocity: Math.round(data.velocity),
      visibility: data.visibility,
      distanceKm: Math.round(getDistanceKm(userLat, userLng, issLat, issLng))
    },
    error: null
  };
}

/* ================= NASA NEO ================= */

async function fetchAsteroids(startDate = todayISO(), endDate = todayISO()) {
  const url = buildUrl(`${BASE.NASA_NEOWS}/feed`, {
    start_date: startDate,
    end_date: endDate,
    api_key: API_KEYS.NASA
  });

  return apiFetch(url);
}

/* ================= NOAA KP ================= */

async function fetchKpIndex() {
  const endpoints = [
    `${BASE.NOAA_SWPC}/json/planetary_k_index_1m.json`,
    `${BASE.NOAA_SWPC}/products/noaa-planetary-k-index.json`
  ];

  for (const endpoint of endpoints) {
    const { data } = await apiFetch(endpoint);

    if (!Array.isArray(data)) continue;

    if (typeof data[data.length - 1]?.kp_index !== "undefined") {
      const recent = [...data]
        .reverse()
        .find((item) => item.kp_index !== undefined && item.kp_index !== null);

      if (recent) {
        return {
          data: parseFloat(recent.kp_index),
          error: null,
          time: recent.time_tag || recent.time || "latest"
        };
      }
    }

    if (Array.isArray(data[data.length - 1])) {
      const latest = data[data.length - 1];

      return {
        data: parseFloat(latest[1]),
        error: null,
        time: latest[0]
      };
    }
  }

  return {
    data: estimateKpFromTime(),
    error: null,
    fallback: true,
    time: "estimated fallback"
  };
}

function estimateKpFromTime() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const day = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

  const timeFactor = Math.sin((hour / 24) * Math.PI * 2) * 0.5 + 0.5;
  const dayFactor = Math.sin((day / 365) * Math.PI * 2) * 0.3 + 0.5;

  return Math.max(
    0.5,
    Math.min(5.5, 1 + (timeFactor * 0.6 + dayFactor * 0.4) * 3)
  );
}

/* ================= SOLAR WIND ================= */

async function fetchSolarWind() {
  const { data, error } = await apiFetch(
    `${BASE.NOAA_SWPC}/json/rtsw/rtsw_wind.json`
  );

  if (error || !Array.isArray(data)) {
    return {
      data: null,
      error: error || "Bad format"
    };
  }

  const recent = [...data]
    .reverse()
    .find((item) => item.proton_speed !== undefined || item.speed !== undefined);

  return {
    data: recent || null,
    error: null
  };
}

/* ================= AURORA ================= */

async function fetchAuroraProbability(lat) {
  const kpResult = await fetchKpIndex();
  const kp = kpResult.data ?? estimateKpFromTime();
  const absLat = Math.abs(Number(lat));

  const thresholds = {
    0: 66,
    1: 65,
    2: 63,
    3: 60,
    4: 57,
    5: 53,
    6: 48,
    7: 42,
    8: 35,
    9: 28
  };

  const kpRounded = Math.min(9, Math.max(0, Math.round(kp)));
  const threshold = thresholds[kpRounded] || 66;

  let probability = 0;
  let description = "";
  let visibilityStatus = "⚪ NONE";

  if (absLat >= threshold) {
    probability =
      30 +
      Math.min(70, (absLat - threshold) * 5) +
      Math.max(0, kp - 5) * 5;

    probability = Math.min(95, probability);
    visibilityStatus = probability >= 70 ? "🔴 HIGH" : "🟡 MODERATE";
    description = `Aurora likely at ${absLat.toFixed(1)}° latitude.`;
  } else {
    const gap = threshold - absLat;

    if (gap <= 5) {
      probability = Math.max(5, 25 - gap * 4);
      visibilityStatus = "🔵 LOW";
      description = `Aurora possible with Kp ${kp.toFixed(1)}.`;
    } else if (gap <= 15) {
      probability = Math.max(0, 20 - (gap - 5) * 1.5);
      visibilityStatus = "⚪ VERY LOW";
      description = "Aurora unlikely under current conditions.";
    } else {
      probability = 0;
      description = `No aurora visible at ${absLat.toFixed(1)}° latitude.`;
    }
  }

  if (absLat < 20 && kp < 7) {
    probability = 0;
    description = `Aurora not visible at ${absLat.toFixed(1)}° latitude.`;
    visibilityStatus = "⚪ NONE";
  }

  return {
    data: {
      probability: Math.round(Math.max(0, Math.min(95, probability))),
      kp,
      threshold,
      absLat,
      description,
      visibilityStatus,
      kpRounded
    },
    error: null
  };
}

/* ================= ACTIVE SATELLITES ================= */

async function fetchActiveSatellitesAbove(lat, lng) {
  try {
   if (typeof satellite === "undefined") {
  return {
    data: {
      count: 0,
      top: []
    },
    error: "Satellite calculation library unavailable"
  };
}

    const response = await fetch(
      "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle"
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const lines = (await response.text()).trim().split(/\r?\n/);

    const observerGd = {
      longitude: toRadians(Number(lng)),
      latitude: toRadians(Number(lat)),
      height: 0
    };

    const now = new Date();
    const gmst = satellite.gstime(now);
    const overhead = [];

    for (let i = 0; i < Math.min(lines.length - 2, 1800); i += 3) {
      try {
        const name = lines[i].trim();
        const tle1 = lines[i + 1];
        const tle2 = lines[i + 2];

        const satrec = satellite.twoline2satrec(tle1, tle2);
        const positionAndVelocity = satellite.propagate(satrec, now);

        if (!positionAndVelocity.position) continue;

        const ecf = satellite.eciToEcf(positionAndVelocity.position, gmst);
        const look = satellite.ecfToLookAngles(observerGd, ecf);

        const elevation = toDegrees(look.elevation);

        if (elevation > 10) {
          overhead.push({
            name,
            elevation,
            azimuth: toDegrees(look.azimuth),
            rangeKm: look.rangeSat
          });
        }
      } catch (_) {
        continue;
      }
    }

    overhead.sort((a, b) => b.elevation - a.elevation);

    return {
      data: {
        count: overhead.length,
        top: overhead.slice(0, 5)
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error.message
    };
  }
}

/* ================= PLANETS ================= */

function fetchPlanetarySky(lat, lng, date = new Date()) {
  if (typeof Astronomy === "undefined") {
    return {
      data: null,
      error: "Astronomy Engine not loaded"
    };
  }

  try {
    const observer = new Astronomy.Observer(Number(lat), Number(lng), 0);

    const bodies = [
      "Sun",
      "Moon",
      "Mercury",
      "Venus",
      "Mars",
      "Jupiter",
      "Saturn"
    ];

    const all = bodies.map((name) => {
      const equator = Astronomy.Equator(name, date, observer, true, true);

      const horizon = Astronomy.Horizon(
        date,
        observer,
        equator.ra,
        equator.dec,
        "normal"
      );

      return {
        name,
        ra: equator.ra,
        dec: equator.dec,
        altitude: horizon.altitude,
        azimuth: horizon.azimuth,
        visible: horizon.altitude > 0
      };
    });

    return {
      data: {
        all,
        above: all.filter((body) => body.visible)
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: error.message
    };
  }
}

/* ================= CONSTELLATION ESTIMATE ================= */

function getConstellationEstimate(lat, lng) {
  const month = new Date().getUTCMonth() + 1;
  const hour = new Date().getUTCHours();

  const seasonal = {
    1: ["Orion", "Taurus", "Gemini"],
    2: ["Orion", "Canis Major", "Gemini"],
    3: ["Leo", "Cancer", "Ursa Major"],
    4: ["Leo", "Virgo", "Ursa Major"],
    5: ["Virgo", "Boötes", "Libra"],
    6: ["Scorpius", "Sagittarius", "Hercules"],
    7: ["Scorpius", "Sagittarius", "Cygnus"],
    8: ["Cygnus", "Lyra", "Aquila"],
    9: ["Pegasus", "Andromeda", "Aquarius"],
    10: ["Pegasus", "Andromeda", "Pisces"],
    11: ["Taurus", "Perseus", "Andromeda"],
    12: ["Orion", "Taurus", "Gemini"]
  };

  const list = seasonal[month] || ["Orion", "Leo", "Scorpius"];

  const index = Math.abs(
    Math.round((Number(lat) + Number(lng) + hour) % list.length)
  );

  return {
    primary: list[index],
    candidates: list
  };
}

/* ================= CRATERS ================= */

const CRATER_DB = [
  {
    name: "Barringer",
    lat: 35.027,
    lng: -111.022,
    dia: 1.2,
    age: "50,000 yrs",
    country: "Arizona, USA"
  },
  {
    name: "Chicxulub",
    lat: 21.4,
    lng: -89.5,
    dia: 180,
    age: "66M yrs",
    country: "Mexico"
  },
  {
    name: "Vredefort",
    lat: -27.0,
    lng: 27.5,
    dia: 300,
    age: "2.02B yrs",
    country: "South Africa"
  },
  {
    name: "Sudbury Basin",
    lat: 46.6,
    lng: -81.2,
    dia: 130,
    age: "1.85B yrs",
    country: "Canada"
  },
  {
    name: "Popigai",
    lat: 71.6,
    lng: 111.0,
    dia: 100,
    age: "35M yrs",
    country: "Russia"
  },
  {
    name: "Ries",
    lat: 48.9,
    lng: 10.6,
    dia: 24,
    age: "15M yrs",
    country: "Germany"
  },
  {
    name: "Lonar",
    lat: 19.98,
    lng: 76.51,
    dia: 1.8,
    age: "50K yrs",
    country: "India"
  }
];

function nearestCrater(lat, lng) {
  let nearest = null;
  let minDistance = Infinity;

  CRATER_DB.forEach((crater) => {
    const distance = getDistanceKm(Number(lat), Number(lng), crater.lat, crater.lng);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = crater;
    }
  });

  return {
    crater: nearest,
    distanceKm: Math.round(minDistance)
  };
}

/* ================= SCORE ================= */

function computeZenithScore({
  kp,
  neoCount,
  hazardCount,
  auroraProbability,
  tempC,
  satelliteCount
}) {
  let score = 72;

  if (typeof kp === "number") {
    score -= Math.max(0, kp - 2) * 5;
  }

  score -= Math.min(16, hazardCount * 6);
  score -= Math.min(8, Math.max(0, neoCount - 20) * 0.3);

  if (typeof tempC === "number") {
    score -= Math.min(10, Math.abs(tempC - 18) * 0.25);
  }

  if (typeof satelliteCount === "number") {
    score += Math.min(10, satelliteCount * 0.6);
  }

  if (auroraProbability > 40) {
    score += 6;
  }

  return Math.round(Math.max(1, Math.min(99, score)));
}

/* ================= MAIN COMBINER ================= */

async function fetchAllRealData(lat, lng) {
  const [
    weather,
    iss,
    kp,
    solarWind,
    asteroids,
    aurora,
    sats
  ] = await Promise.all([
    fetchWeather(lat, lng),
    fetchISSData(lat, lng),
    fetchKpIndex(),
    fetchSolarWind(),
    fetchAsteroids(todayISO(), todayISO()),
    fetchAuroraProbability(lat),
    fetchActiveSatellitesAbove(lat, lng)
  ]);

  const planets = fetchPlanetarySky(lat, lng);
  const crater = nearestCrater(lat, lng);

  const allNEOs = asteroids?.data?.near_earth_objects
    ? Object.values(asteroids.data.near_earth_objects).flat()
    : [];

  const hazardous = allNEOs.filter(
    (object) => object.is_potentially_hazardous_asteroid
  );

  return {
    weather,
    iss,
    kp,
    solarWind,
    asteroids,
    aurora,
    sats,
    planets,
    crater,
    neoTotal: allNEOs.length,
    hazardousTotal: hazardous.length,
    constellation: getConstellationEstimate(lat, lng)
  };
}

/* ================= GEOCODING ================= */

async function geocode(query) {
  return apiFetch(
    buildUrl(`${BASE.NOMINATIM}/search`, {
      q: query,
      format: "json",
      limit: 1
    })
  );
}

/* ================= TIME MACHINE SKY SNAPSHOT ================= */

async function fetchSkySnapshot(dateISO, lat, lon) {
  const date = new Date(dateISO);
  const sky = fetchPlanetarySky(lat, lon, date);

  if (!sky.data) {
    throw new Error(sky.error || "Sky engine failed");
  }

  const moonPhaseAngle = Astronomy.MoonPhase(date);

  const illumination = Math.round(
    50 * (1 - Math.cos(toRadians(moonPhaseAngle)))
  );

  let phaseLabel = "New Moon";

  if (moonPhaseAngle > 22.5 && moonPhaseAngle <= 67.5) {
    phaseLabel = "Waxing Crescent";
  } else if (moonPhaseAngle <= 112.5) {
    phaseLabel = "First Quarter";
  } else if (moonPhaseAngle <= 157.5) {
    phaseLabel = "Waxing Gibbous";
  } else if (moonPhaseAngle <= 202.5) {
    phaseLabel = "Full Moon";
  } else if (moonPhaseAngle <= 247.5) {
    phaseLabel = "Waning Gibbous";
  } else if (moonPhaseAngle <= 292.5) {
    phaseLabel = "Last Quarter";
  } else if (moonPhaseAngle <= 337.5) {
    phaseLabel = "Waning Crescent";
  }

  const byName = Object.fromEntries(
    sky.data.all.map((body) => [body.name.toLowerCase(), body])
  );

  return {
    date: dateISO,
    location: {
      lat,
      lon
    },
    moon: {
      ...byName.moon,
      phaseLabel,
      illumination
    },
    sun: byName.sun,
    planets: {
      mercury: byName.mercury,
      venus: byName.venus,
      mars: byName.mars,
      jupiter: byName.jupiter,
      saturn: byName.saturn
    }
  };
}

/* ================= EXPORTS ================= */

window.ZenithAPI = {
  fetchAllRealData,
  geocode,
  fetchSkySnapshot,
  nearestCrater,
  computeZenithScore,
  getDistanceKm
};

window.fetchAllRealData = fetchAllRealData;
window.geocode = geocode;
window.fetchSkySnapshot = fetchSkySnapshot;