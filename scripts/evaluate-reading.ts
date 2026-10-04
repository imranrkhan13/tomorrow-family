import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {evaluateReading,type ReadingField} from '../src/reading-benchmark.js';
// This runner has no HTTP transport. It evaluates saved outputs only.
const [manifestPath,outputsPath,outPath]=process.argv.slice(2);
if(!manifestPath||!outputsPath)throw Error('Usage: evaluate-reading.ts manifest.json saved-outputs.json [report.json]. No model requests.');
const manifest=JSON.parse(await readFile(manifestPath,'utf8')) as {cases:{id:string;image:string;sha256:string;expected:ReadingField[]}[]};
const outputs=JSON.parse(await readFile(outputsPath,'utf8')) as {id:string;fields:ReadingField[]}[];
if(!Array.isArray(outputs)||new Set(outputs.map(x=>x.id)).size!==outputs.length)throw Error('Saved outputs must be a case array with unique ids.');
const known=new Set(manifest.cases.map(c=>c.id));
if(outputs.some(c=>!known.has(c.id)))throw Error('Unknown output case id.');
const report=[];
for(const c of manifest.cases){const image=await readFile(resolve(dirname(manifestPath),c.image));if(createHash('sha256').update(image).digest('hex')!==c.sha256)throw Error('Fixture image fingerprint changed: '+c.id);
 const output=outputs.find(x=>x.id===c.id);if(!output){report.push({id:c.id,status:'unrun'});continue;}
 if(!Array.isArray(output.fields)||output.fields.some(f=>typeof f.name!=='string'||typeof f.value!=='string'))throw Error('Invalid saved fields: '+c.id);
 report.push({id:c.id,status:'evaluated',...evaluateReading(c.expected,output.fields)});
}
const body=JSON.stringify({scope:'Synthetic font-rendered structural test only; not handwriting accuracy or clinical validation',cases:report},null,2)+'\n';
if(outPath)await writeFile(outPath,body);else process.stdout.write(body);
