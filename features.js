/* ============================================================
   ORBIT — features.js
   This file adds 2 extra features:

   FEATURE 1: "Time Machine"
   User picks a past date + location → see what was in the sky then.
   Example: "What was overhead during the 1969 moon landing?"

   FEATURE 2: "Find My Best Sky"
   User says what they want to see (ISS pass, aurora, etc)
   → ORBIT finds the best coordinates on Earth for that right now.
   ============================================================ */


/* ============================================================
   ===================== FEATURE 1 ===========================
   TIME MACHINE
   ============================================================ */

/* ----------------------------------------------------------
   openTimeMachine()
   Called when the user clicks the Time Machine button.
   Shows/hides the Time Machine panel.
---------------------------------------------------------- */
function openTimeMachine() {
  const panel = document.getElementById('time-machine-panel');
  if (!panel) return;
  // Toggle visible class — CSS handles show/hide animation
  panel.classList.toggle('visible');
}

/* ----------------------------------------------------------
   runTimeMachine()
   Called when user clicks "Travel Back" inside the panel.
   1. Reads the date and location they entered
   2. Calls the relevant historical APIs
   3. Displays what was in the sky on that date
---------------------------------------------------------- */
async function runTimeMachine() {

  // Get inputs from the Time Machine panel
  const dateInput = document.getElementById('tm-date').value;
  const locationInput = document.getElementById('tm-location').value.trim();

  // Validate — make sure both fields are filled
  if (!dateInput || !locationInput) {
    alert('Please enter both a date and a location.');
    return;
  }

  const resultEl = document.getElementById('tm-result');
  resultEl.innerHTML = '<p class="tm-loading">⏳ Travelling back in time...</p>';

  // Step 1: Convert the location text to lat/lng using Nominatim
  let lat, lng;
  try {
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=json&limit=1`
    );
    const geoData = await geoRes.json();
    if (!geoData.length) {
      resultEl.innerHTML = '<p class="tm-error">Location not found. Try a different name.</p>';
      return;
    }
    lat = parseFloat(geoData[0].lat).toFixed(4);
    lng = parseFloat(geoData[0].lon).toFixed(4);
  } catch (e) {
    resultEl.innerHTML = '<p class="tm-error">Could not geocode location. Check your connection.</p>';
    return;
  }

  // Step 2: Parse the date
  const date = new Date(dateInput);
  const dateStr = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Step 3: Get historical planet positions from NASA Horizons API
  // NASA Horizons can calculate planet positions for any date in history
  // We query a few key objects: Sun (10), Moon (301), Mars (499), Jupiter (599)
  const planets = await getHistoricalPlanetPositions(lat, lng, dateInput);

  // Step 4: Ask Claude to generate a "what was in the sky" narrative
  const narrative = await generateTimeMachineNarrative(lat, lng, dateStr, locationInput, planets);

  // Step 5: Display results
  resultEl.innerHTML = `
    <div class="tm-result-card">
      <div class="tm-result-header">
        <span class="tm-result-icon">🕰️</span>
        <div>
          <p class="tm-result-date">${dateStr}</p>
          <p class="tm-result-location">${locationInput} · ${lat}°, ${lng}°</p>
        </div>
      </div>
      <div class="tm-planets">
        ${planets.map(p => `
          <div class="tm-planet-row">
            <span class="tm-planet-name">${p.name}</span>
            <span class="tm-planet-pos">${p.position}</span>
          </div>
        `).join('')}
      </div>
      <p class="tm-narrative">${narrative}</p>
    </div>
  `;
}

/* ----------------------------------------------------------
   getHistoricalPlanetPositions(lat, lng, date)
   Uses NASA Horizons API to get planet positions for a past date.
   Returns an array of { name, position } objects.

   NASA Horizons API docs: https://ssd.jpl.nasa.gov/horizons/
   It can calculate positions of any solar system body for any date.
---------------------------------------------------------- */
async function getHistoricalPlanetPositions(lat, lng, date) {

  // Format date for NASA Horizons (YYYY-MM-DD)
  const startDate = date;
  // End date = 1 day later (Horizons needs a range)
  const endDate = new Date(new Date(date).getTime() + 86400000)
    .toISOString().split('T')[0];

  // Planet IDs in NASA Horizons system
  const bodies = [
    { id: '301', name: '🌙 Moon' },
    { id: '499', name: '🔴 Mars' },
    { id: '599', name: '🟤 Jupiter' },
    { id: '699', name: '💍 Saturn' }
  ];

  const results = [];

  for (const body of bodies) {
    try {
      // NASA Horizons API URL
      // MAKE_EPHEM=YES gets the ephemeris (position data)
      // QUANTITIES=4 gives azimuth and elevation (altitude above horizon)
      const url = `https://ssd.jpl.nasa.gov/api/horizons.api?` +
        `format=json` +
        `&COMMAND='${body.id}'` +
        `&OBJ_DATA='NO'` +
        `&MAKE_EPHEM='YES'` +
        `&EPHEM_TYPE='OBSERVER'` +
        `&CENTER='coord@399'` +
        `&COORD_TYPE='GEODETIC'` +
        `&SITE_COORD='${lng},${lat},0'` +
        `&START_TIME='${startDate}'` +
        `&STOP_TIME='${endDate}'` +
        `&STEP_SIZE='1%20d'` +
        `&QUANTITIES='4'`;

      const res = await fetch(url);
      const data = await res.json();

      // Parse the result text to extract elevation
      // The result is a big text block — we look for the data line
      if (data.result) {
        const lines = data.result.split('\n');
        // Find the data line (after $$SOE marker = Start Of Ephemeris)
        const soeIndex = lines.findIndex(l => l.includes('$$SOE'));
        if (soeIndex !== -1 && lines[soeIndex + 1]) {
          const dataLine = lines[soeIndex + 1].trim();
          const parts = dataLine.split(/\s+/);
          // parts[3] = Azimuth, parts[4] = Elevation
          const elevation = parseFloat(parts[4]);
          const isAboveHorizon = elevation > 0;

          results.push({
            name: body.name,
            position: isAboveHorizon
              ? `${elevation.toFixed(1)}° above horizon`
              : 'Below horizon'
          });
        }
      }
    } catch (e) {
      // If one planet fails, just skip it — don't crash everything
      results.push({ name: body.name, position: 'Data unavailable' });
    }
  }

  return results;
}

