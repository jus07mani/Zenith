(function () {
  let canvas = null;
  let ctx = null;
  let animationId = null;

  let stars = [];
  let satellites = [];
  let planets = [];
  let constellations = [];

  let domeData = null;
  let rotation = 0;

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

  function createStars(lat, lng) {
    stars = [];

    const starCount = window.innerWidth < 700 ? 130 : 230;
    const latitudeBoost = Math.abs(lat) / 90;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        angle: randomRange(0, Math.PI * 2),
        radius: randomRange(0.08, 0.95),
        size: randomRange(0.7, 2.2 + latitudeBoost),
        alpha: randomRange(0.35, 1),
        twinkle: randomRange(0.01, 0.04),
        offset: randomRange(0, Math.PI * 2)
      });
    }

    const lngSeed = Math.abs(Math.floor(lng)) % 30;

    for (let i = 0; i < 25; i++) {
      stars.push({
        angle: (i / 25) * Math.PI * 2 + lngSeed * 0.01,
        radius: 0.38 + Math.sin(i) * 0.08,
        size: randomRange(1.6, 2.8),
        alpha: randomRange(0.65, 1),
        twinkle: randomRange(0.01, 0.03),
        offset: randomRange(0, Math.PI * 2),
        band: true
      });
    }
  }

  function createSatellites(names) {
    satellites = [];

    const safeNames = names && names.length ? names : ["ISS", "NOAA", "Sentinel"];

    safeNames.forEach((name, index) => {
      satellites.push({
        name,
        angle: (index / safeNames.length) * Math.PI * 2,
        radius: 0.35 + (index % 3) * 0.15,
        speed: 0.004 + index * 0.0012,
        trail: []
      });
    });
  }

  function createPlanets(names) {
    planets = [];

    const safeNames = names && names.length ? names : ["Venus", "Jupiter"];

    safeNames.forEach((name, index) => {
      planets.push({
        name,
        angle: (index / safeNames.length) * Math.PI * 2 + 0.7,
        radius: 0.28 + index * 0.18,
        size: 5 + index * 1.5,
        pulse: randomRange(0, Math.PI * 2)
      });
    });
  }

  function createConstellations(names) {
    constellations = [];

    const safeNames = names && names.length ? names : ["Orion", "Pegasus", "Lyra"];

    safeNames.forEach((name, index) => {
      const baseAngle = (index / safeNames.length) * Math.PI * 2 + 0.4;
      const baseRadius = 0.35 + index * 0.13;
      const points = [];

      for (let i = 0; i < 5; i++) {
        points.push({
          angle: baseAngle + randomRange(-0.28, 0.28) + i * 0.11,
          radius: baseRadius + randomRange(-0.08, 0.08),
          size: randomRange(1.6, 2.8)
        });
      }

      constellations.push({
        name,
        points
      });
    });
  }

  function getCanvasCenter() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    return {
      x: width / 2,
      y: height / 2,
      radius: Math.min(width, height) * 0.43
    };
  }

  function polarToScreen(angle, radiusMultiplier) {
    const center = getCanvasCenter();
    const domeCurve = Math.sqrt(radiusMultiplier);

    return {
      x: center.x + Math.cos(angle + rotation) * center.radius * domeCurve,
      y: center.y + Math.sin(angle + rotation) * center.radius * domeCurve * 0.72
    };
  }

  function drawBackground() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const center = getCanvasCenter();

    const bg = ctx.createRadialGradient(
      center.x,
      center.y,
      center.radius * 0.08,
      center.x,
      center.y,
      center.radius * 1.25
    );

    bg.addColorStop(0, "rgba(0, 234, 255, 0.13)");
    bg.addColorStop(0.45, "rgba(4, 18, 45, 0.82)");
    bg.addColorStop(1, "rgba(0, 0, 8, 1)");

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.scale(1, 0.72);

    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, (center.radius / 5) * i, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 234, 255, ${0.18 - i * 0.018})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + rotation;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * center.radius,
        Math.sin(angle) * center.radius
      );
      ctx.strokeStyle = "rgba(0, 234, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      center.radius,
      center.radius * 0.72,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "rgba(0, 234, 255, 0.42)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(
      center.x,
      center.y,
      center.radius * 1.04,
      center.radius * 0.76,
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = "rgba(0, 255, 157, 0.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStars(time) {
    stars.forEach((star) => {
      const pos = polarToScreen(star.angle, star.radius);
      const glow = star.alpha + Math.sin(time * star.twinkle + star.offset) * 0.22;

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, star.size, 0, Math.PI * 2);

      if (star.band) {
        ctx.fillStyle = `rgba(185, 240, 255, ${Math.max(0.25, glow)})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.2, glow)})`;
      }

      ctx.fill();

      if (star.size > 1.8) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, star.size * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 234, 255, ${Math.max(0.02, glow * 0.08)})`;
        ctx.fill();
      }
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

      ctx.strokeStyle = "rgba(0, 234, 255, 0.42)";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      points.forEach((point, index) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, group.points[index].size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(220, 255, 255, 0.9)";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(point.x, point.y, group.points[index].size * 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 234, 255, 0.12)";
        ctx.fill();
      });

      const labelPoint = points[0];

      ctx.fillStyle = "rgba(0, 255, 157, 0.9)";
      ctx.font = "12px Arial";
      ctx.fillText(group.name, labelPoint.x + 8, labelPoint.y - 8);
    });
  }

  function drawPlanets(time) {
    planets.forEach((planet) => {
      const pos = polarToScreen(planet.angle, planet.radius);
      const pulse = Math.sin(time * 0.02 + planet.pulse) * 1.3;

      const gradient = ctx.createRadialGradient(
        pos.x,
        pos.y,
        1,
        pos.x,
        pos.y,
        planet.size * 4
      );

      gradient.addColorStop(0, "rgba(241, 197, 121, 1)");
      gradient.addColorStop(0.35, "rgba(241, 197, 121, 0.42)");
      gradient.addColorStop(1, "rgba(241, 197, 121, 0)");

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, planet.size * 4 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, planet.size + pulse * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(241, 197, 121, 0.95)";
      ctx.fill();

      ctx.fillStyle = "rgba(255, 240, 210, 0.95)";
      ctx.font = "12px Arial";
      ctx.fillText(planet.name, pos.x + 12, pos.y + 4);
    });
  }

  function drawSatellites() {
    const center = getCanvasCenter();

    satellites.forEach((sat) => {
      sat.angle += sat.speed;

      const pos = polarToScreen(sat.angle, sat.radius);

      sat.trail.push({ x: pos.x, y: pos.y });

      if (sat.trail.length > 28) {
        sat.trail.shift();
      }

      for (let i = 0; i < sat.trail.length - 1; i++) {
        const current = sat.trail[i];
        const next = sat.trail[i + 1];

        ctx.beginPath();
        ctx.moveTo(current.x, current.y);
        ctx.lineTo(next.x, next.y);
        ctx.strokeStyle = `rgba(0, 255, 157, ${i / sat.trail.length})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 157, 1)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 255, 157, 0.15)";
      ctx.fill();

      ctx.fillStyle = "rgba(185, 255, 225, 0.95)";
      ctx.font = "11px Arial";
      ctx.fillText(sat.name, pos.x + 9, pos.y - 7);

      ctx.beginPath();
      ctx.ellipse(
        center.x,
        center.y,
        center.radius * Math.sqrt(sat.radius),
        center.radius * Math.sqrt(sat.radius) * 0.72,
        0,
        0,
        Math.PI * 2
      );
      ctx.strokeStyle = "rgba(0, 255, 157, 0.05)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawHorizonLabels() {
    const center = getCanvasCenter();

    ctx.fillStyle = "rgba(0, 234, 255, 0.78)";
    ctx.font = "12px Arial";

    ctx.fillText("N", center.x - 4, center.y - center.radius * 0.78);
    ctx.fillText("S", center.x - 4, center.y + center.radius * 0.78);
    ctx.fillText("E", center.x + center.radius + 8, center.y + 4);
    ctx.fillText("W", center.x - center.radius - 18, center.y + 4);

    ctx.fillStyle = "rgba(148, 184, 197, 0.75)";
    ctx.font = "12px Arial";
    ctx.fillText("ZENITH", center.x - 22, center.y - 8);
  }

  function render(time) {
    if (!canvas || !ctx) return;

    rotation += 0.0007;

    drawBackground();
    drawStars(time);
    drawConstellations();
    drawPlanets(time);
    drawSatellites();
    drawHorizonLabels();

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
    createSatellites(domeData.satellites || []);
    createPlanets(domeData.planets || []);
    createConstellations(domeData.constellations || []);

    window.addEventListener("resize", resizeCanvas);

    animationId = requestAnimationFrame(render);
  }

  function stop() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  window.ZenithSkyDome = {
    start,
    stop
  };
})();