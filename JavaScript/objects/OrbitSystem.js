window.OrbitSystem = class OrbitSystem {
  constructor(scene, config) {
    this.scene = scene;

    this.maxLevel = config.maxLevel;
    this.sectorConfig = config.sectorConfig;
    this.nodesConfig = config.nodes;
    this.getSectors = config.getSectors;

    this.levelOrbitGroups = [];
    this.clickableNodes = [];
    this.levelRings = [];

    this.levelHighlightRings = [];

    this.currentHighlightOpacity = 0.28;
    this.currentHighlightPulseSpeed = 0.0035;
    this.currentHighlightPulseStrength = 0.08;

    this.completedRingOpacity = 0.28;
    this.currentRingOpacity = 0.46;
    this.lockedRingOpacity = 0.12;

    this.completedNodeOpacity = 0.72;
    this.currentNodeOpacity = 0.9;
    this.lockedNodeOpacity = 0.22;

    this.activeNodeEmissiveIntensity = 0.55;

    this.orbitDragGroup = null;

    this.slowOrbitSpeed = 0.0006;
    this.fastOrbitSpeed = 0.0022;

    this.dragRotationFactor = 0.006;
    this.dragDamping = 0.92;
    this.dragVelocity = 0;
    this.isDragging = false;
  }

  init() {
    this.createOrbitDragGroup();
    this.createLevelOrbitGroups();
    this.createSectorNodes();
    this.createLevelRings();
  }

  update() {
    this.animateLevelOrbits();
    this.applyDragInertia();
    this.updateDevelopmentStageVisibility();
    this.updateCurrentRingHighlight();
  }

  createOrbitDragGroup() {
    this.orbitDragGroup = new THREE.Group();
    this.orbitDragGroup.name = 'OrbitDragGroup';

    this.scene.add(this.orbitDragGroup);
  }

  createLevelOrbitGroups() {
    for (let level = 1; level <= this.maxLevel; level++) {
      const orbitGroup = new THREE.Group();

      orbitGroup.rotation.y = Math.random() * Math.PI * 2;

      orbitGroup.userData = {
        level
      };

      if (this.orbitDragGroup) {
        this.orbitDragGroup.add(orbitGroup);
      } else {
        this.scene.add(orbitGroup);
      }

      this.levelOrbitGroups[level] = orbitGroup;
    }
  }

  createSectorNodes() {
    Object.entries(this.sectorConfig).forEach(([sector, sectorSettings]) => {
      for (let level = 1; level <= this.maxLevel; level++) {
        const position = this.getNodePosition(sector, level);

        const geometry = new THREE.SphereGeometry(0.28, 32, 32);

        const material = new THREE.MeshStandardMaterial({
          color: sectorSettings.color,
          emissive: 0x000000,
          emissiveIntensity: this.nodesConfig.inactiveEmissiveIntensity,
          roughness: 0.55,
          transparent: true,
          opacity: this.lockedNodeOpacity
        });

        const node = new THREE.Mesh(geometry, material);
        node.position.copy(position);

        node.userData = {
          sector,
          level,
          active: false
        };

        const orbitGroup = this.levelOrbitGroups[level];

        if (orbitGroup) {
          orbitGroup.add(node);
        } else {
          this.scene.add(node);
        }

        this.clickableNodes.push(node);
      }
    });
  }

  createLevelRings() {
    for (let level = 1; level <= this.maxLevel; level++) {
      const radius = this.getRadiusForLevel(level);

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

      const points = curve.getPoints(128);
      const geometry = new THREE.BufferGeometry().setFromPoints(
        points.map(point => new THREE.Vector3(point.x, 0, point.y))
      );

      const material = new THREE.LineBasicMaterial({
        color: 0x24483f,
        transparent: true,
        opacity: 0.45
      });

      const ring = new THREE.LineLoop(geometry, material);
      ring.userData = {
        level
      };

      this.levelRings[level] = ring;

      const orbitGroup = this.levelOrbitGroups[level];

      if (orbitGroup) {
        orbitGroup.add(ring);
      } else {
        this.scene.add(ring);
      }

      const highlightGeometry = new THREE.TorusGeometry(
        radius,
        0.025,
        8,
        160
      );

      const highlightMaterial = new THREE.MeshBasicMaterial({
        color: 0xffd56a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const highlightRing = new THREE.Mesh(highlightGeometry, highlightMaterial);

      highlightRing.rotation.x = Math.PI / 2;
      highlightRing.visible = false;

      highlightRing.userData = {
        level
      };

      if (orbitGroup) {
        orbitGroup.add(highlightRing);
      } else {
        this.scene.add(highlightRing);
      }

      this.levelHighlightRings[level] = highlightRing;

    }
  }

  animateLevelOrbits() {
    this.levelOrbitGroups.forEach((orbitGroup) => {
      if (!orbitGroup) {
        return;
      }

      const level = orbitGroup.userData.level;
      const speed = this.getOrbitSpeedForLevel(level);

      orbitGroup.rotation.y += speed;
    });
  }

  getOrbitSpeedForLevel(level) {
    const currentDevelopmentLevel = this.getCurrentDevelopmentLevel();

    const isReachedOrCurrentLevel = level <= currentDevelopmentLevel;

    return isReachedOrCurrentLevel
      ? this.slowOrbitSpeed
      : this.fastOrbitSpeed;
  }

  getCurrentDevelopmentLevel() {
    const sectors = this.getSectors();
    const lowestProgress = Math.min(...Object.values(sectors));

    return Math.min(lowestProgress + 1, this.maxLevel);
  }

  startDrag() {
    this.isDragging = true;
    this.dragVelocity = 0;
  }

  drag(deltaX, deltaY = 0) {
    if (!this.orbitDragGroup) {
      return;
    }

    const dragAmount = Math.abs(deltaX) >= Math.abs(deltaY)
      ? deltaX
      : -deltaY;

    const rotationDelta = dragAmount * this.dragRotationFactor;

    this.orbitDragGroup.rotation.y += rotationDelta;
    this.dragVelocity = rotationDelta;
  }

  endDrag() {
    this.isDragging = false;
  }

  applyDragInertia() {
    if (!this.orbitDragGroup || this.isDragging) {
      return;
    }

    if (Math.abs(this.dragVelocity) < 0.00001) {
      this.dragVelocity = 0;
      return;
    }

    this.orbitDragGroup.rotation.y += this.dragVelocity;
    this.dragVelocity *= this.dragDamping;
  }

  getNodePosition(sector, level) {
    const radius = this.getRadiusForLevel(level);
    const angle = this.sectorConfig[sector].angle;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
  }

  getRadiusForLevel(level) {
    const outerRadius = 8;
    const innerRadius = 2.2;

    const t = (level - 1) / (this.maxLevel - 1);

    return outerRadius + (innerRadius - outerRadius) * t;
  }

  activateNodeVisual(node) {
    const { sector } = node.userData;
    const sectorSettings = this.sectorConfig[sector];

    node.userData.active = true;

    gsap.to(node.scale, {
      x: 1.45,
      y: 1.45,
      z: 1.45,
      duration: 0.25,
      yoyo: true,
      repeat: 1
    });

    node.material.emissive.setHex(sectorSettings.color);
    node.material.emissiveIntensity = this.activeNodeEmissiveIntensity;
    node.material.opacity = this.completedNodeOpacity;
    node.material.transparent = true;
  }

  resetNodes() {
    this.clickableNodes.forEach((node) => {
      node.userData.active = false;

      gsap.killTweensOf(node.scale);

      node.scale.set(1, 1, 1);
      node.material.emissive.setHex(0x000000);
      node.material.emissiveIntensity = this.nodesConfig.inactiveEmissiveIntensity;
      node.material.opacity = this.lockedNodeOpacity;
      node.material.transparent = true;
    });
  }

  getClickableNodes() {
    return this.clickableNodes;
  }


  updateDevelopmentStageVisibility() {
    const currentDevelopmentLevel = this.getCurrentDevelopmentLevel();

    this.levelOrbitGroups.forEach((orbitGroup) => {
      if (!orbitGroup) {
        return;
      }

      const level = orbitGroup.userData.level;

      const isCompletedLevel = level < currentDevelopmentLevel;
      const isCurrentLevel = level === currentDevelopmentLevel;
      const isLockedLevel = level > currentDevelopmentLevel;

      let targetRingOpacity = this.lockedRingOpacity;
      let targetNodeOpacity = this.lockedNodeOpacity;

      if (isCompletedLevel) {
        targetRingOpacity = this.completedRingOpacity;
        targetNodeOpacity = this.completedNodeOpacity;
      }

      if (isCurrentLevel) {
        targetRingOpacity = this.currentRingOpacity;
        targetNodeOpacity = this.currentNodeOpacity;
      }

      if (isLockedLevel) {
        targetRingOpacity = this.lockedRingOpacity;
        targetNodeOpacity = this.lockedNodeOpacity;
      }

      const ring = this.levelRings[level];

      if (ring && ring.material) {
        ring.material.opacity = targetRingOpacity;
        ring.material.transparent = true;
      }

      orbitGroup.children.forEach((child) => {
        if (!child.isMesh || !child.material) {
          return;
        }

        child.material.opacity = child.userData.active
          ? this.completedNodeOpacity
          : targetNodeOpacity;

        child.material.transparent = true;

        if (child.userData.active) {
          child.material.emissiveIntensity = this.activeNodeEmissiveIntensity;
        }
      });
    });
  }
  updateCurrentRingHighlight() {
    const currentDevelopmentLevel = this.getCurrentDevelopmentLevel();

    const pulse =
      Math.sin(Date.now() * this.currentHighlightPulseSpeed) *
      this.currentHighlightPulseStrength;

    this.levelHighlightRings.forEach((highlightRing) => {
      if (!highlightRing || !highlightRing.material) {
        return;
      }

      const isCurrentLevel = highlightRing.userData.level === currentDevelopmentLevel;

      highlightRing.visible = isCurrentLevel;
      highlightRing.material.opacity = isCurrentLevel
        ? this.currentHighlightOpacity + pulse
        : 0;
    });
  }
};