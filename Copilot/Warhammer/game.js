import Player from './Player.js';
import Bot from './Bot.js';
import Hero from './Hero.js';
import Board from './Board.js';
import { HEROES } from './heroes.js';

class Game {
  constructor(heroList, numPlayers = 8) {
    this.heroes = heroList.map(h => new Hero(h));
    this.players = Array(numPlayers).fill().map((_, i) => i === 0 ? new Player(i) : new Bot(i));
    this.board = new Board();
    this.round = 1;
    this.currentEnemyId = 1;
    this.playerId = 0;
    this.debugLog = [];
    this.draftOrder = [];
    this.draftIndex = 0;
    this.draftActive = false;
    this.draftHeroes = [];
    this.draftTimer = null;
    this.draftTimeLeft = 10;
  }

  log(msg) {
    this.debugLog.push(msg);
    // Optionally call a UI update here
  }

  startDraft() {
    this.log('State: Draft phase started');
    this.draftActive = true;
    this.draftHeroes = [...this.heroes];
    this.draftOrder = Array(this.players.length).fill().map((_, i) => ({
      id: i,
      roll: Math.floor(Math.random() * 100) + 1
    }));
    this.draftOrder.sort((a, b) => b.roll - a.roll);
    this.draftIndex = 0;
    this.log('Draft started');
    this.draftTimeLeft = 10;
    this.renderDraftUI();
    this.startDraftTurn();
  }

  startDraftTurn() {
    if (this.draftTimer) clearInterval(this.draftTimer);
    // Make draft time shorter and random for bots
    this.draftTimeLeft = this.draftOrder[this.draftIndex].id === this.playerId ? 6 : Math.floor(Math.random() * 3) + 2;
    this.updateDraftTimerUI();
    this.draftTimer = setInterval(() => {
      this.draftTimeLeft--;
      this.updateDraftTimerUI();
      if (this.draftTimeLeft <= 0) {
        clearInterval(this.draftTimer);
        this.draftTimer = null;
        // Auto-pick for bot or skip for player
        if (this.draftOrder[this.draftIndex].id !== this.playerId) {
          this.autoPickDraftHero();
        }
      }
    }, 1000);
  }

  updateDraftTimerUI() {
    const statusDiv = document.getElementById('draft-status');
    if (statusDiv && this.draftActive) {
      statusDiv.innerHTML = `Player ${this.draftOrder[this.draftIndex].id+1}'s turn. Time left: ${this.draftTimeLeft}s`;
    }
  }

  updatePrepTimerUI() {
    const timerSpan = document.getElementById('prep-timer');
    if (timerSpan) {
      timerSpan.textContent = `Preparation Time: ${this.prepTimeLeft}s`;
    }
  }

  autoPickDraftHero() {
    // Bot picks first available hero
    const idx = this.draftHeroes.findIndex(h => !h.picked);
    if (idx !== -1) this.pickDraftHero(idx);
  }

  pickDraftHero(heroIdx) {
    if (!this.draftActive) return;
    const hero = this.draftHeroes[heroIdx];
    if (hero.picked) return;
    hero.picked = true;
    hero.maxHp = hero.hp;
    const currentPlayer = this.players[this.draftOrder[this.draftIndex].id];
    currentPlayer.addHeroToBank(hero);
    this.log(`Player ${currentPlayer.id + 1} picked ${hero.name}`);
    this.draftIndex++;
    if (this.draftIndex < this.draftOrder.length) {
      this.renderDraftUI();
      this.startDraftTurn();
    } else {
      this.draftActive = false;
      this.log('State: Draft phase ended');
      this.log('Draft complete');
      clearInterval(this.draftTimer);
      this.draftTimer = null;
      // Do NOT auto-deploy banked heroes to grid; player must move them during preparation
      this.players.forEach(player => {
        player.units = [];
        player.life = 100;
      });
      // Initialize shop roulette (placeholder)
      if (typeof this.initShopRoulette === 'function') {
        this.initShopRoulette();
      }
      setTimeout(() => window.nextStage(), 1500); // Redirect to battle after short delay
    }
    this.renderDraftUI();
  }