/* ----------------------------------------------------------
   generateTimeMachineNarrative(...)
   Calls Claude to write a poetic description of what
   the sky looked like on that historical date.
---------------------------------------------------------- */
async function generateTimeMachineNarrative(lat, lng, dateStr, locationName, planets) {

  const abovePlanets = planets.filter(p => p.position.includes('above')).map(p => p.name);

  const prompt = `You are ORBIT's Time Machine. A user has travelled back to ${dateStr} at ${locationName} (${lat}°, ${lng}°).

Planets visible that night: ${abovePlanets.length > 0 ? abovePlanets.join(', ') : 'None of the checked planets were above the horizon'}.

Write 2-3 sentences describing what a person standing at this location on this date would have seen looking up. 
Be historically aware — if this is a famous date (moon landing, major event), mention it briefly.
Be vivid and specific. End with one thing worth noting about this sky.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_CLAUDE_API_KEY',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || 'Historical sky data generated.';
  } catch (e) {
    return `On ${dateStr}, the sky over ${locationName} held ${abovePlanets.length} visible planets. ${abovePlanets.length > 0 ? abovePlanets.join(' and ') + ' were above the horizon.' : ''}`;
  }
}


/* ============================================================
   ===================== FEATURE 2 ===========================
   FIND MY BEST SKY — REVERSE SEARCH
   ============================================================ */

/* ----------------------------------------------------------
   openBestSky()
   Shows/hides the Find My Best Sky panel.
---------------------------------------------------------- */
function openBestSky() {
  const panel = document.getElementById('best-sky-panel');
  if (!panel) return;
  panel.classList.toggle('visible');
}

/* ----------------------------------------------------------
   findBestSky()
   Called when user clicks "Find Best Location".
   1. Reads what they want to see (checkboxes)
   2. Tests a grid of coordinates across Earth
   3. Returns the top 3 locations that match
---------------------------------------------------------- */
async function findBestSky() {

  const wantISS    = document.getElementById('want-iss').checked;
  const wantAurora = document.getElementById('want-aurora').checked;
  const wantLowLight = document.getElementById('want-lowlight').checked;

  if (!wantISS && !wantAurora && !wantLowLight) {
    alert('Please select at least one condition.');
    return;
  }

  const resultEl = document.getElementById('best-sky-result');
  resultEl.innerHTML = '<p class="tm-loading">🌍 Scanning Earth for your perfect sky...</p>';

  // Step 1: Get current space weather (same for all locations)
  let weather = null;
  try {
    const res = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
    const data = await res.json();
    const latest = data[data.length - 1];
    weather = { kp: parseFloat(latest[1]) };
  } catch(e) {
    weather = { kp: 2 }; // fallback
  }

  // Step 2: Get ISS current position (to find where it'll pass soon)
  let issLat = 0, issLng = 0;
  try {
    const issRes = await fetch('https://api.open-notify.org/iss-now.json');
    const issData = await issRes.json();
    issLat = parseFloat(issData.iss_position.latitude);
    issLng = parseFloat(issData.iss_position.longitude);
  } catch(e) {
    issLat = 20; issLng = 0; // fallback
  }

  // Step 3: Score a grid of candidate locations
  // We test 12 well-known locations that are good for stargazing
  // (a full grid search would be too slow for a browser)
  const candidates = [
    { name: 'Atacama Desert, Chile',     lat: -24.6, lng: -70.4 },
    { name: 'Mauna Kea, Hawaii',         lat: 19.8,  lng: -155.5 },
    { name: 'Tromsø, Norway',            lat: 69.7,  lng: 18.9 },
    { name: 'Sahara Desert, Algeria',    lat: 23.0,  lng: 5.0 },
    { name: 'Outback, Australia',        lat: -25.0, lng: 133.0 },
    { name: 'Patagonia, Argentina',      lat: -50.0, lng: -70.0 },
    { name: 'Lapland, Finland',          lat: 68.0,  lng: 27.0 },
    { name: 'Tibetan Plateau, China',    lat: 32.0,  lng: 87.0 },
    { name: 'Canary Islands, Spain',     lat: 28.3,  lng: -16.5 },
    { name: 'Namibia, Africa',           lat: -22.0, lng: 17.0 },
    { name: 'Iceland',                   lat: 65.0,  lng: -18.0 },
    { name: 'New Zealand South Island',  lat: -45.0, lng: 168.0 }
  ];

  // Score each candidate based on what the user wants
  const scored = candidates.map(loc => {
    let score = 0;
    let reasons = [];

    // ISS score: how close is this location to the ISS ground track?
    if (wantISS) {
      // Distance from ISS current position (rough approximation)
      const latDiff = Math.abs(loc.lat - issLat);
      const lngDiff = Math.abs(loc.lng - issLng);
      const dist = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      const issScore = Math.max(0, 40 - dist * 0.3);
      score += issScore;
      if (issScore > 20) reasons.push('ISS passes nearby soon');
    }

    // Aurora score: higher latitude + higher Kp = better aurora
    if (wantAurora) {
      const latBonus = Math.abs(loc.lat) > 60 ? 40 : Math.abs(loc.lat) > 50 ? 20 : 5;
      const kpBonus = weather.kp * 5;
      score += latBonus + kpBonus;
      if (latBonus > 20) reasons.push('High latitude = aurora zone');
    }

    // Low light pollution: remote/desert locations score high
    if (wantLowLight) {
      // These locations are known for dark skies
      const darkSkyLocations = ['Atacama', 'Mauna Kea', 'Sahara', 'Outback', 'Namibia', 'Tibetan', 'Patagonia'];
      const isDark = darkSkyLocations.some(d => loc.name.includes(d));
      if (isDark) {
        score += 35;
        reasons.push('Minimal light pollution');
      } else {
        score += 10;
      }
    }

    return { ...loc, score: Math.round(score), reasons };
  });

  // Sort by score, highest first, take top 3
  const top3 = scored.sort((a, b) => b.score - a.score).slice(0, 3);

  // Step 4: Generate AI explanation for why these are the best spots
  const explanation = await generateBestSkyExplanation(top3, wantISS, wantAurora, wantLowLight, weather);

  // Step 5: Display results
  const medals = ['🥇', '🥈', '🥉'];
  resultEl.innerHTML = `
    <div class="best-sky-results">
      <p class="best-sky-intro">${explanation}</p>
      ${top3.map((loc, i) => `
        <div class="best-sky-card" onclick="jumpToLocation(${loc.lat}, ${loc.lng})">
          <span class="best-sky-medal">${medals[i]}</span>
          <div class="best-sky-info">
            <p class="best-sky-name">${loc.name}</p>
            <p class="best-sky-reasons">${loc.reasons.join(' · ')}</p>
          </div>
          <span class="best-sky-score">${loc.score}</span>
        </div>
      `).join('')}
      <p class="best-sky-hint">Click any location to scan its sky →</p>
    </div>
  `;
}

/* ----------------------------------------------------------
   jumpToLocation(lat, lng)
   When user clicks a Best Sky result, it loads that
   location's full ORBIT data automatically.
---------------------------------------------------------- */
function jumpToLocation(lat, lng) {
  document.getElementById('lat-display').textContent = lat.toFixed(4);
  document.getElementById('lng-display').textContent = lng.toFixed(4);

  // Scroll back up to the results
  document.querySelector('.score-section').scrollIntoView({ behavior: 'smooth' });

  // Fetch all data for this location
  if (typeof fetchAllData === 'function') {
    fetchAllData(lat, lng);
  }
}

/* ----------------------------------------------------------
   generateBestSkyExplanation(...)
   Claude explains WHY these 3 locations are the best.
---------------------------------------------------------- */
async function generateBestSkyExplanation(top3, wantISS, wantAurora, wantLowLight, weather) {

  const wants = [];
  if (wantISS) wants.push('ISS visibility');
  if (wantAurora) wants.push('aurora');
  if (wantLowLight) wants.push('dark skies');

  const prompt = `You are ORBIT. A user wants to find the best location on Earth tonight for: ${wants.join(', ')}.

Current Kp index: ${weather.kp} (${weather.kp >= 5 ? 'storm active — aurora likely at high latitudes' : weather.kp >= 3 ? 'unsettled — aurora possible above 55°' : 'quiet conditions'}).

Top 3 recommended locations: ${top3.map(l => l.name).join(', ')}.

Write 1-2 sentences explaining why these locations are ideal tonight. Be specific and helpful.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_CLAUDE_API_KEY',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await response.json();
    return data.content?.[0]?.text || 'Based on current space weather and ISS trajectory, these locations offer the best viewing conditions tonight.';
  } catch(e) {
    return `Based on current conditions (Kp ${weather.kp}), these locations offer the best ${wants.join(' and ')} tonight.`;
  }
}
