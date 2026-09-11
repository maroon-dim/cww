export const ARRIVAL_TIME=3500,HOLD_TIME=1000,DOCK_TIME=1100;
export const APPROACH_DURATION=ARRIVAL_TIME+HOLD_TIME+DOCK_TIME;
export const smooth=(value)=>{const t=Math.max(0,Math.min(1,value));return t*t*t*(10+t*(-15+6*t));};
export const INTRO_DURATION=4200;
export const REGION_ZOOM_DURATION=2800,REGION_FADE_DURATION=900;
export function introFrame(elapsed){
  const progress=smooth(elapsed/INTRO_DURATION);
  return {progress,lon:-137+180*progress,lat:-18+46*progress,scale:.92+.08*progress,lift:.09*(1-progress)};
}
export function introGlobeCamera(elapsed,unit){
  const pose=introFrame(elapsed);
  return {x:(43-pose.lon)*unit*Math.PI/180,y:(pose.lat-28)*unit*Math.PI/180,scale:pose.scale,offset:0};
}
export function regionGlobeCamera(unit){
  return {x:0,y:5*unit*Math.PI/180,scale:3.5,offset:0};
}
export function regionZoomFrame(elapsed){
  return {progress:smooth(elapsed/REGION_ZOOM_DURATION),reveal:smooth((elapsed-REGION_ZOOM_DURATION+REGION_FADE_DURATION)/REGION_FADE_DURATION)};
}
export function regionZoomCamera(elapsed,unit){
  const {progress}=regionZoomFrame(elapsed),to=regionGlobeCamera(unit);
  if(progress===1)return to;
  return {...to,y:to.y*progress,scale:Math.pow(to.scale,progress)};
}
export function approachFrame(elapsed){
  const descent=smooth((elapsed-900)/(ARRIVAL_TIME-900));
  const orbit=.18*smooth((elapsed-ARRIVAL_TIME)/(HOLD_TIME+DOCK_TIME));
  return {
    reveal:smooth((elapsed-1050)/1100),
    dock:smooth((elapsed-ARRIVAL_TIME-HOLD_TIME)/DOCK_TIME),
    distance:descent===1?12:92*Math.pow(12/92,descent),
    height:descent===1?7.2:105*Math.pow(7.2/105,descent),
    angle:.48+(.72-.48)*descent+orbit
  };
}
export function approachGlobeCamera(from,to,elapsed){
  const aim=smooth(elapsed/1250),dive=smooth(elapsed/2350);
  return {x:from.x+(to.x-from.x)*aim,y:from.y+(to.y-from.y)*aim,offset:(from.offset||0)*(1-aim),scale:Math.exp(Math.log(from.scale)+(Math.log(to.scale)-Math.log(from.scale))*dive)};
}
