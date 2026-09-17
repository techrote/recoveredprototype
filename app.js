(()=>{
"use strict";
const Core=window.RecoveredPrototypeCore;
const canvas=document.getElementById("canvas");
const ctx=canvas.getContext("2d",{alpha:false,willReadFrequently:true});
const fileInput=document.getElementById("fileInput");
const status=document.getElementById("status");
const controlsHost=document.getElementById("operatorControls");
const seedInput=document.getElementById("seed");
const frameInput=document.getElementById("frame");
const frameOut=document.getElementById("frameOut");
const fpsInput=document.getElementById("fps");
const fpsOut=document.getElementById("fpsOut");
const checksumOut=document.getElementById("checksum");
const dimensionsOut=document.getElementById("dimensions");

let genome=Core.defaultGenome();
let sourceFrame=null,previousFrame=null,mutationNonce=0,history=[],playing=false,timer=null;

const schema={
tear:{title:"SCANLINE TEAR",fields:{amount:["shift",0,256,1],density:["density",0,1,.01],band:["band px",1,64,1]}},
blocks:{title:"BLOCK DISPLACE",fields:{size:["block px",2,256,1],chance:["chance",0,1,.01],distance:["distance",0,512,1]}},
channels:{title:"CHANNEL MISREGISTER",fields:{red:["red px",-128,128,1],green:["green px",-128,128,1],blue:["blue px",-128,128,1]}},
bits:{title:"BIT DEPTH DAMAGE",fields:{depth:["bits",1,8,1]}},
quantize:{title:"PALETTE COLLAPSE",fields:{levels:["levels",2,32,1]}},
noise:{title:"MEMORY NOISE",fields:{amount:["density",0,.5,.001],amplitude:["amplitude",0,255,1]}},
feedback:{title:"FRAME FEEDBACK",fields:{amount:["mix",0,.95,.01],dx:["x drift",-128,128,1],dy:["y drift",-128,128,1]}},
refresh:{title:"PARTIAL REFRESH",fields:{amount:["refresh",.02,1,.01],band:["band px",1,128,1]}}
};

function frameFromCanvas(){
  const image=ctx.getImageData(0,0,canvas.width,canvas.height);
  return{width:image.width,height:image.height,data:new Uint8ClampedArray(image.data)};
}
function putFrame(frame){
  ctx.putImageData(new ImageData(new Uint8ClampedArray(frame.data),frame.width,frame.height),0,0);
}
function updateDimensions(){dimensionsOut.textContent=canvas.width+"×"+canvas.height;}

function drawSource(){
  canvas.width=960;canvas.height=640;
  const g=ctx.createLinearGradient(0,0,960,640);
  g.addColorStop(0,"#121820");g.addColorStop(.42,"#00c8d8");g.addColorStop(.7,"#ff2b8d");g.addColorStop(1,"#ffd632");
  ctx.fillStyle=g;ctx.fillRect(0,0,960,640);
  ctx.fillStyle="rgba(0,0,0,.38)";for(let y=0;y<640;y+=32)ctx.fillRect(0,y,960,1);
  ctx.font="900 96px Consolas, monospace";ctx.fillStyle="#f2f7f8";ctx.fillText("RECOVERED",58,230);
  ctx.font="900 132px Consolas, monospace";ctx.fillStyle="#07090b";ctx.fillText("SIGNAL",104,360);
  ctx.font="24px Consolas, monospace";ctx.fillStyle="#f2f7f8";ctx.fillText("ERROR IS A MATERIAL // FRAME 000",64,520);
  for(let i=0;i<90;i++){const x=i*157%960,y=i*79%640;ctx.fillStyle=i%2?"rgba(255,255,255,.55)":"rgba(0,0,0,.45)";ctx.fillRect(x,y,3+i%13,2);}
  sourceFrame=frameFromCanvas();previousFrame=null;updateDimensions();render(true);
}

function render(resetTemporal=false){
  if(!sourceFrame)return;
  genome=Core.normalizeGenome(genome);
  genome.seed=seedInput.value||"0";
  genome.frame=Number(frameInput.value);
  if(resetTemporal)previousFrame=null;
  const output=Core.processFrame(sourceFrame,genome,previousFrame);
  putFrame(output);previousFrame=output;
  frameOut.textContent=String(genome.frame);
  checksumOut.textContent=Core.checksum(output);
  status.textContent="frame "+genome.frame+" // "+checksumOut.textContent;
}

function rebuildControls(){
  controlsHost.textContent="";
  for(const[name,def]of Object.entries(schema)){
    const box=document.createElement("section");box.className="operator";
    const title=document.createElement("div");title.className="operator-title";
    const h=document.createElement("h3");h.textContent=def.title;
    const enableLabel=document.createElement("label"),enable=document.createElement("input");
    enable.type="checkbox";enable.checked=genome.operators[name].enabled;
    enable.addEventListener("change",()=>{genome.operators[name].enabled=enable.checked;previousFrame=null;render();});
    enableLabel.append(enable,document.createTextNode(" enabled"));title.append(h,enableLabel);box.append(title);
    for(const[key,spec]of Object.entries(def.fields)){
      const line=document.createElement("label");line.className="control-line";
      const label=document.createElement("span");label.textContent=spec[0];
      const slider=document.createElement("input");slider.type="range";slider.min=spec[1];slider.max=spec[2];slider.step=spec[3];slider.value=genome.operators[name][key];
      const out=document.createElement("output");
      const sync=()=>{const value=Number(slider.value);genome.operators[name][key]=value;out.textContent=Number.isInteger(value)?String(value):value.toFixed(spec[3]<.01?3:2);};
      slider.addEventListener("input",()=>{sync();previousFrame=null;render();});sync();
      line.append(label,slider,out);box.append(line);
    }
    controlsHost.append(box);
  }
}

function remember(){history.push(JSON.stringify(genome));if(history.length>30)history.shift();}
function mutate(){
  remember();genome=Core.mutateGenome(genome,++mutationNonce,1);
  seedInput.value=genome.seed;rebuildControls();previousFrame=null;render();
}
function undoMutation(){
  if(!history.length)return;
  genome=Core.normalizeGenome(JSON.parse(history.pop()));
  seedInput.value=genome.seed;frameInput.value=Math.min(Number(frameInput.max),genome.frame);
  rebuildControls();previousFrame=null;render();
}

function loadImage(file){
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
    const maxPixels=4000000;let width=img.naturalWidth,height=img.naturalHeight;
    if(width*height>maxPixels){const scale=Math.sqrt(maxPixels/(width*height));width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));}
    canvas.width=width;canvas.height=height;ctx.drawImage(img,0,0,width,height);
    sourceFrame=frameFromCanvas();previousFrame=null;URL.revokeObjectURL(url);updateDimensions();render(true);
  };
  img.onerror=()=>{status.textContent="could not decode image";URL.revokeObjectURL(url);};
  img.src=url;
}

