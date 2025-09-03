import { Word } from "@/types";
import { getDayKeyForUser, isTimePassedInUserTz } from "@/lib/dates";

export type Status = 'WAITING_YOU'|'WAITING_THEM'|'SCHEDULED'|'REVEALED'|'MISSED';

export function getConnectionStatus(words:Word[], me:string, them:string): Status {
  // Note: This function needs user timezone context
  // For now, use default timezone, but this should be updated to accept user timezone
  const userTimezone = 'America/New_York'; // TODO: Get from user context
  const today = getDayKeyForUser(userTimezone);
  const mine = words.find(w=>w.senderId===me && w.receiverId===them && w.dateLocal===today);
  const theirs = words.find(w=>w.senderId===them && w.receiverId===me && w.dateLocal===today);

  if(mine && (mine.reveal==='scheduled')){
    // scheduled shows scheduled until revealTime passes
    if(mine.revealTime && !isTimePassedInUserTz(userTimezone, mine.revealTime)) return 'SCHEDULED';
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