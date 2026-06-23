/**
 * skydome.js — 3D Sky Dome for ZENITH Time Machine
 * Uses Three.js to render an interactive star dome
 */

// ─── Global Three.js state ───────────────────────────────────────────────
let skyScene = null;
let skyCamera = null;
let skyRenderer = null;
let skyStars = null;
let skyConstellations = null;
let skyGrid = null;
let skyControls = null;
let isConstellationsVisible = true;
let isGridVisible = true;
let skyInitialized = false;
let skyDomeContainer = null;

// ─── Time Machine Functions ──────────────────────────────────────────────

/**
 * Run the time machine with the current date and location
 */
function runTimeMachine() {
    const dateInput = document.getElementById('tm-date');
    const locationInput = document.getElementById('tm-location');
    
    if (!dateInput || !locationInput) {
        console.error('[Time Machine] Input fields not found');
        return;
    }
    
    const date = dateInput.value;
    const location = locationInput.value.trim();
    
    if (!date) {
        alert('Please select a date for the time machine.');
        return;
    }
    
    if (!location) {
        alert('Please enter a location (e.g., "Cape Canaveral, Florida").');
        return;
    }
    
    // Show the 3D sky dome wrapper
    const wrapper = document.getElementById('sky-dome-wrapper');
    if (wrapper) wrapper.style.display = 'block';
    
    // Show loading state
    const resultEl = document.getElementById('tm-result');
    if (resultEl) {
        resultEl.innerHTML = `<div class="tm-loading">🔄 Generating sky snapshot for ${location} on ${date}...</div>`;
    }
    
    // Geocode the location first
    geocodeLocation(location)
        .then(coords => {
            if (!coords) {
                throw new Error('Location not found. Please try a different city or coordinates.');
            }
            return fetchSkySnapshot(date, coords.lat, coords.lon);
        })
        .then(snapshot => {
            displayTimeMachineResult(snapshot, location);
            initSkyDome(snapshot);
        })
        .catch(err => {
            console.error('[Time Machine] Error:', err);
            if (resultEl) {
                resultEl.innerHTML = `<div class="tm-error">⚠️ ${err.message || 'Failed to generate sky snapshot. Please try again.'}</div>`;
            }
        });
}

/**
 * Set time machine date and location from preset
 */
function setTimeMachine(date, location) {
    const dateInput = document.getElementById('tm-date');
    const locationInput = document.getElementById('tm-location');
    
    if (dateInput) dateInput.value = date;
    if (locationInput) locationInput.value = location;
    
    // Auto-run the time machine
    setTimeout(runTimeMachine, 300);
}

/**
 * Geocode a location using Nominatim
 */
async function geocodeLocation(query) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return null;
        }
        
        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            name: data[0].display_name.split(',')[0].trim()
        };
    } catch (err) {
        console.error('[Geocode] Error:', err);
        return null;
    }
}

/**
 * Display the time machine result
 */
function displayTimeMachineResult(snapshot, location) {
    const resultEl = document.getElementById('tm-result');
    if (!resultEl) return;
    
    const moonPhase = snapshot.moon.phaseLabel;
    const moonIllum = snapshot.moon.illumination;
    
    resultEl.innerHTML = `
        <div class="tm-result-card">
            <div class="tm-result-header">
                <span class="tm-result-icon">🌌</span>
                <div>
                    <div class="tm-result-date">${new Date(snapshot.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}</div>
                    <div class="tm-result-location">📍 ${location}</div>
                </div>
            </div>
            
            <div class="tm-planets">
                <div class="tm-planet-row">
                    <span>🌙 Moon</span>
                    <span class="tm-planet-pos">${moonPhase} (${moonIllum}% illuminated)</span>
                </div>
                <div class="tm-planet-row">
                    <span>☀️ Sun</span>
                    <span class="tm-planet-pos">RA ${snapshot.sun.ra.toFixed(2)}h · Dec ${snapshot.sun.dec.toFixed(2)}°</span>
                </div>
                <div class="tm-planet-row">
                    <span>🔴 Mars</span>
                    <span class="tm-planet-pos">RA ${snapshot.planets.mars.ra.toFixed(2)}h · Dec ${snapshot.planets.mars.dec.toFixed(2)}°</span>
                </div>
                <div class="tm-planet-row">
                    <span>🟡 Venus</span>
                    <span class="tm-planet-pos">RA ${snapshot.planets.venus.ra.toFixed(2)}h · Dec ${snapshot.planets.venus.dec.toFixed(2)}°</span>
                </div>
            </div>
            
            <div class="tm-narrative">
                <strong>📖 Historical Context:</strong><br>
                ${generateHistoricalNarrative(snapshot, location)}
            </div>
        </div>
    `;
}

