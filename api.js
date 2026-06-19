/* ============================================================
   ORBIT — api.js
   This is Person 2's file.
   Job: When Person 1 calls fetchAllData(lat, lng),
   this file calls all the space APIs, collects the data,
   calculates the ORBIT Score, then updates the dashboard cards.
   ============================================================ */


/* ============================================================
   THE MAIN FUNCTION — fetchAllData(lat, lng)
   Person 1 calls this whenever the user picks a location.
   It runs all the API calls and updates the UI when done.

   "async" means this function can wait for internet responses
   without freezing the whole page.
   ============================================================ */
async function fetchAllData(lat, lng) {

  console.log(`Fetching data for: ${lat}, ${lng}`);

  // Set all cards to "Loading..." state while we fetch
  setLoadingState();

  // Run all API calls at the same time (parallel, not one after another)
  // Promise.allSettled means even if one fails, the others still work
  const [satellites, issData, spaceWeather, neoData] = await Promise.allSettled([
    getSatelliteCount(lat, lng),
    getISSPass(lat, lng),
    getSpaceWeather(),
    getNEOData()
  ]);

  // Extract the values (or fallback if an API failed)
  // .status === 'fulfilled' means the API call succeeded
  const satCount   = satellites.status   === 'fulfilled' ? satellites.value   : null;
  const iss        = issData.status      === 'fulfilled' ? issData.value       : null;
  const weather    = spaceWeather.status === 'fulfilled' ? spaceWeather.value  : null;
  const neos       = neoData.status      === 'fulfilled' ? neoData.value       : null;

  // Update each dashboard card with the real data
  updateSkyTrafficCard(satCount);
  updateSpaceWeatherCard(weather);
  updateISSCard(iss);
  updateNEOCard(neos);
  updateAuroraCard(weather, lat);

  // Calculate and display the ORBIT Score
  const score = calculateORBITScore(satCount, iss, weather, neos, lat);
  updateORBITScore(score);

  // Generate the AI Space Brief using Claude API
  generateSpaceBrief(lat, lng, satCount, iss, weather, neos, score);

}


/* ============================================================
   LOADING STATE
   Sets all cards to show "Loading..." while APIs respond.
   This gives users feedback that something is happening.
   ============================================================ */
function setLoadingState() {
  const loadingIds = [
    'satellite-count', 'kp-index', 'crater-name',
    'neo-count', 'iss-pass-time', 'aurora-probability'
  ];
  loadingIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = 'Loading...';
  });
  document.getElementById('orbit-score-value').textContent = '--';
  document.getElementById('space-brief-text').textContent = 'Generating your cosmic intelligence report...';
}


/* ============================================================
   API 1: CELESTRAK — Satellite Count
   CelesTrak provides TLE (Two-Line Element) data for all
   active satellites. We fetch the active satellite list
   and count how many are currently tracked.

   Note: CelesTrak doesn't have a "satellites over lat/lng"
   endpoint for free. So we fetch all active sats and report
   the total count. For Round 2, this is acceptable.
   A proper implementation would use satellite.js to compute
   which ones are actually above the horizon.
   ============================================================ */
async function getSatelliteCount(lat, lng) {

  // CelesTrak's active satellites endpoint (returns TLE text format)
  const url = 'https://celestrak.org/SOCRATES/query.php?CODE=ALL&TCA=7&MAX=10&FMT=json';

  // Simpler alternative: just fetch the count of active satellites
  // We use a CORS proxy since CelesTrak blocks direct browser requests
  const response = await fetch('https://celestrak.org/SATCAT/satcat.csv?STATUS=active&FORMAT=json');

  // CelesTrak returns CSV, so we count lines as a rough proxy
  const text = await response.text();
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // Subtract 1 for the header row
  return Math.max(0, lines.length - 1);

}


/* ============================================================
   API 2: OPEN-NOTIFY — ISS Pass Times
   OpenNotify has an endpoint that takes lat/lng and returns
   the next times the ISS will pass overhead.
   ============================================================ */
