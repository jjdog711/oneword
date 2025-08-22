export function isSingleWord(input:string){
  const t = input.trim();
  if(!t) return false;
  // allow letters, hyphen, apostrophe; no spaces
  if(/\s/.test(t)) return false;
  return /^[\p{L}’'-]+$/u.test(t);
}