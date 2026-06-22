const container = document.querySelector('#canvas');

const MAX_LEVEL = 5;
const WIN_LEVEL = MAX_LEVEL;
const MAX_DISTANCE = 1;

const DEFAULT_LANGUAGE = 'de';

const SUN_BASE_SIZE = 2.2;
const SUN_WIN_SCALE_FACTOR = 1.6;
const SUN_MODEL_PATH = '../Assets/Models/Sun/sol.obj';
const SUN_TEXTURE_PATH = './Assets/Models/Sun/2k_sun.jpg';
const SUN_DEFAULT_EMISSIVE_INTENSITY = 0.7;
const SUN_WIN_EMISSIVE_INTENSITY = 1.1;
const SUN_WIN_LIGHT_INTENSITY = 2.5;

const QUESTION_MODE_ENABLED = true;


const NODE_ACTIVE_EMISSIVE_INTENSITY = 1.1;
const NODE_INACTIVE_EMISSIVE_INTENSITY = 0;

let currentLanguage = DEFAULT_LANGUAGE;
let translations = window.I18N?.[DEFAULT_LANGUAGE] || {};

const sectors = {
  nature: 0,
  human: 0,
  tech: 0
};

const sectorConfig = {
  nature: {
    labelKey: 'sectors.nature',
    angle: 0,
    color: 0x6bd17b
  },
  human: {
    labelKey: 'sectors.human',
    angle: (Math.PI * 2) / 3,
    color: 0xf2a65a
  },
  tech: {
    labelKey: 'sectors.tech',
    angle: (Math.PI * 4) / 3,
    color: 0x4db8ff
  }
};

const nodeQuestions = {
  nature: {
    1: {
      questionKey: 'questions.nature.1.question',
      answers: [
        { labelKey: 'questions.nature.1.answers.0', correct: true },
        { labelKey: 'questions.nature.1.answers.1', correct: false }
      ]
    },
    2: null,
    3: null,
    4: null,
    5: null
  },
  human: {
    1: {
      questionKey: 'questions.human.1.question',
      answers: [
        { labelKey: 'questions.human.1.answers.0', correct: true },
        { labelKey: 'questions.human.1.answers.1', correct: false }
      ]
    },
    2: null,
    3: null,
    4: null,
    5: null
  },
  tech: {
    1: {
      questionKey: 'questions.tech.1.question',
      answers: [
        { labelKey: 'questions.tech.1.answers.0', correct: true },
        { labelKey: 'questions.tech.1.answers.1', correct: false }
      ]
    },
    2: null,
    3: null,
    4: null,
    5: null
  }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071c17);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

camera.position.set(0, 10, 14);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1.2);
pointLight.position.set(5, 8, 5);
scene.add(pointLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

const clickableNodes = [];

let fallbackCenterSphere = null;
let sunModel = null;
let sunModelLoaded = false;
let sunBaseScaleValue = null;
let sunLight = null;
let synergyAnimationStarted = false;

init();

function init() {
  createFallbackCenterSphere();
  loadSunModel();
  createSectorNodes();
  createLevelRings();

  updateUi();
  setStatus(t('status.initial'));

  window.resetGame = resetGame;
  window.setLanguage = setLanguage;

  window.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize);

  animate();
}

function createFallbackCenterSphere() {
  const geometry = new THREE.SphereGeometry(1.1, 64, 64);

  const material = new THREE.MeshStandardMaterial({
    color: 0xc9a84a,
    emissive: 0x332600,
    emissiveIntensity: 0.5,
    roughness: 0.25,
    metalness: 0.05
  });

  fallbackCenterSphere = new THREE.Mesh(geometry, material);
  fallbackCenterSphere.name = t('objects.synergy');
  fallbackCenterSphere.visible = true;

  scene.add(fallbackCenterSphere);
}

function loadSunModel() {
  const textureLoader = new THREE.TextureLoader();

  const texture = textureLoader.load(
    SUN_TEXTURE_PATH,
    () => console.log('Sonnen-Textur geladen.'),
    undefined,
    (error) => console.warn('Sonnen-Textur konnte nicht geladen werden.', error)
  );

  const objLoader = new THREE.OBJLoader();

  objLoader.load(
    SUN_MODEL_PATH,
    (object) => {
      sunModel = object;
      sunModel.name = t('objects.sun');

      applySunMaterial(sunModel, texture);
      normalizeAndPlaceSunModel(sunModel, SUN_BASE_SIZE);

      sunModel.visible = true;
      scene.add(sunModel);

      sunModelLoaded = true;
      setFallbackCenterVisible(false);

      console.log('Sonnenmodell geladen:', {
        visible: sunModel.visible,
        position: sunModel.position,
        scale: sunModel.scale
      });
    },
    undefined,
    (error) => {
      console.warn('Sonnenmodell konnte nicht geladen werden. Fallback-Kugel bleibt sichtbar.', error);
      sunModelLoaded = false;
      setFallbackCenterVisible(true);
    }
  );
}

