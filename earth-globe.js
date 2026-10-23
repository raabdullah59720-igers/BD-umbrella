import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const TEX_URL='https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const CLOUD_URL='https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

function makeFallbackTexture(){
  const c=document.createElement('canvas'); c.width=2048; c.height=1024;
  const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,c.height); g.addColorStop(0,'#0b4f75');g.addColorStop(.48,'#0e6d93');g.addColorStop(1,'#06253e');x.fillStyle=g;x.fillRect(0,0,c.width,c.height);
  // Simplified equirectangular continents are only a local visual fallback.
  const shapes=[
   [[.07,.22],[.14,.12],[.20,.14],[.23,.23],[.19,.32],[.22,.39],[.17,.49],[.12,.42],[.11,.31]],
   [[.22,.48],[.28,.52],[.30,.64],[.27,.79],[.23,.69],[.21,.57]],
   [[.39,.22],[.46,.14],[.54,.16],[.59,.25],[.56,.34],[.48,.35],[.44,.30]],
   [[.45,.36],[.50,.39],[.51,.52],[.48,.68],[.44,.61],[.42,.48]],
   [[.54,.25],[.64,.17],[.76,.20],[.85,.28],[.81,.37],[.73,.39],[.68,.33],[.61,.39],[.56,.34]],
   [[.78,.48],[.87,.43],[.91,.53],[.87,.64],[.80,.62]],
   [[.89,.18],[.95,.16],[.97,.25],[.92,.31]],
   [[.32,.16],[.34,.12],[.37,.16],[.35,.24]],
  ];
  x.fillStyle='#579d83'; x.strokeStyle='#78c8a4';x.lineWidth=3;
  for(const poly of shapes){x.beginPath();poly.forEach((p,i)=>i?x.lineTo(p[0]*c.width,p[1]*c.height):x.moveTo(p[0]*c.width,p[1]*c.height));x.closePath();x.fill();x.stroke();}
  // Longitude/latitude lines.
  x.strokeStyle='rgba(142,229,255,.22)';x.lineWidth=1;
  for(let i=1;i<12;i++){x.beginPath();x.moveTo(i*c.width/12,0);x.lineTo(i*c.width/12,c.height);x.stroke();}
  for(let i=1;i<6;i++){x.beginPath();x.moveTo(0,i*c.height/6);x.lineTo(c.width,i*c.height/6);x.stroke();}
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function latLonVector(lat,lon,r){const phi=(90-lat)*Math.PI/180;const theta=(lon+180)*Math.PI/180;return new THREE.Vector3(-r*Math.sin(phi)*Math.cos(theta),r*Math.cos(phi),r*Math.sin(phi)*Math.sin(theta));}

