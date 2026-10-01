import {z} from 'zod';
import {type Cited,type Evidence,type Extraction,type LinkedField,type LinkedTask,validDate,validTime} from './model.js';
export function evidenceFrom(raw:unknown,text:string):Evidence[]{const evidence:Evidence[]=[];if(text){let start=0;for(const full of text.split(/(?<=\n)/)){const quote=full.trimEnd();if(quote)evidence.push({quote,confidence:null,span:[start,start+quote.length]});start+=full.length;}}
 const point=z.object({x:z.number().finite().nonnegative(),y:z.number().finite().nonnegative()});
 const section=z.object({lines:z.array(z.object({text:z.string(),average_confidence:z.number().min(0).max(1).optional(),bounds:z.object({top_left:point,top_right:point,bottom_left:point,bottom_right:point})}))});
 const entries=z.array(z.object({name:z.string(),result:z.unknown()})).safeParse(raw);if(!entries.success)return evidence;
 for(const entry of entries.data){if(entry.name!=='ocr')continue;
 const r=z.object({width:z.number().positive().optional(),height:z.number().positive().optional(),extracted_text:z.string().optional(),sections:z.array(z.object({lines:z.array(z.unknown()).optional(),text:z.string().optional()})).optional()}).safeParse(entry.result);if(!r.success)continue;
 const recorded=new Set<string>();
 for(const section of r.data.sections??[])for(const candidate of section.lines??[]){
  const line=z.object({text:z.string(),average_confidence:z.number().min(0).max(1).optional(),bounds:z.object({top_left:point,top_right:point,bottom_left:point,bottom_right:point}).optional()}).safeParse(candidate);if(!line.success||!line.data.text.trim())continue;
  const l=line.data;let box:Evidence['box'];if(l.bounds&&r.data.width&&r.data.height){const points=Object.values(l.bounds),x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));if(right<=r.data.width&&bottom<=r.data.height)box=[x,y,right-x,bottom-y];}
  evidence.push({quote:l.text,confidence:l.average_confidence??null,...(box?{box,width:r.data.width,height:r.data.height}:{})});recorded.add(l.text.trim());
 }
 // Preserve raw text without manufacturing coordinates or recognition confidence.
 const fallback=r.data.extracted_text??(r.data.sections??[]).map(s=>s.text??'').join('\n');
 for(const quote of fallback.split('\n'))if(quote.trim()&&!recorded.has(quote.trim())){evidence.push({quote,confidence:null});recorded.add(quote.trim());}
 }

 return evidence;
}
export function link(extraction:Extraction,evidence:Evidence[]):LinkedTask[]{const field=(f:Cited,label:string):LinkedField=>{const matches=f.quote?evidence.filter(e=>e.quote===f.quote):[];const reasons:string[]=[];if(f.value===null)reasons.push(`No ${label} found`);if(matches.length!==1)reasons.push(matches.length?'Quote appears more than once':'Quote not verified against source metadata');if(f.confidence<.9)reasons.push('Extraction confidence below 90%');if(matches.length===1&&matches[0].confidence!==null&&matches[0].confidence!<.9)reasons.push('Low recognition confidence');return {...f,evidence:matches,reasons};};
 return extraction.tasks.map(t=>{const title=field(t.title,'task'),date=field(t.date,'date'),time=field(t.time,'time');if(date.value&&!validDate(date.value)){date.reasons.push('Invalid calendar date');date.value=null;}if(!validTime(time.value)){time.reasons.push('Invalid time');time.value=null;}return{...t,title,date,time};});}