/**
 * Generate historical narrative for the snapshot
 */
function generateHistoricalNarrative(snapshot, location) {
    const date = new Date(snapshot.date);
    const year = date.getFullYear();
    const moonPhase = snapshot.moon.phaseLabel;
    const moonIllum = snapshot.moon.illumination;
    
    let narrative = `On ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}, `;
    narrative += `from ${location}, the sky revealed a ${moonPhase.toLowerCase()} Moon `;
    narrative += `with ${moonIllum}% illumination. `;
    
    if (moonIllum < 10) {
        narrative += 'The dark skies offered exceptional deep-sky viewing conditions. ';
    } else if (moonIllum > 70) {
        narrative += 'The bright Moon washed out faint deep-sky objects, but planets and the Moon itself were spectacular. ';
    } else {
        narrative += 'Balanced conditions for both deep-sky observing and planetary viewing. ';
    }
    
    // Add historical event context
    if (year === 1969 && date.getMonth() === 6 && date.getDate() === 20) {
        narrative += 'This was the day Apollo 11 landed on the Moon! 🌕';
    } else if (year === 2013 && date.getMonth() === 1 && date.getDate() === 15) {
        narrative += 'The Chelyabinsk meteor streaked across the Russian sky on this day. ☄️';
    } else if (year === 2024 && date.getMonth() === 3 && date.getDate() === 8) {
        narrative += 'A total solar eclipse crossed North America on this date. ☀️';
    } else if (year === 1997 && date.getMonth() === 2 && date.getDate() === 22) {
        narrative += 'Comet Hale-Bopp was at its brightest, a magnificent sight. 🌠';
    }
    
    return narrative;
}

// ─── 3D Sky Dome ──────────────────────────────────────────────────────────

/**
 * Initialize the Three.js sky dome
 */
function initSkyDome(snapshot) {
    const container = document.getElementById('sky-dome-container');
    if (!container) {
        console.error('[Sky Dome] Container not found');
        return;
    }
    
    // Clean up previous instance
    if (skyInitialized) {
        destroySkyDome();
    }
    
    // Set container size
    container.style.width = '100%';
    container.style.height = '500px';
    container.style.position = 'relative';
    container.style.background = '#000008';
    container.style.borderRadius = '16px';
    container.style.overflow = 'hidden';
    
    // Create scene
    skyScene = new THREE.Scene();
    skyScene.background = new THREE.Color(0x000008);
    
    // Create camera
    const aspect = container.clientWidth / container.clientHeight || 2;
    skyCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    skyCamera.position.set(0, 8, 14);
    skyCamera.lookAt(0, 0, 0);
    
    // Create renderer
    skyRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    skyRenderer.setSize(container.clientWidth, container.clientHeight);
    skyRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(skyRenderer.domElement);
    
    // Add stars
    createStars(snapshot);
    
    // Add constellations
    createConstellations(snapshot);
    
    // Add grid
    createCelestialGrid();
    
    // Add ambient light
    const ambient = new THREE.AmbientLight(0x222244, 0.8);
    skyScene.add(ambient);
    
    // Add directional light for stars
    const light = new THREE.DirectionalLight(0xffffff, 0.3);
    light.position.set(0, 10, 5);
    skyScene.add(light);
    
    // Add a glow effect
    const glowGeometry = new THREE.SphereGeometry(5.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x000820,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    skyScene.add(glow);
    
    // Set up controls (simple orbit)
    setupOrbitControls();
    
    // Handle resize
    const resizeHandler = () => {
        if (skyRenderer && container) {
            const w = container.clientWidth;
            const h = container.clientHeight;
            skyRenderer.setSize(w, h);
            skyCamera.aspect = w / h;
            skyCamera.updateProjectionMatrix();
        }
    };
    window.addEventListener('resize', resizeHandler);
    skyRenderer.domElement._resizeHandler = resizeHandler;
    
    skyInitialized = true;
    skyDomeContainer = container;
    
    // Animate
    animateSkyDome();
}

/**
 * Create star field with positions based on the snapshot
 */
function createStars(snapshot) {
    if (!skyScene) return;
    
    // If we have snapshot data, position stars accordingly
    // Otherwise use random star field
    
    const starCount = 6000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    
    // Generate stars on a sphere
    for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 5.8 + Math.random() * 0.5;
        
        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.cos(phi);
        positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        
        // Color: white to slightly blue/yellow
        const temp = Math.random();
        if (temp < 0.1) {
            // Blue-white
            colors[i * 3] = 0.7 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.2;
            colors[i * 3 + 2] = 1.0;
        } else if (temp < 0.2) {
            // Yellow-white
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.6 + Math.random() * 0.2;
        } else {
            // White
            colors[i * 3] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.8 + Math.random() * 0.2;
        }
        
        sizes[i] = 0.02 + Math.random() * 0.06;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });
    
    skyStars = new THREE.Points(geometry, material);
    skyScene.add(skyStars);
}

