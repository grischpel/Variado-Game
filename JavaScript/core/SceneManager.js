window.SceneManager = class SceneManager {
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);

    if (!this.container) {
      throw new Error(`Canvas-Container nicht gefunden: ${containerSelector}`);
    }

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.animationCallbacks = [];
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02030a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.camera.position.set(0, 10, 14);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.container.appendChild(this.renderer.domElement);

    this.createLights();

    window.addEventListener('resize', () => this.onResize());
  }

  createLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(5, 8, 5);
    this.scene.add(pointLight);
  }

  addAnimationCallback(callback) {
    if (typeof callback === 'function') {
      this.animationCallbacks.push(callback);
    }
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.animationCallbacks.forEach((callback) => {
      callback();
    });

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
};