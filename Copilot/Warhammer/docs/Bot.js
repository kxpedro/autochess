import Player from './Player.js';

class Bot extends Player {
  constructor(id) {
    super(id);
    this.isBot = true;
  }

  pickHero(draftHeroes) {
    // Pick a random available hero
    const available = draftHeroes.map((h, idx) => h.picked ? null : idx).filter(idx => idx !== null);
    if (available.length === 0) return -1;
    const randomIdx = available[Math.floor(Math.random() * available.length)];
    return randomIdx;
  }
}

export default Bot;
