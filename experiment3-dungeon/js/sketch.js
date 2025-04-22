
// tileset 
const TILESET_URL =
  "https://cdn.glitch.com/25101045-29e2-407a-894c-e0243cd8c7c6%2FtilesetP8.png?v=1611654020438";

let tilesetImg;
let seed = 0;
let currentGrid = [];
let numRows, numCols;

// dungeon set
const MIN_LEAF   = 8;
const MAX_DEPTH  = 4;
const MIN_ROOM   = 4;
const ROOM_PAD   = 1;
const CORRIDOR_W = 2;

const WALL_CODE  = "#";
const FLOOR_CODE = ".";
const CHEST_CODE = "c";
const PILLAR_CODE = "p";

const FLOOR_COLS = [0,1,2,3];  
const FLOOR_ROW  = 22;

const WALL_BASE  = { ti:0, tj:24 };      
const CHEST_ROW  = 28;
const CHEST_COLS = [0,1,2,3,4,5];

const PILLAR_ROW = 0;   
const PILLAR_COL = 29;

// p5 
function preload(){
  tilesetImg = loadImage(TILESET_URL);
}
function setup(){
  numRows = select("#asciiBox").attribute("rows")|0;
  numCols = select("#asciiBox").attribute("cols")|0;

  createCanvas(16*numCols, 16*numRows).parent("canvas-container");
  select("canvas").elt.getContext("2d").imageSmoothingEnabled = false;

  select("#reseedButton").mousePressed(reseed);
  select("#asciiBox").input(()=>currentGrid = stringToGrid(select("#asciiBox").value()));

  reseed();
}
function draw(){
  randomSeed(seed);
  drawGrid(currentGrid);
}

/* (N << 0) | (W << 1) | (E << 2) | (S << 3) */
const lookup = [
  [1,1],[1,0],[0,1],[0,0],
  [2,1],[2,0],[1,1],[1,0],
  [1,2],[1,1],[0,2],[0,1],
  [2,2],[2,1],[1,2],[1,1]
];


// reseed / textarea 
function reseed(){
  seed = (seed|0)+1109;
  randomSeed(seed); noiseSeed(seed);
  select("#seedReport").html("seed "+seed);
  currentGrid = generateGrid(numCols,numRows);
  select("#asciiBox").value(gridToString(currentGrid));
}

