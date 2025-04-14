// sketch.js - purpose and description here
// Author: Your Name
// Date:

// Here is how you might set up an OOP p5.js project
// Note that p5.js looks for a file called sketch.js

const VALUE1 = 1;
const VALUE2 = 2;

// sky
const SKY_COL_TOP    = "#CFCBC2";
const SKY_COL_MID    = "#DDD6C6";
const SKY_COL_HORIZ  = "#E5D9BC";
const CLOUD_COL      = "#EAE6DC";
const NUM_CLOUDS     = 25;

// horizon / cliffs
const HORIZON_Y   = 0.45;
const SHORE_COLOR = "#3E3C32";
const CLIFF_SHADE = "#2F3C28";
const CLIFF_LIT   = "#495C3B";
const CLIFF_HEIGHT = 0.08;

// ocean
const OCEAN_BASE = "#46575F";
const WAVE_COLOR = "#DDE5E4";
const WAVE_ROWS  = 6;
const WAVE_AMPL  = 14;

// rocks
const ROCK_COLOR_LIT = "#C2B6A0";
const ROCK_COLOR_SHA = "#4A463E";
const ROCK1_POS      = 0.28;
const ROCK2_POS      = 0.78;
const ROCK_WIDTH_PCT = 0.22;

// birds
const NUM_BIRDS_TOP  = 80;
const NUM_BIRDS_SIDE = 20;
const NUM_BIRDS_FLY  = 6;
const BIRD_COLOR     = "#111";

let myInstance;
let canvasContainer;
let centerHorz, centerVert;

let seed = 0;
let zOff = 0;
let cloudOffsets = [];

class MyClass {
  constructor(param1, param2) {
    this.property1 = param1;
    this.property2 = param2;
  }
  myMethod() {
    // code to run when method is called
  }
}

// resizeScreen
function resizeScreen() {
  centerHorz = canvasContainer.width() / 2;
  centerVert = canvasContainer.height() / 2;
  console.log("Resizing...");
  resizeCanvas(canvasContainer.width(), canvasContainer.height());
}

let reBtn;  

function setup() {
  canvasContainer = $("#canvas-container");        
  const canvas = createCanvas(canvasContainer.width(),
                              canvasContainer.height());
  canvas.parent("canvas-container");

  myInstance = new MyClass("VALUE1", "VALUE2");

  $(window).resize(resizeScreen);
  resizeScreen();

  noiseSeed(millis());
  for (let i = 0; i < NUM_CLOUDS; i++) cloudOffsets.push(random(1000));

  reBtn = createButton("reimagine")
           .mousePressed(() => seed++)
           .parent(canvasContainer[0])   
           .addClass("re-btn");          
}

// draw 
function draw() {
  randomSeed(seed);

  drawSky();
  drawDistantShore();
  drawCliffs();
  drawOcean();
  const rock1 = drawRock(ROCK1_POS);
  const rock2 = drawRock(ROCK2_POS);
  drawBirds(rock1, rock2);
  zOff += 0.00045;
}

function drawSky() {
  for (let y = 0; y < height * HORIZON_Y; y++) {
    const t = y / (height * HORIZON_Y);
    stroke(lerpColor(color(SKY_COL_TOP), color(SKY_COL_MID), t));
    line(0, y, width, y);
  }
  for (let y = height * HORIZON_Y; y < height * (HORIZON_Y + 0.08); y++) {
    const t = (y - height * HORIZON_Y) / (height * 0.08);
    stroke(lerpColor(color(SKY_COL_MID), color(SKY_COL_HORIZ), t));
    line(0, y, width, y);
  }

  noStroke();
  for (let i = 0; i < NUM_CLOUDS; i++) {
    const cx = noise(cloudOffsets[i], zOff) * width * 1.4 - width * 0.2;
    const cy = noise(cloudOffsets[i] + 50, zOff) * height * 0.25;
    const w = random(120, 260);
    const h = w * random(0.25, 0.4);
    fill(CLOUD_COL + "AA");
    ellipse(cx, cy, w, h);
  }
}

