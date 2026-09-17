(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.RecoveredPrototypeCore=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="0.1.0";
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const whole=(v,a,b)=>Math.round(clamp(Number(v)||0,a,b));

  function hash(text){
    let h=0x811c9dc5;
    for(const ch of String(text)){h^=ch.charCodeAt(0);h=Math.imul(h,0x01000193);}
    return h>>>0;
  }
  function randomFor(seed){
    let s=(typeof seed==="number"?seed>>>0:hash(seed))||0x6d2b79f5;
    return ()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return(s>>>0)/4294967296;};
  }
  function cloneFrame(frame){
    if(!frame||!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||!frame.data)throw new TypeError("invalid frame");
    if(frame.width<1||frame.height<1||frame.data.length!==frame.width*frame.height*4)throw new RangeError("invalid RGBA dimensions");
    return{width:frame.width,height:frame.height,data:new Uint8ClampedArray(frame.data)};
  }
  function defaultGenome(){
    return{version:1,seed:"RECOVERED-001",frame:0,operators:{
      tear:{enabled:true,amount:34,density:.24,band:5},
      blocks:{enabled:true,size:42,chance:.13,distance:88},
      channels:{enabled:true,red:5,green:-2,blue:-7},
      bits:{enabled:true,depth:7},
      quantize:{enabled:false,levels:10},
      noise:{enabled:true,amount:.022,amplitude:70},
      feedback:{enabled:true,amount:.24,dx:4,dy:1},
      refresh:{enabled:false,amount:.28,band:12}
    }};
  }
  function normalizeGenome(input){
    const s=input&&typeof input==="object"?input:{},d=defaultGenome(),o=s.operators&&typeof s.operators==="object"?s.operators:{};
    const on=n=>o[n]&&typeof o[n].enabled==="boolean"?o[n].enabled:d.operators[n].enabled;
    return{version:1,seed:String(s.seed==null?d.seed:s.seed).slice(0,128),frame:whole(s.frame==null?0:s.frame,0,1000000000),operators:{
      tear:{enabled:on("tear"),amount:whole(o.tear?.amount??d.operators.tear.amount,0,256),density:clamp(Number(o.tear?.density??d.operators.tear.density),0,1),band:whole(o.tear?.band??d.operators.tear.band,1,64)},
      blocks:{enabled:on("blocks"),size:whole(o.blocks?.size??d.operators.blocks.size,2,256),chance:clamp(Number(o.blocks?.chance??d.operators.blocks.chance),0,1),distance:whole(o.blocks?.distance??d.operators.blocks.distance,0,512)},
      channels:{enabled:on("channels"),red:whole(o.channels?.red??d.operators.channels.red,-128,128),green:whole(o.channels?.green??d.operators.channels.green,-128,128),blue:whole(o.channels?.blue??d.operators.channels.blue,-128,128)},
      bits:{enabled:on("bits"),depth:whole(o.bits?.depth??d.operators.bits.depth,1,8)},
      quantize:{enabled:on("quantize"),levels:whole(o.quantize?.levels??d.operators.quantize.levels,2,32)},
      noise:{enabled:on("noise"),amount:clamp(Number(o.noise?.amount??d.operators.noise.amount),0,.5),amplitude:whole(o.noise?.amplitude??d.operators.noise.amplitude,0,255)},
      feedback:{enabled:on("feedback"),amount:clamp(Number(o.feedback?.amount??d.operators.feedback.amount),0,.95),dx:whole(o.feedback?.dx??d.operators.feedback.dx,-128,128),dy:whole(o.feedback?.dy??d.operators.feedback.dy,-128,128)},
      refresh:{enabled:on("refresh"),amount:clamp(Number(o.refresh?.amount??d.operators.refresh.amount),.02,1),band:whole(o.refresh?.band??d.operators.refresh.band,1,128)}
    }};
  }
  const at=(w,x,y)=>(y*w+x)*4;
  function wrap(v,max){const r=v%max;return r<0?r+max:r;}
  function copyPixel(src,dst,w,h,sx,sy,dx,dy){
    const si=at(w,wrap(sx,w),wrap(sy,h)),di=at(w,dx,dy);
    dst[di]=src[si];dst[di+1]=src[si+1];dst[di+2]=src[si+2];dst[di+3]=src[si+3];
  }
  function tear(frame,p,seed){
    const out=cloneFrame(frame),rnd=randomFor(seed);
    for(let y=0;y<frame.height;y+=p.band){
      const shift=rnd()<p.density?Math.round((rnd()*2-1)*p.amount):0;
      for(let yy=y;yy<Math.min(frame.height,y+p.band);yy++)for(let x=0;x<frame.width;x++)copyPixel(frame.data,out.data,frame.width,frame.height,x-shift,yy,x,yy);
    }
    return out;
  }
  function blocks(frame,p,seed){
    const out=cloneFrame(frame),rnd=randomFor(seed);
    for(let by=0;by<frame.height;by+=p.size)for(let bx=0;bx<frame.width;bx+=p.size){
      if(rnd()>=p.chance)continue;
      const dx=Math.round((rnd()*2-1)*p.distance),dy=Math.round((rnd()*2-1)*p.distance);
      for(let y=by;y<Math.min(frame.height,by+p.size);y++)for(let x=bx;x<Math.min(frame.width,bx+p.size);x++)copyPixel(frame.data,out.data,frame.width,frame.height,x+dx,y+dy,x,y);
    }
    return out;
  }
  function channels(frame,p){
    const out=cloneFrame(frame);
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
      const di=at(frame.width,x,y),ri=at(frame.width,wrap(x+p.red,frame.width),y),gi=at(frame.width,wrap(x+p.green,frame.width),y),bi=at(frame.width,wrap(x+p.blue,frame.width),y);
      out.data[di]=frame.data[ri];out.data[di+1]=frame.data[gi+1];out.data[di+2]=frame.data[bi+2];
    }
    return out;
  }
  function bits(frame,p){
    const out=cloneFrame(frame),mask=(0xff<<(8-p.depth))&0xff;
    for(let i=0;i<out.data.length;i+=4){out.data[i]&=mask;out.data[i+1]&=mask;out.data[i+2]&=mask;}
    return out;
  }
  function quantize(frame,p){
    const out=cloneFrame(frame),step=255/(p.levels-1);
    for(let i=0;i<out.data.length;i+=4){
      out.data[i]=Math.round(out.data[i]/step)*step;
      out.data[i+1]=Math.round(out.data[i+1]/step)*step;
      out.data[i+2]=Math.round(out.data[i+2]/step)*step;
    }
    return out;
  }
  function noise(frame,p,seed){
    const out=cloneFrame(frame),rnd=randomFor(seed);
    for(let i=0;i<out.data.length;i+=4){
      if(rnd()>=p.amount)continue;
      const mode=Math.floor(rnd()*3);
      if(mode===0){const c=Math.floor(rnd()*3);out.data[i+c]=255-out.data[i+c];}
      else if(mode===1){const r=out.data[i];out.data[i]=out.data[i+1];out.data[i+1]=out.data[i+2];out.data[i+2]=r;}
      else{const d=Math.round((rnd()*2-1)*p.amplitude);out.data[i]=clamp(out.data[i]+d,0,255);out.data[i+1]=clamp(out.data[i+1]-d,0,255);out.data[i+2]=clamp(out.data[i+2]+d/2,0,255);}
    }
    return out;
  }
  function feedback(frame,previous,p){
    if(!previous||previous.width!==frame.width||previous.height!==frame.height)return cloneFrame(frame);
    const out=cloneFrame(frame);
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
      const di=at(frame.width,x,y),pi=at(frame.width,wrap(x+p.dx,frame.width),wrap(y+p.dy,frame.height));
      for(let c=0;c<3;c++)out.data[di+c]=Math.round(frame.data[di+c]*(1-p.amount)+previous.data[pi+c]*p.amount);
    }
    return out;
  }
  function refresh(frame,previous,p,seed){
    if(!previous||previous.width!==frame.width||previous.height!==frame.height)return cloneFrame(frame);
    const out=cloneFrame(previous),rnd=randomFor(seed);
    for(let y=0;y<frame.height;y+=p.band){
      if(rnd()>p.amount)continue;
      for(let yy=y;yy<Math.min(frame.height,y+p.band);yy++){const start=at(frame.width,0,yy);out.data.set(frame.data.subarray(start,start+frame.width*4),start);}
    }
    return out;
  }
  function processFrame(input,genomeInput,previous){
    const genome=normalizeGenome(genomeInput),op=genome.operators,base=genome.seed+"|"+genome.frame+"|";
    let frame=cloneFrame(input);
    if(op.tear.enabled)frame=tear(frame,op.tear,base+"tear");
    if(op.blocks.enabled)frame=blocks(frame,op.blocks,base+"blocks");
    if(op.channels.enabled)frame=channels(frame,op.channels);
    if(op.bits.enabled)frame=bits(frame,op.bits);
    if(op.quantize.enabled)frame=quantize(frame,op.quantize);
    if(op.noise.enabled)frame=noise(frame,op.noise,base+"noise");
    if(op.feedback.enabled)frame=feedback(frame,previous,op.feedback);
    if(op.refresh.enabled)frame=refresh(frame,previous,op.refresh,base+"refresh");
    return frame;
  }
  const ranges={
    "tear.amount":[0,256,18],"tear.density":[0,1,.08],"tear.band":[1,64,4],
    "blocks.size":[2,256,14],"blocks.chance":[0,1,.06],"blocks.distance":[0,512,32],
    "channels.red":[-128,128,8],"channels.green":[-128,128,8],"channels.blue":[-128,128,8],
    "bits.depth":[1,8,1],"quantize.levels":[2,32,3],"noise.amount":[0,.5,.025],"noise.amplitude":[0,255,18],
    "feedback.amount":[0,.95,.08],"feedback.dx":[-128,128,7],"feedback.dy":[-128,128,7],
    "refresh.amount":[.02,1,.08],"refresh.band":[1,128,8]
  };
  function mutateGenome(input,mutationSeed,strength=1){
    const genome=normalizeGenome(input),out=JSON.parse(JSON.stringify(genome)),rnd=randomFor(genome.seed+"|mutate|"+mutationSeed),scale=clamp(Number(strength)||1,.1,4);
    for(const[path,range]of Object.entries(ranges)){
      if(rnd()>.64)continue;
      const[name,key]=path.split("."),[min,max,step]=range,original=out.operators[name][key];
      let value=clamp(original+(rnd()*2-1)*step*scale,min,max);
      if(Number.isInteger(original))value=Math.round(value);
      out.operators[name][key]=value;
    }
    for(const name of Object.keys(out.operators))if(rnd()<.07*scale)out.operators[name].enabled=!out.operators[name].enabled;
    return normalizeGenome(out);
  }
  function checksum(frame){
    let h=0x811c9dc5;
    for(const value of frame.data){h^=value;h=Math.imul(h,0x01000193);}
    return(h>>>0).toString(16).padStart(8,"0");
  }
  return{VERSION,defaultGenome,normalizeGenome,mutateGenome,processFrame,cloneFrame,checksum,hash};
});
