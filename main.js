// import Mount from "./vdom/Mount.js";
// import Diff from "./vdom/Diff.js";
// import { createStore } from "./core/store.js";
// import { createRouter } from "./core/router.js";
// import { on } from "./core/events.js";


import render from "./vdom/Render.js";
// import { on } from "events";
import createElement from "./vdom/CreateElement.js";
const players = {
  1: { row: 1, col: 1, id: 'player1', alive: true },
  2: { row: 1, col: 21, id: 'player2', alive: true },
  3: { row: 11, col: 1, id: 'player3', alive: true },
  4: { row: 11, col: 21, id: 'player4', alive: true }
};

const bombs = [];
const explosions = [];
let gameOver = false;
let winner = null;


const keyBindings = {
  1: { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', bomb: 'KeyQ' },
  2: { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', bomb: 'Space' }
};



function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      // Border walls all around
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push('#');
      }
      // Place walls in a checkerboard pattern (for solid walls)
      else if (r % 2 === 0 && c % 2 === 0) {
        row.push('#');
      }
      else {
        // Randomly place boxes (*) or empty spaces ( )
        const rand = Math.random();
        if (rand < 0.2) row.push('*');    // 20% chance box
        else row.push(' ');               // empty space
      }
    }
    maze.push(row);
  }
  
  // Clear starting positions for all 4 players
  // Player 1 - Top Left
  maze[1][1] = ' ';
  maze[1][2] = ' ';
  maze[2][1] = ' ';
  
  // Player 2 - Top Right  
  maze[1][cols-2] = ' ';
  maze[1][cols-3] = ' ';
  maze[2][cols-2] = ' ';
  
  // Player 3 - Bottom Left
  maze[rows-2][1] = ' ';
  maze[rows-2][2] = ' ';
  maze[rows-3][1] = ' ';
  
  // Player 4 - Bottom Right
  maze[rows-2][cols-2] = ' ';
  maze[rows-2][cols-3] = ' ';
  maze[rows-3][cols-2] = ' ';
  
  return maze;
}

const mazeLayout = generateMaze(13, 23);


const mazeCell = (type, rowIndex, colIndex) => {
  let className = 'cell';
  
  // Check if there's an explosion at this position (highest priority)
  const explosionAtPosition = explosions.find(exp => 
    exp.row === rowIndex && exp.col === colIndex
  );
  
  if (explosionAtPosition) {
    className += ' explosion';
  }
  // Check if there's a bomb at this position
  else {
    const bombAtPosition = bombs.find(bomb => 
      bomb.row === rowIndex && bomb.col === colIndex
    );
    
    if (bombAtPosition) {
      className += ' bomb';
    }
    // Check if any ALIVE player is at this position
    else {
      const playerAtPosition = Object.values(players).find(p => 
        p.alive && p.row === rowIndex && p.col === colIndex
      );
      
      if (playerAtPosition) {
        className += ` ${playerAtPosition.id}`;
      } else {
        switch (type) {
          case '#': className += ' wall'; break;
          case '*': className += ' box'; break;
          default:  className += ' empty'; break;
        }
      }
    }
  }
  
  return createElement('div', {
    attrs: { class: className }
  });
};

function placeBomb(playerId) {
  const player = players[playerId];
  if (!player || !player.alive) return;
  
  const { row, col } = player;
  
  // Check if there's already a bomb at this position
  const existingBomb = bombs.find(bomb => bomb.row === row && bomb.col === col);
  if (existingBomb) return; // Can't place bomb where one already exists
  
  // Create new bomb
  const bomb = {
    row: row,
    col: col,
    playerId: playerId,
    timeLeft: 3000, // 3 seconds in milliseconds
    placedAt: Date.now()
  };
  
  bombs.push(bomb);
  
  // Set timer to explode bomb after 3 seconds
  setTimeout(() => {
    const bombIndex = bombs.findIndex(b => 
      b.row === bomb.row && b.col === bomb.col && b.placedAt === bomb.placedAt
    );
    if (bombIndex !== -1) {
      bombs.splice(bombIndex, 1); // Remove bomb
      explodeBomb(bomb); // Explode it
    }
  }, 3000);
  
  renderGame(); // Re-render to show the bomb
}

function explodeBomb(bomb) {
  const explosionCells = [];
  const { row, col } = bomb;
  
  // Add the bomb's center position
  explosionCells.push({ row, col });
  
  // Explosion directions: up, down, left, right
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }   // right
  ];
  
  // For each direction, spread explosion
  directions.forEach(dir => {
    for (let distance = 1; distance <= 2; distance++) { // Explosion range of 2
      const newRow = row + (dir.row * distance);
      const newCol = col + (dir.col * distance);
      
      // Check bounds
      if (newRow < 0 || newRow >= mazeLayout.length || 
          newCol < 0 || newCol >= mazeLayout[0].length) {
        break; // Stop at maze boundary
      }
      
      const cellType = mazeLayout[newRow][newCol];
      
      if (cellType === '#') {
        break; // Stop at walls
      } else if (cellType === '*') {
        // Destroy box and stop explosion
        mazeLayout[newRow][newCol] = ' '; // Remove the box
        explosionCells.push({ row: newRow, col: newCol });
        break; // Stop after destroying box
      } else {
        // Empty space - explosion continues
        explosionCells.push({ row: newRow, col: newCol });
      }
    }
  });
  
  // Add explosion cells to explosions array
  explosionCells.forEach(cell => {
    explosions.push({
      row: cell.row,
      col: cell.col,
      createdAt: Date.now()
    });
  });
  
  // Check for player deaths immediately
  checkPlayerDeaths();
  
  // Remove explosions after 500ms
  setTimeout(() => {
    explosionCells.forEach(cell => {
      const explosionIndex = explosions.findIndex(exp => 
        exp.row === cell.row && exp.col === cell.col
      );
      if (explosionIndex !== -1) {
        explosions.splice(explosionIndex, 1);
      }
    });
    renderGame();
  }, 500);
  
  renderGame();
}

