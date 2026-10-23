const USGS_URL='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const LOCATIONS={
 dhaka:{name:'Dhaka, Bangladesh',lat:23.8103,lon:90.4125},
 saidpur:{name:'Saidpur, Bangladesh',lat:25.7781,lon:88.8912},
 rajshahi:{name:'Rajshahi, Bangladesh',lat:24.3745,lon:88.6042},
 chattogram:{name:'Chattogram, Bangladesh',lat:22.3569,lon:91.7832},
 sylhet:{name:'Sylhet, Bangladesh',lat:24.8949,lon:91.8687},
 cox:{name:"Cox's Bazar, Bangladesh",lat:21.4272,lon:92.0058}
};
export const getLocation=(id)=>LOCATIONS[id]||LOCATIONS.dhaka;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function getJSON(url,timeout=10000){const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);try{const res=await fetch(url,{cache:'no-store',signal:controller.signal,headers:{'Accept':'application/json'}});if(!res.ok)throw new Error(`HTTP ${res.status}`);return await res.json();}finally{clearTimeout(timer);}}
export async function fetchQuakes(){const data=await getJSON(USGS_URL);if(!data||!Array.isArray(data.features))throw new Error('Invalid GeoJSON response');const events=data.features.map(f=>{const c=f.geometry?.coordinates||[];const p=f.properties||{};return{id:f.id||`${p.time}-${c[0]}`,mag:Number(p.mag)||0,place:p.place||'Location unavailable',time:Number(p.time)||Date.now(),updated:Number(p.updated)||0,url:p.url||'https://earthquake.usgs.gov/earthquakes/feed/v1.0/',lon:Number(c[0]),lat:Number(c[1]),depth:Number(c[2])||0,tsunami:Number(p.tsunami)||0,alert:p.alert||null}}).filter(e=>Number.isFinite(e.lat)&&Number.isFinite(e.lon)).sort((a,b)=>b.time-a.time);return{events,metadata:{generated:data.metadata?.generated||Date.now(),count:data.metadata?.count??events.length,title:data.metadata?.title||'USGS past-day feed'},state:'LIVE'};}
export async function fetchWeather(locationId='dhaka'){
 const loc=getLocation(locationId);const q=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,weather_code',hourly:'precipitation_probability,cape,cloud_cover,wind_gusts_10m',forecast_days:'2',timezone:'auto'});
 const data=await getJSON(`https://api.open-meteo.com/v1/forecast?${q.toString()}`);if(!data?.current)throw new Error('Missing current model data');
 const c=data.current,h=data.hourly||{};const target=String(c.time||'').slice(0,13);let ix=(h.time||[]).findIndex(t=>String(t).slice(0,13)===target);if(ix<0)ix=0;
 const val=(arr)=>Array.isArray(arr)&&Number.isFinite(Number(arr[ix]))?Number(arr[ix]):null;
 return{location:loc,coordinates:{lat:data.latitude??loc.lat,lon:data.longitude??loc.lon},current:{temperature:num(c.temperature_2m),apparent:num(c.apparent_temperature),humidity:num(c.relative_humidity_2m),precipitation:num(c.precipitation),cloud:num(c.cloud_cover),pressure:num(c.pressure_msl),wind:num(c.wind_speed_10m),windDirection:num(c.wind_direction_10m),gust:num(c.wind_gusts_10m),code:num(c.weather_code),time:c.time||null},hourly:{precipProbability:val(h.precipitation_probability),cape:val(h.cape),cloud:val(h.cloud_cover),gust:val(h.wind_gusts_10m)},timezone:data.timezone||'model local',state:'MODEL'};
}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
export function demoQuakes(){const now=Date.now();return[{id:'DEMO-A',mag:4.7,place:'DEMO · illustrative event near Banda Sea',time:now-1000*60*18,lat:-5.1,lon:129.4,depth:32,url:'#',demo:true},{id:'DEMO-B',mag:3.8,place:'DEMO · illustrative event near Japan Trench',time:now-1000*60*66,lat:38.2,lon:143.7,depth:22,url:'#',demo:true},{id:'DEMO-C',mag:2.9,place:'DEMO · illustrative event in the Hindu Kush region',time:now-1000*60*140,lat:36.6,lon:70.8,depth:90,url:'#',demo:true}];}
export function getWeatherDescription(code){if(code==null)return'Forecast model loaded';if(code===0)return'Clear sky';if([1,2,3].includes(code))return code===1?'Mainly clear':code===2?'Partly cloudy':'Overcast';if([45,48].includes(code))return'Fog / depositing rime fog';if([51,53,55,56,57].includes(code))return'Drizzle conditions';if([61,63,65,66,67,80,81,82].includes(code))return'Rain / rain showers';if([71,73,75,77,85,86].includes(code))return'Snow / snow showers';if([95,96,99].includes(code))return'Thunderstorm in model output';return'Variable conditions';}
export function weatherGlyph(code){if(code==null)return'◌';if(code===0)return'☼';if([1,2,3].includes(code))return'◒';if([45,48].includes(code))return'≋';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return'☂';if([95,96,99].includes(code))return'ϟ';if([71,73,75,77,85,86].includes(code))return'❄';return'◌';}
export function getGibsImageURL(date){const qs=new URLSearchParams({SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.1.1',LAYERS:'MODIS_Terra_CorrectedReflectance_TrueColor',STYLES:'',SRS:'EPSG:4326',BBOX:'-180,-90,180,90',WIDTH:'1024',HEIGHT:'512',FORMAT:'image/jpeg',TIME:date});return`https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${qs.toString()}`;}
export function previousUtcDate(days=2){const d=new Date(Date.now()-days*86400000);return d.toISOString().slice(0,10);}
