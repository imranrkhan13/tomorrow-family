import {z} from 'zod';
import type {IntakeLinked} from '../src/intake.js';
import type {GateFinding} from './jev-gate.js';
const response=z.object({answers:z.record(z.string(),z.object({type:z.literal('noul'),noul:z.number().min(0).max(1)})),usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}),truncated:z.record(z.string(),z.unknown()).optional()});
export async function reviewTextWithLev(result:IntakeLinked,key:string,transport:typeof fetch){
 const fields=result.fields.filter(f=>f.verified&&f.value.trim()&&f.quote.includes(f.value));
 const text=[...new Set(fields.map(f=>f.quote))].join('\n');
 // Refuse oversized text, never silently clip source lines.
 if(text.length>1600)throw Error('Source is too long for Lev English context. No call.');
 const questions=Object.fromEntries(fields.map((f,i)=>[`f${i}`,{type:'noul',instructions:`Does the supplied text explicitly state ${JSON.stringify(f.value)} as ${f.name}? Answer yes only for an exact text reading, not a medical inference.`}]));
 const r=await transport('https://phineas8-tomorrow-lev.hf.space/v1/systemone',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({state:text,questions,model:'english'}),signal:AbortSignal.timeout(35000)});
 if(!r.ok)throw Error(`Lev unavailable (${r.status}); Space may be asleep. No automatic retry.`);
 const data=response.parse(await r.json());
 return {tokens:data.usage.input_tokens+data.usage.output_tokens,findings:result.fields.map(f=>{const i=fields.indexOf(f),a=data.answers[`f${i}`],cut=data.truncated&&Object.hasOwn(data.truncated,`f${i}`);const score=i>=0&&!cut&&a?a.noul:null;return {field:f.name,reading:f.value,status:score!==null&&score>=.95?'text_agrees':'needs_check',score,reason:cut?'Lev cut source text; no agreement accepted':score===null?'No linked source text or no Lev answer':'Lev raw text-agreement probability, not calibrated on prescriptions; check handwriting yourself'} as GateFinding;})};
}
