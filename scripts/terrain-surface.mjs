// Preserve satellite detail instead of flattening it into triangle averages.
export const TERRAIN_WIDTH=4096,TERRAIN_HEIGHT=2048;
export function createTerrainSurface(image,createCanvas,width=TERRAIN_WIDTH,height=TERRAIN_HEIGHT){
  const surface=createCanvas(width,height),ctx=surface.getContext('2d');
  ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height),data=pixels.data;
  const tones=new Float32Array(width*height);
  for(let i=0;i<tones.length;i++)tones[i]=(data[i*4]*.2126+data[i*4+1]*.7152+data[i*4+2]*.0722)/255;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=y*width+x,left=y*width+Math.max(0,x-1),right=y*width+Math.min(width-1,x+1);
    const above=Math.max(0,y-1)*width+x,below=Math.min(height-1,y+1)*width+x;
    const local=(tones[left]+tones[right]+tones[above]+tones[below])*.25;
    const tone=Math.pow(Math.max(0,Math.min(1,tones[i]+.45*(tones[i]-local))),.9);
    data[i*4]=Math.round(5+135*tone);
    data[i*4+1]=Math.round(16+160*tone);
    data[i*4+2]=Math.round(29+170*tone);
  }
  ctx.putImageData(pixels,0,0);return surface;
}
