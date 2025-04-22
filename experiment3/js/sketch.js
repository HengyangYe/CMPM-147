
const VALUE1 = 1;
const VALUE2 = 2;

let canvasContainer;
var centerHorz, centerVert;

function generateGrid(numCols, numRows) {
  let grid = [];
  noiseSeed(random(1e9) | 0);

  // base setting
  for (let i = 0; i < numRows; i++) {
    let row = [];
    for (let j = 0; j < numCols; j++) {
      const nearEdge = (i < numRows * 0.15) || (i > numRows * 0.80) ||
                       (j < numCols * 0.15) || (j > numCols * 0.80);
      if (nearEdge) { row.push("w"); continue; }

      const n = noise(i / 45, j / 45);
      if      (n < 0.25) { row.push("w"); }
      else if (n < 0.40) { row.push(":"); }
      else               { row.push("."); }
    }
    grid.push(row);
  }

  // house and grass
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      if (grid[i][j] !== ".") continue;

      const shore =
        (i > 0           && (grid[i-1][j] === "w" || grid[i-1][j] === ":")) ||
        (i < numRows-1   && (grid[i+1][j] === "w" || grid[i+1][j] === ":")) ||
        (j > 0           && (grid[i][j-1] === "w" || grid[i][j-1] === ":")) ||
        (j < numCols-1   && (grid[i][j+1] === "w" || grid[i][j+1] === ":"));

      if (shore && random() < 0.08) { grid[i][j] = "h"; }
    }
  }

  // grass inside
  for (let i = 0; i < numRows; i++) {
    for (let j = 0; j < numCols; j++) {
      if (grid[i][j] !== ".") continue;
      if (random() < 0.04) { grid[i][j] = "t"; }
    }
  }
  return grid;
}


// Autotile 渲染工具
function gridCheck(grid, i, j, target) {
  return (i >= 0 && i < grid.length && j >= 0 && j < grid[i].length) &&
         (grid[i][j] === target);
}

function gridCode(grid, i, j, target) {
  return (
    (gridCheck(grid, i - 1, j, target) << 0) +
    (gridCheck(grid, i, j - 1, target) << 1) +
    (gridCheck(grid, i, j + 1, target) << 2) +
    (gridCheck(grid, i + 1, j, target) << 3)
  );
}

function drawContext(grid, i, j, target, dti, dtj, invert = false) {
  let code = gridCode(grid, i, j, target);
  if (invert) code = (~code) & 0xF;
  const [tiOff, tjOff] = lookup[code];
  placeTile(i, j, dti + tiOff, dtj + tjOff);
}

const lookup = [
  [1,1],[1,0],[0,1],[0,0],
  [2,1],[2,0],[1,1],[1,0],
  [1,2],[1,1],[0,2],[0,1],
  [2,2],[2,1],[1,2],[1,1]
];


// grid
function drawGrid(grid) {
  background(128);
  const t = millis() / 1000;
  const g = 10;

  const GRASS_ROW  = 0;
  const SAND_ROW   = 3;
  const WATER_BASE = { ti: 9, tj: 3 };
  const HOUSE_TILES = [26,27];
  const TREE_TILES  = [20,21,22,23,24,25];

  noStroke();

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[i].length; j++) {
      const code = grid[i][j];

      placeTile(i, j, (4 * pow(noise(t / 10, i, j / 4 + t), 2)) | 0, 14);

      if (gridCheck(grid, i, j, ":")) {
        placeTile(i, j, (4 * pow(random(), g)) | 0, SAND_ROW);
      } else {
        drawContext(grid, i, j, "w", WATER_BASE.ti, WATER_BASE.tj, true);
      }

      if (code === "." || code === "h" || code === "t") {
        placeTile(i, j, (4 * pow(random(), g)) | 0, GRASS_ROW);
      } else {
        drawContext(grid, i, j, ".", 4, 0);
      }

      if (code === "h") {
        placeTile(i, j, random(HOUSE_TILES) | 0, 0);
      }

      if (code === "t") {
        placeTile(i, j, random(TREE_TILES) | 0, 0);
      }
    }
  }
}

function gridToString(grid) {
  return grid.map(r => r.join("")).join("\n");
}
function stringToGrid(str) {
  return str.split("\n").map(line => line.split(""));
}

// p5 
let seed = 0;
let tilesetImage;
let currentGrid = [];
let numRows, numCols;

function preload() {
  tilesetImage = loadImage(
    "https://cdn.glitch.com/25101045-29e2-407a-894c-e0243cd8c7c6%2FtilesetP8.png?v=1611654020438"
  );
}
const TILE_SIZE = 16;         

function updateAsciiBoxSize(){
  const w = TILE_SIZE * numCols;
  const h = TILE_SIZE * numRows;
  select("#asciiBox").style("width",  w + "px");
  select("#asciiBox").style("height", h + "px");
}
function setup() {
  numRows = select("#asciiBox").attribute("rows") | 0;
  numCols = select("#asciiBox").attribute("cols") | 0;

  canvasContainer = $("#canvas-container");
  createCanvas(16 * numCols, 16 * numRows).parent("canvas-container");
  select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;

  select("#reseedButton").mousePressed(reseed);
  select("#asciiBox").input(reparseGrid);

  reseed();
  
}

function draw() {
  randomSeed(seed);
  drawGrid(currentGrid);
}

// logic
function reseed() {
  seed = (seed | 0) + 1109;
  randomSeed(seed);
  noiseSeed(seed);
  select("#seedReport").html("seed " + seed);
  regenerateGrid();
}

function regenerateGrid() {
  select("#asciiBox").value(gridToString(generateGrid(numCols, numRows)));
  reparseGrid();
}

function reparseGrid() {
  currentGrid = stringToGrid(select("#asciiBox").value());
}


function placeTile(i, j, ti, tj) {
  image(tilesetImage, 16 * j, 16 * i, 16, 16, 8 * ti, 8 * tj, 8, 8);
}



