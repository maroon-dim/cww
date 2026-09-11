import {loadGlobeTexture,REGION_DETAIL_BOUNDS} from './satellite.js';

export function globeRenderSize(width,height,pixelRatio=1,highDetail=false){
  const budget=highDetail?8294400:2500000;
  const ratio=Math.min(pixelRatio,highDetail?2:1.5,Math.sqrt(budget/(width*height)));
  return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}

// Orthographic rays intersect a shaded 3D sphere; overlays share its projection.
export const globeVertexShader=`attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
export const globeFragmentShader=`
precision highp float;
varying vec2 uv;
uniform vec2 resolution;
uniform vec2 center;
uniform float radius;
uniform vec2 rotation;
uniform float time;
uniform float vivid;
uniform float vintage;
uniform sampler2D land;
uniform sampler2D borders;
uniform sampler2D cityLights;
uniform sampler2D satellite;
uniform sampler2D regionDetail;
uniform vec4 regionBounds;
uniform float regionBlend;
uniform float satelliteBlend;
const float PI=3.14159265359;
vec3 gradeSurface(vec3 color){
  vec3 sepia=vec3(dot(color,vec3(.393,.769,.189)),dot(color,vec3(.349,.686,.168)),dot(color,vec3(.272,.534,.131)));
  sepia=mix(vec3(dot(sepia,vec3(.2126,.7152,.0722))),sepia,.7);
  return mix(color,sepia,vintage);
}
void main(){
  vec2 p=(uv*resolution-center)/radius;
  float d=length(p),z=sqrt(max(0.,1.-dot(p,p)));
  vec3 n=vec3(p,z),color=vec3(0.);float alpha=0.;
  vec3 atmosphereColor=vec3(.13,.52,1.);
  if(d<1.){
    float ca=cos(rotation.x),sa=sin(rotation.x),cb=cos(rotation.y),sb=sin(rotation.y);
    float front=-sb*p.y+cb*z;
    vec3 world=vec3(ca*front-sa*p.x,cb*p.y+sb*z,sa*front+ca*p.x);
    vec2 geo=vec2(atan(world.z,world.x)/(2.*PI)+.5,asin(clamp(world.y,-1.,1.))/PI+.5);
    float terrain=texture2D(land,geo).r;
    vec3 boundary=texture2D(borders,geo).rgb;
    vec3 light=normalize(vec3(-.65,.4,.8));
    float diffuse=max(0.,dot(n,light));
    float fresnel=pow(1.-z,4.);
    vec3 base=mix(vec3(.024,.08,.17),vec3(.12,.31,.48),terrain);
    vec3 surface=mix(base,texture2D(satellite,geo).rgb,satelliteBlend);
    vec2 localUV=(geo*vec2(360.,180.)-vec2(180.,90.)-regionBounds.xy)/regionBounds.zw;
    vec2 feather=smoothstep(vec2(0.),vec2(.04),localUV)*smoothstep(vec2(0.),vec2(.04),1.-localUV);
    float detailAmount=feather.x*feather.y*regionBlend;
    surface=mix(surface,texture2D(regionDetail,localUV).rgb,detailAmount);
    // Expand terrain midtones before lighting; city lights and borders keep their range.
    float gray=dot(surface,vec3(.2126,.7152,.0722));
    surface=mix(surface,vec3(clamp((gray-.14)*1.35+.14,0.,1.)),vintage);
    color=surface*(.22+.98*diffuse);
    // Gentle blue illumination keeps flat terrain facets legible in the shade.
    color+=vec3(.005,.018,.035)*(1.-terrain)*diffuse;
    float specular=pow(max(0.,dot(reflect(-light,n),vec3(0.,0.,1.))),70.);
    color+=vec3(.45,.56,.64)*specular*.2*(1.-terrain);
    vec3 urban=texture2D(cityLights,geo).rgb;
    float pulse=.97+.03*sin(time*.6+geo.x*91.+geo.y*37.);
    // Lights remain legible across the lit surface and grow on the shadow side.
    color+=urban*terrain*(.65+(1.-diffuse)*1.3)*pulse*smoothstep(0.,.16,z);
    color+=atmosphereColor*fresnel*(.36+.05*vivid)*(.3+.7*diffuse);
    // Grade the landscape and lights before adding the country identity colors.
    color=gradeSurface(color);
    // Preserve saturated border cores against the terrain, with a brighter halo.
    float outline=smoothstep(.24,.78,max(boundary.r,max(boundary.g,boundary.b)));
    color*=1.-outline*.88;
    color+=boundary*1.2;
    alpha=1.-smoothstep(1.-1./radius,1.,d);color*=alpha;
  }else{
    float atmosphere=exp(-(d-1.)*65.)*.24;
    color=gradeSurface(atmosphereColor*atmosphere);
    alpha=atmosphere;
  }
  // Pre-multiplied alpha preserves the soft glow against the star field.
  gl_FragColor=vec4(color,alpha);
}`;

export function createGlobeSurface(canvas){
  let gl;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:true,powerPreference:'high-performance'});}catch{}
  if(!gl)return null;
  let program,buffer;const shaders=[],textures=[];
  try{
    const compile=(type,source)=>{const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Globe shader compilation failed');return shader;};
    program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,globeVertexShader));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,globeFragmentShader));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Globe shader link failed');
    buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position'),uniforms=Object.fromEntries(['resolution','center','radius','rotation','time','vivid','vintage','land','borders','cityLights','satellite','satelliteBlend','regionDetail','regionBounds','regionBlend'].map(name=>[name,gl.getUniformLocation(program,name)]));
    let lost=false,disposed=false,loadedAt=null,latestTime=0,detailRequested=false,detailLoadedAt=null;
    const texture=(slot,source,mipmap=false)=>{
      if(textures[slot])gl.deleteTexture(textures[slot]);const texture=gl.createTexture();textures[slot]=texture;
      gl.activeTexture(gl.TEXTURE0+slot);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,mipmap?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      if(mipmap){gl.generateMipmap(gl.TEXTURE_2D);const filter=gl.getExtension('EXT_texture_filter_anisotropic');if(filter)gl.texParameterf(gl.TEXTURE_2D,filter.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(filter.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));}
    };
    // Tiny placeholders let the first frame paint before any large GPU upload.
    const placeholder=document.createElement('canvas');placeholder.width=placeholder.height=1;
    for(let slot=0;slot<5;slot++)texture(slot,placeholder);
    const onLost=()=>{lost=true;};canvas.addEventListener('webglcontextlost',onLost);
    async function prepareTextures(){
      let failed=false;
      for(const slot of [0,3,1,2]){
        if(lost||disposed)return;
        try{
          const source=await loadGlobeTexture(slot);
          // Upload one decoded image per frame, after the browser has painted.
          await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
          if(lost||disposed)return;
          texture(slot,source,slot===3);
          if(slot===3){loadedAt=latestTime;canvas.dataset.satellite='ready';}
          canvas.dispatchEvent(new Event('globe-texture-ready',{bubbles:true}));
        }catch{failed=true;if(slot===3)canvas.dataset.satellite='unavailable';}
      }
      if(!disposed&&!lost)canvas.dataset.textures=failed?'partial':'ready';
    }
    const baseReady=prepareTextures();
    async function prepareDetail(){
      detailRequested=true;
      try{
        await baseReady;const source=await loadGlobeTexture(4);
        await new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
        if(lost||disposed)return;
        texture(4,source,true);detailLoadedAt=latestTime;canvas.dataset.detail='ready';
        canvas.dispatchEvent(new Event('globe-texture-ready',{bubbles:true}));
      }catch{canvas.dataset.detail='unavailable';}
    }
    return {
      gpu:true,
      get available(){return !lost;},
      draw(view,width,height,regions,options={}){
        if(lost)return;
        latestTime=options.time||0;
        if(!detailRequested&&view.radius>Math.min(width*.43,height*.405)*1.15&&view.lon>5&&view.lon<90)void prepareDetail();
        // Region outlines use the same source geometry, baked into their texture.
        const {width:w,height:h}=globeRenderSize(width,height,globalThis.devicePixelRatio||1,options.highDetail);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        gl.uniform2f(uniforms.resolution,width,height);gl.uniform2f(uniforms.center,view.cx,height-view.cy);gl.uniform1f(uniforms.radius,view.radius);gl.uniform2f(uniforms.rotation,view.lon*Math.PI/180,view.lat*Math.PI/180);gl.uniform1f(uniforms.time,options.time||0);gl.uniform1f(uniforms.vivid,options.era==='both-ai'?1:0);
        gl.uniform1f(uniforms.satelliteBlend,loadedAt===null?0:options.reducedMotion?1:Math.min(1,(latestTime-loadedAt)/.65));
        gl.uniform1f(uniforms.vintage,options.vintage||0);
        const {west,south,east,north}=REGION_DETAIL_BOUNDS;
        gl.uniform4f(uniforms.regionBounds,west,south,east-west,north-south);
        gl.uniform1f(uniforms.regionBlend,detailLoadedAt===null?0:options.reducedMotion?1:Math.min(1,(latestTime-detailLoadedAt)/.65));
        for(let i=0;i<5;i++){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,textures[i]);}gl.uniform1i(uniforms.land,0);gl.uniform1i(uniforms.borders,1);gl.uniform1i(uniforms.cityLights,2);gl.uniform1i(uniforms.satellite,3);gl.uniform1i(uniforms.regionDetail,4);gl.drawArrays(gl.TRIANGLES,0,6);
      },
      dispose(){disposed=true;canvas.removeEventListener('webglcontextlost',onLost);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));textures.forEach(texture=>gl.deleteTexture(texture));}
    };
  }catch{
    if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);shaders.forEach(shader=>gl.deleteShader(shader));textures.forEach(texture=>gl.deleteTexture(texture));return null;
  }
}