  renderDraftUI() {
    const rouletteDiv = document.getElementById('draft-roulette');
    const orderDiv = document.getElementById('draft-order');
    const statusDiv = document.getElementById('draft-status');
    if (!rouletteDiv || !orderDiv || !statusDiv) return;
    const logDiv = document.getElementById('debug-log');
    // Restore draft hero rendering in renderDraftUI
    rouletteDiv.innerHTML = '';
    this.draftHeroes.forEach((hero, idx) => {
      const heroDiv = document.createElement('div');
      heroDiv.className = 'hero-card';
      heroDiv.textContent = `${hero.name}`;
      heroDiv.style.background = hero.color;
      heroDiv.style.margin = '4px';
      heroDiv.style.padding = '6px';
      heroDiv.style.borderRadius = '6px';
      heroDiv.style.opacity = hero.picked ? 0.4 : 1;
      // Only allow pick if draftIndex is valid and it's the player's turn
      if (!hero.picked && this.draftIndex < this.draftOrder.length && this.draftOrder[this.draftIndex].id === this.playerId && this.draftActive) {
        heroDiv.style.cursor = 'pointer';
        heroDiv.onclick = () => this.pickDraftHero(idx);
      }
      rouletteDiv.appendChild(heroDiv);
    });
    orderDiv.innerHTML = '<b>Draft Order:</b><br>' + this.draftOrder.map((o, i) => {
      let mark = (i === this.draftIndex) ? ' <span style="color:#4caf50">&larr; Current</span>' : '';
      return `Player ${o.id+1}${mark}`;
    }).join('<br>');
    if (this.draftActive) {
      statusDiv.innerHTML = `Player ${this.draftOrder[this.draftIndex].id+1}'s turn. Time left: ${this.draftTimeLeft}s`;
    } else {
      statusDiv.innerHTML = 'Draft complete.';
    }
    // Show log of all hero picks
    if (logDiv) {
      logDiv.innerHTML = '<b>Hero Picks Log:</b><br>' + this.draftHeroes.filter(h => h.picked).map(h => {
        const playerIdx = this.players.findIndex(p => p.bank.includes(h));
        if (playerIdx === -1) {
          return `Player Unknown picked ${h.name}`;
        }
        return `Player ${playerIdx+1} picked ${h.name}`;
      }).join('<br>');
    }
  }

  startBattle() {
    this.log(`--- Round ${this.round} Preparation Start ---`);
    this.saveState('preparation');
    this.log('State: Preparation phase started');
    this.prepTimeLeft = 10;
    this.renderPreparationGrid();
    this.updatePrepTimerUI();
    // Show current enemy info
    const roundInfo = document.getElementById('round-info');
    if (roundInfo) {
      roundInfo.textContent = `Round: ${this.round}`;
    }
    const enemyInfo = document.getElementById('current-enemy');
    if (enemyInfo) {
      enemyInfo.textContent = `Current Enemy: ${this.currentEnemyId + 1}`;
    }
    if (this.prepTimer) {
      clearInterval(this.prepTimer);
      this.prepTimer = null;
    }
    this.prepTimer = setInterval(() => {
      this.prepTimeLeft--;
      this.updatePrepTimerUI();
      if (this.prepTimeLeft <= 0) {
        clearInterval(this.prepTimer);
        this.prepTimer = null;
        this.log('State: Preparation phase ended');
        setTimeout(() => this.startActualBattle(), 500);
      }
    }, 1000);
  }

