/* exported getInspirations, initDesign, renderDesign, mutateDesign */
/* global random, randomGaussian, constrain, width, height,
          noStroke, fill, rect, background, brightness, floor,
          frameCount, map, color */

// --------------------------------------------------
// 0) Inspirations  
// --------------------------------------------------
function getInspirations() {
    return [
      { name:"Galaxy",   assetUrl:"img/galaxy.jpg",   credit:"Wiki"   },
      { name:"Universe", assetUrl:"img/Universe.jpg", credit:"Wiki" },
      { name:"Saturn",   assetUrl:"img/Saturn.jpg",   credit:"Wiki"   },
      { name:"Jupiter",  assetUrl:"img/Jupiter.png",  credit:"NASA"   },
      { name:"Sunset",   assetUrl:"img/Sunset.jpg",   credit:"Wiki"   },
      { name:"Sunset_Girl_SantaCruz",   assetUrl:"img/Sunset_Girl_SantaCruz.jpg",   credit:"Shot by Hengyang Ye"   }
    ];
  }
  
  // --------------------------------------------------
  // 1) K-Means palette util
  // --------------------------------------------------
  function kmeansPalette(img, K = 6, samples = 800, iterations = 6) {
    const pts=[];
    img.loadPixels();
    for (let i=0;i<samples;i++){
      const x=floor(random(img.width));
      const y=floor(random(img.height));
      const c=img.get(x,y);
      pts.push([c[0],c[1],c[2]]);
    }
    let centroids=pts.slice(0,K).map(c=>c.slice());
    for (let it=0;it<iterations;it++){
      const clusters=Array.from({length:K},()=>({sum:[0,0,0],cnt:0}));
      for(const p of pts){
        let kBest=0,dBest=1e9;
        for(let k=0;k<K;k++){
          const d=distSq(p,centroids[k]);
          if(d<dBest){dBest=d;kBest=k;}
        }
        clusters[kBest].sum[0]+=p[0];
        clusters[kBest].sum[1]+=p[1];
        clusters[kBest].sum[2]+=p[2];
        clusters[kBest].cnt++;
      }
      for(let k=0;k<K;k++){
        if(clusters[k].cnt>0){
          centroids[k]=clusters[k].sum.map(s=>s/clusters[k].cnt);
        }
      }
    }
    return centroids.sort((a,b)=>brightness(a)-brightness(b));
  }
  function distSq(a,b){const dr=a[0]-b[0],dg=a[1]-b[1],db=a[2]-b[2];return dr*dr+dg*dg+db*db;}
  
  // --------------------------------------------------
  // 2) Init — grid-based color sampling
  // --------------------------------------------------
  function initDesign(inspiration){
    let palette = kmeansPalette(inspiration.image,6);
    const range = brightness(palette.at(-1))-brightness(palette[0]);
    const pixelMode = range<20 || palette.length<3;
    if(pixelMode) palette=[[0,0,0],[255,255,255]];
  
    let canvasContainer = $('.image-container'); // Select the container using jQuery
    let canvasWidth = canvasContainer.width(); // Get the width of the container

    $(".caption").text(inspiration.credit); // Set the caption text

    // add the original image to #original
    const imgHTML = `<img src="${inspiration.assetUrl}" style="width:${canvasWidth}px;">`
    $('#original').empty();
    $('#original').append(imgHTML);
  

    const grid = inspiration.grid||20;
    const cellW = width/grid, cellH = height/grid;
  
    const design={pixelMode,bg:pixelMode?0:palette[0][0],palette,
                  fg:[],baseStep:cellW};
  
    for(let gy=0;gy<grid;gy++){
      for(let gx=0;gx<grid;gx++){
        const cx=(gx+0.5)*cellW, cy=(gy+0.5)*cellH;
        const col=inspiration.image.get(cx,cy);
        const rgb=pixelMode?(brightness(col)<128?[0,0,0]:[255,255,255])
                            :[col[0],col[1],col[2]];
        design.fg.push({x:cx,y:cy,w:cellW,h:cellH,c:rgb});
      }
    }
    return design;
  }
  
  // --------------------------------------------------
  // 3) Render
  // --------------------------------------------------
  function renderDesign(design){
    background(design.bg);
    noStroke();
    const a = design.pixelMode?255:128;
    for(const b of design.fg){
      fill(b.c[0],b.c[1],b.c[2],a);
      rect(b.x,b.y,b.w,b.h);
    }
  }
  
  // --------------------------------------------------
  // 4) Mutate
  // --------------------------------------------------
  function mutateDesign(design,inspiration,rate){
    /* 自动细化 */
    if(!design.pixelMode && frameCount%200===0 && design.fg.length<800){
      const s=design.baseStep*0.5, addCt=floor(random(8,16));
      for(let i=0;i<addCt;i++){
        const src=random(design.fg);
        const col=inspiration.image.get(src.x,src.y);
        design.fg.push({
          x:constrain(src.x+randomGaussian()*s*0.2,0,width),
          y:constrain(src.y+randomGaussian()*s*0.2,0,height),
          w:s,h:s,c:[col[0],col[1],col[2]]
        });
      }
    }
  
    if(design.pixelMode){
      const step=4;
      for(const b of design.fg){
        if(random()<0.1*rate){
          b.c=brightness(b.c)<128?[255,255,255]:[0,0,0];
        }
        b.x=snap(mut(b.x,0,width, rate*0.5),step);
        b.y=snap(mut(b.y,0,height,rate*0.5),step);
        b.w=snap(mut(b.w,step,width/10,rate*0.5),step);
        b.h=snap(mut(b.h,step,height/10,rate*0.5),step);
      }
      return;
    }
  
    for(const b of design.fg){
      for(let ch=0;ch<3;ch++){
        b.c[ch]=mut(b.c[ch],0,255,rate*0.3);
      }
      if(random()<0.02*rate){
        const col=random(design.palette);
        b.c=[col[0],col[1],col[2]];
      }
      b.x=mut(b.x,0,width, rate);
      b.y=mut(b.y,0,height,rate);
      b.w=mut(b.w,1,width/2, rate);
      b.h=mut(b.h,1,height/2,rate);
    }
  }
  
  // --------------------------------------------------
  // 5) Helpers
  // --------------------------------------------------
  function mut(v,min,max,rate){
    const sigma=(rate*(max-min))/15;
    return constrain(randomGaussian(v,sigma),min,max);
  }
  function snap(v,step){return round(v/step)*step;}
  