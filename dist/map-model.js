export const companies = [
  {name:'Rafael',code:'RF',lon:35.09514,lat:32.86568,side:1,offset:-45},
  {name:'Elbit Systems',code:'ES',lon:34.96177,lat:32.78832,side:-1,offset:35},
  {name:'Israel Aerospace Industries',code:'IAI',lon:34.90492,lat:32.00494,side:1,offset:-20},
  {name:'Israel Weapon Industries',code:'IWI',lon:34.78132,lat:31.58204,side:1,offset:35},
  {name:'Israel Shipyards',code:'IS',lon:35.03310,lat:32.81351,side:-1,offset:-30},
  {name:'Aeronautics',code:'AN',lon:34.73739,lat:31.89984,side:-1,offset:20},
];
// Public place pins, approximate campus locations, not surveyed HQ-building points.
export const project = (lon,lat) => [(lon-35)*Math.cos(31.5*Math.PI/180)*200,(31.5-lat)*200];
export const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
export function geometryRings(geometry){return geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();}
export function boundsOf(geometry){const points=geometryRings(geometry).flat().map(([lon,lat])=>project(lon,lat));return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};}
export function fitCamera(bounds,width,height){const scale=Math.max(.05,Math.min((height-110)/(bounds.maxY-bounds.minY),(width-40)/(bounds.maxX-bounds.minX)));return {scale,x:width/2-(bounds.minX+bounds.maxX)/2*scale,y:(height-50)/2-(bounds.minY+bounds.maxY)/2*scale};}
export const toScreen = (point,camera) => [point[0]*camera.scale+camera.x,point[1]*camera.scale+camera.y];
export function zoomCamera(camera,factor,anchor,minScale,maxScale){const scale=clamp(camera.scale*factor,minScale,maxScale);const ratio=scale/camera.scale;return {scale,x:anchor[0]-(anchor[0]-camera.x)*ratio,y:anchor[1]-(anchor[1]-camera.y)*ratio};}
export function layoutLabels(items,width,height){
  const available=items.map(item=>({...item,x:clamp(item.px+(item.side>0?28:-item.width-28),12,width-item.width-12),y:clamp(item.py+item.offset-item.height/2,12,height-item.height-80)}));
  // Resolve close markers in screen space, keeping geographic points fixed.
  for(const side of [-1,1]){
    const group=available.filter(i=>i.side===side).sort((a,b)=>a.y-b.y);
    for(let i=1;i<group.length;i++)group[i].y=Math.max(group[i].y,group[i-1].y+group[i-1].height+10);
    for(let i=group.length-1;i>=0;i--)group[i].y=Math.min(group[i].y,i===group.length-1?height-group[i].height-80:group[i+1].y-group[i].height-10);
  }
  return available;
}
