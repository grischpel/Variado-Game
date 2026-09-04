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
    this.winEffectGroup = null;
    this.winParticles = null;
    this.winRings = [];
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

    if (this.synergyAnimationStarted && this.winEffectGroup) {
      this.winEffectGroup.rotation.y += 0.004;
      this.winEffectGroup.rotation.z -= 0.002;
      this.animateWinParticles();
    }

    if (this.synergyAnimationStarted && this.sunLight) {
      this.sunLight.intensity = this.config.winLightIntensity +
        Math.sin(performance.now() * 0.004) * 0.25;
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
    this.createWinEffect();
  }

  createWinEffect() {
    this.winEffectGroup = new THREE.Group();
    this.winEffectGroup.name = 'win-effect';
    this.scene.add(this.winEffectGroup);

    const ringColors = [0xffd166, 0xff8c42, 0x7df9ff];
    ringColors.forEach((color, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.35 + index * 0.18, 0.025, 8, 96),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );

      ring.rotation.x = index === 1 ? Math.PI / 2 : index * 0.55;
      ring.rotation.z = index * 0.8;
      this.winEffectGroup.add(ring);
      this.winRings.push(ring);

      gsap.to(ring.scale, {
        x: 4.8,
        y: 4.8,
        z: 4.8,
        duration: 2.8 + index * 0.35,
        delay: index * 0.16,
        ease: 'power2.out'
      });
      gsap.to(ring.material, {
        opacity: 0.7,
        duration: 0.18,
        delay: index * 0.16,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
      });
    });

    const particleCount = 220;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount);

    for (let index = 0; index < particleCount; index++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 0.7;
      const height = (Math.random() - 0.5) * 1.3;
      const offset = index * 3;

      positions[offset] = Math.cos(angle) * radius;
      positions[offset + 1] = height;
      positions[offset + 2] = Math.sin(angle) * radius;
      velocities[index] = 0.012 + Math.random() * 0.022;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    this.winParticles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({
        color: 0xffd166,
        size: 0.09,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.winParticles.userData.velocities = velocities;
    this.winEffectGroup.add(this.winParticles);

    gsap.to(this.winParticles.material, {
      opacity: 0.95,
      duration: 0.5,
      ease: 'power2.out'
    });
    gsap.to(this.winParticles.material, {
      size: 0.16,
      duration: 1.4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut'
    });
  }

  animateWinParticles() {
    if (!this.winParticles) {
      return;
    }

    const positions = this.winParticles.geometry.attributes.position.array;
    const velocities = this.winParticles.userData.velocities;

    for (let index = 0; index < velocities.length; index++) {
      const offset = index * 3;
      const distance = Math.hypot(positions[offset], positions[offset + 2]);
      const scale = distance > 6 ? 0.35 : 1;

      positions[offset] *= 1 + velocities[index] * scale;
      positions[offset + 2] *= 1 + velocities[index] * scale;
      positions[offset + 1] += velocities[index] * 0.22;

      if (distance > 8 || positions[offset + 1] > 4) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.6 + Math.random() * 0.7;
        positions[offset] = Math.cos(angle) * radius;
        positions[offset + 1] = (Math.random() - 0.5) * 1.3;
        positions[offset + 2] = Math.sin(angle) * radius;
      }
    }

    this.winParticles.geometry.attributes.position.needsUpdate = true;
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
    this.removeWinEffect();
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

  removeWinEffect() {
    if (!this.winEffectGroup) {
      return;
    }

    this.winRings.forEach((ring) => {
      gsap.killTweensOf(ring.scale);
      gsap.killTweensOf(ring.material);
      ring.geometry.dispose();
      ring.material.dispose();
    });

    if (this.winParticles) {
      gsap.killTweensOf(this.winParticles.material);
      this.winParticles.geometry.dispose();
      this.winParticles.material.dispose();
    }

    this.scene.remove(this.winEffectGroup);
    this.winEffectGroup = null;
    this.winParticles = null;
    this.winRings = [];
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