(() => {
  window.addEventListener("load", () => {
    const box = document.getElementById("threeGlobe");

    if (!box) {
      console.error("threeGlobe container not found");
      return;
    }

    if (typeof THREE === "undefined") {
      console.error("THREE is not loaded");
      return;
    }

    const scene = new THREE.Scene();

    const width = box.clientWidth || 900;
    const height = box.clientHeight || 720;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.4);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    box.innerHTML = "";
    box.appendChild(renderer.domElement);

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const satelliteGroup = new THREE.Group();
    scene.add(satelliteGroup);

    const starGroup = new THREE.Group();
    scene.add(starGroup);

    const textureLoader = new THREE.TextureLoader();

    const earthTexture = textureLoader.load(
      "https://threejs.org/examples/textures/land_ocean_ice_cloud_2048.jpg"
    );

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 128, 128),
      new THREE.MeshStandardMaterial({
        map: earthTexture,
        roughness: 0.55,
        metalness: 0.04
      })
    );

    globeGroup.add(earth);

    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1.37, 72, 72),
      new THREE.MeshBasicMaterial({
        color: 0x8ccfff,
        wireframe: true,
        transparent: true,
        opacity: 0.12
      })
    );

    globeGroup.add(wire);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 96, 96),
      new THREE.MeshBasicMaterial({
        color: 0x69c9ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide
      })
    );

    globeGroup.add(atmosphere);

    function createOrbit(radius, rotateX, rotateZ, opacity) {
      const curve = new THREE.EllipseCurve(
        0,
        0,
        radius,
        radius,
        0,
        Math.PI * 2,
        false,
        0
      );

      const points = curve.getPoints(480);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: 0xbdeaff,
        transparent: true,
        opacity: opacity
      });

      const line = new THREE.LineLoop(geometry, material);
      line.rotation.x = rotateX;
      line.rotation.z = rotateZ;

      orbitGroup.add(line);
    }

    createOrbit(1.72, Math.PI / 2.35, 0.25, 0.42);
    createOrbit(1.95, Math.PI / 2.08, -0.55, 0.32);
    createOrbit(2.22, Math.PI / 2.75, 0.95, 0.25);
    createOrbit(2.45, Math.PI / 2.45, -1.2, 0.18);

    const satellites = [];

    function createSatellite(radius, speed, offset, tilt) {
      const satellite = new THREE.Group();

      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 18, 18),
        new THREE.MeshBasicMaterial({
          color: 0xffffff
        })
      );

      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.20, 0.028, 0.028),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.75
        })
      );

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 18, 18),
        new THREE.MeshBasicMaterial({
          color: 0xaee8ff,
          transparent: true,
          opacity: 0.16
        })
      );

      satellite.add(glow);
      satellite.add(body);
      satellite.add(wing);

      satellite.userData = {
        radius,
        speed,
        offset,
        tilt
      };

      satellites.push(satellite);
      satelliteGroup.add(satellite);
    }

    createSatellite(1.72, 0.00155, 0, 0.55);
    createSatellite(1.95, 0.0011, 2.2, -0.7);
    createSatellite(2.22, 0.00086, 4.4, 0.95);
    createSatellite(2.45, 0.00072, 1.4, -1.1);

    for (let i = 0; i < 500; i++) {
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(Math.random() * 0.011 + 0.003, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: Math.random() * 0.75 + 0.25
        })
      );

      star.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 10
      );

      starGroup.add(star);
    }

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(5, 3, 4);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.62);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x6ec8ff, 1.4);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    let targetX = 0;
    let targetY = 0;

    window.addEventListener("mousemove", (event) => {
      targetX = (event.clientX / window.innerWidth - 0.5) * 0.55;
      targetY = (event.clientY / window.innerHeight - 0.5) * 0.55;
    });

    function animate(time) {
      requestAnimationFrame(animate);

      earth.rotation.y += 0.0018;
      wire.rotation.y += 0.0023;
      atmosphere.rotation.y += 0.001;

      globeGroup.rotation.x += (targetY * 0.42 - globeGroup.rotation.x) * 0.035;
      globeGroup.rotation.y += (targetX * 0.42 - globeGroup.rotation.y) * 0.035;

      orbitGroup.rotation.y += 0.0008;
      starGroup.rotation.y += 0.00025;

      satellites.forEach((satellite) => {
        const t = time * satellite.userData.speed + satellite.userData.offset;
        const r = satellite.userData.radius;

        satellite.position.x = Math.cos(t) * r;
        satellite.position.z = Math.sin(t) * r;
        satellite.position.y = Math.sin(t + satellite.userData.tilt) * 0.62;

        satellite.rotation.y += 0.018;
      });

      renderer.render(scene, camera);
    }

    animate(0);

    window.addEventListener("resize", () => {
      const newWidth = box.clientWidth || 900;
      const newHeight = box.clientHeight || 720;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(newWidth, newHeight);
    });
  });
})();