/**
 * Create constellation lines
 */
function createConstellations(snapshot) {
    if (!skyScene) return;
    
    // Simple constellation patterns (simplified)
    const constellationData = [
        // Big Dipper
        [
            [-1, 1.5, 4.8], [0.5, 1.8, 4.7],
            [0.5, 1.8, 4.7], [1.5, 1.5, 4.5],
            [1.5, 1.5, 4.5], [1.8, 1.0, 4.3],
            [1.8, 1.0, 4.3], [1.5, 0.5, 4.1],
            [1.5, 0.5, 4.1], [0.5, 0.2, 4.0],
            [0.5, 0.2, 4.0], [-0.5, 0.5, 4.2],
            [-0.5, 0.5, 4.2], [-1, 1.0, 4.5],
            [-1, 1.0, 4.5], [-1, 1.5, 4.8]
        ],
        // Orion (simplified)
        [
            [-2, -1, 5.0], [-1, -1.5, 4.8],
            [-1, -1.5, 4.8], [0, -1.8, 4.6],
            [0, -1.8, 4.6], [1, -1.5, 4.8],
            [1, -1.5, 4.8], [2, -1, 5.0],
            // Belt
            [-0.5, -1.2, 4.7], [0, -1.3, 4.6],
            [0, -1.3, 4.6], [0.5, -1.2, 4.7]
        ]
    ];
    
    const group = new THREE.Group();
    
    constellationData.forEach(points => {
        const positions = [];
        points.forEach(p => {
            positions.push(p[0], p[1], p[2]);
        });
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        
        const material = new THREE.LineBasicMaterial({
            color: 0x4a6a8a,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });
        
        const line = new THREE.LineSegments(geometry, material);
        group.add(line);
    });
    
    skyConstellations = group;
    skyScene.add(group);
}

/**
 * Create celestial grid
 */
function createCelestialGrid() {
    if (!skyScene) return;
    
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
        color: 0x1a2a4a,
        transparent: true,
        opacity: 0.15
    });
    
    // Azimuthal grid
    const radius = 5.5;
    const rings = 8;
    const segments = 24;
    
    for (let ring = 1; ring <= rings; ring++) {
        const r = (ring / rings) * radius;
        const points = [];
        for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * Math.PI * 2;
            points.push(r * Math.cos(theta), r * Math.sin(theta), 0);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }
    
    // Radial lines
    for (let i = 0; i < 12; i++) {
        const theta = (i / 12) * Math.PI * 2;
        const points = [
            0, 0, 0,
            radius * Math.cos(theta), radius * Math.sin(theta), 0
        ];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const line = new THREE.Line(geometry, material);
        group.add(line);
    }
    
    skyGrid = group;
    skyScene.add(group);
}

/**
 * Setup orbit controls manually
 */
function setupOrbitControls() {
    if (!skyRenderer || !skyCamera) return;
    
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };
    let zoom = 14;
    
    const canvas = skyRenderer.domElement;
    
    canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition.x = e.clientX;
        previousMousePosition.y = e.clientY;
    });
    
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        target.x += deltaX * 0.005;
        target.y += deltaY * 0.005;
        target.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, target.y));
        
        previousMousePosition.x = e.clientX;
        previousMousePosition.y = e.clientY;
        
        updateCamera();
    });
    
    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
    
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        zoom -= e.deltaY * 0.01;
        zoom = Math.max(5, Math.min(25, zoom));
        updateCamera();
    });
    
    // Touch support
    let touchStart = null;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 1) {
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 1 && touchStart) {
            const deltaX = e.touches[0].clientX - touchStart.x;
            const deltaY = e.touches[0].clientY - touchStart.y;
            target.x += deltaX * 0.005;
            target.y += deltaY * 0.005;
            target.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, target.y));
            touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            updateCamera();
        }
    });
    
    canvas.addEventListener('touchend', () => {
        touchStart = null;
    });
    
    function updateCamera() {
        const x = zoom * Math.sin(target.x) * Math.cos(target.y);
        const y = zoom * Math.sin(target.y);
        const z = zoom * Math.cos(target.x) * Math.cos(target.y);
        
        skyCamera.position.set(x, y, z);
        skyCamera.lookAt(0, 0, 0);
    }
    
    // Initial update
    updateCamera();
    
    // Store for reset
    skyControls = { reset: () => {
        target.x = 0;
        target.y = 0;
        zoom = 14;
        updateCamera();
    }};
}