  startActualBattle() {
    this.log(`--- Round ${this.round} Battle Start ---`);
    this.saveState('battle');
    this.log(`Battle started against Player ${this.currentEnemyId + 1} (HP: ${this.players[this.currentEnemyId].life})`);
    this.renderEnemyList();
    // If player or enemy units are empty, try to deploy from bank for demo
    if (this.players[this.playerId].units.length === 0 && this.players[this.playerId].bank.filter(h => h).length > 0) {
      this.players[this.playerId].units = this.players[this.playerId].bank.filter(h => h).map((h, idx) => ({ ...h, x: idx % 9, y: Math.floor(idx / 9) }));
    }
    if (this.players[this.currentEnemyId].units.length === 0 && this.players[this.currentEnemyId].bank.filter(h => h).length > 0) {
      this.players[this.currentEnemyId].units = this.players[this.currentEnemyId].bank.filter(h => h).map((h, idx) => ({ ...h, x: idx % 9, y: Math.floor(idx / 9) }));
    }
    const boardsDiv = document.getElementById('boards');
    if (!boardsDiv) return;
    const playerUnits = this.players[this.playerId].units;
    const enemyUnits = this.players[this.currentEnemyId].units;
    if (playerUnits.length === 0 || enemyUnits.length === 0) {
      this.log('No units to battle. Skipping battle.');
      setTimeout(() => this.nextBattleRound(), 1500);
      return;
    }
    let round = 1;
    let playerAlive = playerUnits.filter(u => u.hp > 0).length > 0;
    let enemyAlive = enemyUnits.filter(u => u.hp > 0).length > 0;
    const moveMeleeUnit = (unit, enemyUnits) => {
      // Find closest enemy
      let minDist = Infinity, target = null;
      enemyUnits.forEach(e => {
        if (e.hp > 0) {
          const dist = Math.abs(unit.x - e.x) + Math.abs(unit.y - e.y);
          if (dist < minDist) {
            minDist = dist;
            target = e;
          }
        }
      });
      if (target && minDist > 0) {
        // Move one step in the direction that reduces Manhattan distance fastest
        const dx = target.x - unit.x;
        const dy = target.y - unit.y;
        if (Math.abs(dx) > Math.abs(dy)) {
          unit.x += Math.sign(dx);
        } else if (Math.abs(dy) > 0) {
          unit.y += Math.sign(dy);
        } else if (Math.abs(dx) > 0) {
          unit.x += Math.sign(dx);
        }
      }
    };
    const animateBattleRound = () => {
      if (!playerAlive || !enemyAlive) {
        let resultMsg = '';
        if (!playerAlive && !enemyAlive) resultMsg = 'Draw!';
        else if (!playerAlive) resultMsg = 'You lost!';
        else if (!enemyAlive) resultMsg = 'Enemy lost!';
        else resultMsg = 'Both survived.';
        this.log(resultMsg);
        this.log('Battle ended!');
        this.log('State: Battle phase ended');
    // Restore hero states after battle
    this.restoreHeroStatesAfterBattle();
        setTimeout(() => this.nextBattleRound(), 2000);
        return;
      }
      this.log(`Round ${round} begins.`);
      // Move melee units closer to enemies
      playerUnits.filter(u => u.hp > 0 && u.isMelee).forEach(u => moveMeleeUnit(u, enemyUnits));
      enemyUnits.filter(u => u.hp > 0 && u.isMelee).forEach(u => moveMeleeUnit(u, playerUnits));
      // Each living hero attacks
      const livingPlayerUnits = playerUnits.filter(u => u.hp > 0);
      const livingEnemyUnits = enemyUnits.filter(u => u.hp > 0);
      // Player attacks
      livingPlayerUnits.forEach(pUnit => {
        if (pUnit.isRanged) {
          livingEnemyUnits.forEach(eUnit => {
            eUnit.hp -= (pUnit.damage || 10);
            this.log(`${pUnit.name} (ranged) attacks ${eUnit.name} for ${pUnit.damage || 10} damage! (${eUnit.name} HP: ${eUnit.hp})`);
          });
        } else {
          // Melee: attack only if in same cell
          livingEnemyUnits.forEach(eUnit => {
            if (pUnit.x === eUnit.x && pUnit.y === eUnit.y) {
              eUnit.hp -= (pUnit.damage || 10);
              this.log(`${pUnit.name} (melee) attacks ${eUnit.name} for ${pUnit.damage || 10} damage! (${eUnit.name} HP: ${eUnit.hp})`);
            }
          });
        }
      });
      // Enemy attacks
      livingEnemyUnits.forEach(eUnit => {
        if (eUnit.isRanged) {
          livingPlayerUnits.forEach(pUnit => {
            pUnit.hp -= (eUnit.damage || 10);
            this.log(`${eUnit.name} (ranged) attacks ${pUnit.name} for ${eUnit.damage || 10} damage! (${pUnit.name} HP: ${pUnit.hp})`);
          });
        } else {
          livingPlayerUnits.forEach(pUnit => {
            if (eUnit.x === pUnit.x && eUnit.y === pUnit.y) {
              pUnit.hp -= (eUnit.damage || 10);
              this.log(`${eUnit.name} (melee) attacks ${pUnit.name} for ${eUnit.damage || 10} damage! (${pUnit.name} HP: ${pUnit.hp})`);
            }
          });
        }
      });
      playerUnits.forEach(u => { if (u.hp <= 0) u.hp = 0; });
      enemyUnits.forEach(u => { if (u.hp <= 0) u.hp = 0; });
      boardsDiv.innerHTML = '';
      boardsDiv.appendChild(this.renderBoardGrid(this.players[this.currentEnemyId].units, 'Enemy Board'));
      boardsDiv.appendChild(this.renderBoardGrid(this.players[this.playerId].units, 'Your Board'));
      playerAlive = playerUnits.filter(u => u.hp > 0).length > 0;
      enemyAlive = enemyUnits.filter(u => u.hp > 0).length > 0;
      round++;
      setTimeout(animateBattleRound, 800);
    };
    animateBattleRound();
  }

