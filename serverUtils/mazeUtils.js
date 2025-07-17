export function generateMaze(rows, cols) {
  const maze = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      if (
        r === 0 ||
        r === rows - 1 ||
        c === 0 ||
        c === cols - 1 ||
        (r % 2 === 0 && c % 2 === 0)
      )
        row.push("#");
      else row.push(Math.random() < 0.3 ? "*" : " ");
    }
    maze.push(row);
  }
  [
    [1, 1],
    [1, 2],
    [2, 1],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [1, 21],
    [1, 20],
    [2, 21],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [11, 1],
    [10, 1],
    [11, 2],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  [
    [11, 21],
    [11, 20],
    [10, 21],
  ].forEach((p) => (maze[p[0]][p[1]] = " "));
  return maze;
}