export async function createEarthGlobe(container, callbacks={}){
  const loading=document.getElementById('earthLoading'), fallback=document.getElementById('earthFallback');
  const scene=new THREE.Scene();scene.background=new THREE.Color('#030810');
  const camera=new THREE.PerspectiveCamera(40,1,.1,80);camera.position.set(0,0,3.05);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.domElement.className='webgl-earth';renderer.domElement.setAttribute('aria-label','Interactive 3D Earth globe. Drag to rotate, scroll to zoom.');
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=1.55;controls.maxDistance=5.4;controls.autoRotate=true;controls.autoRotateSpeed=.55;controls.enablePan=false;
  scene.add(new THREE.AmbientLight(0x6a9bb9,1.35));
  const key=new THREE.DirectionalLight(0xc4eeff,3.1);key.position.set(-3,2,4);scene.add(key);
  const rim=new THREE.PointLight(0x20b9ff,2.5,12);rim.position.set(2,-1,-3);scene.add(rim);
  const earthGroup=new THREE.Group();scene.add(earthGroup);
  const fallbackTexture=makeFallbackTexture();
  let earthTexture=fallbackTexture, textureState='FALLBACK TEXTURE';
  try{const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');earthTexture=await new Promise((resolve,reject)=>loader.load(TEX_URL,resolve,undefined,reject));earthTexture.colorSpace=THREE.SRGBColorSpace;textureState='EARTH TEXTURE';}catch(_){/* Local procedural texture remains available. */}
  const earth=new THREE.Mesh(new THREE.SphereGeometry(1,96,72),new THREE.MeshStandardMaterial({map:earthTexture,roughness:.93,metalness:.02,emissive:new THREE.Color('#04111c'),emissiveIntensity:.12}));earthGroup.add(earth);
  let cloudMesh=null;
  try{const cloudTex=await new Promise((resolve,reject)=>new THREE.TextureLoader().setCrossOrigin('anonymous').load(CLOUD_URL,resolve,undefined,reject));cloudTex.colorSpace=THREE.SRGBColorSpace;cloudMesh=new THREE.Mesh(new THREE.SphereGeometry(1.008,72,56),new THREE.MeshStandardMaterial({map:cloudTex,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide}));earthGroup.add(cloudMesh);}catch(_){cloudMesh=null;}
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.045,72,56),new THREE.MeshBasicMaterial({color:0x2aaeff,transparent:true,opacity:.10,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false}));earthGroup.add(atmosphere);
  const gridGroup=new THREE.Group();earthGroup.add(gridGroup);
  const gridMat=new THREE.LineBasicMaterial({color:0x69dfff,transparent:true,opacity:.16,depthWrite:false});
  for(let lat=-75;lat<=75;lat+=15){const pts=[];for(let lon=0;lon<=360;lon+=3)pts.push(latLonVector(lat,lon,1.006));gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
  for(let lon=0;lon<180;lon+=15){const pts=[];for(let lat=-90;lat<=90;lat+=3)pts.push(latLonVector(lat,lon,1.006));gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),gridMat));}
  const quakeGroup=new THREE.Group();earthGroup.add(quakeGroup);const markerObjects=[];
  // Illustrative satellite orbit: deliberately not live ephemeris or a tracked satellite.
  const orbitGroup=new THREE.Group();earthGroup.add(orbitGroup);orbitGroup.rotation.set(.72,.27,.18);
  const orbitPoints=[];for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;orbitPoints.push(new THREE.Vector3(Math.cos(a)*1.43,Math.sin(a)*1.43,0));}
  orbitGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(orbitPoints),new THREE.LineBasicMaterial({color:0x48b8e8,transparent:true,opacity:.37})));
  const sat=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(.045,.035,.055),new THREE.MeshStandardMaterial({color:0xd7f6ff,metalness:.6,roughness:.3}));sat.add(body);
  const solarMat=new THREE.MeshBasicMaterial({color:0x2879cf});const panelL=new THREE.Mesh(new THREE.BoxGeometry(.14,.008,.055),solarMat);panelL.position.x=-.095;sat.add(panelL);const panelR=panelL.clone();panelR.position.x=.095;sat.add(panelR);orbitGroup.add(sat);
  const satGlow=new THREE.PointLight(0x56dcff,.35,1);sat.add(satGlow);
  // Stars in inertial background.
  const starN=1100, starPos=new Float32Array(starN*3);for(let i=0;i<starN;i++){const rad=8+Math.random()*18,theta=Math.random()*Math.PI*2,phi=Math.acos(2*Math.random()-1);starPos[i*3]=rad*Math.sin(phi)*Math.cos(theta);starPos[i*3+1]=rad*Math.cos(phi);starPos[i*3+2]=rad*Math.sin(phi)*Math.sin(theta);}
  const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:0x9bd9f3,size:.025,transparent:true,opacity:.7,sizeAttenuation:true}));scene.add(stars);
  const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();let currentQuakes=[];let disposed=false;let raf=0;let last=performance.now();
  function resize(){if(disposed)return;const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  function clearMarkers(){while(quakeGroup.children.length){const obj=quakeGroup.children.pop();if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose();}}markerObjects.length=0;}
  function setQuakes(events){currentQuakes=Array.isArray(events)?events:[];clearMarkers();const shown=currentQuakes.filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lon)).slice(0,160);
    for(const e of shown){const m=Number(e.mag)||0;const color=m>=5?0xff6279:m>=4?0xffc36a:0x57e0ff;const p=latLonVector(e.lat,e.lon,1.014+(Math.min(7,Math.max(0,m))*.001));const radius=.006+Math.min(7,Math.max(0,m))*.0019;
      const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,depthWrite:false});const marker=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),material);marker.position.copy(p);marker.userData={event:e};quakeGroup.add(marker);markerObjects.push(marker);
      if(m>=4.6){const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.7,radius*2.15,24),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));ring.position.copy(latLonVector(e.lat,e.lon,1.018+(Math.min(7,Math.max(0,m))*.001)));ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),ring.position.clone().normalize());ring.userData={pulse:true};quakeGroup.add(ring);}
    }
    const c=document.getElementById('globeEventCount');if(c)c.textContent=shown.length.toString();const pl=document.getElementById('plottedEvents');if(pl)pl.textContent=`${shown.length} / ${currentQuakes.length}`;
  }
  function setLayer(name,enabled){if(name==='quakes')quakeGroup.visible=enabled;if(name==='grid')gridGroup.visible=enabled;if(name==='atmosphere')atmosphere.visible=enabled;}
  function focus(lat,lon){const pos=latLonVector(lat,lon,3.05);camera.position.copy(pos);camera.lookAt(0,0,0);controls.target.set(0,0,0);controls.update();controls.autoRotate=false;}
  function reset(){camera.position.set(0,0,3.05);camera.lookAt(0,0,0);controls.target.set(0,0,0);controls.update();controls.autoRotate=true;}
  function onClick(ev){const rect=renderer.domElement.getBoundingClientRect();pointer.x=((ev.clientX-rect.left)/rect.width)*2-1;pointer.y=-((ev.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(markerObjects,false);if(hits.length&&callbacks.onSelect)callbacks.onSelect(hits[0].object.userData.event);}
  renderer.domElement.addEventListener('click',onClick);window.addEventListener('resize',resize,{passive:true});
  function animate(now){if(disposed)return;raf=requestAnimationFrame(animate);const dt=Math.min(.06,(now-last)/1000);last=now;controls.update();if(cloudMesh)cloudMesh.rotation.y+=dt*.0025;sat.position.set(Math.cos(now*.00010)*1.43,Math.sin(now*.00010)*1.43,0);sat.rotation.z=now*.0001;for(const m of quakeGroup.children){if(m.userData.pulse){const s=1+.24*Math.sin(now*.002+m.position.x*7);m.scale.setScalar(s);}}
    renderer.render(scene,camera);
  }
  resize();raf=requestAnimationFrame(animate);if(loading)loading.style.display='none';if(fallback)fallback.hidden=true;
  const status=document.getElementById('earthStatusBadge');if(status)status.innerHTML=`<i></i> 3D READY · ${textureState}`;
  const mode=document.getElementById('globeMode');if(mode)mode.textContent='3D VISUALIZATION · ORBIT TRACK IS ILLUSTRATIVE';
  return {setQuakes,setLayer,focus,reset,toggleOrbit(){controls.autoRotate=!controls.autoRotate;return controls.autoRotate;},get autoRotate(){return controls.autoRotate;},dispose(){disposed=true;cancelAnimationFrame(raf);window.removeEventListener('resize',resize);renderer.domElement.removeEventListener('click',onClick);controls.dispose();renderer.dispose();container.removeChild(renderer.domElement);}};
}
