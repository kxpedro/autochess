import Hero from './Hero.js';

class Player {
  constructor(id) {
    this.id = id;
    this.gold = 10;
    this.life = 100;
    this.units = [];
    this.bank = Array(9).fill(null);
    this.isBot = id !== 0;
  }

  addHeroToBank(hero) {
    const slot = this.bank.findIndex(h => h === null);
    if (slot !== -1) {
      this.bank[slot] = hero;
      return true;
    }
    return false;
  }

  removeHeroFromBank(idx) {
    this.bank[idx] = null;
  }

  deployHeroToBoard(hero, x, y) {
    this.units.push({ ...hero, x, y });
  }
}

export default Player;
