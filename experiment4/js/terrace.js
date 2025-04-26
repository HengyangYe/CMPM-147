"use strict";

/* global p5, XXH, $ */
/* exported preload, setup, draw, mouseClicked */

// =============================================
// Engine Core (from Infinite Worlds example)
// =============================================

let tile_width_step_main;
let tile_height_step_main;
let tile_rows, tile_columns;
let camera_offset, camera_velocity;

function worldToScreen([world_x, world_y], [camera_x, camera_y]) {
  const i = (world_x - world_y) * tile_width_step_main;
  const j = (world_x + world_y) * tile_height_step_main;
  return [i + camera_x, j + camera_y];
}

function tileRenderingOrder(offset) {
  return [offset[1] - offset[0], offset[0] + offset[1]];
}

function screenToWorld([sx, sy], [cx, cy]) {
  sx -= cx;
  sy -= cy;
  sx /= tile_width_step_main * 2;
  sy /= tile_height_step_main * 2;
  sy += 0.5;
  return [Math.floor(sy + sx), Math.floor(sy - sx)];
}

function cameraToWorldOffset([cx, cy]) {
  const wx = cx / (tile_width_step_main * 2);
  const wy = cy / (tile_height_step_main * 2);
  return { x: Math.round(wx), y: Math.round(wy) };
}

function drawTile(offset, cam) {
  const [sx, sy] = worldToScreen(offset, cam);
  push();
  translate(0 - sx, sy);
  if (window.p3_drawTile) window.p3_drawTile(offset[0], offset[1]);
  pop();
}

function describeMouseTile(worldPos, cam) {
  const [sx, sy] = worldToScreen(worldPos, cam);
  push();
  translate(0 - sx, sy);
  if (window.p3_drawSelectedTile) window.p3_drawSelectedTile(worldPos[0], worldPos[1], -sx, sy);
  pop();
}

function preload() {
  if (window.p3_preload) window.p3_preload();
}

function setup() {
    const container = $("#canvas-container");
    // 确保 container 可定位
    container.css('position', 'relative');
  
    const canvas = createCanvas(container.width(), container.height());
    canvas.parent("canvas-container");
  
    camera_offset = new p5.Vector(-width / 2, height / 2);
    camera_velocity = new p5.Vector(0, 0);
  
    if (window.p3_setup) window.p3_setup();
  
    // —— INFO 浮层，显示 World key + seed —— 
    const infoDiv = createDiv()
      .addClass('info')
      .parent("canvas-container");
    // World key
    createSpan('World key: ').parent(infoDiv);
    const input = createInput('xyzzy')
      .parent(infoDiv);
    input.input(() => {
      rebuildWorld(input.value());
      // 每次 key 改了之后更新 seed 值
      select('#world-seed').html(worldSeed);
    });
    // World seed
    createSpan(' World seed: ').parent(infoDiv);
    createSpan('')
      .id('world-seed')
      .parent(infoDiv);
  
    // 操作提示
    createP('Arrow keys scroll. Clicking changes tiles, plant a seedling.')
      .parent("canvas-container");
  
    // 初次生成、并把 seed 显示出来
    rebuildWorld(input.value());
    select('#world-seed').html(worldSeed);
  
    $(window).resize(resizeCanvasToContainer);
  }
  

function rebuildWorld(key) {
  if (window.p3_worldKeyChanged) window.p3_worldKeyChanged(key);
  tile_width_step_main  = window.p3_tileWidth  ? window.p3_tileWidth()  : 32;
  tile_height_step_main = window.p3_tileHeight ? window.p3_tileHeight() : 14.5;
  tile_columns = Math.ceil(width  / (tile_width_step_main  * 2));
  tile_rows    = Math.ceil(height / (tile_height_step_main * 2));
}

function resizeCanvasToContainer() {
  const container = $("#canvas-container");
  resizeCanvas(container.width(), container.height());
}

function mouseClicked() {
  const worldPos = screenToWorld([0 - mouseX, mouseY], [camera_offset.x, camera_offset.y]);
  if (window.p3_tileClicked) window.p3_tileClicked(worldPos[0], worldPos[1]);
  return false;
}