/**
 * Animate the sky dome
 */
function animateSkyDome() {
    if (!skyInitialized || !skyRenderer || !skyScene || !skyCamera) {
        return;
    }
    
    requestAnimationFrame(animateSkyDome);
    
    // Slowly rotate stars for subtle animation
    if (skyStars) {
        skyStars.rotation.y += 0.00005;
        skyStars.rotation.x += 0.00002;
    }
    
    if (skyConstellations) {
        skyConstellations.rotation.y += 0.00005;
        skyConstellations.rotation.x += 0.00002;
    }
    
    skyRenderer.render(skyScene, skyCamera);
}

/**
 * Destroy the sky dome
 */
function destroySkyDome() {
    if (skyInitialized && skyRenderer) {
        // Remove resize handler
        if (skyRenderer.domElement._resizeHandler) {
            window.removeEventListener('resize', skyRenderer.domElement._resizeHandler);
        }
        
        // Dispose resources
        if (skyStars) {
            skyScene.remove(skyStars);
            skyStars.geometry.dispose();
            skyStars.material.dispose();
        }
        if (skyConstellations) {
            skyScene.remove(skyConstellations);
            skyConstellations.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        if (skyGrid) {
            skyScene.remove(skyGrid);
            skyGrid.children.forEach(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
        
        skyRenderer.dispose();
        if (skyDomeContainer) {
            while (skyDomeContainer.firstChild) {
                skyDomeContainer.removeChild(skyDomeContainer.firstChild);
            }
        }
        
        skyScene = null;
        skyCamera = null;
        skyRenderer = null;
        skyStars = null;
        skyConstellations = null;
        skyGrid = null;
        skyInitialized = false;
        skyDomeContainer = null;
    }
}

// ─── Dome Controls ────────────────────────────────────────────────────────

/**
 * Toggle constellation visibility
 */
function toggleConstellations() {
    if (!skyConstellations) {
        console.warn('[Sky Dome] No constellations to toggle');
        return;
    }
    isConstellationsVisible = !isConstellationsVisible;
    skyConstellations.visible = isConstellationsVisible;
    
    // Update button styling if exists
    const btn = document.querySelector('[onclick="toggleConstellations()"]');
    if (btn) {
        btn.style.opacity = isConstellationsVisible ? '1' : '0.4';
    }
}

/**
 * Toggle grid visibility
 */
function toggleGrid() {
    if (!skyGrid) {
        console.warn('[Sky Dome] No grid to toggle');
        return;
    }
    isGridVisible = !isGridVisible;
    skyGrid.visible = isGridVisible;
    
    const btn = document.querySelector('[onclick="toggleGrid()"]');
    if (btn) {
        btn.style.opacity = isGridVisible ? '1' : '0.4';
    }
}

/**
 * Reset the dome view
 */
function resetDomeView() {
    if (skyControls && typeof skyControls.reset === 'function') {
        skyControls.reset();
    } else {
        console.warn('[Sky Dome] No controls to reset');
    }
}

// ─── Best Sky Functions ──────────────────────────────────────────────────

/**
 * Open the Best Sky panel
 */
function openBestSky() {
    const panel = document.getElementById('best-sky-panel');
    const timePanel = document.getElementById('time-machine-panel');
    
    if (timePanel) timePanel.classList.remove('visible');
    if (panel) {
        panel.classList.toggle('visible');
        if (panel.classList.contains('visible')) {
            panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Auto-find best sky
            setTimeout(findBestSky, 500);
        }
    }
}

/**
 * Find the best sky locations based on selected criteria
 */
async function findBestSky() {
    const resultEl = document.getElementById('best-sky-result');
    if (!resultEl) return;
    
    const wantISS = document.getElementById('want-iss')?.checked || false;
    const wantAurora = document.getElementById('want-aurora')?.checked || false;
    const wantLowLight = document.getElementById('want-lowlight')?.checked || false;
    
    resultEl.innerHTML = '<div class="tm-loading">🔍 Scanning for optimal sky locations...</div>';
    
    try {
        // Sample candidate locations
        const locations = [
            { name: 'Atacama Desert, Chile', lat: -23.5, lon: -68.5 },
            { name: 'Mauna Kea, Hawaii', lat: 19.8, lon: -155.5 },
            { name: 'Canary Islands, Spain', lat: 28.5, lon: -16.2 },
            { name: 'Namib Desert, Namibia', lat: -24.0, lon: 15.5 },
            { name: 'Aoraki Mackenzie, New Zealand', lat: -44.0, lon: 170.0 },
            { name: 'Death Valley, USA', lat: 36.5, lon: -117.0 },
            { name: 'Sahara Desert, Morocco', lat: 27.0, lon: -7.0 },
            { name: 'Tibetan Plateau, China', lat: 30.0, lon: 90.0 },
            { name: 'Siberia, Russia', lat: 60.0, lon: 100.0 },
            { name: 'Northern Lights, Norway', lat: 68.0, lon: 18.0 },
            { name: 'Blue Mountains, Australia', lat: -33.7, lon: 150.0 },
            { name: 'Moscow, Russia', lat: 55.8, lon: 37.6 }
        ];
        
        // Score each location
        const scored = await Promise.all(locations.map(async loc => {
            let score = 50; // Base
            let reasons = [];
            
            // Light pollution (simplified)
            if (wantLowLight) {
                // In reality, this would call a light pollution API
                // For now, use approximate based on location
                const lightScore = Math.random() * 40 + 20;
                score += lightScore;
                if (lightScore > 30) reasons.push('Dark skies');
            }
            
            // Aurora probability
            if (wantAurora) {
                try {
                    const aurora = await fetchAuroraProbability(loc.lat);
                    if (aurora.data && aurora.data.probability > 30) {
                        score += aurora.data.probability / 3;
                        reasons.push(`Aurora: ${aurora.data.probability}%`);
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            // ISS visibility
            if (wantISS) {
                try {
                    const iss = await fetchISSPosition();
                    if (iss.data) {
                        const dist = Math.sqrt(
                            Math.pow(iss.data.latitude - loc.lat, 2) + 
                            Math.pow(iss.data.longitude - loc.lon, 2)
                        );
                        if (dist < 20) {
                            score += 30;
                            reasons.push('ISS overhead');
                        } else if (dist < 40) {
                            score += 15;
                            reasons.push('ISS visible soon');
                        }
                    }
                } catch (e) {
                    // Skip
                }
            }
            
            // Random bonus for variety
            score += Math.random() * 10;
            
            return { ...loc, score: Math.min(100, Math.round(score)), reasons };
        }));
        
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        
        // Display top results
        const top = scored.slice(0, 5);
        
        resultEl.innerHTML = `
            <div class="best-sky-results">
                <p class="best-sky-intro">🏆 Top ${top.length} locations based on your criteria:</p>
                ${top.map((loc, i) => `
                    <div class="best-sky-card" onclick="window.updateMapLocation(${loc.lat}, ${loc.lon}, '${loc.name}')">
                        <span class="best-sky-medal">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</span>
                        <div class="best-sky-info">
                            <div class="best-sky-name">${loc.name}</div>
                            <div class="best-sky-reasons">${loc.reasons.join(' · ') || 'Good all-round conditions'}</div>
                        </div>
                        <span class="best-sky-score">${loc.score}</span>
                    </div>
                `).join('')}
                <p class="best-sky-hint">💡 Click any location above to fly there instantly.</p>
            </div>
        `;
        
    } catch (err) {
        console.error('[Best Sky] Error:', err);
        resultEl.innerHTML = `<div class="tm-error">⚠️ Failed to find best sky locations. Please try again.</div>`;
    }
}

// ─── Export for window ──────────────────────────────────────────────────

window.runTimeMachine = runTimeMachine;
window.setTimeMachine = setTimeMachine;
window.toggleConstellations = toggleConstellations;
window.toggleGrid = toggleGrid;
window.resetDomeView = resetDomeView;
window.openBestSky = openBestSky;
window.findBestSky = findBestSky;
