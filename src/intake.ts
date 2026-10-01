import {z} from 'zod';
import {evidenceFrom} from './ground.js';
import {sourceStatesValue} from './prescription.js';
import type {Evidence} from './model.js';
export const intakeCategory=z.enum(['schedule','payment','support','other']);
export const intakeUrgency=z.enum(['routine','soon','urgent','unknown']);
export const intakeSchema=z.object({schema_version:z.literal('intake.v1'),summary:z.string().max(1000),category:intakeCategory,urgency:intakeUrgency,fields:z.array(z.object({name:z.string().max(80),value:z.string().max(500),quote:z.string().max(2000)}).strict()).max(20),missing:z.array(z.string().max(160)).max(20)}).strict();
export type IntakeResult=z.infer<typeof intakeSchema>;
export type IntakeLinked=Omit<IntakeResult,'fields'>&{fields:(IntakeResult['fields'][number]&{evidence:Evidence[];verified:boolean})[];reviewReasons:string[];inputHash:string;transcript:string|null;tokens:number;usd:number;cacheHit:boolean;useCase?:'prescription';sourceLines?:Evidence[]};
export function linkIntake(result:IntakeResult,raw:unknown,text:string):Pick<IntakeLinked,'fields'|'reviewReasons'|'sourceLines'>{
 const sources=evidenceFrom(raw,text);const reasons:string[]=[];
 const fields=result.fields.map(f=>{const clean=(s:string)=>s.trim().replace(/\s+/g,' ');const quote=clean(f.quote),value=clean(f.value);const matches=sources.filter(e=>quote&&clean(e.quote).includes(quote));const row=/^(?:medicine|dose|frequency|duration)_(\d+)$/.exec(f.name)?.[1],writtenRow=/^\s*(\d+)\s*[).:-]/.exec(quote)?.[1];const sameRow=!row||!writtenRow||row===writtenRow;const verified=matches.length===1&&!!value&&sourceStatesValue(clean(matches[0].quote),value)&&sourceStatesValue(quote,value)&&sameRow;if(!verified)reasons.push(`Check ${f.name}: source quote or value is not uniquely verified.`);return {...f,evidence:verified?matches:[],verified};});
 if(result.urgency==='urgent'||result.urgency==='unknown')reasons.push('Urgency needs human review.');if(result.missing.length)reasons.push('Missing information needs human review.');
 // Labels and urgency are model proposals, not evidence-grounded facts.
 reasons.push('Confirm the proposed category and urgency before any downstream action.');
 return{fields,reviewReasons:reasons,sourceLines:sources};
}