  showGameOver(winner) {
    const container = document.getElementById('stage-container');
    if (container) {
      container.innerHTML = `<div class='game-over'><h2>Game Over</h2><p>Winner: ${winner.name}</p></div>`;
    }
  }

  renderBoardGrid(units, title, isPlayerBoard = false) {
    const grid = document.createElement('div');
    grid.className = 'hex-grid';
    grid.style.display = 'flex';
    grid.style.flexDirection = 'column';
    grid.style.margin = '16px';
    const caption = document.createElement('div');
    caption.textContent = title;
    caption.style.fontWeight = 'bold';
    caption.style.fontSize = '22px';
    caption.style.color = '#ffd700';
    caption.style.padding = '8px';
    caption.style.marginRight  = '60px';
    grid.appendChild(caption);
    // First row: 8 columns
    const firstRow = document.createElement('div');
    firstRow.style.display = 'flex';
    for (let x = 0; x < 8; x++) {
      const hex = this.createHexCell(units, x, 0, isPlayerBoard);
      firstRow.appendChild(hex);
    }
    grid.appendChild(firstRow);
    // Second row: 9 columns
    const secondRow = document.createElement('div');
    secondRow.style.display = 'flex';
    secondRow.style.marginLeft = '-40px';
    for (let x = 0; x < 9; x++) {
      const hex = this.createHexCell(units, x, 1, isPlayerBoard);
      secondRow.appendChild(hex);
    }
    grid.appendChild(secondRow);
    // Third row: 8 columns
    const thirdRow = document.createElement('div');
    thirdRow.style.display = 'flex';
    for (let x = 0; x < 8; x++) {
      const hex = this.createHexCell(units, x, 2, isPlayerBoard);
      thirdRow.appendChild(hex);
    }
    grid.appendChild(thirdRow);
    return grid;
  }

