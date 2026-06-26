window.StarEnvironment = class StarEnvironment {
  constructor(scene, config) {
    this.scene = scene;

    this.starCount = config.starCount;
    this.starFieldRadius = config.starFieldRadius;
    this.galaxyArmCount = config.galaxyArmCount;

    this.starField = null;
    this.galaxyField = null;
  }

  init() {
    this.createStarField();
    this.createGalaxyDust();
  }

  update() {
    if (this.starField) {
      this.starField.rotation.y += 0.00025;
    }

    if (this.galaxyField) {
      this.galaxyField.rotation.y -= 0.00045;
    }
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < this.starCount; i++) {
      const radius = THREE.MathUtils.randFloat(35, this.starFieldRadius);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions.push(x, y, z);

      const brightness = THREE.MathUtils.randFloat(0.55, 1);
      colors.push(brightness, brightness, brightness);
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    this.starField = new THREE.Points(geometry, material);
    this.starField.name = 'Starfield';

    this.scene.add(this.starField);
  }

  createGalaxyDust() {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    const dustCount = 2200;

    for (let i = 0; i < dustCount; i++) {
      const arm = i % this.galaxyArmCount;
      const armAngle = (Math.PI * 2 / this.galaxyArmCount) * arm;

      const distance = THREE.MathUtils.randFloat(8, 55);
      const spiralOffset = distance * 0.18;
      const angle = armAngle + spiralOffset + THREE.MathUtils.randFloatSpread(0.45);

      const x = Math.cos(angle) * distance + THREE.MathUtils.randFloatSpread(2.5);
      const y = THREE.MathUtils.randFloatSpread(7);
      const z = Math.sin(angle) * distance + THREE.MathUtils.randFloatSpread(2.5);

      positions.push(x, y, z);

      const blue = THREE.MathUtils.randFloat(0.55, 1);
      const red = THREE.MathUtils.randFloat(0.25, 0.65);
      const green = THREE.MathUtils.randFloat(0.35, 0.75);

      colors.push(red, green, blue);
    }

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );

    geometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(colors, 3)
    );

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.galaxyField = new THREE.Points(geometry, material);
    this.galaxyField.name = 'GalaxyDust';
    this.galaxyField.rotation.x = Math.PI * 0.08;

    this.scene.add(this.galaxyField);
  }
};