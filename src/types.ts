export type ID = string;
export type Reveal = 'instant'|'mutual'|'scheduled';
export type Connection = { id: ID; a: ID; b: ID; name: string; createdAt: number };
export type Word = {
  id: ID;
  senderId: ID;
  receiverId: ID;
  dateLocal: string; // YYYY-MM-DD
  text: string;
  reveal: Reveal;
  revealTime?: string; // ISO or HH:mm local for demo
  burnIfUnread?: boolean;
  createdAt: number;
};
export type JournalEntry = { date: string; myWord?: string; reflections?: string };
export type Settings = { notifEnabled: boolean; reminderTime?: string; gamificationEnabled: boolean };
export type User = { id: ID; name: string; email?: string; isPremium?: boolean };