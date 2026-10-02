import type {IntakeLinked} from './intake.js';

const fieldPattern=/^(medicine|dose|quantity|frequency|duration)_(\d+)$/;
const labels={medicine:'Medicine name',dose:'Dose',quantity:'Amount per dose',frequency:'How often (written shorthand)',duration:'Duration'};
export function prescriptionLabel(name:string){const match=fieldPattern.exec(name);return match?`${labels[match[1] as keyof typeof labels]} ${match[2]}`:name.replaceAll('_',' ');}
/** Shape checks are not medical validation. Never repair a guessed letter or unit. */
export function readingIssue(field:IntakeLinked['fields'][number]):string|null{
 const value=field.value.trim();
 if(!value||/[?\[\]]|illegible|unreadable|uncertain|unclear/i.test(value))return 'Unclear reading. Ask a pharmacist; do not guess.';
 if(/^dose_\d+$/.test(field.name)&&!/^\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|units?|IU)$/i.test(value))return 'Dose needs a number and a clear unit. Do not infer the unit.';
 if(/^quantity_\d+$/.test(field.name)&&!/^(?:\d+(?:\.\d+)?|\d+\/\d+|½)\s*(?:tabs?|tablets?|caps?|capsules?|ml|mL|tsp|tbsp|drops?|puffs?)?$/i.test(value))return 'Amount per dose needs a clear written number. Do not infer it from the strength.';
 if(/^quantity_\d+$/.test(field.name)){
  // A number that is only a row marker, part of a timing pattern, a strength or a duration is not an amount per dose.
  const rest=field.quote.replace(/^\s*\d+\s*[).:-]\s*/,' ').replace(/\b\d+\s*[-–]\s*\d+\s*[-–]\s*\d+\b/g,' ').replace(/\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?|IU)\b/gi,' ').replace(/\b\d+(?:\.\d+)?\s*(?:d|days?|weeks?|wks?|months?|hours?|hrs?)\b/gi,' ');
  if(!sourceStatesValue(rest,value))return 'Amount per dose is not written separately in this line. Do not infer it from the strength, timing or a form word.';
 }
 if(/^duration_\d+$/.test(field.name)&&!/^\d+(?:\.\d+)?\s*(?:d|days?|weeks?|wks?|months?|hours?|hrs?)$/i.test(value))return 'Duration needs a number and a clear time unit. Do not infer the unit.';
 if(/^duration_\d+$/.test(field.name)&&parseFloat(value)<=0)return 'Duration is unclear. Check the original.';
 if(/^medicine_\d+$/.test(field.name)&&field.evidence.some(e=>e.confidence!==null&&e.confidence<.9))return 'Low OCR confidence on this line. Check the medicine letters with a pharmacist.';
 return null;
}
/** Also applies to saved readings. Keep field order for Jev and human-check keys. */
export function reviewPrescription(result:IntakeLinked):IntakeLinked{
 if(result.useCase!=='prescription')return result;
 const fields=result.fields.map(f=>readingIssue(f)?{...f,verified:false}:f);
 const indices=new Set(fields.map(f=>fieldPattern.exec(f.name)?.[2]).filter((x):x is string=>!!x));
 for(const missing of result.missing){const m=missing.match(/(?:medicine|dose|frequency|duration)_(\d+)/);if(m)indices.add(m[1]);}
 const missing:string[]=[];
 for(const i of indices)for(const type of Object.keys(labels).filter(t=>t!=='quantity'||fields.some(f=>f.name===`quantity_${i}`)||result.missing.some(n=>n.includes(`quantity_${i}`)))){
  const name=`${type}_${i}`,matches=fields.filter(f=>f.name===name);
  if(matches.length!==1||!matches[0].verified)missing.push(`${prescriptionLabel(name)}: ${matches.length===1?(readingIssue(matches[0])??'Reading not linked to one OCR line. Check the original.'):'Not read clearly or not present.'}`);
 }
 // Reconcile only explicit field references or recognized generic field labels.
 // Unknown omissions remain visible rather than being silently discarded.
 for(const note of result.missing){
  if(/^(?:Medicine name|Dose|How often \(written shorthand\)|Duration) \d+:/.test(note))continue;
  if(/(?:medicine|dose|frequency|duration)_\d+/.test(note))continue;
  const type=/^(?:times?\s*(?:per|\/)\s*day|frequency|how often)\b/i.test(note)?'frequency':/^(?:days|duration)\b/i.test(note)?'duration':/^(?:dose|dosage)\b/i.test(note)?'dose':/^(?:medicine name|drug name)\b/i.test(note)?'medicine':null;
  if(type&&indices.size&&[...indices].every(i=>fields.filter(f=>f.name===`${type}_${i}`&&f.verified).length===1))continue;
  if(!missing.includes(note))missing.push(note);
 }
 const issues=fields.flatMap(f=>{const issue=readingIssue(f);return issue?[`${f.name}: ${issue}`]:[];});
 return {...result,fields,missing,summary:`${indices.size?`${indices.size} possible medicine rows. `:''}${fields.filter(f=>f.verified).length} possible readings; ${missing.length} unclear or missing details. Check every reading against the original.`,reviewReasons:[...new Set([...result.reviewReasons,...issues])]};
}
/** Judge extracted text, including unlinked candidates, without changing source or human flags. */
export function textCheckInput(result:IntakeLinked,allowUnlinked=true){
 const fields=result.fields.filter(f=>(allowUnlinked||f.verified&&f.quote.includes(f.value))&&f.value.trim()&&!/[?\[\]]|illegible|unreadable|uncertain|unclear/i.test(f.value));
 const sources=allowUnlinked?(result.sourceLines?.length?result.sourceLines.map(e=>e.quote):result.fields.map(f=>f.quote)):fields.map(f=>f.quote);
 const text=[...new Set(sources.filter(s=>s.trim()))].join('\n');
 return {text,fields};
}

/** Conservative literal check, not medical validation or fuzzy correction. */
export function sourceStatesValue(text:string,value:string){
 const clean=(s:string)=>s.trim().replace(/\s+/g,' ');
 const source=clean(text),candidate=clean(value);if(!candidate)return false;
 let at=source.indexOf(candidate);while(at>=0){const before=at?source[at-1]:'',after=source[at+candidate.length]??'';if(!/[a-z0-9]/i.test(before)&&!/[a-z0-9]/i.test(after))return true;at=source.indexOf(candidate,at+1);}return false;
}

/** Plain-words view of a written N-N-N notation. Display only: never a dose, treatment or reminder. */
export function scheduleReading(value:string):string|null{
 const m=/^\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*$/.exec(value);if(!m)return null;
 const parts=[['morning',+m[1]],['afternoon',+m[2]],['night',+m[3]]] as const;
 const on=parts.filter(([,n])=>n>0).map(([t,n])=>n===1?t:`${t} (${n})`),off=parts.filter(([,n])=>n===0).map(([t])=>t);
 if(!on.length)return `Written as ${value.trim()}: no time marked. Check the original.`;
 return `Written as ${value.trim()}: ${on.join(' and ')}${off.length?`, not ${off.join(' or ')}`:''}. Confirm against the original.`;
}
