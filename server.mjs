import http from 'node:http';
import {companies} from './dist/map-model.js';
import { readFile } from 'node:fs/promises';
const routes = new Map([['/', ['index.html','text/html']], ['/index.html',['index.html','text/html']], ['/style.css',['style.css','text/css']], ['/experience.css',['experience.css','text/css']], ...['app.js','geography.js','map-model.js','particles.js','experience.js','minigames.js','experience-ui.js','hq-scene.js','globe.js','globe-land.js','globe-webgl.js','globe-cities.js','city-lights.js','approach.js','satellite.js'].map(file=>['/'+file,[file,'text/javascript']])]);
for(const file of ['vector-games.js','vector-ui.js'])routes.set('/'+file,[file,'text/javascript']);
routes.set('/textures/earth-blue-marble.jpg',['textures/earth-blue-marble.jpg','image/jpeg']);
for(const name of ['globe-terrain','globe-land-mask','globe-city-lights','globe-borders','globe-region-detail'])routes.set('/textures/'+name+'.png',['textures/'+name+'.png','image/png']);
const port = Number(process.env.PORT || 3000);
for (const {code} of companies) routes.set('/logos/'+code+'.png',['logos/'+code+'.png','image/png']);
http.createServer(async (req,res) => {
  const route = routes.get(new URL(req.url,'http://localhost').pathname);
  if (!route || !['GET','HEAD'].includes(req.method)) { res.writeHead(404); res.end('Not found'); return; }
  try {
    const body = await readFile(new URL(`./dist/${route[0]}`,import.meta.url));
    res.writeHead(200, {'Content-Type':`${route[1]}; charset=utf-8`,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('Unable to load asset'); }
}).listen(port,'127.0.0.1',()=>console.log(`SPECTER simulation: http://localhost:${port}`));
