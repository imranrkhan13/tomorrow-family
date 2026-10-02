import {textCheckInput,sourceStatesValue} from '../src/prescription.js';
import {z} from 'zod';
import type {IntakeLinked} from '../src/intake.js';
import type {GateFinding} from './jev-gate.js';
const response=z.object({answers:z.record(z.string(),z.object({type:z.literal('noul'),noul:z.number().min(0).max(1)})),usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}),truncated:z.record(z.string(),z.unknown()).optional()});
/** Diagnostics keep only fixed wording and event names: never provider text, prompts, tokens or source text. */
function timedOut(e:unknown){return e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError');}
export async function reviewTextWithLev(result:IntakeLinked,key:string,transport:typeof fetch,allowUnlinked=true){
 const {text,fields}=textCheckInput(result,allowUnlinked);
 if(!fields.length||!text.trim())return{findings:result.fields.map(f=>({field:f.name,reading:f.value,status:'needs_check' as const,reason:'No extracted text or candidate value',score:null})),tokens:0};
 if(text.length>1600)throw Error('Source is too long for Lev. No call.');
 const questions=Object.fromEntries(fields.map((f,i)=>[`f${i}`,{type:'noul',instructions:`Does the supplied text explicitly state ${JSON.stringify(f.value)} as ${f.name}? Answer yes only for an exact text reading, not a medical inference.`}]));
 const headers={'X-HF-Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
 const host='https://phineas8-tomorrow-lev.hf.space';
 // Separate budgets: queueing the request is quick; ZeroGPU may need longer to return the result. Total stays under 60s.
 const postSignal=AbortSignal.timeout(15000),readSignal=AbortSignal.timeout(40000);
 const r=await transport(host+'/gradio_api/call/score',{method:'POST',headers,body:JSON.stringify({data:[{state:text,questions,model:'english'}]}),signal:postSignal}).catch(e=>{throw Error(timedOut(e)?'Lev request was not accepted within 15s. No automatic retry.':'Lev request could not be sent. No automatic retry.');});
 if(!r.ok)throw Error(`Lev unavailable (${r.status}); Space may be asleep. No automatic retry.`);
 const event=z.object({event_id:z.string().regex(/^[a-zA-Z0-9_-]+$/)}).parse(await r.json());
 // This GET collects the same queued request. It never submits another score call.
 const collected=await transport(host+'/gradio_api/call/score/'+event.event_id,{headers,signal:readSignal}).catch(e=>{throw Error(timedOut(e)?'Lev accepted the request but returned no result within 40s. No automatic retry.':'Lev result could not be read. No automatic retry.');});
 if(!collected.ok)throw Error('Lev result unavailable. No automatic retry.');
 const stream=await collected.text().catch(e=>{throw Error(timedOut(e)?'Lev accepted the request but the result stream timed out at 40s. No automatic retry.':'Lev result stream broke. No automatic retry.');});
 const complete=stream.split(/\r?\n\r?\n/).find(block=>/^event: complete$/m.test(block));
 const line=complete?.split(/\r?\n/).find(line=>line.startsWith('data: '));
 if(!line){const names=[...new Set([...stream.matchAll(/^event: ([a-z_]{1,20})$/gm)].map(m=>m[1]))].slice(0,5);throw Error(names.includes('error')?'Lev Space returned an error event instead of a result. No retry.':`Lev result stream ended without a result (events: ${names.join(', ')||'none'}). No retry.`);}
 const data=response.parse(JSON.parse(line.slice(6))[0]);
 return {tokens:data.usage.input_tokens+data.usage.output_tokens,findings:result.fields.map(f=>{const i=fields.indexOf(f),a=data.answers[`f${i}`],cut=data.truncated&&Object.hasOwn(data.truncated,`f${i}`);const score=i>=0&&!cut&&a?a.noul:null;return {field:f.name,reading:f.value,status:score!==null&&score>=.95&&sourceStatesValue(text,f.value)?'text_agrees':'needs_check',score,reason:!sourceStatesValue(text,f.value)?'Value absent from extracted source text; provider score cannot verify it':cut?'Lev cut source text; no agreement accepted':score===null?'No candidate value or no Lev answer':'Lev raw text-agreement probability, not calibrated on prescriptions; check handwriting yourself'} as GateFinding;})};
}
