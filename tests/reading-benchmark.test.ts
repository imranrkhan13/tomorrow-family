import {test} from 'node:test';import assert from 'node:assert/strict';
import {evaluateReading} from '../src/reading-benchmark.js';
import {linkIntake} from '../src/intake.js';
const expected=[{name:'medicine_1',value:'SYN-A'},{name:'dose_1',value:'15 mg'},{name:'frequency_1',value:'1-0-1'}];
test('offline benchmark separates wrong names from missing fields and invented values',()=>{const r=evaluateReading(expected,[{name:'medicine_1',value:'SYN-B'},{name:'dose_1',value:'15  mg'},{name:'duration_1',value:'5 d'}]);assert.equal(r.exact,1);assert.equal(r.wrong,1);assert.equal(r.missing,1);assert.equal(r.invented.length,1);assert.equal(r.exactCoverage,1/3);});
test('benchmark does not repair drug letters, dose substrings or duplicate candidates',()=>{const r=evaluateReading(expected,[{name:'medicine_1',value:'SYN-A'},{name:'medicine_1',value:'SYN-B'},{name:'dose_1',value:'5 mg'}]);assert.equal(r.wrong,2);assert.equal(r.missing,1);assert.throws(()=>evaluateReading([expected[0],expected[0]],[]),/duplicate/);});
test('text support from a different numbered row cannot validate a dose',()=>{const x={schema_version:'intake.v1' as const,summary:'Synthetic',category:'support' as const,urgency:'unknown' as const,fields:[{name:'dose_1',value:'10 mg',quote:'2) SYN-B 10 mg HS'}],missing:[]};assert.equal(linkIntake(x,null,'1) SYN-A 5 mg BD\n2) SYN-B 10 mg HS').fields[0].verified,false);});