  createHexCell(units, x, y, isPlayerBoard) {
    const hex = document.createElement('div');
    hex.className = 'hex-cell';
    hex.style.width = '100px';
    hex.style.height = '100px';
    hex.style.clipPath = 'polygon(25% 6%, 75% 6%, 100% 50%, 75% 94%, 25% 94%, 0% 50%)';
    hex.style.border = '4px solid #ffd700';
    hex.style.boxSizing = 'border-box';
    hex.style.display = 'flex';
    hex.style.alignItems = 'center';
    hex.style.justifyContent = 'center';
    hex.style.position = 'relative';
    hex.style.margin = '2px';
    hex.dataset.x = x;
    hex.dataset.y = y;
    const unit = units.find(u => u.x === x && u.y === y);
    if (unit) {
      // HP fill effect
      const hpPercent = Math.max(0, Math.min(1, unit.hp / (unit.maxHp || unit.hp || 1)));
      if (!unit.maxHp) unit.maxHp = unit.hp;
      hex.style.background = `linear-gradient(to right, ${unit.color} ${hpPercent*100}%, #222 ${hpPercent*100}%)`;
      hex.innerHTML = `<span style="color:#fff;text-shadow:0 0 4px ${unit.color},0 0 2px #fff;font-weight:bold;font-size:1.1em;">${unit.name}<br>HP:${unit.hp}</span>`;
      hex.draggable = isPlayerBoard;
      hex.addEventListener('dragstart', e => {
        e.dataTransfer.setData('unitIdx', units.indexOf(unit));
        e.dataTransfer.setData('from', 'grid');
      });
    } else {
      hex.style.background = '#444';
    }
    if (isPlayerBoard) {
      hex.addEventListener('dragover', e => e.preventDefault());
      hex.addEventListener('drop', e => {
        e.preventDefault();
        const from = e.dataTransfer.getData('from');
        if (from === 'bank') {
          const bankIdx = e.dataTransfer.getData('bankIdx');
          this.deployHeroFromBankToGrid(parseInt(bankIdx), x, y);
        } else if (from === 'grid') {
          const unitIdx = e.dataTransfer.getData('unitIdx');
          this.moveHeroOnGrid(parseInt(unitIdx), x, y);
        } else if (from === 'shop' && this.prepTimer) {
          const shopIdx = e.dataTransfer.getData('shopIdx');
          const hero = this.heroes[shopIdx];
          const cost = this.getHeroCost(hero);
          const player = this.players[this.playerId];
          if (this.buyHeroFromShop(this.playerId, parseInt(shopIdx), cost)) {
            if (player.addHeroToBank(hero)) {
              const bankIdx = player.bank.findIndex(h => h && h.name === hero.name);
              this.log(`Player ${player.id + 1} placed ${hero.name} in bank slot ${bankIdx}`);
              this.deployHeroFromBankToGrid(bankIdx, x, y);
              this.log(`Player ${player.id + 1} deployed ${hero.name} to grid (${x},${y})`);
              this.renderBank(player);
              this.renderShopRoulette();
            } else {
              this.log(`Player ${player.id + 1} could not place ${hero.name} in bank (bank full)`);
            }
          }
        }
      });
    }
    return hex;
  }

  renderBank(player) {
    const bankDiv = document.getElementById('bank');
    if (!bankDiv) return;
    bankDiv.innerHTML = '';
        player.bank.forEach((hero, idx) => {
          const slot = document.createElement('div');
          slot.className = 'bank-slot';
          slot.style.width = '60px';
          slot.style.height = '60px';
          slot.style.margin = '2px';
          slot.addEventListener('dragover', e => e.preventDefault());
          slot.addEventListener('drop', e => {
            e.preventDefault();
            const from = e.dataTransfer.getData('from');
            if (from === 'grid') {
              const unitIdx = e.dataTransfer.getData('unitIdx');
              this.moveHeroFromGridToBank(parseInt(unitIdx), idx);
            }
            // In renderBank, handle drop from shop (only during preparation phase)
            slot.addEventListener('drop', e => {
              e.preventDefault();
              const from = e.dataTransfer.getData('from');
              if (from === 'grid') {
                const unitIdx = e.dataTransfer.getData('unitIdx');
                this.moveHeroFromGridToBank(parseInt(unitIdx), idx);
              }
              if (from === 'shop' && this.prepTimer) {
                const shopIdx = e.dataTransfer.getData('shopIdx');
                const hero = this.heroes[shopIdx];
                const cost = this.getHeroCost(hero);
                const player = this.players[this.playerId];
                if (this.buyHeroFromShop(this.playerId, parseInt(shopIdx), cost)) {
                  if (player.addHeroToBank(hero)) {
                    const bankIdx = player.bank.findIndex(h => h && h.name === hero.name);
                    this.log(`Player ${player.id + 1} placed ${hero.name} in bank slot ${bankIdx}`);
                    this.renderBank(player);
                    this.renderShopRoulette();
                  } else {
                    this.log(`Player ${player.id + 1} could not place ${hero.name} in bank (bank full)`);
                  }
                }
              }
            });
          });
          if (hero) {
            const heroDiv = document.createElement('div');
            heroDiv.className = 'hero-card';
            heroDiv.textContent = hero.name;
            heroDiv.style.background = hero.color;
            heroDiv.draggable = true;
            heroDiv.addEventListener('dragstart', e => {
              e.dataTransfer.setData('bankIdx', idx);
              e.dataTransfer.setData('from', 'bank');
            });
            slot.appendChild(heroDiv);
          }
          bankDiv.appendChild(slot);
        });
  }