function drawDistantShore() {
  fill(SHORE_COLOR);
  noStroke();
  beginShape();
  vertex(0, height * HORIZON_Y);
  for (let x = 0; x <= width; x += 10) {
    const yOff = noise(x * 0.003) * 10;
    vertex(x, height * HORIZON_Y + yOff);
  }
  vertex(width, height * HORIZON_Y);
  endShape(CLOSE);
}

function drawCliffs() {
  const baseY = height * (HORIZON_Y + 0.02);
  const maxH  = height * CLIFF_HEIGHT;
  const step  = 6;

  noStroke();
  fill(CLIFF_SHADE);
  beginShape();
  vertex(0, baseY);
  for (let x = 0; x <= width; x += step) {
    const y = baseY - noise(x * 0.002, seed * 100) * maxH * 0.9;
    vertex(x, y);
  }
  vertex(width, baseY);
  endShape(CLOSE);

  fill(CLIFF_LIT);
  beginShape();
  vertex(0, baseY);
  for (let x = 0; x <= width; x += step) {
    const y = baseY - noise(x * 0.002, seed * 100 + 50) * maxH;
    vertex(x, y);
  }
  vertex(width, baseY);
  endShape(CLOSE);
}

function drawOcean() {
  fill(OCEAN_BASE);
  noStroke();
  rect(0, height * HORIZON_Y, width, height * (1 - HORIZON_Y));

  stroke(WAVE_COLOR + "CC");
  strokeWeight(2);
  noFill();
  for (let r = 0; r < WAVE_ROWS; r++) {
    const baseY = height * (HORIZON_Y + 0.08 + r * 0.12);
    beginShape();
    for (let x = 0; x <= width; x += 8) {
      const y = baseY +
        sin((x * 0.02 + zOff * TWO_PI * 0.6 + r)) * WAVE_AMPL * (0.6 + r * 0.1) +
        noise(x * 0.015, r * 20 + zOff * 4) * 6;
      vertex(x, y);
    }
    endShape();
  }
}

function drawRock(centerPct) {
  const rockW = width * ROCK_WIDTH_PCT;
  const rockH = rockW * 0.6;
  const baseX = width * centerPct;
  const baseY = height * (HORIZON_Y + 0.18);

  const vertices = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = baseX - rockW / 2 + t * rockW;
    const y = baseY -
      noise(i * 0.2, centerPct * 10) * rockH * 0.4 +
      (i === 0 || i === steps ? 0 : -rockH * 0.2);
    vertices.push([x, y]);
  }

  noStroke();
  fill(ROCK_COLOR_SHA);
  beginShape();
  vertex(baseX - rockW / 2, baseY);
  vertices.forEach(([x, y]) => vertex(x, y + rockH * 0.35));
  vertex(baseX + rockW / 2, baseY);
  endShape(CLOSE);

  fill(ROCK_COLOR_LIT);
  beginShape();
  vertices.forEach(([x, y]) => vertex(x, y));
  vertex(baseX + rockW / 2, baseY);
  vertex(baseX - rockW / 2, baseY);
  endShape(CLOSE);

  return { top: vertices, baseY };
}

function drawBirds(rock1, rock2) {
  stroke(BIRD_COLOR);
  strokeWeight(3);

  for (let i = 0; i < NUM_BIRDS_TOP; i++) {
    const idx = floor(random(rock1.top.length));
    const [x, y] = rock1.top[idx];
    point(x + random(-4, 4), y - random(4, 8));
  }
  for (let i = 0; i < NUM_BIRDS_SIDE; i++) {
    const idx = floor(random(rock2.top.length));
    const [x, y] = rock2.top[idx];
    point(x + random(-3, 3), y - random(3, 6));
  }

  noFill();
  for (let i = 0; i < NUM_BIRDS_FLY; i++) {
    const x = random(width * 0.1, width * 0.9);
    const y = random(height * 0.1, height * 0.3);
    const span = random(12, 20);
    arc(x, y, span, span * 0.6, PI + QUARTER_PI, TWO_PI - QUARTER_PI);
  }
}

function mousePressed() {
  // code to run when mouse is pressed
}
