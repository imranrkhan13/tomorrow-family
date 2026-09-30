import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewPrescription,readingIssue} from '../src/prescription.js';
import type {IntakeLinked} from '../src/intake.js';
const base:IntakeLinked={schema_version:'intake.v1',summary:'Kalovin and Telvagin',category:'support',urgency:'unknown',fields:[],missing:[],reviewReasons:[],inputHash:'fixture',transcript:null,tokens:0,usd:0,cacheHit:false,useCase:'prescription'};
const field=(name:string,value:string,verified=true)=>({name,value,quote:value,evidence:[],verified});
test('bad duration is withheld, not repaired; unchecked drug names never enter summary',()=>{
 const result=reviewPrescription({...base,fields:[field('medicine_1','Kalovin'),field('dose_1','250 mg'),field('frequency_1','1-0-1 / BD'),field('duration_1','3 X')]});
 assert.equal(result.fields[3].verified,false);assert.equal(result.fields[3].value,'3 X');
 assert.equal(result.missing.length,1);assert.match(result.missing[0],/Duration 1/);assert.doesNotMatch(result.summary,/Kalovin|Telvagin/);
});
test('written shorthand and d duration stay verbatim; stale missing times/day is removed',()=>{
 for(const shorthand of ['1 - 0 - 1 / BD','0-0-1 / HS','1-1-1 / TDS','OD']){
  const result=reviewPrescription({...base,fields:[field('medicine_1','Demo'),field('dose_1','5 ml'),field('frequency_1',shorthand),field('duration_1','4d')],missing:['times/day missing','frequency_1 absent']});
  assert.deepEqual(result.missing,[]);assert.equal(result.fields[2].value,shorthand);assert.equal(result.fields[3].value,'4d');
 }
});
test('withheld correct candidate appears in missing list; unrelated missing note is retained',()=>{
 const result=reviewPrescription({...base,fields:[field('medicine_1','Demo',false),field('dose_1','10 mg'),field('frequency_1','HS'),field('duration_1','3 d')],missing:['patient age absent']});
 assert.equal(result.missing.length,2);assert.match(result.missing[0],/Medicine name 1/);assert.equal(result.missing[1],'patient age absent');
});
test('questionable letters and low OCR confidence cannot be visible readings',()=>{
 assert.ok(readingIssue(field('medicine_1','Dem?')));
 assert.ok(readingIssue({...field('medicine_1','Demo'),evidence:[{quote:'Demo',confidence:.7}]}));
 assert.equal(readingIssue(field('medicine_1','Kalovin')),null); // no claim to detect a plausible wrong OCR word
});
test('old generic cache and field order remain untouched',()=>{
 const old={...base,useCase:undefined};assert.equal(reviewPrescription(old),old);
 const current={...base,fields:[field('medicine_3','Demo'),field('duration_3','3 X')]};
 assert.deepEqual(reviewPrescription(current).fields.map(f=>f.name),current.fields.map(f=>f.name));
});

test('re-review is stable and malformed dose is withheld',()=>{const r=reviewPrescription({...base,fields:[field('medicine_1','Demo'),field('dose_1','10 X'),field('frequency_1','HS'),field('duration_1','3 X')]});assert.equal(r.fields[1].verified,false);assert.deepEqual(reviewPrescription(r),r);});