  moveHeroFromGridToBank(unitIdx, bankIdx) {
    const player = this.players[this.playerId];
    const unit = player.units[unitIdx];
    if (!unit) return;
    if (player.bank[bankIdx]) return; // Only move if bank slot is empty
    player.bank[bankIdx] = unit;
    player.units.splice(unitIdx, 1);
    this.log(`Player ${player.id + 1} moved ${unit.name} from grid to bank (slot ${bankIdx})`);
    this.renderBank(player);
    this.renderPreparationGrid();
  }

  moveHeroOnGrid(unitIdx, x, y) {
    const player = this.players[this.playerId];
    const unit = player.units[unitIdx];
    if (!unit) return;
    unit.x = x;
    unit.y = y;
    this.renderPreparationGrid();
  }

  deployHeroFromBankToGrid(bankIdx, x, y) {
    const player = this.players[this.playerId];
    const hero = player.bank[bankIdx];
    if (!hero) return;
    if (!hero.maxHp) hero.maxHp = hero.hp;
    player.deployHeroToBoard(hero, x, y);
    player.removeHeroFromBank(bankIdx);
    this.log(`Player ${player.id + 1} deployed ${hero.name} from bank to grid (${x},${y})`);
    this.renderBank(player);
    this.renderPreparationGrid();
  }

  renderPreparationGrid() {
    const boardsDiv = document.getElementById('boards');
    if (!boardsDiv) return;
    boardsDiv.innerHTML = '';
    // Always render enemy grid with their units
    boardsDiv.appendChild(this.renderBoardGrid(this.players[this.currentEnemyId].units, 'Enemy Board'));
    boardsDiv.appendChild(this.renderBoardGrid(this.players[this.playerId].units, 'Your Board', true));
    this.renderBank(this.players[this.playerId]);
  }

  showResult() {
    this.log('State: Result phase started');
    const resultDiv = document.getElementById('result-section');
    if (!resultDiv) return;
    // Display winner and summary
    let winner = this.players.reduce((a, b) => (a.life > b.life ? a : b));
    resultDiv.innerHTML = `<h2>Game Over</h2><p>Winner: Player ${winner.id + 1} (Life: ${winner.life})</p>`;
    // Show hero summary
    const summary = this.players.map(p => `Player ${p.id + 1}: ${p.bank.filter(h => h).map(h => h.name).join(', ')}`).join('<br>');
    resultDiv.innerHTML += `<div><b>Hero Summary:</b><br>${summary}</div>`;
    this.log('State: Result phase ended');
  }

  // Called after battle ends to check for game over or start next round
  nextBattleRound() {
    // Check for game over
    const alivePlayers = Object.values(this.players).filter(p => p.life > 0);
    if (alivePlayers.length === 1) {
      this.log(`Game Over! Winner: ${alivePlayers[0].name || ('Player ' + (alivePlayers[0].id + 1))}`);
      this.showGameOver(alivePlayers[0]);
      return;
    }
    // Log round result and enemy info
    this.log(`--- Round ${this.round} Result ---`);
    this.log(`Enemy Player: ${this.currentEnemyId + 1}, HP: ${this.players[this.currentEnemyId].life}`);
    this.renderEnemyList();
    // For now, just restart battle for demo
    this.round++;
    this.currentEnemyId = (this.currentEnemyId + 1) % this.players.length;
    if (this.currentEnemyId === this.playerId) this.currentEnemyId = (this.currentEnemyId + 1) % this.players.length;
    setTimeout(() => this.startBattle(), 1000);
  }

  showDebugInfo() {
    const logDiv = document.getElementById('debug-log');
    if (!logDiv) return;
    let info = '<b>Players State:</b><br>';
    this.players.forEach((p, idx) => {
      info += `<div style='margin-bottom:8px;'><b>Player ${idx + 1}</b> (HP: ${p.life})<br>`;
      info += `Bank: ${p.bank.filter(h => h).map(h => h.name).join(', ') || 'Empty'}<br>`;
      info += `Units: ${p.units.map(u => `${u.name}(HP:${u.hp},DMG:${u.damage},x:${u.x},y:${u.y})`).join(', ') || 'None'}<br></div>`;
    });
    logDiv.innerHTML = info;
  }

