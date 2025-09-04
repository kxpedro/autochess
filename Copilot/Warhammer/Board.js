class Board {
  constructor(rows = 3, cols = 9) {
    this.rows = rows;
    this.cols = cols;
    this.grid = Array(rows).fill().map(() => Array(cols).fill(null));
  }

  placeUnit(unit, x, y) {
    if (this.grid[y][x] === null) {
      this.grid[y][x] = unit;
      return true;
    }
    return false;
  }

  removeUnit(x, y) {
    this.grid[y][x] = null;
  }

  getUnits() {
    return this.grid.flat().filter(u => u !== null);
  }
}

export default Board;
