"use strict";
/* global p5, XXH, $, createCanvas, createDiv, createButton, createSpan,
   createInput, createP, keyIsDown, LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW,
   floor, ceil, round, color, noStroke, fill, rect, push, pop, translate,
   beginShape, vertex, endShape, textSize, textAlign, text, noise, random,
   sin, abs, atan2, sqrt, millis, TWO_PI, exp, constrain, map */

// =============================================
// 多世界状态机 & 分发逻辑
// =============================================
let currentWorld = 'starry';  // 'terrace' | 'city' | 'starry'

function preload() {
  window[`p3_${currentWorld}_preload`]?.();
}

function setup() {
  // 1) 画布初始化
  const container = $("#canvas-container");
  container.css('position', 'relative');
  const canvas = createCanvas(container.width(), container.height());
  canvas.parent("canvas-container");

  // 2) 相机初始化
  camera_offset   = createVector(-width/2, height/2);
  camera_velocity = createVector(0,0);

  // 3) 切换按钮 + key/seed 工具栏
  const toolbar = createDiv().addClass('info').parent("canvas-container");
  createButton('Terrace').parent(toolbar)
    .mousePressed(() => switchWorld('terrace'));
  createButton('City').parent(toolbar)
    .mousePressed(() => switchWorld('city'));
  createButton('Starry').parent(toolbar)
    .mousePressed(() => switchWorld('starry'));

  createSpan('  World key: ').parent(toolbar);
  const input = createInput('xyzzy').parent(toolbar);
  input.input(() => {
    rebuildWorld(input.value());
    select('#world-seed').html(worldSeed);
    window[`p3_${currentWorld}_setup`]?.();
  });
  createSpan('  World seed: ').parent(toolbar);
  createSpan('').id('world-seed').parent(toolbar);

  // 4) 操作提示
  createP('Arrow keys scroll. Clicking changes tiles.').parent("canvas-container");

  // 5) 初始化世界
  rebuildWorld(input.value());
  select('#world-seed').html(worldSeed);
  window[`p3_${currentWorld}_setup`]?.();

  // 6) 监听 resize
  $(window).resize(resizeCanvasToContainer);
}

function draw() {
  // 相机滚动
  if (keyIsDown(LEFT_ARROW))  camera_velocity.x -= 1;
  if (keyIsDown(RIGHT_ARROW)) camera_velocity.x += 1;
  if (keyIsDown(DOWN_ARROW))  camera_velocity.y -= 1;
  if (keyIsDown(UP_ARROW))    camera_velocity.y += 1;
  camera_velocity.mult(0.95);
  camera_offset.add(camera_velocity);

  background(100);

  // 分发到当前世界
  window[`p3_${currentWorld}_drawBefore`]?.();
  drawWorldTiles();
  window[`p3_${currentWorld}_drawAfter`]?.();
}

function mouseClicked() {
    // 如果点在输入框，就放行
    if (document.activeElement.tagName === 'INPUT') {
      return;
    }
    // 否则按原来的逻辑处理 tile 点击
    const wp = screenToWorld(
      [-mouseX, mouseY],
      [camera_offset.x, camera_offset.y]
    );
  //return false;
}
function mousePressed() {
  if (currentWorld === 'starry' && window.p3_starry_mousePressed) {
    window.p3_starry_mousePressed();
    //return false;
  }
}
function mouseDragged() {
  if (currentWorld === 'starry' && window.p3_starry_mouseDragged) {
    window.p3_starry_mouseDragged();
    //return false;
  }
}

function switchWorld(name) {
  currentWorld = name;
  const key = select('input').value();
  rebuildWorld(key);
  select('#world-seed').html(worldSeed);
  window[`p3_${currentWorld}_setup`]?.();
}

function drawWorldTiles() {
  const overdraw = 0.1;
  const wo = cameraToWorldOffset([camera_offset.x, camera_offset.y]);
  const y0 = floor((0 - overdraw) * tile_rows);
  const y1 = floor((1 + overdraw) * tile_rows);
  const x0 = floor((0 - overdraw) * tile_columns);
  const x1 = floor((1 + overdraw) * tile_columns);

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      drawTile(tileRenderingOrder([x + wo.x, y - wo.y]), [camera_offset.x, camera_offset.y]);
    }
    for (let x = x0; x < x1; x++) {
      drawTile(tileRenderingOrder([x + 0.5 + wo.x, y + 0.5 - wo.y]), [camera_offset.x, camera_offset.y]);
    }
  }
  const mw = screenToWorld([-mouseX, mouseY], [camera_offset.x, camera_offset.y]);
  describeMouseTile(mw, [camera_offset.x, camera_offset.y]);
}

