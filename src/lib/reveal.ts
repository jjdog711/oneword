import { Word } from "@/types";
import { localDateString } from "@/lib/time";

export type Status = 'WAITING_YOU'|'WAITING_THEM'|'SCHEDULED'|'REVEALED'|'MISSED';

export function getConnectionStatus(words:Word[], me:string, them:string): Status {
  const today = localDateString();
  const mine = words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===today);
  const theirs = words.find(w=>w.senderId===them && w.receiverId===me && w.dateLocal===today);

  if(mine && (mine.reveal==='scheduled')){
    // scheduled shows scheduled until revealTime passes
    const t = mine.revealTime ? new Date(mine.revealTime).getTime() : 0;
    if(Date.now()<t) return 'SCHEDULED';
  }

  if(mine && mine.reveal==='instant') return theirs ? 'REVEALED' : 'REVEALED';
  if(mine && mine.reveal==='mutual') return theirs ? 'REVEALED' : 'WAITING_THEM';
  if(!mine && theirs) return 'WAITING_YOU';
  return 'WAITING_YOU';
}

export function getConnectionStatusLabel(s:Status){
  switch(s){
    case 'WAITING_YOU': return 'Waiting for your word';
    case 'WAITING_THEM': return 'Waiting for their word';
    case 'SCHEDULED': return 'Reveals later';
    case 'REVEALED': return 'Revealed';
    case 'MISSED': return 'Missed';
  }
}