function setPlaying(next){
  playing=next;document.getElementById("playButton").textContent=playing?"PAUSE":"PLAY";
  if(timer)clearInterval(timer);timer=null;
  if(playing)timer=setInterval(()=>{
    frameInput.value=(Number(frameInput.value)+1)%(Number(frameInput.max)+1);
    render();
  },1000/Number(fpsInput.value));
}

document.getElementById("mutateButton").addEventListener("click",mutate);
document.getElementById("previousButton").addEventListener("click",undoMutation);
document.getElementById("randomSeedButton").addEventListener("click",()=>{
  remember();seedInput.value=Math.random().toString(36).slice(2,10).toUpperCase();genome.seed=seedInput.value;previousFrame=null;render();
});
document.getElementById("sampleButton").addEventListener("click",drawSource);
document.getElementById("playButton").addEventListener("click",()=>setPlaying(!playing));
document.getElementById("stepButton").addEventListener("click",()=>{frameInput.value=Math.min(Number(frameInput.max),Number(frameInput.value)+1);render();});
document.getElementById("resetTimeButton").addEventListener("click",()=>{frameInput.value=0;previousFrame=null;render(true);});
frameInput.addEventListener("input",()=>{previousFrame=null;render(true);});
fpsInput.addEventListener("input",()=>{fpsOut.textContent=fpsInput.value;if(playing)setPlaying(true);});
seedInput.addEventListener("change",()=>{genome.seed=seedInput.value;previousFrame=null;render();});
fileInput.addEventListener("change",()=>{if(fileInput.files[0])loadImage(fileInput.files[0]);});

document.getElementById("exportButton").addEventListener("click",()=>{
  const link=document.createElement("a");
  link.download="recovered-"+genome.seed.replace(/[^a-z0-9_-]+/gi,"_")+"-f"+genome.frame+".png";
  link.href=canvas.toDataURL("image/png");link.click();
});
document.getElementById("copyGenomeButton").addEventListener("click",async()=>{
  const text=JSON.stringify(Core.normalizeGenome(genome),null,2);
  try{await navigator.clipboard.writeText(text);status.textContent="genome copied";}
  catch{window.prompt("Copy genome JSON",text);}
});
document.getElementById("pasteGenomeButton").addEventListener("click",async()=>{
  let text="";
  try{text=await navigator.clipboard.readText();}catch{text=window.prompt("Paste genome JSON")||"";}
  if(!text)return;
  try{
    remember();genome=Core.normalizeGenome(JSON.parse(text));seedInput.value=genome.seed;frameInput.value=Math.min(Number(frameInput.max),genome.frame);
    rebuildControls();previousFrame=null;render();status.textContent="genome loaded";
  }catch(error){status.textContent="invalid genome: "+error.message;}
});

fpsOut.textContent=fpsInput.value;seedInput.value=genome.seed;rebuildControls();drawSource();
})();