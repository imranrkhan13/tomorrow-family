import {textCheckInput,sourceStatesValue} from '../src/prescription.js';
import {z} from 'zod';
import type {IntakeLinked} from '../src/intake.js';
import type {GateFinding} from './jev-gate.js';
const response=z.object({answers:z.record(z.string(),z.object({type:z.literal('noul'),noul:z.number().min(0).max(1)})),usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}),truncated:z.record(z.string(),z.unknown()).optional()});
export async function reviewTextWithLev(result:IntakeLinked,key:string,transport:typeof fetch,allowUnlinked=true){
 const {text,fields}=textCheckInput(result,allowUnlinked);
 if(!fields.length||!text.trim())return{findings:result.fields.map(f=>({field:f.name,reading:f.value,status:'needs_check' as const,reason:'No extracted text or candidate value',score:null})),tokens:0};
 if(text.length>1600)throw Error('Source is too long for Lev. No call.');
 const questions=Object.fromEntries(fields.map((f,i)=>[`f${i}`,{type:'noul',instructions:`Does the supplied text explicitly state ${JSON.stringify(f.value)} as ${f.name}? Answer yes only for an exact text reading, not a medical inference.`}]));
 const headers={'X-HF-Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
 const host='https://phineas8-tomorrow-lev.hf.space';
 const signal=AbortSignal.timeout(35000);
 const r=await transport(host+'/gradio_api/call/score',{method:'POST',headers,body:JSON.stringify({data:[{state:text,questions,model:'english'}]}),signal});
 if(!r.ok)throw Error(`Lev unavailable (${r.status}); Space may be asleep. No automatic retry.`);
 const event=z.object({event_id:z.string().regex(/^[a-zA-Z0-9_-]+$/)}).parse(await r.json());
 // This GET collects the same queued request. It never submits another score call.
 const collected=await transport(host+'/gradio_api/call/score/'+event.event_id,{headers,signal});
 if(!collected.ok)throw Error('Lev result unavailable. No automatic retry.');
 const stream=await collected.text();
 const complete=stream.split(/\r?\n\r?\n/).find(block=>/^event: complete$/m.test(block));
 const line=complete?.split(/\r?\n/).find(line=>line.startsWith('data: '));
 if(!line)throw Error('Lev result missing or timed out. No retry.');
 const data=response.parse(JSON.parse(line.slice(6))[0]);
 return {tokens:data.usage.input_tokens+data.usage.output_tokens,findings:result.fields.map(f=>{const i=fields.indexOf(f),a=data.answers[`f${i}`],cut=data.truncated&&Object.hasOwn(data.truncated,`f${i}`);const score=i>=0&&!cut&&a?a.noul:null;return {field:f.name,reading:f.value,status:score!==null&&score>=.95&&sourceStatesValue(text,f.value)?'text_agrees':'needs_check',score,reason:!sourceStatesValue(text,f.value)?'Value absent from extracted source text; provider score cannot verify it':cut?'Lev cut source text; no agreement accepted':score===null?'No candidate value or no Lev answer':'Lev raw text-agreement probability, not calibrated on prescriptions; check handwriting yourself'} as GateFinding;})};
}
