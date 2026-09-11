import test from 'node:test';
import assert from 'node:assert/strict';
import {headquartersGeometry,headquartersCamera,createHeadquartersScene} from '../dist/hq-scene.js';
test('all six HQ models have valid triangles, lines and distinct architecture',()=>{
  const signatures=new Set();
  for(const code of ['HESA','IEI','IAIO','SADRA','ISOICO','ITMCO']){
    const {solid,lines}=headquartersGeometry(code);
    assert.ok(solid.length>360);assert.equal(solid.length%30,0);assert.equal(lines.length%20,0);
    assert.ok(solid.every(Number.isFinite));assert.ok(lines.every(Number.isFinite));
    signatures.add(solid.join(','));
  }
  assert.equal(signatures.size,6);
});
test('camera projects the model center inside the viewport at different aspect ratios',()=>{
  for(const aspect of [.6,1,2]){
    const matrix=headquartersCamera(aspect);assert.equal(matrix.length,16);assert.ok(matrix.every(Number.isFinite));
    const clip=[0,1,2,3].map(row=>matrix[4+row]*1.4+matrix[12+row]);
    assert.ok(clip[3]>0);for(let i=0;i<3;i++)assert.ok(Math.abs(clip[i]/clip[3])<1);
  }
});
test('unavailable WebGL offers an inert fallback without breaking method choices',()=>{
  const canvas={getContext:()=>null,parentElement:{dataset:{}}};const scene=createHeadquartersScene(canvas);
  assert.equal(canvas.parentElement.dataset.renderer,'fallback');
  scene.setTarget('HESA');scene.setActive(true);scene.setPaused(true);scene.dispose();
});