function applySunMaterial(object, texture) {
  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      emissive: 0xff8c00,
      emissiveIntensity: SUN_DEFAULT_EMISSIVE_INTENSITY,
      roughness: 0.35,
      metalness: 0.0
    });

    child.castShadow = false;
    child.receiveShadow = false;
  });
}

function normalizeAndPlaceSunModel(object, targetSize = 1) {
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

  sunBaseScaleValue = normalizedScale;

  console.log('Sonnenmodell normalisiert:', {
    originalSize: size,
    originalCenter: center,
    normalizedScale
  });
}

function setFallbackCenterVisible(visible) {
  if (fallbackCenterSphere) {
    fallbackCenterSphere.visible = visible;
  }
}

function createSectorNodes() {
  Object.entries(sectorConfig).forEach(([sector, config]) => {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      const position = getNodePosition(sector, level);

      const geometry = new THREE.SphereGeometry(0.28, 32, 32);

      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        emissive: 0x000000,
        emissiveIntensity: NODE_INACTIVE_EMISSIVE_INTENSITY,
        roughness: 0.55
      });

      const node = new THREE.Mesh(geometry, material);
      node.position.copy(position);

      node.userData = {
        sector,
        level,
        active: false
      };

      scene.add(node);
      clickableNodes.push(node);
    }
  });
}

function createLevelRings() {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const radius = getRadiusForLevel(level);

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
    scene.add(ring);
  }
}

function getNodePosition(sector, level) {
  const radius = getRadiusForLevel(level);
  const angle = sectorConfig[sector].angle;

  return new THREE.Vector3(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  );
}

function getRadiusForLevel(level) {
  const outerRadius = 8;
  const innerRadius = 2.2;

  const t = (level - 1) / (MAX_LEVEL - 1);

  return outerRadius + (innerRadius - outerRadius) * t;
}

function isValidSector(sector) {
  return Object.prototype.hasOwnProperty.call(sectors, sector);
}

function canAdvance(sector) {
  if (!isValidSector(sector)) {
    return false;
  }

  if (sectors[sector] >= MAX_LEVEL) {
    return false;
  }

  const simulated = {
    ...sectors,
    [sector]: sectors[sector] + 1
  };

  const values = Object.values(simulated);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return max - min <= MAX_DISTANCE;
}

function getNodeActivationState(node) {
  if (!node || !node.userData) {
    return {
      allowed: false,
      reason: 'invalidNode'
    };
  }

  const { sector, level, active } = node.userData;

  if (active) {
    return {
      allowed: false,
      reason: 'alreadyActive'
    };
  }

  const expectedLevel = sectors[sector] + 1;

  if (level !== expectedLevel) {
    return {
      allowed: false,
      reason: 'wrongLevel'
    };
  }

  if (!canAdvance(sector)) {
    return {
      allowed: false,
      reason: 'balanceViolation'
    };
  }

  return {
    allowed: true,
    reason: null
  };
}

function activateNode(node) {
  const activationState = getNodeActivationState(node);

  if (!activationState.allowed) {
    setNodeActivationErrorStatus(activationState.reason);
    return;
  }

  if (QUESTION_MODE_ENABLED && hasQuestionForNode(node)) {
    askQuestionForNode(node);
    return;
  }

  completeNodeActivation(node);
}

function hasQuestionForNode(node) {
  const { sector, level } = node.userData;

  return Boolean(nodeQuestions?.[sector]?.[level]);
}

function askQuestionForNode(node) {
  const { sector, level } = node.userData;
  const questionConfig = nodeQuestions[sector][level];

  const questionText = t(questionConfig.questionKey);
  const answerText = questionConfig.answers
    .map((answer, index) => `${index + 1}: ${t(answer.labelKey)}`)
    .join('\n');

  const userInput = window.prompt(`${questionText}\n\n${answerText}`);

  if (userInput === null) {
    setStatus(t('status.questionCancelled'));
    return;
  }

  const answerIndex = Number(userInput) - 1;
  const selectedAnswer = questionConfig.answers[answerIndex];

  if (!selectedAnswer) {
    setStatus(t('status.questionInvalidAnswer'));
    return;
  }

  if (!selectedAnswer.correct) {
    setStatus(t('status.questionWrongAnswer'));
    return;
  }

  setStatus(t('status.questionCorrectAnswer'));
  completeNodeActivation(node);
}