// (BSP)
function generateGrid(cols,rows){
  const g = Array.from({length:rows},()=>Array(cols).fill(WALL_CODE));

  let leaves=[]; splitSpace({x:0,y:0,w:cols,h:rows},0,leaves);
  leaves.forEach(l=>makeRoom(g,l));
  for(let i=1;i<leaves.length;i++){
    const r1=leaves[i-1].room, r2=leaves[i].room;
    if(r1&&r2) carveCorridor(g,r1.cx,r1.cy,r2.cx,r2.cy);
  }

  // Incidentals
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
    if(g[i][j]!==FLOOR_CODE) continue;
    const r=random();
    if(r<0.02) g[i][j]=CHEST_CODE;
    else if(r<0.04) g[i][j]=PILLAR_CODE;
  }
  return g;
}
function splitSpace(n,d,leaves){
  if(d>=MAX_DEPTH||(n.w<=MIN_LEAF*2&&n.h<=MIN_LEAF*2)){leaves.push(n);return;}
  const canH=n.w>MIN_LEAF*2, canV=n.h>MIN_LEAF*2;
  if(!canH&&!canV){leaves.push(n);return;}
  const h=canH&&(!canV||random()<0.5);
  let sp;
  if(h){
    sp=int(random(MIN_LEAF,n.w-MIN_LEAF));
    n.c1={x:n.x,y:n.y,w:sp,h:n.h}; n.c2={x:n.x+sp,y:n.y,w:n.w-sp,h:n.h};
  }else{
    sp=int(random(MIN_LEAF,n.h-MIN_LEAF));
    n.c1={x:n.x,y:n.y,w:n.w,h:sp}; n.c2={x:n.x,y:n.y+sp,w:n.w,h:n.h-sp};
  }
  splitSpace(n.c1,d+1,leaves); splitSpace(n.c2,d+1,leaves);
}
function makeRoom(g,l){
  const aw=l.w-ROOM_PAD*2, ah=l.h-ROOM_PAD*2;
  if(aw<MIN_ROOM||ah<MIN_ROOM) return;
  const rw=int(random(MIN_ROOM,aw+1)), rh=int(random(MIN_ROOM,ah+1));
  const rx=l.x+ROOM_PAD+int(random(0,aw-rw+1));
  const ry=l.y+ROOM_PAD+int(random(0,ah-rh+1));
  carveRect(g,rx,ry,rw,rh,FLOOR_CODE);
  l.room={x:rx,y:ry,w:rw,h:rh,cx:rx+floor(rw/2),cy:ry+floor(rh/2)};
}
function carveCorridor(g,x1,y1,x2,y2){
  const w=CORRIDOR_W;
  if(random()<0.5){
    carveRect(g,min(x1,x2),y1,abs(x1-x2)+w,w,FLOOR_CODE);
    carveRect(g,x2,min(y1,y2),w,abs(y1-y2)+w,FLOOR_CODE);
  }else{
    carveRect(g,x1,min(y1,y2),w,abs(y1-y2)+w,FLOOR_CODE);
    carveRect(g,min(x1,x2),y2,abs(x1-x2)+w,w,FLOOR_CODE);
  }
}
function carveRect(g,x,y,w,h,c){
  for(let i=y;i<y+h;i++)for(let j=x;j<x+w;j++)
    if(i>=0&&i<g.length&&j>=0&&j<g[0].length) g[i][j]=c;
}

function drawGrid(grid){
  background(20);
  const flick = (sin(millis()/200)+1)*0.5;
  for(let i=0;i<grid.length;i++)for(let j=0;j<grid[i].length;j++){
    const ch=grid[i][j];
    // base
    if([FLOOR_CODE,CHEST_CODE,PILLAR_CODE].includes(ch))
         placeTile(i,j,random(FLOOR_COLS)|0,FLOOR_ROW);
    else placeTile(i,j,0,24);

    if(!gridCheck(grid,i,j,FLOOR_CODE))
        drawContext(grid,i,j,FLOOR_CODE,WALL_BASE.ti,WALL_BASE.tj,true);

    if(ch===CHEST_CODE)  placeTile(i,j,random(CHEST_COLS)|0,CHEST_ROW);
    if(ch===PILLAR_CODE) placeTile(i,j,PILLAR_COL,PILLAR_ROW);

    // 烛光
    if(ch===FLOOR_CODE&&random()<0.003){
      fill(255,200+55*flick,80,160); noStroke();
      rect(j*16+6,i*16+6,4,4,1);
    }
  }
}

// autotile 
function gridCheck(g,i,j,t){return i>=0&&i<g.length&&j>=0&&j<g[i].length&&g[i][j]===t;}
function gridCode(g,i,j,t){return (gridCheck(g,i-1,j,t)<<0)+(gridCheck(g,i,j-1,t)<<1)+
                                 (gridCheck(g,i,j+1,t)<<2)+(gridCheck(g,i+1,j,t)<<3);}
function drawContext(g,i,j,t,dti,dtj,inv=false){
  let code=gridCode(g,i,j,t); if(inv) code=(~code)&0xF;
  const [ti,tj]=lookup[code]; placeTile(i,j,dti+ti,dtj+tj);
}

// Place tile -----------------------------------------------------
function placeTile(i,j,ti,tj){
  image(tilesetImg, j*16, i*16, 16,16, ti*8, tj*8, 8,8);
}

// textarea  grid
function gridToString(g){return g.map(r=>r.join("")).join("\n");}
function stringToGrid(s){return s.split("\n").map(l=>l.split(""));}

