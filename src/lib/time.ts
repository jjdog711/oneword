export const pad = (n:number)=> (n<10?`0${n}`:`${n}`);
export function localDateString(d=new Date()){ const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); return `${y}-${m}-${day}`; }
export function isPastMidnight(last:string){ return localDateString()!==last; }
export function parseHHmmToTodayISO(hhmm:string){
  const [h,m] = hhmm.split(":").map(Number);
  const d = new Date(); d.setHours(h||0,m||0,0,0); return d.toISOString();
}