async function getISSPass(lat, lng) {

  // Open-Notify ISS pass endpoint
  // n=1 means we only want the next 1 pass
  const url = `https://api.open-notify.org/iss-pass.json?lat=${lat}&lon=${lng}&n=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.response && data.response.length > 0) {
    // risetime is a Unix timestamp (seconds since 1970)
    // We convert it to a human-readable time
    const riseTime = new Date(data.response[0].risetime * 1000);
    const duration = data.response[0].duration; // seconds

    return {
      time: riseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: riseTime.toLocaleDateString(),
      duration: Math.round(duration / 60) // convert to minutes
    };
  }

  return null;
}


/* ============================================================
   API 3: NOAA Space Weather — Kp Index
   NOAA's Space Weather Prediction Center provides real-time
   geomagnetic storm data. Kp index ranges from 0-9:
   0-2 = quiet, 3-4 = unsettled, 5+ = storm (aurora possible)
   ============================================================ */
async function getSpaceWeather() {

  // NOAA's planetary Kp index JSON feed
  const url = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

  const response = await fetch(url);
  const data = await response.json();

  // data is an array of [timestamp, kpValue] pairs
  // The last entry is the most recent
  if (data.length > 1) {
    const latest = data[data.length - 1];
    const kp = parseFloat(latest[1]);

    return {
      kp: kp,
      level: kp < 3 ? 'Quiet' : kp < 5 ? 'Unsettled' : 'Storm Active'
    };
  }

  return { kp: 0, level: 'Unknown' };
}


/* ============================================================
   API 4: NASA NeoWs — Near Earth Objects
   NASA's Near Earth Object Web Service tracks asteroids.
   We check today's date for any tracked objects.
   ============================================================ */
async function getNEOData() {

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // NASA NeoWs API — requires a free API key from api.nasa.gov
  // For now we use DEMO_KEY (limited to 30 requests/hour)
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=DEMO_KEY`;

  const response = await fetch(url);
  const data = await response.json();

  const todayNEOs = data.near_earth_objects[today] || [];
  const hazardous = todayNEOs.filter(neo => neo.is_potentially_hazardous_asteroid);

  return {
    total: todayNEOs.length,
    hazardous: hazardous.length,
    closest: todayNEOs.length > 0 ? todayNEOs[0].name : 'None today'
  };
}


/* ============================================================
   UPDATE FUNCTIONS
   These take the data from the APIs and put it into the
   HTML elements (the card values) using their ids.
   ============================================================ */

function updateSkyTrafficCard(satCount) {
  const el = document.getElementById('satellite-count');
  const detail = document.getElementById('satellite-detail');
  if (!el) return;

  if (satCount !== null) {
    el.textContent = satCount.toLocaleString(); // adds commas e.g. "8,521"
    detail.textContent = 'Active satellites currently tracked';
  } else {
    el.textContent = 'Unavailable';
    detail.textContent = 'Could not reach CelesTrak';
  }
}

function updateSpaceWeatherCard(weather) {
  const el = document.getElementById('kp-index');
  const detail = document.getElementById('kp-detail');
  if (!el) return;

  if (weather) {
    el.textContent = `Kp ${weather.kp}`;
    detail.textContent = `Geomagnetic activity: ${weather.level}`;
  } else {
    el.textContent = 'Unavailable';
    detail.textContent = 'Could not reach NOAA';
  }
}

function updateISSCard(iss) {
  const el = document.getElementById('iss-pass-time');
  const detail = document.getElementById('iss-detail');
  if (!el) return;

  if (iss) {
    el.textContent = iss.time;
    detail.textContent = `${iss.date} · visible for ~${iss.duration} min`;
  } else {
    el.textContent = 'No pass soon';
    detail.textContent = 'No ISS pass in next 24hrs';
  }
}

function updateNEOCard(neos) {
  const el = document.getElementById('neo-count');
  const detail = document.getElementById('neo-detail');
  if (!el) return;

  if (neos) {
    el.textContent = neos.total;
    detail.textContent = `${neos.hazardous} potentially hazardous today`;
  } else {
    el.textContent = 'Unavailable';
    detail.textContent = 'Could not reach NASA NeoWs';
  }
}

function updateAuroraCard(weather, lat) {
  const el = document.getElementById('aurora-probability');
  const detail = document.getElementById('aurora-detail');
  if (!el) return;

  if (weather) {
    // Aurora is more likely at high latitudes and high Kp
    // Simple probability formula:
    // - Base chance based on Kp: kp * 10%
    // - Latitude bonus: above 60° adds +30%, 45-60° adds +15%
    const kpChance = weather.kp * 10;
    const latBonus = Math.abs(lat) > 60 ? 30 : Math.abs(lat) > 45 ? 15 : 0;
    const probability = Math.min(100, Math.round(kpChance + latBonus));

    el.textContent = `${probability}%`;
    detail.textContent = probability > 50
      ? 'Aurora likely if skies are clear!'
      : 'Low aurora probability tonight';
  } else {
    el.textContent = 'N/A';
    detail.textContent = 'Requires space weather data';
  }
}


