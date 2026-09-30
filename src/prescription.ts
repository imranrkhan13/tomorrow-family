import type {IntakeLinked} from './intake.js';

const fieldPattern=/^(medicine|dose|frequency|duration)_(\d+)$/;
const labels={medicine:'Medicine name',dose:'Dose',frequency:'How often (written shorthand)',duration:'Duration'};
export function prescriptionLabel(name:string){const match=fieldPattern.exec(name);return match?`${labels[match[1] as keyof typeof labels]} ${match[2]}`:name.replaceAll('_',' ');}
/** Shape checks are not medical validation. Never repair a guessed letter or unit. */
export function readingIssue(field:IntakeLinked['fields'][number]):string|null{
 const value=field.value.trim();
 if(!value||/[?\[\]]|illegible|unreadable|uncertain|unclear/i.test(value))return 'Unclear reading. Ask a pharmacist; do not guess.';
 if(/^dose_\d+$/.test(field.name)&&!/^\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|units?|IU)$/i.test(value))return 'Dose needs a number and a clear unit. Do not infer the unit.';
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
 for(const i of indices)for(const type of Object.keys(labels)){
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
export function textCheckInput(result:IntakeLinked){
 const fields=result.fields.filter(f=>f.value.trim()&&!/[?\[\]]|illegible|unreadable|uncertain|unclear/i.test(f.value));
 const sources=result.sourceLines?.length?result.sourceLines.map(e=>e.quote):result.fields.map(f=>f.quote);
 const text=[...new Set(sources.filter(s=>s.trim()))].join('\n');
 return {text,fields};
}
