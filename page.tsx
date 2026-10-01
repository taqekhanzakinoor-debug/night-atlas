'use client';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Orbit, MapPin, Moon, Sun, Sparkles, Compass, SlidersHorizontal, X, Check, Send, LocateFixed, ChevronLeft, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { skyAt, eveningEvents, toDate, clock, direction, places, type Place, type Target } from './sky';

type Message={role:'user'|'model';text:string};
function point(t:Target){const r=(90-t.altitude)/90*230,a=t.azimuth*Math.PI/180;return {x:300-r*Math.sin(a),y:270-r*Math.cos(a)};}
function SkyMap({targets,selected,onSelect,labels}:{targets:Target[];selected:string;onSelect:(id:string)=>void;labels:boolean}){
 const visible=targets.filter(t=>t.altitude>0);
 return <svg className="sky-map" viewBox="0 0 600 540" role="img" aria-label="Calculated all-sky chart. North is at the top and east on the left. Select targets from the list below.">
  <defs><radialGradient id="skyfill"><stop offset="0" stopColor="#142538"/><stop offset="1" stopColor="#0a1421"/></radialGradient></defs>
  <circle cx="300" cy="270" r="230" fill="url(#skyfill)" stroke="#31404c"/>
  {[76.67,153.33].map((r,i)=><g key={r}><circle cx="300" cy="270" r={r} fill="none" stroke="#293744" strokeDasharray="2 6"/><text x="306" y={266-r} className="grid-label">{60-i*30}°</text></g>)}
  {[0,45,90,135].map(a=><line key={a} x1="70" y1="270" x2="530" y2="270" transform={`rotate(${a} 300 270)`} stroke="#253240" strokeDasharray="2 7"/>)}
  {Array.from({length:72},(_,i)=>{const a=i*Math.PI/36;return <line key={i} x1={300+231*Math.sin(a)} y1={270+231*Math.cos(a)} x2={300+(i%9===0?240:235)*Math.sin(a)} y2={270+(i%9===0?240:235)*Math.cos(a)} stroke="#506070" strokeWidth={i%9===0?1.5:0.6}/>})}
  <text x="300" y="19" textAnchor="middle" className="cardinal">N</text><text x="45" y="276" textAnchor="middle" className="cardinal">E</text><text x="555" y="276" textAnchor="middle" className="cardinal">W</text><text x="300" y="527" textAnchor="middle" className="cardinal">S</text>
  <text x="126" y="92" className="intercardinal">NE</text><text x="456" y="92" className="intercardinal">NW</text><text x="126" y="460" className="intercardinal">SE</text><text x="456" y="460" className="intercardinal">SW</text>
  {visible.map(t=>{const p=point(t),active=t.id===selected,planet=t.type!=='Star',r=planet?4.5:Math.max(0.8,3.6-t.magnitude*.65),interactive=planet||t.named;return <g key={t.id} onClick={()=>interactive&&onSelect(t.id)} className={interactive?'chart-target':''}>
   {active&&<><circle cx={p.x} cy={p.y} r="16" fill="#d6edaa12" stroke="#d6edaa" strokeDasharray="3 3"/><circle cx={p.x} cy={p.y} r="23" fill="none" stroke="#d6edaa22"/></>}
   {planet&&<circle cx={p.x} cy={p.y} r="10" fill={t.color} opacity=".09"/>}
   <circle cx={p.x} cy={p.y} r={r} fill={t.color} opacity={planet?1:Math.max(.35,1-t.magnitude*.1)}/>
   {interactive&&<circle cx={p.x} cy={p.y} r="12" fill="transparent"><title>{t.name}: {t.altitude.toFixed(0)}° above the horizon, {direction(t.azimuth)}</title></circle>}
   {(active||(labels&&(planet||t.magnitude<1.25)))&&<text x={p.x+(p.x>450?-10:10)} y={p.y-10} textAnchor={p.x>450?'end':'start'} className={active?'selected-label':'star-label'}>{t.name}</text>}
  </g>})}
 </svg>;
}
export default function Home(){
 const [place,setPlace]=useState<Place>(places[0]);
 const [day,setDay]=useState('2026-10-01'),[minutes,setMinutes]=useState(21*60);
 const [selected,setSelected]=useState('Saturn'),[filter,setFilter]=useState('All targets'),[equipment,setEquipment]=useState('Unaided eyes');
 const [labels,setLabels]=useState(true),[redMode,setRedMode]=useState(false);
 const [modal,setModal]=useState<'location'|null>(null);
 const [question,setQuestion]=useState(''),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[connection,setConnection]=useState(false);
 const [locationError,setLocationError]=useState('');
 const end=useRef<HTMLDivElement>(null),dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const today=new Date(Date.now()+5*3600000).toISOString().slice(0,10);setDay(today);},[]);
 useEffect(()=>{if(modal)dialog.current?.showModal();else dialog.current?.close();},[modal]);
 useEffect(()=>{end.current?.scrollIntoView({block:'nearest',behavior:'smooth'});},[messages,busy]);
 const when=useMemo(()=>toDate(day,minutes,place.offset),[day,minutes,place.offset]);
 const sky=useMemo(()=>skyAt(when,place),[when,place]);
 const events=useMemo(()=>eveningEvents(day,place),[day,place]);
 const target=sky.targets.find(t=>t.id===selected);
 const useful=sky.targets.filter(t=>(t.type!=='Star'||(t.named&&t.magnitude<2))&&t.altitude>10).sort((a,b)=>((b.altitude>25?20:0)-b.magnitude)-((a.altitude>25?20:0)-a.magnitude));
 const shown=useful.filter(t=>filter==='All targets'||(filter==='Planets'&&t.type==='Planet')||(filter==='Stars'&&t.type==='Star')).slice(0,6);
 const timeLabel=`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
 const zone=`UTC${place.offset>=0?'+':''}${place.offset}`;
 const changeDay=(amount:number)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);const next=d.toISOString().slice(0,10);if(next>='2000-01-01'&&next<='2100-12-31')setDay(next);};
 async function ask(text=question){
  if(busy||!text.trim())return;
  setError('');setBusy(true);const history=messages.slice(-6);setMessages([...messages,{role:'user',text}]);setQuestion('');
  try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text,place,date:when.toISOString(),selected:target?.name,equipment,history})});const data=await r.json() as {answer:string;error?:string};if(!r.ok)throw new Error(data.error||'Gemma could not answer. Please try again.');setConnection(true);setMessages(prev=>[...prev,{role:'model',text:data.answer}]);}
  catch(e){setError(e instanceof Error?e.message:'Connection failed. Please try again.');setQuestion(text);setMessages(prev=>prev.slice(0,-1));}finally{setBusy(false);}
 }
 function saveLocation(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);const lat=Number(f.get('lat')),lon=Number(f.get('lon')),offset=Number(f.get('offset'));if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180||!Number.isFinite(offset)||offset < -12||offset>14)return;setPlace({name:String(f.get('name')).trim()||'Custom location',lat,lon,offset});setModal(null);}
 function locate(){setLocationError('');if(!navigator.geolocation){setLocationError('Location access is unavailable. Enter coordinates below.');return;}navigator.geolocation.getCurrentPosition(pos=>{setPlace({name:'My location',lat:pos.coords.latitude,lon:pos.coords.longitude,offset:-new Date().getTimezoneOffset()/60});setModal(null);},()=>setLocationError('Location access was unavailable. You can enter coordinates below.'),{timeout:12000});}
 return <main className={redMode?'app red-mode':'app'}>
  <header className="site-header"><a href="#" className="brand" aria-label="Night Atlas home"><Orbit size={30}/><span>NIGHT<span className="brand-light">ATLAS</span></span></a><span className="header-section"><Compass size={15}/> Sky planner</span><button className={redMode?'quiet active':'quiet'} onClick={()=>setRedMode(!redMode)} aria-pressed={redMode}><Moon size={16}/><span>Night vision</span></button></header>
  <div className="workspace">
   <div className="page-heading"><div><div className="eyebrow">A FIELD GUIDE TO THE NIGHT SKY</div><h1>Your night, mapped.</h1><p>Find your bearings. Choose a target. Look a little further.</p></div><div className="heading-mark"><span>EXPLORER’S LOG</span><strong>{day.replaceAll('-',' / ')}</strong></div></div>
   <section className="observation-controls" aria-label="Observing settings">
    <button className="location-control" onClick={()=>{setLocationError('');setModal('location');}}><MapPin size={19}/><span><small>OBSERVING FROM</small><strong>{place.name}</strong></span><SlidersHorizontal size={16}/></button>
    <label className="date-control"><small>OBSERVING DATE</small><input aria-label="Observing date" type="date" value={day} min="2000-01-01" max="2100-12-31" onChange={e=>{if(e.target.value>='2000-01-01'&&e.target.value<='2100-12-31')setDay(e.target.value);}}/></label>
    <label className="equipment-control"><small>LOOKING WITH</small><select value={equipment} onChange={e=>setEquipment(e.target.value)}><option>Unaided eyes</option><option>Binoculars</option><option>Telescope</option></select></label>
    <div className="coordinates"><span>{Math.abs(place.lat).toFixed(2)}° {place.lat>=0?'N':'S'}</span><span>{Math.abs(place.lon).toFixed(2)}° {place.lon>=0?'E':'W'}</span></div>
   </section>
   <div className="main-grid">
    <section className="map-panel panel" aria-labelledby="map-title">
     <div className="panel-heading"><div><span className="eyebrow">THE VIEW ABOVE YOU</span><h2 id="map-title">Sky at {timeLabel} <small>{zone}</small></h2></div><button className={labels?'toggle selected':'toggle'} onClick={()=>setLabels(!labels)} aria-pressed={labels}>Labels</button></div>
     <div className="chart-wrap"><SkyMap targets={sky.targets} selected={selected} onSelect={setSelected} labels={labels}/><div className="chart-legend"><span><i className="planet-dot"/> Solar system</span><span><i/> Stars</span></div><div className="projection-note">LOOKING UP<br/>Horizon at the edge</div></div>
     {target&&<div className="target-readout"><span className="target-symbol" style={{color:target.color}}>{target.type==='Star'?<Sparkles size={19}/>:<Orbit size={20}/>}</span><div><strong>{target.name}</strong><small>{target.type} · {target.altitude>0?'Above horizon':'Below horizon'}</small></div><div className="readout-number"><strong>{target.altitude.toFixed(0)}°</strong><small>ALTITUDE</small></div><div className="readout-number"><strong>{direction(target.azimuth)}</strong><small>{target.azimuth.toFixed(0)}° BEARING</small></div><button className="ask-target" onClick={()=>ask(`How can I observe ${target.name} at my selected time with ${equipment.toLowerCase()}?`)} title={`Ask Gemma about ${target.name}`}><Sparkles size={17}/><span>Ask Gemma</span></button></div>}
     <div className="time-control"><div className="time-top"><span><button aria-label="Previous day" className="icon-button" onClick={()=>changeDay(-1)}><ChevronLeft size={16}/></button><strong>{timeLabel}</strong><small>{zone}</small><button aria-label="Next day" className="icon-button" onClick={()=>changeDay(1)}><ChevronRight size={16}/></button></span><label htmlFor="sky-time">Move through the day</label></div><input id="sky-time" type="range" min="0" max="1430" step="10" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/><div className="time-ticks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:50</span></div></div>
    </section>
    <aside className="guide-panel panel" aria-labelledby="guide-title"><div className="guide-head"><span className="gemma-icon"><Sparkles size={20}/></span><div><h2 id="guide-title">Your sky companion</h2><span>WITH GEMMA · OPEN-WEIGHT AI</span></div></div>
     <div className="guide-context"><MapPin size={12}/>{place.name.split(',')[0]}<span>·</span>{timeLabel}<span>·</span>{equipment}</div>
     <div className="conversation" aria-live="polite">
      {messages.length===0?<div className="guide-welcome"><div className="guide-orbit"><Compass size={38} strokeWidth={1}/></div><div className="eyebrow">A LITTLE GUIDANCE GOES A LONG WAY</div><h3>Make the most<br/>of your night.</h3><p>Ask Gemma what to look for, where to find it, and what makes it worth a closer look.</p><div className="prompt-list">{['Plan a 30-minute stargazing session','What can I see without a telescope?','How will the Moon affect my view?'].map((p,i)=><button key={p} onClick={()=>ask(p)}><span>0{i+1}</span>{p}<Sparkles size={14}/></button>)}</div></div>:messages.map((m,i)=><div className={`message ${m.role}`} key={i}><span>{m.role==='model'?'GEMMA':'YOU'}</span><p>{m.text}</p></div>)}
      {busy&&<div className="thinking"><Sparkles size={15}/> Gemma is reading your sky…</div>}<div ref={end}/>
     </div>
     {error&&<p className="error" role="alert">{error}</p>}
     <form className="chat-form" onSubmit={e=>{e.preventDefault();ask();}}><label className="sr-only" htmlFor="question">Ask Gemma an astronomy question</label><textarea id="question" placeholder="Ask about your night sky…" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={2000} rows={2} disabled={busy} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask();}}}/><button type="submit" aria-label="Send question" disabled={busy||!question.trim()}><Send size={18}/></button></form>
     <div className="guide-footer"><span className={connection?'connected':''}>{connection?'Gemma connected':'Ask Gemma to begin'}</span><span>Check AI advice before observing.</span></div>
    </aside>
   </div>
   <section className="conditions" aria-label="Observing conditions"><div><Sun size={21}/><span><small>SKY AT {timeLabel}</small><strong>{sky.skyState}</strong></span></div><div><Moon size={21}/><span><small>MOON ILLUMINATED</small><strong>{Math.round(sky.moonFraction*100)}% <em>{sky.moonPhase<180?'Waxing':'Waning'}</em></strong></span></div><div><Compass size={21}/><span><small>FULL DARKNESS STARTS</small><strong>{clock(events.dark,place.offset)} <em>{zone}</em></strong></span></div><p><Info size={15}/>Calculated sky positions.<br/>Weather and light pollution are not included.</p></section>
   <section className="targets-section" aria-labelledby="targets-title"><div className="section-heading"><div><span className="eyebrow">START LOOKING HERE</span><h2 id="targets-title">Above your horizon</h2></div><div className="filters" role="group" aria-label="Target type">{['All targets','Planets','Stars'].map(f=><button key={f} className={f===filter?'active':''} aria-pressed={f===filter} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
    {sky.sunAltitude>-6&&<p className="daylight-note">The sky is still bright at this time. Positions are shown, but most stars will not be visible. Move the time slider to after dark.</p>}
    <div className="target-cards">{shown.length===0?<p className="empty">No matching targets above 10° at this time. Try another time or target type.</p>:shown.map(t=><button key={t.id} className={selected===t.id?'target-card chosen':'target-card'} onClick={()=>setSelected(t.id)}><div className="card-top"><span className="target-kind">{t.type==='Star'?<Sparkles size={15}/>:<Orbit size={16}/>} {t.type}</span><span className="bearing">{direction(t.azimuth)} · {Math.round(t.altitude)}°</span></div><h3>{t.name}</h3><div className="card-bottom"><span>{t.type==='Moon'?'Lunar features':t.magnitude>5?'Optical aid recommended':t.type==='Star'?'Bright-star landmark':'Solar-system target'}</span><span className="selection-ring">{selected===t.id&&<Check size={11}/>}</span></div></button>)}</div>
   </section>
   <footer className="site-footer"><span><Orbit size={17}/> NIGHT ATLAS <span className="footer-divider">/</span> KEEP LOOKING UP</span><div><a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noreferrer">Astronomy Engine</a><a href="https://github.com/astronexus/HYG-Database" target="_blank" rel="noreferrer">HYG star catalog · CC BY-SA 4.0</a><a href="https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api" target="_blank" rel="noreferrer">About Gemma <ExternalLink size={11}/></a></div></footer>
  </div>
  <dialog ref={dialog} onCancel={()=>setModal(null)} onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="modal"><button className="modal-close icon-button" aria-label="Close dialog" onClick={()=>setModal(null)}><X size={22}/></button>
   <><span className="eyebrow">SET YOUR VIEWPOINT</span><h2>Where are you looking up?</h2><div className="city-presets">{places.map(p=><button key={p.name} onClick={()=>{setPlace(p);setModal(null);}}>{p.name.split(',')[0]}</button>)}</div><button className="locate-button" onClick={locate}><LocateFixed size={17}/> Use my current location</button>{locationError&&<p className="error">{locationError}</p>}<form onSubmit={saveLocation}><label>Location name<input name="name" defaultValue={place.name} maxLength={100} required/></label><div className="coordinate-inputs"><label>Latitude<input name="lat" type="number" min="-90" max="90" step="any" defaultValue={place.lat} required/></label><label>Longitude<input name="lon" type="number" min="-180" max="180" step="any" defaultValue={place.lon} required/></label></div><label>UTC offset at your observing date<input name="offset" type="number" min="-12" max="14" step=".25" defaultValue={place.offset} required/></label><p className="key-note">Use negative longitude west of Greenwich. For locations with daylight saving, adjust the UTC offset for your chosen date.</p><button className="primary" type="submit">Set observing location</button></form></>
  </div></dialog>
 </main>;
}
