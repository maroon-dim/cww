import test from 'node:test';
import assert from 'node:assert/strict';
import {iranGeometry,mapGeometry,contextCountries} from '../dist/geography.js';
import {companies,project,boundsOf,fitCamera,toScreen,zoomCamera,geometryRings} from '../dist/map-model.js';
const bounds=boundsOf(mapGeometry);
test('both countries fit desktop, phone, and landscape viewports',()=>{
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
    const camera=fitCamera(bounds,width,height);
    for(const point of [[bounds.minX,bounds.minY],[bounds.maxX,bounds.maxY]]){
      const [x,y]=toScreen(point,camera);assert.ok(x>=0&&x<=width);assert.ok(y>=0&&y<height-60);
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
test('Iran outline contains representative mainland cities',()=>{
  assert.equal(iranGeometry.type,'MultiPolygon');
  function contains(ring,[x,y]){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [xi,yi]=ring[i],[xj,yj]=ring[j];
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }return inside;}
  for(const point of [[51.39,35.69],[52.53,29.59],[59.61,36.30]])assert.ok(geometryRings(iranGeometry).some(ring=>contains(ring,point)));
  assert.ok(!geometryRings(iranGeometry).some(ring=>contains(ring,[34.78,32.08])));
});

test('regional overview keeps Israel near center and every country visible',()=>{
  const region={type:'MultiPolygon',coordinates:[...mapGeometry.coordinates,...contextCountries.flatMap(c=>c.geometry.type==='Polygon'?[c.geometry.coordinates]:c.geometry.coordinates)]};
  const regionBounds=boundsOf(region),origin=project(35,31.7);
  for(const [width,height] of [[1440,900],[390,844],[320,568],[844,390]]){
    const camera=fitCamera(regionBounds,width,height,origin);
    assert.ok(Math.abs(toScreen(origin,camera)[0]-width*.42)<1e-6);
    for(const point of geometryRings(region).flat()){
      const [x,y]=toScreen(project(...point),camera);
      assert.ok(x>=0&&x<=width&&y>=0&&y<=height-70,'Country clipped at '+width+'x'+height);
    }
  }
});
