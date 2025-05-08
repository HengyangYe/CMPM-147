/* exported preload, setup, draw */
/* global memory, dropper, restart, rate, slider,
          activeScore, bestScore, fpsCounter */
/* global getInspirations, initDesign, renderDesign, mutateDesign */

const MAX_EDGE = 360      // 画布最长边，改这里就能整体放大

let bestDesign;
let currentDesign;
let currentScore;
let currentInspiration;
let currentCanvas;
let currentInspirationPixels;

function preload() {
  let allInspirations = getInspirations();

  for (let i = 0; i < allInspirations.length; i++) {
    let insp = allInspirations[i];
    insp.image = loadImage(insp.assetUrl);

    /* populate drop-down */
    let option = document.createElement("option");
    option.value = i;
    option.innerHTML = insp.name;
    dropper.appendChild(option);
  }

  dropper.onchange = e => inspirationChanged(allInspirations[e.target.value]);
  currentInspiration = allInspirations[0];

  restart.onclick = () =>
    inspirationChanged(allInspirations[dropper.value]);
}

function inspirationChanged(nextInspiration) {
  currentInspiration = nextInspiration;
  currentDesign = undefined;
  memory.innerHTML = "";
  setup();                         // re-init everything
}

/* --------------------------------------------------
 *  Setup  ——  按原图比例创建画布
 * -------------------------------------------------- */
function setup() {

  /* ① 计算目标尺寸（最长边 MAX_EDGE） */
  const iw = currentInspiration.image.width;
  const ih = currentInspiration.image.height;
  let cw, ch;
  if (iw >= ih) {          // 宽图
    cw = MAX_EDGE;
    ch = ih / iw * MAX_EDGE;
  } else {                 // 竖图
    ch = MAX_EDGE;
    cw = iw / ih * MAX_EDGE;
  }

  /* ② 创建画布 */
  currentCanvas = createCanvas(cw, ch);
  currentCanvas.parent(document.getElementById("active"));

  /* ③ 初始化进化器 */
  currentScore   = Number.NEGATIVE_INFINITY;
  currentDesign  = initDesign(currentInspiration);
  bestDesign     = currentDesign;

  /* ④ 把原图拉伸到同尺寸，再采像素 */
  image(currentInspiration.image, 0, 0, cw, ch);
  loadPixels();
  currentInspirationPixels = pixels;
}

/* --------------------------------------------------
 * 评分函数
 * -------------------------------------------------- */
function evaluate() {
  loadPixels();
  let error = 0;
  let n = pixels.length;
  for (let i = 0; i < n; i++) error += sq(pixels[i] - currentInspirationPixels[i]);
  return 1 / (1 + error / n);
}

/* --------------------------------------------------
 *  把当前最佳保存到记忆区 & Best 区
 * -------------------------------------------------- */
function memorialize() {
  const url = currentCanvas.canvas.toDataURL();

  let img = document.createElement("img");
  img.classList.add("memory");
  img.src   = url;
  img.title = currentScore;

  /* 用真实画布尺寸，而非固定常量 */
  img.width  = width;
  img.height = height;

  /* 更新 Best 区 */
  document.getElementById("best").innerHTML = "";
  document.getElementById("best").appendChild(img.cloneNode());

  /* Memory 区缩略图（1/2 尺寸） */
  img.width  = width  / 2;
  img.height = height / 2;
  memory.insertBefore(img, memory.firstChild);

  /* 删旧缩略图以免撑爆 */
  if (memory.childNodes.length > memory.dataset.maxItems) {
    memory.removeChild(memory.lastChild);
  }
}

let mutationCount = 0;

/* --------------------------------------------------
 *  Draw Loop
 * -------------------------------------------------- */
function draw() {

  if (!currentDesign) return;

  /* ① 复制最佳设计并做变异 */
  randomSeed(mutationCount++);
  currentDesign = JSON.parse(JSON.stringify(bestDesign));
  rate.innerHTML = slider.value;
  mutateDesign(currentDesign, currentInspiration, slider.value / 100.0);

  /* ② 渲染 & 评估 */
  randomSeed(0);
  renderDesign(currentDesign, currentInspiration);
  const nextScore = evaluate();

  /* ③ 更新 UI + 纪录最佳 */
  activeScore.innerHTML = nextScore;
  if (nextScore > currentScore) {
    currentScore = nextScore;
    bestDesign   = currentDesign;
    memorialize();
    bestScore.innerHTML = currentScore;
  }
  fpsCounter.innerHTML = Math.round(frameRate());
}
