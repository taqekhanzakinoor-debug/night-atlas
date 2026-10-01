import * as A from 'astronomy-engine';
import stars from './stars.json';

export type Place = { name: string; lat: number; lon: number; offset: number };
export type Target = { id: string; name: string; type: 'Planet' | 'Moon' | 'Star'; altitude: number; azimuth: number; magnitude: number; color: string; named: boolean };
export const places: Place[] = [
 {name:'Islamabad, Pakistan',lat:33.6844,lon:73.0479,offset:5},
 {name:'Karachi, Pakistan',lat:24.8607,lon:67.0011,offset:5},
 {name:'Quetta, Pakistan',lat:30.1798,lon:66.975,offset:5},
 {name:'Lahore, Pakistan',lat:31.5204,lon:74.3587,offset:5},
];
export function toDate(day: string, minutes: number, offset: number) {
 return new Date(Date.parse(day+'T00:00:00Z')+(minutes-offset*60)*60000);
}
export function clock(date: Date | undefined, offset: number) {
 if(!date) return 'No event';
 return new Date(date.getTime()+offset*3600000).toISOString().slice(11,16);
}
export function direction(az: number) { return ['N','NE','E','SE','S','SW','W','NW'][Math.round(az/45)%8]; }
export function skyAt(date: Date, place: Place) {
 const observer = new A.Observer(place.lat,place.lon,0);
 const position = (body: A.Body) => { const eq=A.Equator(body,date,observer,true,true); return A.Horizon(date,observer,eq.ra,eq.dec,'normal'); };
 const sun=position(A.Body.Sun);
 const moon=A.Illumination(A.Body.Moon,date);
 const phase=A.MoonPhase(date);
 const bodies:[A.Body,string][]=[[A.Body.Moon,'#f0ead3'],[A.Body.Mercury,'#c0c7d4'],[A.Body.Venus,'#ffe3ad'],[A.Body.Mars,'#f6987c'],[A.Body.Jupiter,'#e9bd89'],[A.Body.Saturn,'#f5d19d'],[A.Body.Uranus,'#8ee0d4'],[A.Body.Neptune,'#97baff']];
 const targets:Target[]=bodies.map(([body,color])=>{const h=position(body); return {id:body,name:body,type:body===A.Body.Moon?'Moon':'Planet',altitude:h.altitude,azimuth:h.azimuth,magnitude:A.Illumination(body,date).mag,color,named:true};});
 const rotation=A.Rotation_EQJ_EQD(date);
 for(const star of stars){
  const v=A.VectorFromSphere(new A.Spherical(star.dec,star.ra*15,1),date);
  const eq=A.EquatorFromVector(A.RotateVector(rotation,v));
  const h=A.Horizon(date,observer,eq.ra,eq.dec,'normal');
  targets.push({id:star.id,name:star.name,type:'Star',altitude:h.altitude,azimuth:h.azimuth,magnitude:star.mag,color:'#d4e5fa',named:star.named});
 }
 return {targets,sunAltitude:sun.altitude,moonFraction:moon.phase_fraction,moonPhase:phase,skyState:sun.altitude < -18?'Astronomical night':sun.altitude < -6?'Twilight':sun.altitude < 0?'Civil twilight':'Daylight'};
}
export function eveningEvents(day:string,place:Place){
 const start=toDate(day,720,place.offset),obs=new A.Observer(place.lat,place.lon,0);
 return {sunset:A.SearchRiseSet(A.Body.Sun,obs,-1,start,1)?.date,dark:A.SearchAltitude(A.Body.Sun,obs,-1,start,1,-18)?.date};
}