function completeNodeActivation(node) {
  const { sector } = node.userData;

  node.userData.active = true;
  sectors[sector]++;

  gsap.to(node.scale, {
    x: 1.45,
    y: 1.45,
    z: 1.45,
    duration: 0.25,
    yoyo: true,
    repeat: 1
  });

  node.material.emissive.setHex(sectorConfig[sector].color);
  node.material.emissiveIntensity = NODE_ACTIVE_EMISSIVE_INTENSITY;

  updateUi();

  if (checkWin()) {
    setStatus(t('status.synergyReached'));
    activateSunWinState();
    return;
  }

  setStatus(t('status.sectorAdvanced', {
    sector: getSectorLabel(sector)
  }));
}

function setNodeActivationErrorStatus(reason) {
  const messageKeyByReason = {
    alreadyActive: 'status.nodeAlreadyActive',
    wrongLevel: 'status.nodeWrongLevel',
    balanceViolation: 'status.nodeBalanceViolation',
    invalidNode: 'status.nodeNotAllowed'
  };

  const messageKey = messageKeyByReason[reason] || 'status.nodeNotAllowed';

  setStatus(t(messageKey));
}

function getSectorLabel(sector) {
  const config = sectorConfig[sector];

  if (!config) {
    return sector;
  }

  return t(config.labelKey);
}

function checkWin() {
  return Object.values(sectors).every(value => value >= WIN_LEVEL);
}

function activateSunWinState() {
  if (synergyAnimationStarted) {
    return;
  }

  synergyAnimationStarted = true;

  if (sunModelLoaded && sunModel) {
    activateSunModelWinState();
  } else {
    activateFallbackSphereWinState();
  }

  createWinSunLight();
}

function activateSunModelWinState() {
  setFallbackCenterVisible(false);

  sunModel.visible = true;
  sunModel.name = t('objects.sun');

  gsap.killTweensOf(sunModel.scale);

  const targetScale = sunModel.scale.x * SUN_WIN_SCALE_FACTOR;

  gsap.to(sunModel.scale, {
    x: targetScale,
    y: targetScale,
    z: targetScale,
    duration: 1.6,
    ease: 'power2.out'
  });

  sunModel.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    gsap.killTweensOf(child.material);
    child.material.emissiveIntensity = SUN_WIN_EMISSIVE_INTENSITY;
  });
}

function activateFallbackSphereWinState() {
  if (!fallbackCenterSphere) {
    return;
  }

  fallbackCenterSphere.visible = true;
  fallbackCenterSphere.name = t('objects.sun');

  fallbackCenterSphere.material.color.setHex(0xffc94a);
  fallbackCenterSphere.material.emissive.setHex(0xff8c00);
  fallbackCenterSphere.material.emissiveIntensity = 1.8;
  fallbackCenterSphere.material.roughness = 0.15;

  gsap.to(fallbackCenterSphere.scale, {
    x: 2.4,
    y: 2.4,
    z: 2.4,
    duration: 1.6,
    ease: 'power2.out'
  });

  gsap.killTweensOf(fallbackCenterSphere.material);
  fallbackCenterSphere.material.emissiveIntensity = SUN_WIN_EMISSIVE_INTENSITY;
}

function createWinSunLight() {
  if (sunLight) {
    return;
  }

  sunLight = new THREE.PointLight(0xffaa33, SUN_WIN_LIGHT_INTENSITY, 45);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);
}

function resetGame() {
  resetSectors();
  resetNodes();
  resetSunState();
  updateUi();
  setStatus(t('status.initial'));
}

function resetSectors() {
  sectors.nature = 0;
  sectors.human = 0;
  sectors.tech = 0;

  synergyAnimationStarted = false;
}

function resetNodes() {
  clickableNodes.forEach((node) => {
    node.userData.active = false;

    gsap.killTweensOf(node.scale);

    node.scale.set(1, 1, 1);
    node.material.emissive.setHex(0x000000);
    node.material.emissiveIntensity = NODE_INACTIVE_EMISSIVE_INTENSITY;
  });
}

function resetSunState() {
  resetSunModelState();
  resetFallbackSphereState();
  removeWinSunLight();
}

