// Prebuilt from the same NASA terrain, geographic borders, and city-light artwork.
// Expensive painting lives in scripts/bake-globe.mjs, never in page startup.
export const GLOBE_TEXTURE_URLS=[
  '/textures/globe-land-mask.png',
  '/textures/globe-borders.png',
  '/textures/globe-city-lights.png',
  '/textures/globe-terrain.png',
  '/textures/globe-region-detail.png'
];
export const REGION_DETAIL_BOUNDS={west:25,south:18,east:70,north:48};
export function regionDetailUV(lon,lat){
  const {west,south,east,north}=REGION_DETAIL_BOUNDS;
  return {u:(lon-west)/(east-west),v:(lat-south)/(north-south)};
}
export const SATELLITE_TEXTURE_URL=GLOBE_TEXTURE_URLS[3];
const pending=new Map();
export function loadGlobeTexture(slot){
  if(!GLOBE_TEXTURE_URLS[slot])return Promise.reject(Error('Unknown globe texture'));
  if(!pending.has(slot)){
    const promise=new Promise((resolve,reject)=>{
      const image=new Image();image.decoding='async';
      image.onload=async()=>{try{if(image.decode)await image.decode();resolve(image);}catch(error){reject(error);}};
      image.onerror=()=>reject(Error('Globe texture unavailable'));
      image.src=GLOBE_TEXTURE_URLS[slot];
    });
    pending.set(slot,promise);promise.catch(()=>pending.delete(slot));
  }
  return pending.get(slot);
}
export function loadSatelliteSurface(){return loadGlobeTexture(3);}
