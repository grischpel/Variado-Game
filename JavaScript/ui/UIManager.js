window.UIManager = class UIManager {
  constructor(config) {
    this.defaultLanguage = config.defaultLanguage;
    this.maxLevel = config.maxLevel;
    this.sectorConfig = config.sectorConfig;

    this.currentLanguage = this.defaultLanguage;
    this.translations = window.I18N?.[this.defaultLanguage] || {};
  }

  t(key, replacements = {}) {
    const value = key.split('.').reduce((current, part) => {
      if (current && Object.prototype.hasOwnProperty.call(current, part)) {
        return current[part];
      }

      return null;
    }, this.translations);

    let text = value || key;

    Object.entries(replacements).forEach(([placeholder, replacement]) => {
      text = text.replaceAll(`{${placeholder}}`, replacement);
    });

    return text;
  }

  setLanguage(language) {
    if (!window.I18N || !window.I18N[language]) {
      console.warn(`Sprache nicht gefunden: ${language}`);
      return false;
    }

    this.currentLanguage = language;
    this.translations = window.I18N[language];

    return true;
  }

  updateUi(sectors) {
    const titleElement = document.querySelector('#game-title');
    const descriptionElement = document.querySelector('#game-description');
    const resetElement = document.querySelector('#reset-label');

    if (titleElement) {
      titleElement.textContent = this.t('ui.title');
    }

    if (descriptionElement) {
      descriptionElement.textContent = this.t('ui.description');
    }

    if (resetElement) {
      resetElement.textContent = this.t('ui.reset');
      resetElement.dataset.title = this.t('ui.reset');
    }

    Object.entries(sectors).forEach(([sector, value]) => {
      const percent = Math.round((value / this.maxLevel) * 100);

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
        labelElement.textContent = this.getSectorLabel(sector);
      }
    });

    this.updateDevelopmentStage(sectors);
  }

  setStatus(message, type = 'neutral') {
    const statusElement = document.querySelector('#status');

    if (!statusElement) {
      return;
    }

    statusElement.textContent = `${this.t('status.prefix')} ${message}`;

    statusElement.classList.remove(
      'status-bar--neutral',
      'status-bar--success',
      'status-bar--warning',
      'status-bar--error',
      'status-bar--info'
    );

    statusElement.classList.add(`status-bar--${type}`);
  }

  getSectorLabel(sector) {
    const config = this.sectorConfig[sector];

    if (!config) {
      return sector;
    }

    return this.t(config.labelKey);
  }

  getCurrentDevelopmentLevel(sectors) {
    const lowestProgress = Math.min(...Object.values(sectors));

    return Math.min(lowestProgress + 1, this.maxLevel);
  }

  updateDevelopmentStage(sectors) {
    const labelElement = document.querySelector('#development-stage-label');
    const valueElement = document.querySelector('#development-stage-value');

    if (!labelElement || !valueElement) {
      return;
    }

    const currentLevel = this.getCurrentDevelopmentLevel(sectors);

    labelElement.textContent = this.t('ui.developmentStageLabel');
    valueElement.textContent = this.t(`developmentStages.${currentLevel}`);
  }
};