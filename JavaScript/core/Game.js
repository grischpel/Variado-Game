window.Game = class Game {
  constructor(config) {
    this.config = config;

    this.sectorConfig = {
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

    this.sectors = {
      nature: 0,
      human: 0,
      tech: 0
    };

    this.nodeQuestions = window.nodeQuestions || {};

    this.sceneManager = null;
    this.uiManager = null;
    this.questionDialog = null;
    this.sun = null;
    this.starEnvironment = null;
    this.orbitSystem = null;
    this.inputController = null;

    this.mobilePanelController = null;
  }

  init() {
    this.uiManager = new window.UIManager({
      defaultLanguage: this.config.defaultLanguage,
      maxLevel: this.config.maxLevel,
      sectorConfig: this.sectorConfig
    });

    if (!window.nodeQuestions || Object.keys(this.nodeQuestions).length === 0) {
      console.warn(this.t('warnings.nodeQuestionsMissing'));
    }

    this.sceneManager = new window.SceneManager('#canvas');
    this.sceneManager.init();

    this.questionDialog = new window.QuestionDialog(
      (key, replacements) => this.t(key, replacements),
      (message, type) => this.uiManager.setStatus(message, type)
    );

    this.sun = new window.Sun(
      this.sceneManager.scene,
      this.config.sun,
      (key, replacements) => this.t(key, replacements)
    );

    this.starEnvironment = new window.StarEnvironment(
      this.sceneManager.scene,
      this.config.stars
    );

    this.orbitSystem = new window.OrbitSystem(
      this.sceneManager.scene,
      {
        maxLevel: this.config.maxLevel,
        sectorConfig: this.sectorConfig,
        nodes: this.config.nodes,
        getSectors: () => this.sectors
      }
    );

    this.sun.init();
    this.orbitSystem.init();
    this.starEnvironment.init();

    this.inputController = new window.InputController(
      this.sceneManager.camera,
      () => this.orbitSystem.getClickableNodes(),
      (node) => this.activateNode(node),
      this.orbitSystem
    );

    this.inputController.init();

    this.sceneManager.addAnimationCallback(() => this.sun.update());
    this.sceneManager.addAnimationCallback(() => this.starEnvironment.update());
    this.sceneManager.addAnimationCallback(() => this.orbitSystem.update());

    this.uiManager.updateUi(this.sectors);
    this.uiManager.setStatus(this.t('status.initial'), 'neutral');

    this.mobilePanelController = new window.MobilePanelController(
      '#ui-panel',
      '#ui-panel-handle'
    );

    this.mobilePanelController.init();

    this.initGalaxyButtonHoverEffect();

    this.sceneManager.start();
  }

  async activateNode(node) {
    const activationState = this.getNodeActivationState(node);

    if (!activationState.allowed) {
      this.setNodeActivationErrorStatus(activationState.reason);
      return;
    }

    if (this.config.questionModeEnabled && this.hasQuestionForNode(node)) {
      const { sector, level } = node.userData;
      const questionConfig = this.nodeQuestions[sector][level];

      const answeredCorrectly = await this.questionDialog.ask(questionConfig);

      if (!answeredCorrectly) {
        return;
      }
    }

    this.completeNodeActivation(node);
  }

  hasQuestionForNode(node) {
    const { sector, level } = node.userData;

    return Boolean(this.nodeQuestions?.[sector]?.[level]);
  }

  completeNodeActivation(node) {
    const { sector } = node.userData;

    this.orbitSystem.activateNodeVisual(node);
    this.sectors[sector]++;

    this.sun.setProgress(this.getTotalProgress());

    this.uiManager.updateUi(this.sectors);

    if (this.mobilePanelController) {
      this.mobilePanelController.close();
    }

    if (this.checkWin()) {
      this.uiManager.setStatus(this.t('status.synergyReached'), 'success');
      this.sun.activateWinState();
      return;
    }

    this.uiManager.setStatus(
      this.t('status.sectorAdvanced', {
        sector: this.uiManager.getSectorLabel(sector)
      }),
      'info'
    );
  }

  getNodeActivationState(node) {
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

    const expectedLevel = this.sectors[sector] + 1;

    if (level !== expectedLevel) {
      return {
        allowed: false,
        reason: 'wrongLevel'
      };
    }

    if (!this.canAdvance(sector)) {
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

  canAdvance(sector) {
    if (!this.isValidSector(sector)) {
      return false;
    }

    if (this.sectors[sector] >= this.config.maxLevel) {
      return false;
    }

    const simulated = {
      ...this.sectors,
      [sector]: this.sectors[sector] + 1
    };

    const values = Object.values(simulated);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return max - min <= this.config.maxDistance;
  }

  isValidSector(sector) {
    return Object.prototype.hasOwnProperty.call(this.sectors, sector);
  }

  setNodeActivationErrorStatus(reason) {
    const messageKeyByReason = {
      alreadyActive: 'status.nodeAlreadyActive',
      wrongLevel: 'status.nodeWrongLevel',
      balanceViolation: 'status.nodeBalanceViolation',
      invalidNode: 'status.nodeNotAllowed'
    };

    const messageKey = messageKeyByReason[reason] || 'status.nodeNotAllowed';

    this.uiManager.setStatus(this.t(messageKey), 'warning');
  }

  checkWin() {
    return Object.values(this.sectors).every(
      value => value >= this.config.winLevel
    );
  }

  reset() {
    this.resetSectors();
    this.orbitSystem.resetNodes();
    this.sun.reset();
    this.sun.setProgress(0);

    this.uiManager.updateUi(this.sectors);
    this.uiManager.setStatus(this.t('status.initial'), 'neutral');
  }

  resetSectors() {
    this.sectors.nature = 0;
    this.sectors.human = 0;
    this.sectors.tech = 0;
  }

  setLanguage(language) {
    const languageChanged = this.uiManager.setLanguage(language);

    if (!languageChanged) {
      return;
    }

    this.uiManager.updateUi(this.sectors);

    if (this.checkWin()) {
      this.uiManager.setStatus(this.t('status.synergyReached'), 'success');
    } else {
      this.uiManager.setStatus(this.t('status.initial'), 'neutral');
    }

    this.sun.refreshLanguage();
  }

  t(key, replacements = {}) {
    return this.uiManager.t(key, replacements);
  }

  inverseMousePosition(element, event) {
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width;
    const y = event.clientY - rect.top - rect.height;

    return {
      x: -x,
      y: -y
    };
  }

  initGalaxyButtonHoverEffect() {
    const buttons = document.querySelectorAll('.galaxy-button');

    buttons.forEach((button) => {
      button.addEventListener('mousemove', (event) => {
        const position = this.inverseMousePosition(button, event);

        document.body.style.setProperty('--bg-x', position.x);
        document.body.style.setProperty('--bg-y', position.y);
      });

      button.addEventListener('mouseout', () => {
        document.body.style.setProperty('--bg-x', 0);
        document.body.style.setProperty('--bg-y', 0);
      });
    });
  }

  getTotalProgress() {
    const totalActivated = Object.values(this.sectors).reduce(
      (sum, value) => sum + value,
      0
    );

    const maxActivated = Object.keys(this.sectors).length * this.config.maxLevel;

    return totalActivated / maxActivated;
  }
};