  // Call this after every state change
  saveState(phase) {
    // Save and log current state for debugging
    const playerUnits = this.players[this.playerId].units.map(u => `${u.name}(HP:${u.hp},x:${u.x},y:${u.y})`).join(', ');
    const enemyUnits = this.players[this.currentEnemyId].units.map(u => `${u.name}(HP:${u.hp},x:${u.x},y:${u.y})`).join(', ');
    const playerBank = this.players[this.playerId].bank.filter(h => h).map(h => h.name).join(', ');
    this.log(`[${phase}] Player Units: ${playerUnits}`);
    this.log(`[${phase}] Enemy Units: ${enemyUnits}`);
    this.log(`[${phase}] Player Bank: ${playerBank}`);
    this.showDebugInfo();
  }

  renderEnemyList() {
    const section = document.getElementById('enemy-list');
    if (!section) return;
    section.innerHTML = '';
    this.players.forEach((p, idx) => {
      const div = document.createElement('div');
      div.className = 'enemy-item';
      div.textContent = `Player ${idx + 1} - HP: ${p.life}`;
      if (idx === this.playerId) {
        div.style.background = '#2196f3';
        div.style.color = '#fff';
        div.style.fontWeight = 'bold';
        div.textContent += ' (You)';
      }
      if (idx === this.currentEnemyId) {
        div.style.background = '#ff4444';
        div.style.color = '#fff';
        div.style.fontWeight = 'bold';
        div.textContent += ' (Current Enemy)';
      }
      section.appendChild(div);
    });
  }

  // Show player HP on screen
  showPlayerHP() {
    const hpDiv = document.getElementById('player-hp');
    if (!hpDiv) return;
    hpDiv.textContent = `Your HP: ${this.players[this.playerId].life}`;
  }

  // Preparation phase for all players after each battle
  startPreparationPhaseForAll() {
    this.log('--- Preparation phase for all players ---');
    this.players.forEach((player, idx) => {
      // Preparation logic for each player
      player.prepTimeLeft = 10;
      if (idx === this.playerId) {
        this.renderPreparationGrid();
        this.updatePrepTimerUI();
        this.showPlayerHP();
        this.shopHeroIndices = [];
        this.rerollShopRoulette();
        if (this.prepTimer) {
          clearInterval(this.prepTimer);
          this.prepTimer = null;
        }
        this.prepTimer = setInterval(() => {
          this.prepTimeLeft--;
          this.updatePrepTimerUI();
          if (this.prepTimeLeft <= 0) {
            clearInterval(this.prepTimer);
            this.prepTimer = null;
            this.log('State: Preparation phase ended');
            setTimeout(() => this.startActualBattle(), 500);
          }
        }, 1000);
      } else {
        // Bots buy random heroes if they have gold
        for (let i = 0; i < 3; i++) {
          const shopIdx = Math.floor(Math.random() * this.heroes.length);
          const hero = this.heroes[shopIdx];
          const cost = this.getHeroCost(hero);
          if (player.gold >= cost && !player.bank.some(h => h && h.name === hero.name) && !player.units.some(u => u.name === hero.name)) {
            player.gold -= cost;
            player.addHeroToBank(hero);
            this.log(`Bot Player ${player.id + 1} bought ${hero.name} for ${cost} gold. Remaining gold: ${player.gold}`);
          }
        }
      }
    });
  }

  // Hero rarity and cost scaling
  getHeroCost(hero) {
    // Example: rarity based on name (customize as needed)
    const rarityMap = {
      'Knight': 1,
      'Archer': 1,
      'Mage': 1,
      'Paladin': 1,
      'Assassin': 1,
      'Priest': 1,
      'Berserker': 1,
      'Druid': 1,
      'Necromancer': 1
    };
    const rarity = rarityMap[hero.name] || 1;
    return rarity * 2; // Cost: 2, 4, or 6 gold
  }

  // Store current shop heroes for reroll
  shopHeroIndices = [];

  // Reroll shop heroes
  rerollShopRoulette() {
    // Pick 3 random heroes
    const heroIndices = Array.from({length: this.heroes.length}, (_, i) => i);
    this.shopHeroIndices = [];
    while (this.shopHeroIndices.length < 3 && heroIndices.length > 0) {
      const idx = Math.floor(Math.random() * heroIndices.length);
      this.shopHeroIndices.push(heroIndices[idx]);
      heroIndices.splice(idx, 1);
    }
    this.renderShopRoulette();
  }

