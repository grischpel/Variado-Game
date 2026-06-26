(function () {
  const config = {
    maxLevel: 5,
    winLevel: 5,
    maxDistance: 1,
    defaultLanguage: 'de',

    sun: {
      baseSize: 2.2,
      winScaleFactor: 1.18,
      modelPath: '../Assets/Models/Sun/sol.obj',
      texturePath: './Assets/Models/Sun/2k_sun.jpg',
      defaultEmissiveIntensity: 0.12,
      winEmissiveIntensity: 0.55,
      winLightIntensity: 0.85
    },

    nodes: {
      activeEmissiveIntensity: 1.1,
      inactiveEmissiveIntensity: 0
    },

    stars: {
      starCount: 1800,
      starFieldRadius: 90,
      galaxyArmCount: 3
    },

    questionModeEnabled: true
  };

  const game = new window.Game(config);

  game.init();

  window.resetGame = function () {
    game.reset();
  };

  window.setLanguage = function (language) {
    game.setLanguage(language);
  };
})();