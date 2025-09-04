# Warhammer Auto-Chess Game

## Overview
A browser-based auto-chess game inspired by Warhammer, built with JavaScript ES modules, HTML partials, and CSS. The game features modular stages, OOP architecture, drag-and-drop mechanics, multi-player battle logic, and dynamic UI updates.

## Features
- Modular stage controller (`main.js`) loads partial HTML views for draft, battle, and result phases
- OOP classes: `Hero`, `Player`, `Bot`, `Board`, `Game`
- Singleton game instance exported from `game.js`
- Draft phase: Heroes go to bank after draft, not grid
- Drag-and-drop: Move heroes between bank and grid
- Battle phase: All 8 players battle in pairs each round
- Preparation phase: All players have a preparation phase after each battle
- Persistent hero state: Heroes remain on grid after losing a battle
- Player HP display: Shows current HP on screen
- Player list: Shows all players, highlights current player and current enemy
- Debug log: Shows all player stats, choices, and battle results
- Preparation timer: Fixed and displayed during preparation phase
- Battle animation: Simulates battles between paired players
- Shop Hero Roulette: Shows random heroes each round, players can buy duplicates if they have enough gold
- Gold system: Players spend gold to buy heroes during preparation
- Hero attributes: `hp`, `maxHp`, `damage`, `attackSpeed`, `attackRange`, `isMelee`, `isRanged`, `color`
- Attack logic: Uses `attackRange` and Manhattan distance for targeting
- Life loss: After defeat, player loses 20 minus sum of enemy heroes' remaining HP
- Hero HP resets to 100% after each battle
- Responsive UI: Styled grids, bank, player list, debug log

## File Structure
- `game.js`: Main game logic, OOP classes, stage transitions, drag-and-drop, battle simulation, debug logging, shop logic
- `main.js`: Stage controller, loads partials and invokes game logic
- `Hero.js`: Hero class definition
- `battle.html`, `draft.html`, `result.html`: Partial HTML views for each stage
- `style.css`: UI styling for grids, bank, player list, debug log

## How It Works
1. **Draft Phase**: Players draft heroes, which go to their bank
2. **Preparation Phase**: Players deploy heroes from bank to grid, timer counts down, can buy random heroes from shop roulette
3. **Battle Phase**: All players are paired and battle simultaneously; heroes persist after loss, HP resets after battle
4. **Result Phase**: Battle results are logged, player HP is updated
5. **Shop Roulette**: Shows random heroes each round, allows buying duplicates
6. **Repeat**: After each battle, a new preparation phase begins

## To-Do / Next Steps
- Implement advanced shop logic (refresh, reroll, etc.)
- Connect new features to UI for seamless gameplay
- Add advanced battle mechanics and hero abilities
- Polish UI/UX and add animations
- Add sound effects and music
- Add multiplayer networking (future)

## Development Notes
- Uses ES modules for all logic
- All game state and transitions managed in `game.js`
- UI updates and rendering handled via DOM manipulation
- Debug log provides detailed state and battle info for testing

## Getting Started
1. Open `index.html` in your browser
2. Play through draft, preparation, and battle phases
3. Use drag-and-drop to move heroes between bank and grid
4. Buy heroes from shop roulette during preparation
5. Watch debug log and player HP for game state updates

---

For questions or contributions, contact the project maintainer.