// =============================================
// 2. 引擎核心（所有世界共用）
// =============================================
let tile_width_step_main, tile_height_step_main, tile_rows, tile_columns;
let camera_offset, camera_velocity;
let worldSeed;

function rebuildWorld(key) {
  window[`p3_${currentWorld}_worldKeyChanged`](key);
  tile_width_step_main  = window[`p3_${currentWorld}_tileWidth`]()  || 32;
  tile_height_step_main = window[`p3_${currentWorld}_tileHeight`]() || 14.5;
  tile_columns = ceil(width  / (tile_width_step_main  * 2));
  tile_rows    = ceil(height / (tile_height_step_main * 2));
}

function resizeCanvasToContainer() {
  const c = $("#canvas-container");
  resizeCanvas(c.width(), c.height());
}

function worldToScreen([wx, wy], [cx, cy]) {
  const i = (wx - wy) * tile_width_step_main;
  const j = (wx + wy) * tile_height_step_main;
  return [i + cx, j + cy];
}
function tileRenderingOrder(off) {
  return [off[1] - off[0], off[0] + off[1]];
}
function screenToWorld([sx, sy], [cx, cy]) {
  sx -= cx; sy -= cy;
  sx /= tile_width_step_main * 2;
  sy /= tile_height_step_main * 2;
  sy += 0.5;
  return [floor(sy + sx), floor(sy - sx)];
}
function cameraToWorldOffset([cx, cy]) {
  return { x: round(cx/(tile_width_step_main*2)), y: round(cy/(tile_height_step_main*2)) };
}
function drawTile(offset, cam) {
  const [sx, sy] = worldToScreen(offset, cam);
  push(); translate(-sx, sy);
  window[`p3_${currentWorld}_drawTile`](offset[0], offset[1]);
  pop();
}
function describeMouseTile(wp, cam) {
  const [sx, sy] = worldToScreen(wp, cam);
  push(); translate(-sx, sy);
  window[`p3_${currentWorld}_drawSelectedTile`](wp[0], wp[1], -sx, sy);
  pop();
}

