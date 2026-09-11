import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {REGION_DETAIL_BOUNDS as bounds} from '../dist/satellite.js';

if(!process.argv[2])throw Error('Pass the downloaded NASA July 21600 x 10800 JPEG path.');
const bytes=await readFile(process.argv[2]),source=await loadImage(bytes);
if(source.width!==21600||source.height!==10800)throw Error('Expected the original 21600 x 10800 NASA image.');
const x=(bounds.west+180)/360*source.width,y=(90-bounds.north)/180*source.height;
const width=(bounds.east-bounds.west)/360*source.width,height=(bounds.north-bounds.south)/180*source.height;
const cropped=createCanvas(width,height);
cropped.getContext('2d').drawImage(source,x,y,width,height,0,0,width,height);
const directory=new URL('assets/',import.meta.url);await mkdir(directory,{recursive:true});
await writeFile(new URL('earth-region-july.jpg',directory),await cropped.encode('jpeg',97));
await writeFile(new URL('earth-region-july.json',directory),JSON.stringify({
  source:'https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x21600x10800.jpg',
  sourceWidth:source.width,sourceHeight:source.height,sourceSha256:createHash('sha256').update(bytes).digest('hex'),
  bounds,width,height
},null,2)+'\n');
console.log('Saved native satellite crop: '+width+' x '+height);