function draw() {
  if (keyIsDown(LEFT_ARROW))  camera_velocity.x -= 1;
  if (keyIsDown(RIGHT_ARROW)) camera_velocity.x += 1;
  if (keyIsDown(DOWN_ARROW))  camera_velocity.y -= 1;
  if (keyIsDown(UP_ARROW))    camera_velocity.y += 1;

  camera_velocity.mult(0.95);
  camera_offset.add(camera_velocity);

  background(100);

  if (window.p3_drawBefore) window.p3_drawBefore();

  const overdraw = 0.1;
  const wo = cameraToWorldOffset([camera_offset.x, camera_offset.y]);

  const y0 = Math.floor((0 - overdraw) * tile_rows);
  const y1 = Math.floor((1 + overdraw) * tile_rows);
  const x0 = Math.floor((0 - overdraw) * tile_columns);
  const x1 = Math.floor((1 + overdraw) * tile_columns);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      drawTile(tileRenderingOrder([x + wo.x, y - wo.y]), [camera_offset.x, camera_offset.y]);
    }
    for (let x = x0; x < x1; x++) {
      drawTile(tileRenderingOrder([x + 0.5 + wo.x, y + 0.5 - wo.y]), [camera_offset.x, camera_offset.y]);
    }
  }

  const mouseWorld = screenToWorld([0 - mouseX, mouseY], [camera_offset.x, camera_offset.y]);
  describeMouseTile(mouseWorld, [camera_offset.x, camera_offset.y]);

  if (window.p3_drawAfter) window.p3_drawAfter();
}

// =============================================
// Terrace Generator (Example 1)
// =============================================

function p3_preload() {}
function p3_setup() {}

let worldSeed;
function p3_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
}
function p3_tileWidth()  { return 32; }
function p3_tileHeight() { return 16; }

const tw = p3_tileWidth();
const th = p3_tileHeight();

const clicks = {};
function p3_tileClicked(i, j) {
  const key = [i, j];
  clicks[key] = 1 + (clicks[key] | 0);
}
function p3_drawBefore() {}

function p3_drawTile(i, j) {
  push();
  translate(0, 4);
  // -- 四季动态底色 --
  const seasonPeriod = 12000;
  const seasonT = (millis() % seasonPeriod) / seasonPeriod;
  const seasonVal = seasonT * 4;

  const mud = [color(120,90,32), color(140,110,20), color(185,148,60), color(140,100,55)];
  const green = [color(178,255,144),color(62,190,38), color(190,210,112), color(110,160,100)];
  const yellow= [color(241,236,180),color(255,255,88), color(255,235,53),  color(232,227,150)];

  function lerpList(arr, t) {
    const i0 = Math.floor(t) % 4;
    const i1 = (i0 + 1) % 4;
    const f  = t - Math.floor(t);
    return lerpColor(arr[i0], arr[i1], f);
  }

  const baseMud   = lerpList(mud, seasonVal);
  const baseGreen = lerpList(green, seasonVal);
  const baseYel   = lerpList(yellow, seasonVal);

  const nLevels = 9;
  const terraceH = 3;
  const noiseOff = noise(i * 0.10 + worldSeed, j * 0.10 + worldSeed) * 3.5;
  let rawLevel = Math.floor((j + noiseOff) / terraceH);
  let h = rawLevel % nLevels;
  if (h < 0) h += nLevels;

  const levelPct = h / (nLevels - 1);
  const c = lerpColor(
    lerpColor(baseMud, baseGreen, pow(levelPct, 0.8)),
    baseYel, pow(levelPct, 2.0)
  );

  fill(c);
  // 阴影
  if (h > 0) {
    fill(color(80,70,20,45));
    beginShape();
    vertex(-tw,0);
    vertex(0,th+5);
    vertex(tw,0);
    vertex(0,-th);
    endShape(CLOSE);
  }
  // 主面
  fill(c);
  stroke(68,59,32,140);
  strokeWeight(1);
  beginShape();
  vertex(-tw,0);
  vertex(0,th);
  vertex(tw,0);
  vertex(0,-th);
  endShape(CLOSE);
  // 田埂
  stroke(41,36,18,225);
  strokeWeight(2.3);
  line(-tw+2,0, tw-2,0);

  // 点击动画
  const n = clicks[[i,j]] | 0;
  if (n > 0) {
    const phase = millis() * 0.002 + i*2 + j*3;
    fill(28,180,65,180);
    for (let k=0; k<n; ++k) {
      const a = phase + k * TWO_PI / n;
      ellipse(
        7*cos(a+sin(a*2.3))*0.7,
        6*sin(a*1.1+cos(a*2))*0.6 - 4,
        5+2*sin(a), 9
      );
    }
  }
  pop();
}

function p3_drawSelectedTile(i,j) {
  push();
  noFill();
  stroke(0,225,60,185);
  strokeWeight(3.2);
  beginShape();
  vertex(-tw,0);
  vertex(0,th);
  vertex(tw,0);
  vertex(0,-th);
  endShape(CLOSE);

  noStroke();
  fill(50,140,40,150);
  textAlign(CENTER, CENTER);
  text(`tile ${i},${j}`, 0, -10);
  pop();
}

function p3_drawAfter() {}