const gameDiv = createElement('div', {
  attrs: { class: 'game' },
  children: mazeLayout.flatMap(row =>
    row.map(cell => mazeCell(cell))
  ),
});

// const app = document.getElementById('app');
// const rendered = render(gameDiv);
// app.appendChild(rendered);


function renderGame() {
  const gameDiv = createElement('div', {
    attrs: { class: 'game' },
    children: mazeLayout.flatMap((row, rowIndex) =>
      row.map((cell, colIndex) => mazeCell(cell, rowIndex, colIndex))
    ),
  });

  const root = document.getElementById('app');
  root.innerHTML = '';
  root.appendChild(render(gameDiv));
}

renderGame();

function checkPlayerDeaths() {
  Object.values(players).forEach(player => {
    if (!player.alive) return; // Skip already dead players
    
    // Check if player is in any explosion
    const playerInExplosion = explosions.find(exp => 
      exp.row === player.row && exp.col === player.col
    );
    
    if (playerInExplosion) {
      player.alive = false;
      console.log(`Player ${player.id} died!`);
      
      // Check win condition after death
      checkWinCondition();
    }
  });
}

function checkWinCondition() {
  const alivePlayers = Object.values(players).filter(p => p.alive);
  
  if (alivePlayers.length <= 1) {
    gameOver = true;
    winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    
    // Display win message
    setTimeout(() => {
      if (winner) {
        alert(`${winner.id.toUpperCase()} WINS! Press R to restart.`);
      } else {
        alert("DRAW! Everyone died! Press R to restart.");
      }
    }, 100);
  }
}

function restartGame() {
  // Reset game state
  gameOver = false;
  winner = null;
  
  // Clear bombs and explosions
  bombs.length = 0;
  explosions.length = 0;
  
  // Reset all players to alive and starting positions
  players[1] = { row: 1, col: 1, id: 'player1', alive: true };
  players[2] = { row: 1, col: 21, id: 'player2', alive: true };
  players[3] = { row: 11, col: 1, id: 'player3', alive: true };
  players[4] = { row: 11, col: 21, id: 'player4', alive: true };
  
  // Regenerate maze
  const newMaze = generateMaze(13, 23);
  // Copy new maze to existing maze
  for (let r = 0; r < newMaze.length; r++) {
    for (let c = 0; c < newMaze[r].length; c++) {
      mazeLayout[r][c] = newMaze[r][c];
    }
  }
  
  renderGame();
  console.log("Game restarted!");
}

document.addEventListener('keydown', (e) => {
  // Handle restart
  if (e.key.toLowerCase() === 'r' && gameOver) {
    restartGame();
    return;
  }
  
  // Don't process game input if game is over
  if (gameOver) return;
  
  // Handle Player 1 (Arrow keys + Spacebar)
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    const player1 = players[1];
    if (!player1.alive) return; // Dead players can't move
    
    let newRow = player1.row;
    let newCol = player1.col;
    
    switch (e.key) {
      case 'ArrowUp': newRow--; break;
      case 'ArrowDown': newRow++; break;
      case 'ArrowLeft': newCol--; break;
      case 'ArrowRight': newCol++; break;
    }
    
    // Check bounds and wall collisions
    if (
      mazeLayout[newRow] &&
      mazeLayout[newRow][newCol] !== '#' && 
      mazeLayout[newRow][newCol] !== '*' &&
      mazeLayout[newRow][newCol] !== undefined
    ) {
      players[1].row = newRow;
      players[1].col = newCol;
      renderGame();
    }
  }
  
  // Handle Player 2 (WASD + Q for bomb)
  else if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) {
    const player2 = players[2];
    if (!player2.alive) return; // Dead players can't move
    
    let newRow = player2.row;
    let newCol = player2.col;
    
    switch (e.code) {
      case 'KeyW': newRow--; break;
      case 'KeyS': newRow++; break;
      case 'KeyA': newCol--; break;
      case 'KeyD': newCol++; break;
    }
    
    // Check bounds and wall collisions
    if (
      mazeLayout[newRow] &&
      mazeLayout[newRow][newCol] !== '#' && 
      mazeLayout[newRow][newCol] !== '*' &&
      mazeLayout[newRow][newCol] !== undefined
    ) {
      players[2].row = newRow;
      players[2].col = newCol;
      renderGame();
    }
  }
  
  // Handle bomb placement
  else if (e.key === ' ') { // Spacebar for Player 1
    e.preventDefault(); // Prevent page scroll
    if (players[1].alive) {
      placeBomb(1);
    }
  }
  else if (e.code === 'KeyQ') { // Q for Player 2
    if (players[2].alive) {
      placeBomb(2);
    }
  }
});
