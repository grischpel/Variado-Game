window.Sun = class Sun {
  constructor(scene, config, translate) {
    this.scene = scene;
    this.config = config;
    this.t = translate;

    this.fallbackCenterSphere = null;
    this.sunModel = null;
    this.sunModelLoaded = false;
    this.sunBaseScaleValue = null;
    this.sunLight = null;
    this.synergyAnimationStarted = false;

    this.coldSunColor = 0x6f86a8;
    this.warmSunColor = 0xd8923a;

    this.coldEmissiveColor = 0x102038;
    this.warmEmissiveColor = 0xb85f18;

    this.currentProgress = 0;
  }

  init() {
    this.createFallbackCenterSphere();
    this.loadSunModel();
  }

  update() {
    if (
      this.fallbackCenterSphere &&
      this.synergyAnimationStarted &&
      this.fallbackCenterSphere.visible
    ) {
      this.fallbackCenterSphere.rotation.y += 0.01;
      this.fallbackCenterSphere.rotation.x += 0.004;
    }

    if (this.sunModel && this.sunModel.visible) {
      this.sunModel.rotation.y += this.synergyAnimationStarted ? 0.01 : 0.003;
      this.sunModel.rotation.x += this.synergyAnimationStarted ? 0.003 : 0.001;
    }
  }

  createFallbackCenterSphere() {
    const geometry = new THREE.SphereGeometry(1.1, 64, 64);

    const material = new THREE.MeshStandardMaterial({
      color: this.coldSunColor,
      emissive: this.coldEmissiveColor,
      emissiveIntensity: this.config.defaultEmissiveIntensity,
      roughness: 0.45,
      metalness: 0.05
    });

    this.fallbackCenterSphere = new THREE.Mesh(geometry, material);
    this.fallbackCenterSphere.name = this.t('objects.synergy');
    this.fallbackCenterSphere.visible = true;

    this.scene.add(this.fallbackCenterSphere);
  }

  loadSunModel() {
    const textureLoader = new THREE.TextureLoader();

    const texture = textureLoader.load(
      this.config.texturePath,
      () => console.log('Sonnen-Textur geladen.'),
      undefined,
      (error) => console.warn('Sonnen-Textur konnte nicht geladen werden.', error)
    );

    const objLoader = new THREE.OBJLoader();

    objLoader.load(
      this.config.modelPath,
      (object) => {
        this.sunModel = object;
        this.sunModel.name = this.t('objects.sun');

        this.applySunMaterial(this.sunModel, texture);
        this.normalizeAndPlaceSunModel(this.sunModel, this.config.baseSize);

        this.sunModel.visible = true;
        this.scene.add(this.sunModel);

        this.sunModelLoaded = true;
        this.setFallbackCenterVisible(false);

        console.log('Sonnenmodell geladen:', {
          visible: this.sunModel.visible,
          position: this.sunModel.position,
          scale: this.sunModel.scale
        });
      },
      undefined,
      (error) => {
        console.warn(
          'Sonnenmodell konnte nicht geladen werden. Fallback-Kugel bleibt sichtbar.',
          error
        );

        this.sunModelLoaded = false;
        this.setFallbackCenterVisible(true);
      }
    );
  }

  applySunMaterial(object, texture) {
    object.traverse((child) => {
      if (!child.isMesh) {
        return;
      }

      child.material = new THREE.MeshStandardMaterial({
        map: texture,
        color: this.coldSunColor,
        emissive: this.coldEmissiveColor,
        emissiveIntensity: this.config.defaultEmissiveIntensity,
        roughness: 0.45,
        metalness: 0.0
      });

      child.castShadow = false;
      child.receiveShadow = false;
    });
  }

  normalizeAndPlaceSunModel(object, targetSize = 1) {
    object.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxAxis = Math.max(size.x, size.y, size.z);

    if (maxAxis === 0) {
      console.warn('Sonnenmodell hat keine messbare Größe.');
      return;
    }

    object.position.sub(center);

    const normalizedScale = targetSize / maxAxis;
    object.scale.setScalar(normalizedScale);
    object.position.set(0, 0, 0);

    this.sunBaseScaleValue = normalizedScale;

    console.log('Sonnenmodell normalisiert:', {
      originalSize: size,
      originalCenter: center,
      normalizedScale
    });
  }

  setFallbackCenterVisible(visible) {
    if (this.fallbackCenterSphere) {
      this.fallbackCenterSphere.visible = visible;
    }
  }

  activateWinState() {
    if (this.synergyAnimationStarted) {
      return;
    }

    this.synergyAnimationStarted = true;

    if (this.sunModelLoaded && this.sunModel) {
      this.activateSunModelWinState();
    } else {
      this.activateFallbackSphereWinState();
    }

    this.createWinSunLight();
  }

  activateSunModelWinState() {
    this.setFallbackCenterVisible(false);

    this.sunModel.visible = true;
    this.sunModel.name = this.t('objects.sun');

    gsap.killTweensOf(this.sunModel.scale);

    const targetScale = this.sunModel.scale.x * this.config.winScaleFactor;

    gsap.to(this.sunModel.scale, {
      x: targetScale,
      y: targetScale,
      z: targetScale,
      duration: 1.6,
      ease: 'power2.out'
    });

    this.sunModel.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }

      gsap.killTweensOf(child.material);
      child.material.emissiveIntensity = this.config.winEmissiveIntensity;
    });

    this.setProgress(1);

  }

  activateFallbackSphereWinState() {
    if (!this.fallbackCenterSphere) {
      return;
    }

    this.fallbackCenterSphere.visible = true;
    this.fallbackCenterSphere.name = this.t('objects.sun');

    this.fallbackCenterSphere.material.color.setHex(0xffc94a);
    this.fallbackCenterSphere.material.emissive.setHex(0xff8c00);
    this.fallbackCenterSphere.material.emissiveIntensity = 1.8;
    this.fallbackCenterSphere.material.roughness = 0.15;

    gsap.to(this.fallbackCenterSphere.scale, {
      x: 2.4,
      y: 2.4,
      z: 2.4,
      duration: 1.6,
      ease: 'power2.out'
    });

    gsap.killTweensOf(this.fallbackCenterSphere.material);
    this.fallbackCenterSphere.material.emissiveIntensity = this.config.winEmissiveIntensity;
    this.setProgress(1);
  }

  createWinSunLight() {
    if (this.sunLight) {
      return;
    }

    this.sunLight = new THREE.PointLight(
      0xffaa33,
      this.config.winLightIntensity,
      45
    );

    this.sunLight.position.set(0, 0, 0);
    this.scene.add(this.sunLight);
  }

  reset() {
    this.synergyAnimationStarted = false;

    this.resetSunModelState();
    this.resetFallbackSphereState();
    this.removeWinSunLight();
    this.setProgress(0);
  }

  resetSunModelState() {
    if (!this.sunModel) {
      return;
    }

    gsap.killTweensOf(this.sunModel.scale);

    this.sunModel.visible = true;
    this.sunModel.rotation.set(0, 0, 0);

    if (this.sunBaseScaleValue !== null) {
      this.sunModel.scale.setScalar(this.sunBaseScaleValue);
    }

    this.sunModel.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }

      gsap.killTweensOf(child.material);
      child.material.emissiveIntensity = this.config.defaultEmissiveIntensity;
    });
  }

  resetFallbackSphereState() {
    if (!this.fallbackCenterSphere) {
      return;
    }

    gsap.killTweensOf(this.fallbackCenterSphere.scale);
    gsap.killTweensOf(this.fallbackCenterSphere.material);

    this.fallbackCenterSphere.visible = !this.sunModelLoaded;
    this.fallbackCenterSphere.name = this.t('objects.synergy');

    this.fallbackCenterSphere.scale.set(1, 1, 1);
    this.fallbackCenterSphere.rotation.set(0, 0, 0);

    this.fallbackCenterSphere.material.color.setHex(0xc9a84a);
    this.fallbackCenterSphere.material.emissive.setHex(0x332600);
    this.fallbackCenterSphere.material.emissiveIntensity = 0.5;
    this.fallbackCenterSphere.material.roughness = 0.25;
    this.fallbackCenterSphere.material.metalness = 0.05;
  }

  removeWinSunLight() {
    if (!this.sunLight) {
      return;
    }

    gsap.killTweensOf(this.sunLight);
    this.scene.remove(this.sunLight);

    if (this.sunLight.dispose) {
      this.sunLight.dispose();
    }

    this.sunLight = null;
  }

  refreshLanguage() {
    if (this.sunModel) {
      this.sunModel.name = this.t('objects.sun');
    }

    if (this.fallbackCenterSphere) {
      this.fallbackCenterSphere.name = this.synergyAnimationStarted
        ? this.t('objects.sun')
        : this.t('objects.synergy');
    }
  }

  setProgress(progress) {
    this.currentProgress = THREE.MathUtils.clamp(progress, 0, 1);

    const emissiveIntensity = THREE.MathUtils.lerp(
      this.config.defaultEmissiveIntensity,
      this.config.winEmissiveIntensity,
      this.currentProgress
    );

    const color = new THREE.Color(this.coldSunColor).lerp(
      new THREE.Color(this.warmSunColor),
      this.currentProgress
    );

    const emissiveColor = new THREE.Color(this.coldEmissiveColor).lerp(
      new THREE.Color(this.warmEmissiveColor),
      this.currentProgress
    );

    if (this.sunModel) {
      this.sunModel.traverse((child) => {
        if (!child.isMesh || !child.material) {
          return;
        }

        child.material.color.copy(color);
        child.material.emissive.copy(emissiveColor);
        child.material.emissiveIntensity = emissiveIntensity;
      });
    }

    if (this.fallbackCenterSphere) {
      this.fallbackCenterSphere.material.color.copy(color);
      this.fallbackCenterSphere.material.emissive.copy(emissiveColor);
      this.fallbackCenterSphere.material.emissiveIntensity = emissiveIntensity;
    }

    if (this.sunLight) {
      this.sunLight.intensity = THREE.MathUtils.lerp(
        0.3,
        this.config.winLightIntensity,
        this.currentProgress
      );
    }
  }
};