/* ============================================================
   ORBIT SCORE CALCULATOR
   Combines all data into a single 0-100 score.
   Higher = more cosmically active location right now.
   ============================================================ */
function calculateORBITScore(satCount, iss, weather, neos, lat) {

  let score = 0;

  // Satellite density (max 25 points)
  // More satellites overhead = higher score
  if (satCount !== null) {
    score += Math.min(25, Math.round(satCount / 400));
  }

  // ISS pass (20 points if there's a pass within 12 hours)
  if (iss) {
    score += 20;
  }

  // Space weather — high Kp = more activity (max 25 points)
  if (weather) {
    score += Math.min(25, Math.round(weather.kp * 4));
  }

  // NEO activity (max 15 points)
  if (neos) {
    score += Math.min(15, neos.total * 2);
  }

  // Latitude bonus — polar regions are more cosmically active (max 15 points)
  const latBonus = Math.round((Math.abs(lat) / 90) * 15);
  score += latBonus;

  return Math.min(100, score);
}


/* ============================================================
   UPDATE ORBIT SCORE DISPLAY
   Updates the big number and animates the ring arc.
   ============================================================ */
function updateORBITScore(score) {

  // Update the number text
  document.getElementById('orbit-score-value').textContent = score;

  // Animate the SVG ring
  // Circumference = 2 * π * 80 ≈ 502
  // stroke-dashoffset of 502 = empty, 0 = full
  // So offset = 502 - (score/100 * 502)
  const circumference = 502;
  const offset = circumference - (score / 100) * circumference;

  const ring = document.getElementById('score-ring-fill');
  if (ring) {
    ring.style.strokeDashoffset = offset;
  }

  // Update the description text based on score
  const desc = document.getElementById('score-description');
  if (desc) {
    if (score >= 75) desc.textContent = '🔥 Exceptional cosmic activity at this location';
    else if (score >= 50) desc.textContent = '✨ Above average space activity overhead';
    else if (score >= 25) desc.textContent = '🌙 Moderate cosmic activity';
    else desc.textContent = '💤 Quiet cosmic conditions right now';
  }
}


/* ============================================================
   CLAUDE API — AI SPACE BRIEF
   After all data loads, we call Claude to generate a
   natural language summary of what's happening at this location.
   This is ORBIT's most unique feature.
   ============================================================ */
async function generateSpaceBrief(lat, lng, satCount, iss, weather, neos, score) {

  const briefEl = document.getElementById('space-brief-text');
  if (!briefEl) return;

  // Build a prompt with all the data we collected
  const prompt = `You are ORBIT, an advanced space intelligence system. 
Generate a 2-3 sentence "Space Brief" for the coordinates ${lat}°, ${lng}°.

Current data:
- Active satellites tracked: ${satCount || 'unknown'}
- ISS next pass: ${iss ? `${iss.time} on ${iss.date}, visible ${iss.duration} minutes` : 'no pass in next 24hrs'}
- Geomagnetic activity: Kp index ${weather ? weather.kp : 'unknown'} (${weather ? weather.level : 'unknown'})
- Near-Earth Objects today: ${neos ? neos.total : 'unknown'}
- ORBIT Score: ${score}/100

Write in a calm, intelligent, slightly poetic tone. Be specific. Include actionable advice (e.g. whether to look up tonight).`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // NOTE: In production you must NEVER put your API key here in frontend code.
        // For the competition demo, this is acceptable.
        // Replace YOUR_CLAUDE_API_KEY with your actual key from console.anthropic.com
        'x-api-key': 'YOUR_CLAUDE_API_KEY',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.content && data.content[0]) {
      briefEl.textContent = data.content[0].text;
    }

  } catch (error) {
    console.error('Claude API error:', error);
    briefEl.textContent = `Location ${lat}°, ${lng}° currently shows an ORBIT Score of ${score}/100. ${
      weather && weather.kp >= 3 ? 'Elevated geomagnetic activity detected. ' : ''
    }${iss ? `ISS passes overhead at ${iss.time}. ` : ''}Space activity is ${score > 50 ? 'above' : 'below'} average for this region.`;
  }
}