  // Shop roulette: show current shopHeroIndices, allow reroll
  renderShopRoulette() {
    const shopDiv = document.getElementById('shop');
    if (!shopDiv) return;
    shopDiv.innerHTML = '<h2>Hero Roulette</h2>';
    const rouletteDiv = document.createElement('div');
    rouletteDiv.id = 'roulette';
    // If no shopHeroIndices, reroll
    if (!this.shopHeroIndices || this.shopHeroIndices.length === 0) {
      this.rerollShopRoulette();
      return;
    }
    this.shopHeroIndices.forEach(idx => {
      const hero = this.heroes[idx];
      const cost = this.getHeroCost(hero);
      const heroDiv = document.createElement('div');
      heroDiv.className = 'hero-card';
      heroDiv.textContent = `${hero.name} (HP: ${hero.hp}) - ${cost} gold`;
      heroDiv.style.background = hero.color;
      heroDiv.style.margin = '4px';
      heroDiv.style.padding = '6px';
      heroDiv.style.borderRadius = '6px';
      heroDiv.style.opacity = 1;
      heroDiv.style.cursor = 'grab';
      heroDiv.draggable = true;
      heroDiv.addEventListener('dragstart', e => {
        e.dataTransfer.setData('shopIdx', idx);
        e.dataTransfer.setData('from', 'shop');
      });
      // Optional: click to buy as fallback
      heroDiv.onclick = () => {
        this.buyHeroFromShop(this.playerId, idx, cost);
      };
      rouletteDiv.appendChild(heroDiv);
    });
    shopDiv.appendChild(rouletteDiv);
    // Reroll button
    const rerollBtn = document.createElement('button');
    rerollBtn.textContent = 'Reroll (2 gold)';
    rerollBtn.onclick = () => {
      const player = this.players[this.playerId];
      if (player.gold >= 2) {
        player.gold -= 2;
        this.rerollShopRoulette();
        this.log(`Player ${this.playerId + 1} spent 2 gold to reroll shop. Remaining gold: ${player.gold}`);
      } else {
        this.log('Not enough gold to reroll shop!');
      }
    };
    shopDiv.appendChild(rerollBtn);
    shopDiv.innerHTML += `<p>Click a hero to buy. Your gold: ${this.players[this.playerId].gold}</p>`;
  }

  // Shop roulette: allow buying a hero during preparation if player has enough gold
  buyHeroFromShop(playerId, heroIdx, cost = 5) {
    // Only allow buying if in preparation phase
    if (!this.prepTimer) {
      this.log('You can only buy heroes during the preparation phase!');
      return false;
    }
    const player = this.players[playerId];
    const hero = this.heroes[heroIdx];
    // Prevent buying the same hero twice
    const alreadyOwned = player.bank.some(h => h && h.name === hero.name) || player.units.some(u => u.name === hero.name);
    if (!player || !hero || player.gold < cost || alreadyOwned) {
      this.log(`Player ${playerId + 1} cannot buy ${hero ? hero.name : 'unknown hero'} (Gold: ${player ? player.gold : 0})`);
      return false;
    }
    player.gold -= cost;
    player.addHeroToBank(hero);
    this.log(`Player ${playerId + 1} bought ${hero.name} for ${cost} gold. Remaining gold: ${player.gold}`);
    this.renderBank(player);
    this.renderShopRoulette();
    return true;
  }

  restoreHeroStatesAfterBattle() {
    this.players.forEach(player => {
      if (player.savedUnitsState) {
        // Map by hero name for robust matching
        player.units.forEach(u => {
          const saved = player.savedUnitsState.find(s => s.name === u.name);
          if (saved) {
            u.hp = saved.maxHp || saved.hp; // Always reset to max HP
            u.x = saved.x;
            u.y = saved.y;
            u.attackSpeed = saved.attackSpeed;
            u.damage = saved.damage;
            u.color = saved.color;
            u.isMelee = saved.isMelee;
            u.isRanged = saved.isRanged;
            u.maxHp = saved.maxHp || saved.hp;
            u.name = saved.name;
            if (saved.attackRange !== undefined) u.attackRange = saved.attackRange;
          }
        });
      }
    });
    // Re-render board grid after restoration
    this.renderPreparationGrid();
    this.log('Restored hero states after battle.');
  }
}

const game = new Game(HEROES, 8);
export default game;
