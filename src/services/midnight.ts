import { useEffect } from "react";
import { useAppStore } from "@/store/app";
import { getDayKeyForUser } from "@/lib/dates";

export function useMidnightRollover(){
  const last = useAppStore(s=>s.lastProcessedDate);
  const process = useAppStore(s=>s.processMidnight);
  const userTimezone = useAppStore(s=>s.me.timezone) || 'America/New_York';
  
  useEffect(()=>{ 
    // Only process if we have a valid lastProcessedDate
    if (last) {
      process(); 
    }
  },[]);
  
  useEffect(()=>{
    const id = setInterval(()=>{
      const today = getDayKeyForUser(userTimezone);
      if(today !== last && last){ 
        process(); 
      }
    }, 60_000);
    return ()=> clearInterval(id);
  },[last, userTimezone]);
}