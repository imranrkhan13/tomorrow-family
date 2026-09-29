/** Jev checks Interfaze-linked text, not image pixels or medicine safety. */
import {z} from 'zod';
import type {IntakeLinked} from '../src/intake.js';

const response=z.object({judge:z.literal('jev'),decisions:z.array(z.object({field:z.string(),action:z.enum(['fill','review']),confidence:z.number().min(0).max(1).nullable().optional(),reason:z.string().optional()})),calibrated:z.boolean().optional(),jevModel:z.string().optional(),usage:z.object({input_tokens:z.number().int().nonnegative(),output_tokens:z.number().int().nonnegative()}).optional()});
export type GateFinding={field:string;reading:string;status:'text_agrees'|'needs_check';reason:string;score:number|null};
const VERIFY_URL='https://jevscope.vercel.app/api/v1/verify';
export async function reviewTextWithJev(result:IntakeLinked,key:string,transport:typeof fetch):Promise<{findings:GateFinding[];tokens:number}>{
     if(result.useCase!=='prescription')throw Error('Only new prescription readings can be checked.');
      if(!key)throw Error('Jev key is not configured. No call made.');
       const fields=result.fields.filter(f=>f.verified&&f.value.trim()&&f.quote.includes(f.value));
        if(!fields.length)return{findings:result.fields.map(f=>({field:f.name,reading:f.value,status:'needs_check',reason:'No uniquely linked source text',score:null})),tokens:0};
         // Only text already returned from Interfaze; never claim Jev read the original pixels.
          const text=[...new Set(fields.map(f=>f.quote))].join('\n').slice(0,8000);
           const selected=fields.slice(0,20).map((f,i)=>({name:`candidate_${i}`,value:f.value,description:`Check whether the text explicitly states this ${f.name} value` }));
            const r=await transport(VERIFY_URL,{method:'POST',headers:{'Content-Type':'application/json','X-Jev-Key':key},body:JSON.stringify({text,fields:selected}),signal:AbortSignal.timeout(40000)});
             if(!r.ok)throw Error(`Jev text check failed (${r.status}). No automatic retry.`);
              const parsed=response.parse(await r.json());
               const byName=new Map(parsed.decisions.map(d=>[d.field,d]));
                if(!parsed.usage)throw Error('Jev usage not reported; budget halted.');
                 return {tokens:parsed.usage.input_tokens+parsed.usage.output_tokens,findings:result.fields.map(f=>{const index=fields.indexOf(f);if(index<0)return{field:f.name,reading:f.value,status:'needs_check' as const,reason:'No uniquely linked source text',score:null};const d=byName.get(`candidate_${index}`);if(!d)return{field:f.name,reading:f.value,status:'needs_check' as const,reason:'No Jev answer for this text candidate',score:null};return{field:f.name,reading:f.value,status:d.action==='fill'?'text_agrees' as const:'needs_check' as const,reason:d.action==='fill'?'Jev agreed with Interfaze text; handwriting and medicine remain unchecked':d.reason??'Jev did not agree with the text candidate',score:d.confidence??null};})};
                 }
} */