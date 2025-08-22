import { useEffect } from "react";
import { useAppStore } from "@/store/app";
import { localDateString } from "@/lib/time";

export function useMidnightRollover(){
  const last = useAppStore(s=>s.lastProcessedDate);
  const process = useAppStore(s=>s.processMidnight);
  useEffect(()=>{ process(); },[]);
  useEffect(()=>{
    const id = setInterval(()=>{
      const today = localDateString();
      if(today !== last){ process(); }
    }, 60_000);
    return ()=> clearInterval(id);
  },[last]);
}