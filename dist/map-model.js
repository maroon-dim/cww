export const companies = [
  {
    "name": "HESA",
    "code": "HESA",
    "lon": 51.53,
    "lat": 32.86,
    "featured": true
  },
  {
    "name": "Iran Electronics Industries",
    "code": "IEI",
    "lon": 52.53,
    "lat": 29.59
  },
  {
    "name": "Iran Aviation Industries Organization",
    "code": "IAIO",
    "lon": 51.39,
    "lat": 35.69
  },
  {
    "name": "SADRA",
    "code": "SADRA",
    "lon": 50.84,
    "lat": 28.92
  },
  {
    "name": "ISOICO",
    "code": "ISOICO",
    "lon": 56.27,
    "lat": 27.18
  },
  {
    "name": "Iran Tractor Manufacturing Company",
    "code": "ITMCO",
    "lon": 46.29,
    "lat": 38.08
  }
];
// Illustrative city-level locations, not facility coordinates.
export const project = (lon,lat) => [(lon-54)*Math.cos(32*Math.PI/180)*200,(32-lat)*200];
export const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
export function geometryRings(geometry){return geometry.type==='Polygon'?geometry.coordinates:geometry.coordinates.flat();}
export function boundsOf(geometry){const points=geometryRings(geometry).flat().map(([lon,lat])=>project(lon,lat));return {minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minY:Math.min(...points.map(p=>p[1])),maxY:Math.max(...points.map(p=>p[1]))};}
export function fitCamera(bounds,width,height,focus){
  if(focus){
    const x=width*.42,y=(height-70)*.5,padding=Math.min(36,width*.06);
    const scale=Math.max(.0001,Math.min((x-padding)/(focus[0]-bounds.minX),(width-padding-x)/(bounds.maxX-focus[0]),(y-padding)/(focus[1]-bounds.minY),(height-90-y)/(bounds.maxY-focus[1])));
    return {scale,x:x-focus[0]*scale,y:y-focus[1]*scale};
  }
  const scale=Math.max(.05,Math.min((height-110)/(bounds.maxY-bounds.minY),(width-40)/(bounds.maxX-bounds.minX)));return {scale,x:width/2-(bounds.minX+bounds.maxX)/2*scale,y:(height-50)/2-(bounds.minY+bounds.maxY)/2*scale};
}
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
