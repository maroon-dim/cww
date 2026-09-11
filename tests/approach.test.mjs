import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROACH_DURATION,ARRIVAL_TIME,HOLD_TIME,INTRO_DURATION,REGION_ZOOM_DURATION,REGION_FADE_DURATION,introFrame,introGlobeCamera,regionGlobeCamera,regionZoomCamera,regionZoomFrame,approachFrame,approachGlobeCamera} from '../dist/approach.js';
import {globeView,globePoint} from '../dist/globe.js';
import {headquartersCamera} from '../dist/hq-scene.js';
import {createExperience} from '../dist/experience.js';

test('flight descends toward the HQ, orbits during the full-screen pause, and docks smoothly',()=>{
  let previous=approachFrame(0);
  for(let time=0;time<=APPROACH_DURATION;time+=20){
    const frame=approachFrame(time);assert.ok(frame.distance<=previous.distance);assert.ok(frame.height<=previous.height);
    assert.ok(frame.reveal>=previous.reveal&&frame.dock>=previous.dock);assert.ok(frame.dock<=frame.reveal);
    for(const aspect of [.5,1,2])assert.ok(headquartersCamera(aspect,frame.angle,0,frame).every(Number.isFinite));
    previous=frame;
  }
  for(const time of [ARRIVAL_TIME,ARRIVAL_TIME+HOLD_TIME/2,ARRIVAL_TIME+HOLD_TIME]){
    const pose=approachFrame(time);assert.equal(pose.dock,0,'view stays full screen for one second');
    assert.equal(pose.distance,12);assert.ok(Math.abs(pose.height-7.2)<1e-10);
  }
  assert.ok(approachFrame(ARRIVAL_TIME+500).angle>approachFrame(ARRIVAL_TIME).angle);
  assert.ok(approachFrame(ARRIVAL_TIME+1000).angle>approachFrame(ARRIVAL_TIME+500).angle);
  previous=approachFrame(APPROACH_DURATION);
  assert.ok(previous.angle>approachFrame(ARRIVAL_TIME+HOLD_TIME).angle,'orbit continues through docking');
  assert.deepEqual(approachFrame(APPROACH_DURATION+1000),previous,'final camera does not snap back');
  assert.equal(previous.dock,1);assert.equal(previous.reveal,1);
  for(let time=ARRIVAL_TIME;time<APPROACH_DURATION;time+=10){const speed=(approachFrame(time+10).angle-approachFrame(time).angle)*100;assert.ok(speed>=0&&speed<.18,'orbit stays slow throughout the hold and docking');}
});
test('globe flight starts at the live camera and ends aimed at the target with deep zoom',()=>{
  const from={x:28,y:-32,scale:2,offset:0},to={x:-55,y:17,scale:150,offset:0};let previous=from.scale;
  for(let time=0;time<=2050;time+=25){const frame=approachGlobeCamera(from,to,time);assert.ok(frame.scale>=previous);previous=frame.scale;}
  assert.deepEqual(approachGlobeCamera(from,to,0),from);
  const end=approachGlobeCamera(from,to,APPROACH_DURATION);assert.equal(end.x,to.x);assert.equal(end.y,to.y);assert.ok(Math.abs(end.scale-to.scale)<1e-9);
});
test('opening camera crosses half the globe smoothly and lands on the shared geographic overview',()=>{
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
    const base={x:0,y:0,scale:1,offset:0},view=globeView(base,width,height);
    const start=globeView(introGlobeCamera(0,view.unit),width,height);
    assert.ok(Math.abs(start.lon-(view.lon-180))<1e-8);
    assert.equal(globePoint(35,31.7,start).visible,false);
    assert.ok(start.cy+height*introFrame(0).lift+start.radius<=height);
    assert.deepEqual(introGlobeCamera(INTRO_DURATION,view.unit),base);
    const end=globeView(introGlobeCamera(INTRO_DURATION,view.unit),width,height);
    for(const [lon,lat] of [[35,31.7],[51.4,35.7],[60,30]])assert.ok(globePoint(lon,lat,end).visible);
  }
  let previous=introFrame(0);
  for(let time=20;time<=INTRO_DURATION;time+=20){
    const current=introFrame(time);assert.ok(current.lon>=previous.lon&&current.progress>=previous.progress);
    assert.ok(Object.values(current).every(Number.isFinite));previous=current;
  }
  assert.ok(introFrame(20).progress<.00001);assert.ok(1-introFrame(INTRO_DURATION-20).progress<.00001);
});

test('regional zoom continues from rotation to the center-button view and reveals the timer only near arrival',()=>{
  for(const [width,height] of [[1440,900],[390,844],[844,390]]){
    const {unit}=globeView({x:0,y:0,scale:1,offset:0},width,height);
    assert.deepEqual(regionZoomCamera(0,unit),introGlobeCamera(INTRO_DURATION,unit));
    const destination=regionGlobeCamera(unit);
    assert.deepEqual(destination,{x:0,y:5*unit*Math.PI/180,scale:3.5,offset:0});
    assert.deepEqual(regionZoomCamera(REGION_ZOOM_DURATION,unit),destination);
    assert.deepEqual(regionZoomCamera(REGION_ZOOM_DURATION+1000,unit),destination);
    let previous=regionZoomCamera(0,unit),previousReveal=0;
    for(let elapsed=20;elapsed<=REGION_ZOOM_DURATION;elapsed+=20){
      const camera=regionZoomCamera(elapsed,unit),{reveal}=regionZoomFrame(elapsed);
      assert.ok(camera.scale>=previous.scale&&camera.y>=previous.y);
      assert.ok(camera.scale<=destination.scale&&camera.y<=destination.y);
      assert.ok(reveal>=previousReveal&&reveal<=1);
      if(elapsed<=REGION_ZOOM_DURATION-REGION_FADE_DURATION)assert.equal(reveal,0);
      if(reveal>0)assert.ok(camera.scale>2.7,'most of the zoom remains unobscured');
      previous=camera;previousReveal=reveal;
    }
    assert.ok(regionZoomCamera(20,unit).scale-1<.00001);
    assert.ok(destination.scale-regionZoomCamera(REGION_ZOOM_DURATION-20,unit).scale<.00002);
  }
  assert.equal(regionZoomFrame(REGION_ZOOM_DURATION-REGION_FADE_DURATION/2).reveal,.5);
  assert.equal(regionZoomFrame(REGION_ZOOM_DURATION).reveal,1);
});

test('HQ choices wait for touchdown; pausing or restarting cannot leave a delayed arrival',()=>{
  const model=createExperience();model.dispatch('start');model.tick(INTRO_DURATION);model.tick(REGION_ZOOM_DURATION);model.tick(1800);model.dispatch('target',{code:'HESA',name:'HESA'});
  model.tick(1500);assert.equal(model.snapshot().phase,'approach');assert.equal(model.dispatch('method','phishing'),false);
  model.setHidden(true);model.tick(10000);assert.equal(model.snapshot().elapsed,1500);model.setHidden(false);
  model.tick(APPROACH_DURATION-1500);assert.equal(model.snapshot().phase,'method');
  model.dispatch('backToMap');model.dispatch('target',{code:'IEI',name:'IEI'});model.dispatch('restart');model.dispatch('confirmRestart');model.tick(10000);assert.equal(model.snapshot().phase,'attract');
});
