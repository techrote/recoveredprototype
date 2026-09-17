const test=require("node:test");
const assert=require("node:assert/strict");
const Core=require("../core.js");

function fixture(width=16,height=12){
  const data=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4;
    data[i]=(x*19+y*3)&255;data[i+1]=(x*7+y*23)&255;data[i+2]=(x*11+y*13)&255;data[i+3]=255;
  }
  return{width,height,data};
}

test("default genome has stable schema",()=>{
  const g=Core.normalizeGenome(Core.defaultGenome());
  assert.equal(g.version,1);
  assert.deepEqual(Object.keys(g.operators),["tear","blocks","channels","bits","quantize","noise","feedback","refresh"]);
});

test("fixed source genome and frame are deterministic",()=>{
  const input=fixture(),g=Core.defaultGenome();
  g.operators.feedback.enabled=false;g.operators.refresh.enabled=false;
  const a=Core.processFrame(input,g,null),b=Core.processFrame(input,g,null);
  assert.equal(Core.checksum(a),Core.checksum(b));
  assert.deepEqual(Array.from(a.data),Array.from(b.data));
});

test("all operators disabled is an exact no-op",()=>{
  const input=fixture(),g=Core.defaultGenome();
  for(const op of Object.values(g.operators))op.enabled=false;
  assert.deepEqual(Array.from(Core.processFrame(input,g,null).data),Array.from(input.data));
});

test("semantic frame changes stochastic faults",()=>{
  const input=fixture(32,24),g=Core.defaultGenome();
  g.operators.feedback.enabled=false;g.operators.refresh.enabled=false;
  g.frame=2;const a=Core.processFrame(input,g,null);
  g.frame=3;const b=Core.processFrame(input,g,null);
  assert.notEqual(Core.checksum(a),Core.checksum(b));
});

test("mutation is deterministic and bounded",()=>{
  const g=Core.defaultGenome(),a=Core.mutateGenome(g,17,1),b=Core.mutateGenome(g,17,1);
  assert.deepEqual(a,b);
  assert.ok(a.operators.bits.depth>=1&&a.operators.bits.depth<=8);
  assert.ok(a.operators.feedback.amount>=0&&a.operators.feedback.amount<=.95);
});

test("feedback consumes previous output",()=>{
  const input=fixture(),previous=fixture();previous.data.fill(255);
  const g=Core.defaultGenome();
  for(const[name,op]of Object.entries(g.operators))op.enabled=name==="feedback";
  g.operators.feedback.amount=.5;
  const a=Core.processFrame(input,g,null),b=Core.processFrame(input,g,previous);
  assert.notEqual(Core.checksum(a),Core.checksum(b));
});
