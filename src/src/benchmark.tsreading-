/** Offline exact-field evaluation. No model calls, fuzzy drug correction or accuracy claim. */
export type ReadingField={name:string;value:string};
export function evaluateReading(expected:ReadingField[],actual:ReadingField[]){
 const clean=(s:string)=>s.trim().replace(/\s+/g,' ');
 const names=new Set(expected.map(f=>f.name));
 if(names.size!==expected.length)throw Error('Ground truth has duplicate field names.');
 const outcomes=expected.map(truth=>{const candidates=actual.filter(f=>f.name===truth.name&&clean(f.value));return{name:truth.name,expected:truth.value,actual:candidates.map(f=>f.value),outcome:candidates.length===0?'missing':candidates.length>1?'duplicate':clean(candidates[0].value)===clean(truth.value)?'exact':'wrong'};});
 const invented=actual.filter(f=>!names.has(f.name)&&clean(f.value));
 const exact=outcomes.filter(f=>f.outcome==='exact').length,wrong=outcomes.filter(f=>f.outcome==='wrong'||f.outcome==='duplicate').length,missing=outcomes.filter(f=>f.outcome==='missing').length;
 return {outcomes,invented,expected:expected.length,exact,wrong,missing,returned:actual.filter(f=>clean(f.value)).length,exactCoverage:expected.length?exact/expected.length:null};
}
