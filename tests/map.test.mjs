import test from 'node:test';
import assert from 'node:assert/strict';
import {israelGeometry} from '../dist/geography.js';
import {companies,project,boundsOf,fitCamera,toScreen,zoomCamera,layoutLabels} from '../dist/map-model.js';
const bounds=boundsOf(israelGeometry);
test('geography fits desktop, phone, and landscape viewports',()=>{
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
    const camera=fitCamera(bounds,width,height);
    for(const point of [[bounds.minX,bounds.minY],[bounds.maxX,bounds.maxY]]){
      const [x,y]=toScreen(point,camera);assert.ok(x>=0&&x<=width);assert.ok(y>=0&&y<height-60);
    }
    const labels=layoutLabels(companies.map(c=>{const [px,py]=toScreen(project(c.lon,c.lat),camera);return {...c,px,py,width:width<=600?145:230,height:c.name.length>22?58:44};}),width,height);
    for(const label of labels){assert.ok(label.x>=0&&label.x+label.width<=width);assert.ok(label.y>=0&&label.y+label.height<height-65);}
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j];const overlap=a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
      assert.ok(!overlap,`${width}x${height}: ${a.name} overlaps ${b.name}`);
    }
  }
});
test('zoom preserves cursor location and respects limits',()=>{
  const camera=fitCamera(bounds,1440,900),point=project(companies[0].lon,companies[0].lat),anchor=toScreen(point,camera);
  const next=zoomCamera(camera,3,anchor,camera.scale*.65,camera.scale*18);
  assert.ok(toScreen(point,next).every((value,i)=>Math.abs(value-anchor[i])<1e-8));
  assert.equal(zoomCamera(camera,100,anchor,camera.scale*.65,camera.scale*18).scale,camera.scale*18);
  assert.equal(zoomCamera(camera,.001,anchor,camera.scale*.65,camera.scale*18).scale,camera.scale*.65);
});
