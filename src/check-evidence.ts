import {fieldHasSourceSupport} from './intake.js';
import type {IntakeLinked} from './intake.js';
/** Revalidate old saved agreement without changing the raw provider score or making a request. */
export function recheckFindings<T extends {field:string;reading:string;status:string;reason:string;score:number|null}>(result:IntakeLinked,findings:T[]){
 return findings.map(f=>{const matches=result.fields.filter(v=>v.name===f.field&&v.value===f.reading);return f.status==='text_agrees'&&(matches.length!==1||!fieldHasSourceSupport(result,matches[0]))?{...f,status:'needs_check',reason:'Saved score does not verify this exact source row or quote. Compare with the original.'}:f;});
}
