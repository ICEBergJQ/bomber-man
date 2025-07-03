const WebSocket = require('ws');
const PORT = 8080;
const TICK_INTERVAL = 100; // server tick every 100ms
const ROWS = 13, COLS = 23;

// Cell types
const CELL_EMPTY = ' ';
const CELL_WALL  = '#';
const CELL_BOX   = '*';

let maze, player, bombs = [], explosions = [], gameOver = false;

// Setup maze and player
function initGame() {
  maze = generateMaze(ROWS, COLS);
  player = { row:1, col:1, alive: true, id: 'player1' };
  bombs = [];
  explosions = [];
  gameOver = false;
}

// Maze generation
function generateMaze(rows, cols) {
  // similar to your prototype
  const m = [];
  for (let r=0; r<rows; r++) {
    m[r] = [];
    for (let c=0; c<cols; c++) {
      if (r===0||r===rows-1||c===0||c===cols-1 || (r%2===0 && c%2===0)) m[r][c] = CELL_WALL;
      else if (Math.random()<0.2) m[r][c] = CELL_BOX;
      else m[r][c] = CELL_EMPTY;
    }
  }
  // clear top-left area for player
  for (let dr=0; dr<=1; dr++) for (let dc=0; dc<=1; dc++) m[1+dr][1+dc] = CELL_EMPTY;
  return m;
}

// Explosion logic
function explodeBomb(b) {
  const center = { row: b.row, col: b.col };
  const cells = [center];
  const dirs = [{dr:-1,dc:0},{dr:1,dc:0},{dr:0,dc:-1},{dr:0,dc:1}];
  for (const d of dirs) {
    for (let dist=1; dist<=2; dist++) {
      const rr=b.row+d.dr*dist, cc=b.col+d.dc*dist;
      if (!maze[rr] || maze[rr][cc]===CELL_WALL) break;
      cells.push({row:rr, col:cc});
      if (maze[rr][cc]===CELL_BOX) { maze[rr][cc]=CELL_EMPTY; break; }
    }
  }
  explosions.push(...cells.map(c => ({...c, expireAt:Date.now()+500})));
}

// Game tick
function gameLoop() {
  const now = Date.now();
  for (let i=bombs.length-1; i>=0; i--) {
    if (now >= bombs[i].explodeAt) {
      explodeBomb(bombs[i]);
      bombs.splice(i,1);
    }
  }
  explosions = explosions.filter(e=>e.expireAt>now);
  // Check player death
  if (player.alive && explosions.find(e=>e.row===player.row && e.col===player.col)) {
    player.alive = false;
    gameOver = true;
  }
  broadcastState();
}

// WebSocket server
const wss = new WebSocket.Server({ port: PORT });
initGame();
setInterval(gameLoop, TICK_INTERVAL);

wss.on('connection', ws => {
  console.log('Client connected');
  ws.on('message', msg => {
    try {
      const m = JSON.parse(msg);
      if (gameOver && m.type !== 'restart') return;
      if (m.type === 'move') {
        const d = m.data.direction;
        let nr = player.row, nc = player.col;
        if (d==='up') nr--;
        else if (d==='down') nr++;
        else if (d==='left') nc--;
        else if (d==='right') nc++;
        if (maze[nr] && maze[nr][nc]===CELL_EMPTY) {
          // ensure bomb not blocking
          if (!bombs.find(b=>b.row===nr&&b.col===nc)) {
            player.row=nr; player.col=nc;
          }
        }
      } else if (m.type === 'bomb') {
        bombs.push({ row: player.row, col: player.col, explodeAt: Date.now()+3000 });
      } else if (m.type === 'restart') {
        initGame();
      }
    } catch(e) {
      console.error('Invalid message', e);
    }
  });
  ws.on('close', ()=> console.log('Client disconnected'));
  broadcastState(ws); // send state to new client
});

function broadcastState(targetWs) {
  const payload = {
    type: 'gameState',
    data: { maze, player, bombs, explosions, gameOver }
  };
  const str = JSON.stringify(payload);
  if (targetWs) {
    targetWs.send(str);
  } else {
    wss.clients.forEach(c=> c.readyState===WebSocket.OPEN && c.send(str));
  }
}
console.log(`Server running on ws://localhost:${PORT}`);
