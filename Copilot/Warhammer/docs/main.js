// main.js - controls stage transitions and partial loading
const stages = ['hero-draft', 'battle', 'result'];
let currentStage = 0;

function loadStage(stageName) {
  fetch(`${stageName}.html`)
    .then(r => r.text())
    .then(html => {
      document.getElementById('stage-container').innerHTML = html;
      import('./game.js').then(game => {
        if (stageName === 'hero-draft') {
          game.default.startDraft();
        }
        if (stageName === 'battle') {
          game.default.startPreparationPhaseForAll();
        }
        if (stageName === 'result') {
          game.default.showResult();
        }
      });
    });
}

function nextStage() {
  currentStage = Math.min(currentStage + 1, stages.length - 1);
  loadStage(stages[currentStage]);
}

function startGame() {
  currentStage = 0;
  loadStage(stages[currentStage]);
}

window.nextStage = nextStage;
window.startGame = startGame;

// Start with the draft stage
window.addEventListener('DOMContentLoaded', startGame);
