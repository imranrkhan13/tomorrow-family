import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
// Exercise the exact inline helpers shipped in the frontend, not a duplicate implementation.
const source=readFileSync('web/main.ts','utf8');
const helpers=source.slice(source.indexOf('const resultColumns='),source.indexOf("import {reviewPrescription"));
assert.ok(helpers.startsWith('const resultColumns='),'frontend layout helpers must be present');
const code=ts.transpile(helpers+'\n({columnsFor,kindOf,columnLabels});',{target:ts.ScriptTarget.ES2022});
const {columnsFor,kindOf,columnLabels}=runInNewContext(code) as {columnsFor:(fields:{name:string}[])=>string[];kindOf:(name:string)=>string;columnLabels:Record<string,string>};
test('strength and amount per dose stay separate columns',()=>{
 assert.deepEqual(Array.from(columnsFor([{name:'medicine_1'},{name:'quantity_1'}])),['medicine','dose','quantity','frequency','duration']);
 assert.equal(columnLabels.dose,'Strength');assert.equal(columnLabels.quantity,'Amount per dose');
});
test('missing fields keep remaining column meanings and order',()=>{
 assert.deepEqual(Array.from(columnsFor([{name:'medicine_1'},{name:'duration_1'}])),['medicine','dose','frequency','duration']);
 assert.equal(kindOf('duration_12'),'duration');assert.equal(kindOf('quantity_3'),'quantity');
});