// =============================================
// === Terrace World ===
// =============================================
function p3_terrace_preload() {}
function p3_terrace_setup() {}
function p3_terrace_worldKeyChanged(key) {
  worldSeed = XXH.h32(key, 0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
}
function p3_terrace_tileWidth()  { return 32; }
function p3_terrace_tileHeight() { return 16; }
const twTerrace = 32, thTerrace = 16;
const clicksTerrace = {};
function p3_terrace_tileClicked(i,j){
  const k=`${i},${j}`; clicksTerrace[k]=(clicksTerrace[k]||0)+1;
}
function p3_terrace_drawBefore() {}
function p3_terrace_drawTile(i,j){
  push();
  translate(0,4);
  // -- 四季动态底色 --
  const seasonPeriod = 12000;
  const seasonT = (millis() % seasonPeriod) / seasonPeriod;
  const seasonVal = seasonT * 4;
  const mudArr   = [color(120,90,32), color(140,110,20), color(185,148,60), color(140,100,55)];
  const greenArr = [color(178,255,144),color(62,190,38),  color(190,210,112), color(110,160,100)];
  const yelArr   = [color(241,236,180),color(255,255,88), color(255,235,53),  color(232,227,150)];
  function lerpList(arr,t){
    const i0=floor(t)%4, i1=(i0+1)%4, f=t-floor(t);
    return lerpColor(arr[i0], arr[i1], f);
  }
  const baseMud  = lerpList(mudArr, seasonVal);
  const baseGn   = lerpList(greenArr, seasonVal);
  const baseY    = lerpList(yelArr, seasonVal);

  // 梯田高度
  const nLv = 9, terrH = 3;
  const noiseOff = noise(i*0.10+worldSeed, j*0.10+worldSeed)*3.5;
  let lvl = floor((j+noiseOff)/terrH) % nLv;
  if (lvl<0) lvl+=nLv;
  const pct = lvl/(nLv-1);
  const c = lerpColor(
    lerpColor(baseMud, baseGn, pow(pct,0.8)),
    baseY, pow(pct,2.0)
  );
  // 阴影
  if (lvl>0){
    fill(color(80,70,20,45));
    beginShape();
    vertex(-twTerrace,0); vertex(0,thTerrace+5);
    vertex(twTerrace,0);   vertex(0,-thTerrace);
    endShape(CLOSE);
  }
  // 主面
  fill(c);
  stroke(68,59,32,140); strokeWeight(1);
  beginShape();
    vertex(-twTerrace,0); vertex(0,thTerrace);
    vertex(twTerrace,0);  vertex(0,-thTerrace);
  endShape(CLOSE);
  // 田埂线
  stroke(41,36,18,225); strokeWeight(2.3);
  line(-twTerrace+2,0, twTerrace-2,0);

  // 点击动画
  const n = clicksTerrace[`${i},${j}`]||0;
  if (n>0){
    const phase = millis()*0.002 + i*2 + j*3;
    fill(28,180,65,180);
    for (let k=0; k<n; k++){
      const a = phase + k*TWO_PI/n;
      ellipse(
        7*cos(a+sin(a*2.3))*0.7,
        6*sin(a*1.1+cos(a*2))*0.6 - 4,
        5+2*sin(a), 9
      );
    }
  }

  pop();
}
function p3_terrace_drawSelectedTile(i,j){
  push();
  noFill(); stroke(0,225,60,185); strokeWeight(3.2);
  beginShape();
    vertex(-twTerrace,0);vertex(0,thTerrace);
    vertex(twTerrace,0); vertex(0,-thTerrace);
  endShape(CLOSE);
  noStroke(); fill(50,140,40,150);
  textAlign(CENTER,CENTER);
  text(`tile ${i},${j}`,0,-10);
  pop();
}
function p3_terrace_drawAfter(){}

// =============================================
// === City World ===
// =============================================
function p3_city_preload() {}
function p3_city_setup() {}
function p3_city_worldKeyChanged(key){
  worldSeed = XXH.h32(key,0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
}
function p3_city_tileWidth()  { return 42; }
function p3_city_tileHeight() { return 26; }
const twCity=42, thCity=26;
const clicksCity={}, flyingObjectsCity=[];
function getBuildingHeight(i,j){
  const baseHash=XXH.h32("b:"+i+","+j,worldSeed).toNumber();
  if((baseHash%9)<4) return 0;
  const hRaw=XXH.h32("h:"+i+","+j,worldSeed).toNumber();
  const maxH=10+int(noise(i*0.18+worldSeed,j*0.19-worldSeed)*5);
  return ((hRaw%maxH)+3+(clicksCity[`${i},${j}`]||0));
}
function p3_city_tileClicked(i,j){
  const k=`${i},${j}`; clicksCity[k]=(clicksCity[k]||0)+1;
}
function p3_city_drawBefore(){
  const w=width,h=height;
  for(let y=0;y<h;y+=16){
    let c=color(24,32,54,map(y,0,h,220,10));
    if(y<h*0.35){
      const r=map(y,0,h*0.35,128,26), b=map(y,0,h*0.25,230,50);
      c=color(r,36,b,90+map(y,0,h*0.5,60,8,true));
    }
    noStroke(); fill(c); rect(0,y,w,18);
  }
  for(let o of flyingObjectsCity){
    push(); noStroke();
    fill(255,160,220,220);
    ellipse(o.x,o.y,o.size*1.5,o.size*0.6);
    fill(255,255,255,200);
    ellipse(o.x+o.size*0.6,o.y,o.size*0.3,o.size*0.3);
    pop();
  }
}
function p3_city_drawTile(i,j){
  push();
  const currH=getBuildingHeight(i,j), aboveH=getBuildingHeight(i,j-1);
  if(currH<6){
    if(aboveH>=3) fill(18,20,32,120);
    else {
      fill(50,60,90,240);
      beginShape();
        vertex(-twCity,0);vertex(0,thCity);
        vertex(twCity,0);vertex(0,-thCity);
      endShape(CLOSE);
      fill(190,195,210,160);
      for(let x=-twCity*0.5;x<twCity*0.5;x+=7){
        rect(x,thCity*0.25,5,2,1.2);
      }
      stroke(180,210,240,150); strokeWeight(1.4);
      line(-twCity*0.55,0, twCity*0.55,0);
      noStroke();
      const phase=(millis()/700+i*2)%1;
      if(phase<0.15){
        fill(245,210,77,180);
        ellipse((phase/0.15-0.5)*twCity*1.1,thCity*0.45,10,5);
        fill(30,200,250,140);
        ellipse((phase/0.15-0.4)*twCity*1.1,thCity*0.6,8,4);
      }
    }
    pop(); return;
  }
  const iSeed=XXH.h32("c:"+i+","+j,worldSeed).toNumber();
  const baseCol=color(
    32+iSeed%14,
    38+int(iSeed/36)%11,
    75+iSeed%70+int(noise(j*0.1+i*0.17+worldSeed*0.2)*37),
    225
  );
  const topCol=color(130+iSeed%70,90+iSeed%40,230,230);
  const hscale=0.54;
  for(let h=0;h<currH;h++){
    const elev=-h*thCity*hscale;
    const alpha=map(h,0,currH-1,13,200);
    stroke(90+65*(h/currH),180,255,158-alpha*0.42);
    strokeWeight(2.3-1.3*(h/currH));
    noFill();
    line(-twCity*0.89,elev,-twCity*0.67,thCity*0.45+elev);
    line(twCity*0.89,elev,twCity*0.67,thCity*0.45+elev);
    noStroke();
    fill(lerpColor(baseCol, color(10,10,26,212),0.18+0.65*(h/currH)),169-alpha);
    beginShape();
      vertex(-twCity,elev);
      vertex(0,thCity+elev);
      vertex(twCity,elev);
      vertex(0,-thCity+elev);
    endShape(CLOSE);
    const winSeed=XXH.h32("w:"+i+","+j+","+h,worldSeed).toNumber();
    const winRows=2+(winSeed%3);
    const winCols=2+int((winSeed/51)%5);
    for(let r=1;r<winRows;r++){
      for(let c=0;c<winCols;c++){
        const on=sin(millis()/340+i*1.8+j*0.7+h*0.32+c+worldSeed*0.07)
                 >0.32+(winSeed%3)*0.18;
        fill(on? color(255,255,120,180-alpha*0.78)
               : color(58,68,85,60-alpha*0.4),
             188-alpha*0.4);
        const wx=map(c,0,winCols-1,-twCity*0.7,twCity*0.7);
        const wy=elev+map(r,0,winRows-1,thCity*0.19,-thCity*0.53);
        rect(wx,wy,5,8,1.6);
      }
    }
  }
  const topH=-(currH-1)*thCity*hscale;
  fill(topCol); noStroke();
  beginShape();
    vertex(-twCity,topH);
    vertex(twCity, topH);
    vertex(twCity-10,topH-10);
    vertex(-twCity+10,topH-10);
  endShape(CLOSE);
  stroke(193,233,255,142); strokeWeight(2.1);
  noFill();
  beginShape();
    vertex(-twCity,topH);
    vertex(twCity, topH);
    vertex(twCity-10,topH-10);
    vertex(-twCity+10,topH-10);
  endShape(CLOSE);
  if(currH>15 && i%8===0 && (millis()/1300+j)%1<0.15){
    noStroke();
    fill(255,38,149,60+80*sin(millis()/2450+i));
    ellipse(0,topH-38,16,75);
  }
  pop();
}
function p3_city_drawSelectedTile(i,j){
  push();
  noFill(); stroke(15,230,247,162); strokeWeight(3);
  beginShape();
    vertex(-twCity,0); vertex(0,thCity);
    vertex(twCity,0); vertex(0,-thCity);
  endShape(CLOSE);
  fill(243,255,234,145); textSize(12);
  text(`tile ${i},${j}`,0,-10);
  pop();
}
function p3_city_drawAfter(){
  if(frameCount%30===0 && random()<0.6){
    const size=random(4,7);
    flyingObjectsCity.push({
      x:random(-60,width+60),
      y:random(50,height-50),
      size,
      speed:random(2,4)*(random()<0.5?1:-1)
    });
  }
  for(let i=flyingObjectsCity.length-1;i>=0;i--){
    flyingObjectsCity[i].x+=flyingObjectsCity[i].speed;
    if(flyingObjectsCity[i].x<-80||flyingObjectsCity[i].x>width+80)
      flyingObjectsCity.splice(i,1);
  }
}

// =============================================
// === Starry World ===
// =============================================
function p3_starry_preload() {}
function p3_starry_setup() {}
function p3_starry_worldKeyChanged(key){
  worldSeed = XXH.h32(key,0);
  noiseSeed(worldSeed);
  randomSeed(worldSeed);
  window.starTypes = {};
  window.specialStars = {};
}
function p3_starry_tileWidth()  { return 40; }
function p3_starry_tileHeight() { return 24; }
const twStarry=40, thStarry=24;
const clicksStarry={}, meteorsStarry=[];
let starry_draggedStar=null, starry_hoverI=0, starry_hoverJ=0;

function p3_starry_tileClicked(i,j){
  const k=`${i},${j}`;
  clicksStarry[k] = (clicksStarry[k]||0)+1;
  if(clicksStarry[k]>=4){
    window.specialStars[k] = !window.specialStars[k];
    clicksStarry[k]=0;
  }
}

function p3_starry_drawBefore(){}

function galaxyParams(){
  const baseAng = (abs(worldSeed%360)/360)*TWO_PI;
  const off     = ((worldSeed>>8)%1000-500)/210;
  const arms    = 2+(worldSeed%3);
  const t       = millis();
  return { angle: baseAng+0.6*sin(t/7000), offset:off, arms };
}

function p3_starry_drawTile(i,j){
  push();
  // 拖拽偏移
  let ofs=[0,0];
  if(starry_draggedStar?.i===i && starry_draggedStar?.j===j){
    ofs = starry_draggedStar.offset;
  }
  translate(ofs[0], ofs[1]);

  // 星云背景
  const dx=i, dy=j;
  const {angle,offset,arms} = galaxyParams();
  const r     = sqrt(dx*dx+dy*dy);
  const tht   = atan2(dy,dx);
  const curve = arms*(tht-angle+offset);
  const distA = abs(curve - r*0.19)%PI;
  const armG  = exp(-pow(distA*1.72,2));
  const coreG = exp(-pow(r*0.11,2));
  const b     = 0.35*coreG + 1.1*armG;
  let c       = lerpColor(color(12,16,41), color(80,130,255,122), constrain(b,0,1));
  if(armG>0.32) c=lerpColor(c, color(240,225,80,120), map(armG,0.32,1,0,0.5,true));
  const a     = 110+82*sin(millis()/8100 + i*0.19 + j*0.18);
  fill(red(c),green(c),blue(c),a); noStroke();
  rect(-twStarry/2,-thStarry/2,twStarry,thStarry);

  // 天体
  const hash = XXH.h32("star:"+i+","+j,worldSeed).toNumber();
  randomSeed(hash);
  if(random()>0.81-0.3*b){
    let typeRand=random(), type="Common Star", auraCol=color(255,255,240,60);
    if(typeRand<0.09){ type="Blue Giant Star"; auraCol=color(140,210,255,74); }
    else if(typeRand<0.15){ type="Supernova"; auraCol=color(255,110,180,120); }
    else if(typeRand<0.25){ type="Red Giant Star"; auraCol=color(255,120,90,90); }
    else if(typeRand<0.32){ type="White Dwarf"; auraCol=color(240,240,260,120); }
    else if(typeRand<0.5){ type="Yellow Dwarf"; auraCol=color(255,238,200,70); }

    let sz=2+random()*3+pow(b,1.5)*4;
    let phase=random(TWO_PI);
    let flicker=1.05+0.22*sin(millis()*0.003+phase)+0.10*sin(millis()*0.0045+phase*2+i-j);

    // 黑洞
    if(window.specialStars[`${i},${j}`]){
      fill(0,0,0,220); ellipse(0,0,sz*2.2,sz*2.2);
      for(let r=0;r<4;r++){
        noFill(); stroke(220,220,30+30*r,110-18*r);
        strokeWeight(3.5-0.7*r);
        ellipse(0,0,sz*2.6+r*12,sz*2.6+r*13);
      }
      noStroke(); fill(180,180,220,32+22*sin(millis()*0.012+i*3+j*7));
      ellipse(0,0,sz*2.8+random(-6,12),sz*2.8+random(-5,14));
      window.starTypes[`${i},${j}`]="Black Hole";
      pop(); return;
    }

    // 拖拽高亮
    if(starry_draggedStar?.i===i && starry_draggedStar?.j===j){
      stroke(255,250,70,130); noFill();
      ellipse(0,0,sz*2.5+18*sin(millis()*0.009),sz*2.5+14*cos(millis()*0.011));
      ellipse(0,0,32,32);
      stroke(200,220,255,90+60*sin(millis()*0.02));
      ellipse(0,0,sz*2.5+24,sz*2.5+23);
    }

    // 光环
    noStroke(); fill(auraCol); ellipse(0,0,sz*2.1,sz*2.01);
    // 主星体
    let mainCol=color(255,255,240+random(-15,15),205+random(-40,30));
    fill(mainCol); ellipse(0,0,sz*flicker,sz*flicker);

    let n=clicksStarry[`${i},${j}`]|0;
    if(n>0){
      for(let k=0;k<n;k++){
        fill(255,random(150,255),random(60,220),90+60*sin(millis()*0.0038+k*15+i));
        let ang=k*TWO_PI/n+millis()*0.0012;
        ellipse(9*cos(ang)*flicker,9*sin(ang)*flicker,sz*1.2+2.3*k,sz*1.2+2.1*k);
      }
      fill(255,255,120,88+62*sin(millis()*0.004+phase));
      ellipse(0,0,sz*flicker*n*1.22,sz*flicker*n*1.15);
    }

    // 特殊星云
    if(random()<0.05 && armG>0.35 && r>3){
      fill(110+random(-10,60),90+random(-20,120),180+random(-30,80),90+random(70));
      ellipse(random(-14,14),random(-9,9),random(18,35),random(16,36));
    }
    window.starTypes[`${i},${j}`]=type;
  }
  pop();
}

function p3_starry_drawSelectedTile(i,j){
  starry_hoverI=i; starry_hoverJ=j;
  push();
  noFill(); stroke(100,255,200,185); strokeWeight(2.6);
  beginShape();
    vertex(-twStarry,0);vertex(0,thStarry);
    vertex(twStarry,0); vertex(0,-thStarry);
  endShape(CLOSE);
  if(window.starTypes[`${i},${j}`]){
    fill(245,220,130,185);
    textSize(12); textAlign(CENTER,CENTER);
    text(window.starTypes[`${i},${j}`],0,10);
  }
  fill(160,255,210,140);
  textSize(11); noStroke();
  textAlign(CENTER,CENTER);
  text(`tile ${i},${j}`,0,-10);
  pop();
}

function p3_starry_drawAfter(){
  if(frameCount%60===0 && random()<0.7){
    const num=1+(random()<0.4?1:0);
    for(let c=0;c<num;c++){
      const sx=random()<0.5?-60:width+60;
      meteorsStarry.push({ x:sx, y:random(40,height-40),
                          speed:random(13,22)*(sx<0?1:-1) });
    }  
  }
  for(let m of meteorsStarry){
    m.x+=m.speed;
    push();
    stroke(220,255,225,202); strokeWeight(2.4+random(-0.4,0.7));
    point(m.x,m.y);
    line(m.x,m.y,m.x-32*m.speed/abs(m.speed),m.y-17);
    pop();
  }
  for(let i=meteorsStarry.length-1;i>=0;i--){
    if(meteorsStarry[i].x<-100||meteorsStarry[i].x>width+110)
      meteorsStarry.splice(i,1);
  }
}

// Starry 拖拽
function p3_starry_mousePressed(){
  const i=starry_hoverI,j=starry_hoverJ;
  const t=window.starTypes[`${i},${j}`];
  if(t && t!=="Black Hole"){
    starry_draggedStar={ i,j, mouseStart:[mouseX,mouseY], offset:[0,0] };
  }
}
function p3_starry_mouseDragged(){
  if(starry_draggedStar){
    const dx=mouseX-starry_draggedStar.mouseStart[0];
    const dy=mouseY-starry_draggedStar.mouseStart[1];
    starry_draggedStar.offset=[dx,dy];
  }
}