function resetSunModelState() {
  if (!sunModel) {
    return;
  }

  gsap.killTweensOf(sunModel.scale);

  sunModel.visible = true;
  sunModel.rotation.set(0, 0, 0);

  if (sunBaseScaleValue !== null) {
    sunModel.scale.setScalar(sunBaseScaleValue);
  }

  sunModel.traverse((child) => {
    if (!child.isMesh || !child.material) {
      return;
    }

    gsap.killTweensOf(child.material);
    child.material.emissiveIntensity = 1.3;
  });
}

function resetFallbackSphereState() {
  if (!fallbackCenterSphere) {
    return;
  }

  gsap.killTweensOf(fallbackCenterSphere.scale);
  gsap.killTweensOf(fallbackCenterSphere.material);

  fallbackCenterSphere.visible = !sunModelLoaded;
  fallbackCenterSphere.name = t('objects.synergy');

  fallbackCenterSphere.scale.set(1, 1, 1);
  fallbackCenterSphere.rotation.set(0, 0, 0);

  fallbackCenterSphere.material.color.setHex(0xc9a84a);
  fallbackCenterSphere.material.emissive.setHex(0x332600);
  fallbackCenterSphere.material.emissiveIntensity = 0.5;
  fallbackCenterSphere.material.roughness = 0.25;
  fallbackCenterSphere.material.metalness = 0.05;
}

function removeWinSunLight() {
  if (!sunLight) {
    return;
  }

  gsap.killTweensOf(sunLight);
  scene.remove(sunLight);

  if (sunLight.dispose) {
    sunLight.dispose();
  }

  sunLight = null;
}

function updateUi() {
  const titleElement = document.querySelector('#game-title');
  const descriptionElement = document.querySelector('#game-description');
  const resetElement = document.querySelector('#reset-label');

  if (titleElement) {
    titleElement.textContent = t('ui.title');
  }

  if (descriptionElement) {
    descriptionElement.textContent = t('ui.description');
  }

  if (resetElement) {
    resetElement.textContent = t('ui.reset');
  }

  Object.entries(sectors).forEach(([sector, value]) => {
    const percent = Math.round((value / MAX_LEVEL) * 100);

    const valueElement = document.querySelector(`#${sector}-value`);
    const barElement = document.querySelector(`#${sector}-bar`);
    const labelElement = document.querySelector(`#${sector}-label`);

    if (valueElement) {
      valueElement.textContent = `${percent}%`;
    }

    if (barElement) {
      barElement.style.width = `${percent}%`;
    }

    if (labelElement) {
      labelElement.textContent = getSectorLabel(sector);
    }
  });
}

function setStatus(message) {
  const statusElement = document.querySelector('#status');

  if (statusElement) {
    statusElement.textContent = `${t('status.prefix')} ${message}`;
  }
}

function setLanguage(language) {
  if (!window.I18N || !window.I18N[language]) {
    console.warn(`Sprache nicht gefunden: ${language}`);
    return;
  }

  currentLanguage = language;
  translations = window.I18N[language];

  updateUi();

  if (checkWin()) {
    setStatus(t('status.synergyReached'));
  } else {
    setStatus(t('status.initial'));
  }

  if (sunModel) {
    sunModel.name = t('objects.sun');
  }

  if (fallbackCenterSphere) {
    fallbackCenterSphere.name = synergyAnimationStarted
      ? t('objects.sun')
      : t('objects.synergy');
  }
}

function t(key, replacements = {}) {
  const value = key.split('.').reduce((current, part) => {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      return current[part];
    }

    return null;
  }, translations);

  let text = value || key;

  Object.entries(replacements).forEach(([placeholder, replacement]) => {
    text = text.replaceAll(`{${placeholder}}`, replacement);
  });

  return text;
}

function onPointerDown(event) {
  if (event.target.closest('.ui-panel')) {
    return;
  }

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(clickableNodes);

  if (intersects.length === 0) {
    return;
  }

  activateNode(intersects[0].object);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  scene.rotation.y += 0.0015;

  if (fallbackCenterSphere && synergyAnimationStarted && fallbackCenterSphere.visible) {
    fallbackCenterSphere.rotation.y += 0.01;
    fallbackCenterSphere.rotation.x += 0.004;
  }

  if (sunModel && sunModel.visible) {
    sunModel.rotation.y += synergyAnimationStarted ? 0.01 : 0.003;
    sunModel.rotation.x += synergyAnimationStarted ? 0.003 : 0.001;
  }

  renderer.render(scene, camera);
}