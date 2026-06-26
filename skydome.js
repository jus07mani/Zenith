(function () {
  let canvas = null;
  let ctx = null;
  let animationId = null;

  let stars = [];
  let shootingStars = [];
  let satellites = [];
  let planets = [];
  let constellations = [];

  let domeData = null;
  let rotation = 0;
  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(rect.width * pixelRatio);
    canvas.height = Math.floor(rect.height * pixelRatio);

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getCanvasCenter() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    return {
      x: width / 2,
      y: height / 2,
      radius: Math.min(width, height) * 0.42
    };
  }

  function polarToScreen(angle, radiusMultiplier) {
    const center = getCanvasCenter();

    const domeCurve = Math.sqrt(radiusMultiplier);
    const parallaxX = mouseX * 20 * radiusMultiplier;
    const parallaxY = mouseY * 14 * radiusMultiplier;

    return {
      x:
        center.x +
        Math.cos(angle + rotation) * center.radius * domeCurve +
        parallaxX,
      y:
        center.y +
        Math.sin(angle + rotation) * center.radius * domeCurve * 0.68 +
        parallaxY
    };
  }

  function createStars(lat, lng) {
    stars = [];

    const starCount = window.innerWidth < 700 ? 360 : 850;
    const latitudeBoost = Math.abs(lat) / 90;
    const lngSeed = Math.abs(Math.floor(lng)) % 40;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        angle: randomRange(0, Math.PI * 2),
        radius: randomRange(0.06, 0.98),
        size: randomRange(0.45, 1.9 + latitudeBoost),
        alpha: randomRange(0.22, 1),
        twinkle: randomRange(0.006, 0.034),
        offset: randomRange(0, Math.PI * 2),
        color: Math.random() > 0.82 ? "blue" : "white"
      });
    }

    for (let i = 0; i < 42; i++) {
      stars.push({
        angle: (i / 42) * Math.PI * 2 + lngSeed * 0.015,
        radius: 0.35 + Math.sin(i * 1.6) * 0.08,
        size: randomRange(1.5, 2.8),
        alpha: randomRange(0.62, 1),
        twinkle: randomRange(0.008, 0.025),
        offset: randomRange(0, Math.PI * 2),
        color: "cyan",
        band: true
      });
    }
  }

  function createShootingStars() {
    shootingStars = [];

    for (let i = 0; i < 9; i++) {
      shootingStars.push({
        x: randomRange(-200, canvas.clientWidth),
        y: randomRange(40, canvas.clientHeight * 0.55),
        length: randomRange(90, 160),
        speed: randomRange(2.2, 4.8),
        delay: randomRange(0, 600),
        active: false,
        opacity: 0
      });
    }
  }

  function drawStars(time) {
    stars.forEach((star) => {
      const pos = polarToScreen(star.angle, star.radius);
      const twinkle =
        star.alpha + Math.sin(time * star.twinkle + star.offset) * 0.25;

      const alpha = clamp(twinkle, 0.12, 1);

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, star.size, 0, Math.PI * 2);

      if (star.color === "cyan") {
        ctx.fillStyle = `rgba(180, 245, 255, ${alpha})`;
      } else if (star.color === "blue") {
        ctx.fillStyle = `rgba(150, 205, 255, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      }

      ctx.fill();

      if (star.size > 1.35) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, star.size * 4.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80, 210, 255, ${alpha * 0.055})`;
        ctx.fill();
      }
    });
  }

  function updateShootingStars(time) {
    shootingStars.forEach((star, index) => {
      if (!star.active && time * 0.02 > star.delay) {
        star.active = true;
        star.opacity = 1;
      }

      if (!star.active) return;

      star.x += star.speed;
      star.y += star.speed * 0.38;
      star.opacity -= 0.006;

      if (
        star.opacity <= 0 ||
        star.x > canvas.clientWidth + 250 ||
        star.y > canvas.clientHeight
      ) {
        star.x = randomRange(-260, canvas.clientWidth * 0.5);
        star.y = randomRange(35, canvas.clientHeight * 0.45);
        star.length = randomRange(90, 170);
        star.speed = randomRange(2.2, 4.6);
        star.delay = time * 0.02 + randomRange(260, 900);
        star.active = false;
        star.opacity = 0;
      }
    });
  }

  function drawShootingStars() {
    shootingStars.forEach((star) => {
      if (!star.active) return;

      const gradient = ctx.createLinearGradient(
        star.x,
        star.y,
        star.x - star.length,
        star.y - star.length * 0.38
      );

      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity})`);
      gradient.addColorStop(0.35, `rgba(120, 220, 255, ${star.opacity * 0.55})`);
      gradient.addColorStop(1, "rgba(120, 220, 255, 0)");

      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - star.length, star.y - star.length * 0.38);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function handleMouseMove(event) {
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    targetMouseX = (event.clientX - rect.left) / rect.width - 0.5;
    targetMouseY = (event.clientY - rect.top) / rect.height - 0.5;
  }
    function createPlanets(names) {
    planets = [];

    const safeNames = names && names.length ? names : ["Venus", "Jupiter", "Mars"];

    const planetStyles = {
      Mercury: { color: "rgba(190, 185, 165, 1)", glow: "rgba(190, 185, 165, 0.35)" },
      Venus: { color: "rgba(255, 216, 145, 1)", glow: "rgba(255, 216, 145, 0.42)" },
      Mars: { color: "rgba(255, 125, 82, 1)", glow: "rgba(255, 125, 82, 0.38)" },
      Jupiter: { color: "rgba(241, 197, 121, 1)", glow: "rgba(241, 197, 121, 0.42)" },
      Saturn: { color: "rgba(236, 208, 154, 1)", glow: "rgba(236, 208, 154, 0.34)" },
      Uranus: { color: "rgba(150, 235, 255, 1)", glow: "rgba(150, 235, 255, 0.34)" },
      Neptune: { color: "rgba(110, 150, 255, 1)", glow: "rgba(110, 150, 255, 0.32)" }
    };

    safeNames.forEach((name, index) => {
      const style = planetStyles[name] || planetStyles.Jupiter;

      planets.push({
        name,
        angle: (index / safeNames.length) * Math.PI * 2 + 0.75,
        radius: 0.28 + index * 0.16,
        size: 5.5 + index * 1.1,
        pulse: randomRange(0, Math.PI * 2),
        color: style.color,
        glow: style.glow
      });
    });
  }

  function createSatellites(names) {
    satellites = [];

    const safeNames = names && names.length ? names : ["ISS", "NOAA-19", "Sentinel-2A"];

    safeNames.slice(0, 5).forEach((name, index) => {
      satellites.push({
        name,
        angle: (index / safeNames.length) * Math.PI * 2 + randomRange(-0.4, 0.4),
        radius: 0.32 + (index % 4) * 0.13,
        speed: 0.0052 + index * 0.0012,
        trail: [],
        pulse: randomRange(0, Math.PI * 2)
      });
    });
  }

  function createConstellations(names) {
    constellations = [];

    const safeNames =
      names && names.length ? names : ["Orion", "Pegasus", "Lyra", "Draco"];

    safeNames.slice(0, 4).forEach((name, index) => {
      const baseAngle = (index / safeNames.length) * Math.PI * 2 + 0.35;
      const baseRadius = 0.32 + index * 0.13;

      const points = [];

      const pattern = [
        { a: -0.28, r: -0.05 },
        { a: -0.1, r: 0.03 },
        { a: 0.08, r: -0.04 },
        { a: 0.24, r: 0.05 },
        { a: 0.38, r: -0.02 },
        { a: 0.5, r: 0.04 }
      ];

      pattern.forEach((point) => {
        points.push({
          angle: baseAngle + point.a + randomRange(-0.04, 0.04),
          radius: baseRadius + point.r + randomRange(-0.035, 0.035),
          size: randomRange(1.7, 2.9)
        });
      });

      constellations.push({
        name,
        points
      });
    });
  }

  function drawPlanets(time) {
    planets.forEach((planet) => {
      const pos = polarToScreen(planet.angle, planet.radius);
      const pulse = Math.sin(time * 0.018 + planet.pulse) * 1.3;

      const glow = ctx.createRadialGradient(
        pos.x,
        pos.y,
        1,
        pos.x,
        pos.y,
        planet.size * 6
      );

      glow.addColorStop(0, planet.glow);
      glow.addColorStop(0.42, planet.glow.replace("0.42", "0.18").replace("0.38", "0.16").replace("0.34", "0.14").replace("0.32", "0.12"));
      glow.addColorStop(1, "rgba(0,0,0,0)");

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, planet.size * 5 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, planet.size + pulse * 0.18, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.fill();

      if (planet.name === "Saturn") {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(-0.35);
        ctx.beginPath();
        ctx.ellipse(0, 0, planet.size * 1.9, planet.size * 0.55, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255, 230, 180, 0.7)";
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = "rgba(240, 250, 255, 0.95)";
      ctx.font = "12px Inter, Arial";
      ctx.fillText(planet.name, pos.x + 13, pos.y + 4);
    });
  }

  function drawSatellites(time) {
    const center = getCanvasCenter();

    satellites.forEach((sat) => {
      sat.angle += sat.speed;

      const pos = polarToScreen(sat.angle, sat.radius);

      sat.trail.push({ x: pos.x, y: pos.y });

      if (sat.trail.length > 36) {
        sat.trail.shift();
      }

      for (let i = 0; i < sat.trail.length - 1; i++) {
        const current = sat.trail[i];
        const next = sat.trail[i + 1];
        const alpha = i / sat.trail.length;

        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(105, 255, 190, ${alpha * 0.85})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.ellipse(
        center.x + mouseX * 8,
        center.y + mouseY * 6,
        center.radius * Math.sqrt(sat.radius),
        center.radius * Math.sqrt(sat.radius) * 0.68,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(105, 255, 190, 0.055)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const satellitePulse = Math.sin(time * 0.025 + sat.pulse) * 1.4;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4 + satellitePulse * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(105, 255, 190, 1)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12 + satellitePulse, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(105, 255, 190, 0.14)";
      ctx.fill();

      ctx.fillStyle = "rgba(210, 255, 235, 0.94)";
      ctx.font = "11px Inter, Arial";
      ctx.fillText(sat.name, pos.x + 10, pos.y - 8);
    });
  }

  function drawConstellations() {
    constellations.forEach((group) => {
      const points = group.points.map((point) =>
        polarToScreen(point.angle, point.radius)
      );

      ctx.beginPath();

      points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });

      ctx.strokeStyle = "rgba(95, 220, 255, 0.48)";
      ctx.lineWidth = 1.25;
      ctx.stroke();

      points.forEach((point, index) => {
        const size = group.points[index].size;

        ctx.beginPath();
        ctx.arc(point.x, point.y, size * 3.7, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(95, 220, 255, 0.11)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(235, 255, 255, 0.96)";
        ctx.fill();
      });

      const labelPoint = points[0];

      ctx.fillStyle = "rgba(105, 255, 190, 0.92)";
      ctx.font = "12px Inter, Arial";
      ctx.fillText(group.name, labelPoint.x + 10, labelPoint.y - 9);
    });
  }
    function drawBackground() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const center = getCanvasCenter();

    const bg = ctx.createRadialGradient(
      center.x,
      center.y,
      center.radius * 0.05,
      center.x,
      center.y,
      center.radius * 1.7
    );

    bg.addColorStop(0, "rgba(35, 110, 165, 0.28)");
    bg.addColorStop(0.35, "rgba(8, 28, 62, 0.92)");
    bg.addColorStop(0.78, "rgba(3, 8, 24, 1)");
    bg.addColorStop(1, "rgba(0, 0, 8, 1)");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const horizon = ctx.createLinearGradient(0, height * 0.58, 0, height);
    horizon.addColorStop(0, "rgba(80, 210, 255, 0)");
    horizon.addColorStop(0.42, "rgba(80, 210, 255, 0.14)");
    horizon.addColorStop(0.72, "rgba(6, 18, 38, 0.75)");
    horizon.addColorStop(1, "rgba(0, 0, 0, 0.95)");

    ctx.fillStyle = horizon;
    ctx.fillRect(0, height * 0.55, width, height * 0.45);

    ctx.save();
    ctx.translate(center.x + mouseX * 9, center.y + mouseY * 7);
    ctx.scale(1, 0.68);

    for (let i = 1; i <= 7; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (center.radius / 7) * i, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(95, 220, 255, ${0.18 - i * 0.017})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + rotation;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * center.radius,
        Math.sin(angle) * center.radius
      );
      ctx.strokeStyle = "rgba(95, 220, 255, 0.065)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(
      center.x + mouseX * 9,
      center.y + mouseY * 7,
      center.radius,
      center.radius * 0.68,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "rgba(95, 220, 255, 0.48)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      center.x + mouseX * 9,
      center.y + mouseY * 7,
      center.radius * 1.04,
      center.radius * 0.72,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "rgba(105, 255, 190, 0.17)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const scan = ctx.createLinearGradient(0, 0, width, 0);
    scan.addColorStop(0, "rgba(95, 220, 255, 0)");
    scan.addColorStop(0.5, "rgba(95, 220, 255, 0.055)");
    scan.addColorStop(1, "rgba(95, 220, 255, 0)");

    for (let y = 0; y < height; y += 34) {
      ctx.fillStyle = scan;
      ctx.fillRect(0, y, width, 1);
    }
  }

  function drawHorizonLabels() {
    const center = getCanvasCenter();

    ctx.fillStyle = "rgba(170, 230, 255, 0.9)";
    ctx.font = "12px Inter, Arial";

    ctx.fillText("N", center.x - 4, center.y - center.radius * 0.75);
    ctx.fillText("S", center.x - 4, center.y + center.radius * 0.75);
    ctx.fillText("E", center.x + center.radius + 12, center.y + 5);
    ctx.fillText("W", center.x - center.radius - 22, center.y + 5);

    ctx.fillStyle = "rgba(220, 240, 255, 0.72)";
    ctx.font = "12px Inter, Arial";
    ctx.fillText("ZENITH", center.x - 25, center.y - 8);

    ctx.fillStyle = "rgba(105, 255, 190, 0.76)";
    ctx.font = "10px Inter, Arial";
    ctx.fillText("OBSERVER", center.x - 26, center.y + 16);
  }

  function drawGroundSilhouette() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.beginPath();
    ctx.moveTo(0, height);

    const base = height * 0.84;

    for (let x = 0; x <= width; x += 80) {
      const peak = base + Math.sin(x * 0.02) * 18 + randomRange(-6, 6);
      ctx.lineTo(x, peak);
    }

    ctx.lineTo(width, height);
    ctx.closePath();

    ctx.fillStyle = "rgba(0, 0, 8, 0.72)";
    ctx.fill();
  }

  function drawTopOverlay() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      height * 0.25,
      width / 2,
      height / 2,
      height * 0.95
    );

    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.72, "rgba(0,0,0,0.1)");
    vignette.addColorStop(1, "rgba(0,0,0,0.58)");

    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }

  function updateMouse() {
    mouseX += (targetMouseX - mouseX) * 0.045;
    mouseY += (targetMouseY - mouseY) * 0.045;
  }
  function drawMilkyWay() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-0.28);

  const gradient = ctx.createLinearGradient(-width * 0.55, 0, width * 0.55, 0);
  gradient.addColorStop(0, "rgba(120, 180, 255, 0)");
  gradient.addColorStop(0.35, "rgba(150, 220, 255, 0.08)");
  gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.13)");
  gradient.addColorStop(0.65, "rgba(150, 220, 255, 0.08)");
  gradient.addColorStop(1, "rgba(120, 180, 255, 0)");

  ctx.fillStyle = gradient;
  ctx.filter = "blur(18px)";
  ctx.fillRect(-width * 0.55, -height * 0.08, width * 1.1, height * 0.16);

  ctx.restore();
  ctx.filter = "none";
}

  function render(time) {
    if (!canvas || !ctx) return;

    rotation += 0.00055;

    updateMouse();
    updateShootingStars(time);

    drawBackground();
    drawMilkyWay();
    drawStars(time);
    drawConstellations();
    drawPlanets(time);
    drawSatellites(time);
    drawShootingStars();
    drawHorizonLabels();
    drawGroundSilhouette();
    drawTopOverlay();

    animationId = requestAnimationFrame(render);
  }

  function start(data) {
    domeData = data || {};

    canvas = document.getElementById("skyDomeCanvas");

    if (!canvas) {
      console.error("Sky dome canvas not found.");
      return;
    }

    ctx = canvas.getContext("2d");

    if (!ctx) {
      console.error("Canvas context not supported.");
      return;
    }

    stop();

    resizeCanvas();

    createStars(Number(domeData.lat || 0), Number(domeData.lng || 0));
    createShootingStars();
    createSatellites(domeData.satellites || []);
    createPlanets(domeData.planets || []);
    createConstellations(domeData.constellations || []);

    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);

    animationId = requestAnimationFrame(render);
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (canvas) {
      canvas.removeEventListener("mousemove", handleMouseMove);
    }
  }

  window.ZenithSkyDome = {
    start,
    stop
  };
})();
