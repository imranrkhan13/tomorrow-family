import {z} from 'zod';
import {validDate,validTime,type Notice,type Task} from './model.js';

// Import is deliberately strict: local backups include private family information,
// and a malformed file must never erase the current browser database.
const id=z.string().min(1).max(180);
const field=z.object({value:z.string().max(500).nullable(),quote:z.string().max(2000).nullable(),confidence:z.number().min(0).max(1),evidence:z.array(z.object({quote:z.string(),confidence:z.number().nullable(),box:z.tuple([z.number(),z.number(),z.number(),z.number()]).optional(),width:z.number().optional(),height:z.number().optional(),span:z.tuple([z.number(),z.number()]).optional(),page:z.number().optional()}).strict()).max(100),reasons:z.array(z.string()).max(100)}).strict();
const original=z.object({title:field,kind:z.enum(['bring','do','event']),date:field,time:field,notes:z.string().max(1000)}).strict();
const notice=z.object({id,name:z.string().max(180),child:z.string().max(80),createdAt:z.string().datetime(),mime:z.string().max(100),text:z.string().max(30000),file:z.object({mime:z.string().max(100),base64:z.string().max(4_000_000).regex(/^[A-Za-z0-9+/]*={0,2}$/)}).strict().nullable(),inputHash:z.string().max(128).optional(),summary:z.string().max(1000),status:z.enum(['saved','extracted','failed']),error:z.string().max(2000).optional()}).strict();
const task=z.object({id,noticeId:z.string().max(180),child:z.string().max(80),title:z.string().max(500),kind:z.enum(['bring','do','event']),date:z.string().nullable(),time:z.string().nullable(),notes:z.string().max(1000),status:z.enum(['review','confirmed']),done:z.boolean(),original:original.nullable(),reviewedAt:z.string().datetime().optional()}).strict();
const backup=z.object({version:z.literal(1),exportedAt:z.string().datetime(),notices:z.array(notice).max(1000),tasks:z.array(task).max(10000)}).strict();

export async function parseBackup(text:string):Promise<{notices:Notice[];tasks:Task[]}> {
 if(text.length>100_000_000)throw Error('Backup is too large (100 MB maximum).');
 let data:unknown;try{data=JSON.parse(text);}catch{throw Error('This is not a valid JSON backup.');}
 const parsed=backup.safeParse(data);if(!parsed.success)throw Error('This file is not a valid Tomorrow version 1 backup.');
 const b=parsed.data;
 const noticeIds=new Set<string>(),taskIds=new Set<string>();
 for(const n of b.notices){if(noticeIds.has(n.id))throw Error('The backup has duplicate notices.');noticeIds.add(n.id);
  if(n.file){if(n.mime!==n.file.mime||n.file.base64.length%4===1)throw Error('A file in the backup has an invalid type or encoding.');
   let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(n.file.base64),c=>c.charCodeAt(0));}catch{throw Error('A file in the backup is corrupt.');}
   if(bytes.length>3_000_000)throw Error('An original file exceeds the 3 MB limit.');
  }}
 for(const t of b.tasks){if(taskIds.has(t.id))throw Error('The backup has duplicate reminders.');taskIds.add(t.id);if(t.noticeId&&!noticeIds.has(t.noticeId))throw Error('A reminder refers to a missing notice.');if(t.date&&!validDate(t.date)||!validTime(t.time))throw Error('A reminder has an invalid date or time.');}
 return {notices:b.notices.map(n=>({...n,file:n.file?new Blob([Uint8Array.from(atob(n.file.base64),c=>c.charCodeAt(0))],{type:n.file.mime}):null})),tasks:b.tasks};
}
