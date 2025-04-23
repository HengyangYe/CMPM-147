// sketch.js — Overworld (instance mode)
new p5(p5 => {
  /* ========== 全局变量 & 常量 ========== */
  const TILE_SIZE = 16;
  let seed = 0;
  let tilesetImage;
  let currentGrid = [];
  let numCols, numRows;

  /* ========== lookup ========== */
  const lookup = [
    [1,1], [1,0], [0,1], [0,0],
    [2,1], [2,0], [1,1], [1,0],
    [1,2], [1,1], [0,2], [0,1],
    [2,2], [2,1], [1,2], [1,1]
  ];

  /* ----------------------- 生成网格 ----------------------- */
  function generateGrid(cols, rows) {
    let grid = [];
    p5.noiseSeed(p5.random(1e9) | 0);

    /* A. 基础地形 */
    for (let i = 0; i < rows; i++) {
      let row = [];
      for (let j = 0; j < cols; j++) {
        const nearEdge = (i < rows * 0.15) || (i > rows * 0.80)
                       || (j < cols * 0.15) || (j > cols * 0.80);
        if (nearEdge) { row.push("w"); continue; }

        const n = p5.noise(i / 45, j / 45);
        if      (n < 0.25) row.push("w");
        else if (n < 0.40) row.push(":");
        else               row.push(".");
      }
      grid.push(row);
    }

    /* B. 靠海草地 → 房子 */
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] !== ".") continue;
        const shore =
          (i > 0           && (grid[i-1][j]==="w"||grid[i-1][j]===":")) ||
          (i < rows-1     && (grid[i+1][j]==="w"||grid[i+1][j]===":")) ||
          (j > 0           && (grid[i][j-1]==="w"||grid[i][j-1]===":")) ||
          (j < cols-1     && (grid[i][j+1]==="w"||grid[i][j+1]===":"));
        if (shore && p5.random() < 0.08) grid[i][j] = "h";
      }
    }

    /* C. 内陆草地 → 树 */
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (grid[i][j] !== ".") continue;
        if (p5.random() < 0.04) grid[i][j] = "t";
      }
    }

    return grid;
  }

  /* ========== Autotile 工具函数 ========== */
  function gridCheck(grid, i, j, target) {
    return i>=0 && i<grid.length && j>=0 && j<grid[i].length
        && grid[i][j] === target;
  }
  function gridCode(grid, i, j, target) {
    return (gridCheck(grid,i-1,j,target)<<0)
         + (gridCheck(grid,i,j-1,target)<<1)
         + (gridCheck(grid,i,j+1,target)<<2)
         + (gridCheck(grid,i+1,j,target)<<3);
  }
  function drawContext(grid, i, j, target, dti, dtj, invert=false) {
    let code = gridCode(grid,i,j,target);
    if (invert) code = (~code) & 0xF;
    const [tiOff, tjOff] = lookup[code];
    placeTile(i, j, dti + tiOff, dtj + tjOff);
  }

  /* ========== 渲染网格 ========== */
  function drawGrid(grid) {
    p5.background(128);
    const t = p5.millis() / 1000;
    const g = 10;
    /* tileset 行列常量 */
    const GRASS_ROW   = 0;
    const SAND_ROW    = 3;
    const WATER_BASE  = { ti: 9, tj: 3 };
    const HOUSE_TILES = [26, 27];
    const TREE_TILES  = [20,21,22,23,24,25];

    p5.noStroke();
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const code = grid[i][j];
        /* 底层阴影 */
        placeTile(i, j,
          (4 * Math.pow(p5.noise(t/10,i,j/4 + t), 2)) | 0,
          14
        );
        /* 沙滩 & 水-沙边缘 */
        if (gridCheck(grid,i,j,":")) {
          placeTile(i, j,
            (4 * Math.pow(p5.random(), g)) | 0,
            SAND_ROW
          );
        } else {
          drawContext(grid,i,j,"w", WATER_BASE.ti, WATER_BASE.tj, true);
        }
        /* 草地 & 草-土边缘 */
        if (code==="."||code==="h"||code==="t") {
          placeTile(i, j,
            (4 * Math.pow(p5.random(), g)) | 0,
            GRASS_ROW
          );
        } else {
          drawContext(grid,i,j,".", 4, 0);
        }
        /* 覆盖层：房子 */
        if (code === "h") {
          placeTile(i, j, p5.random(HOUSE_TILES)|0, 0);
        }
        /* 覆盖层：树 */
        if (code === "t") {
          placeTile(i, j, p5.random(TREE_TILES)|0, 0);
        }
      }
    }
  }

  /* ========== 网格 ↔ 字符串 转换工具 ========== */
  function gridToString(grid) {
    return grid.map(r=>r.join("")).join("\n");
  }
  function stringToGrid(str) {
    return str.split("\n").map(line=>line.split(""));
  }

  /* ========== 贴图辅助 ========== */
  function placeTile(i, j, ti, tj) {
    p5.image(
      tilesetImage,
      16 * j, 16 * i,
      TILE_SIZE, TILE_SIZE,
      8 * ti, 8 * tj, 8, 8
    );
  }

  /* ========== reseed / regenerate / reparse ========== */
  function reseed() {
    seed = (seed|0) + 1109;
    p5.randomSeed(seed);
    p5.noiseSeed(seed);
    p5.select("#seedReport").html("seed " + seed);
    regenerateGrid();
  }
  function regenerateGrid() {
    p5.select("#asciiBox")
      .value(gridToString(generateGrid(numCols, numRows)));
    reparseGrid();
  }
  function reparseGrid() {
    currentGrid = stringToGrid(p5.select("#asciiBox").value());
  }

  /* ========== p5 ：preload / setup / draw ========== */
  p5.preload = function() {
    tilesetImage = p5.loadImage(
      "https://cdn.glitch.com/25101045-29e2-407a-894c-e0243cd8c7c6%2FtilesetP8.png?v=1611654020438"
    );
  };
  p5.setup = function() {
    numCols = p5.select("#asciiBox").attribute("cols") | 0;
    numRows = p5.select("#asciiBox").attribute("rows") | 0;
    p5.createCanvas(TILE_SIZE * numCols, TILE_SIZE * numRows)
      .parent("canvas-container");
    p5.select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;
    p5.select("#reseedButton").mousePressed(reseed);
    p5.select("#asciiBox").input(reparseGrid);
    reseed();
  };
  p5.draw = function() {
    p5.randomSeed(seed);
    drawGrid(currentGrid);
  };
});
