import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {outputSchema} from '../src/model.js';
import {evidenceFrom,link} from '../src/ground.js';
const source='Maple School — fictional product test notice\nIssued: 2026-09-27\nClass trip: 2026-09-29 at 08:30.\nPlease return the permission slip by 2026-09-28.\nBring a water bottle and packed lunch on 2026-09-29.';
const image=await readFile('docs/samples/notice.png');
const samples=[];
for(const [id,fixture,text] of [['text','tests/fixtures/interfaze-notice.json',source],['image','tests/fixtures/interfaze-image.json','']] as const){
 const raw=JSON.parse(await readFile(fixture,'utf8'));
 const parsed=outputSchema.parse(JSON.parse(raw.choices[0].message.content));
 const src=id==='image'?image:Buffer.from(text);
 samples.push({id,name:id==='image'?'Fictional trip notice · photo':'Fictional trip notice · text',sourceKind:id,sourceText:text,sourceImage:id==='image'?'/demo/notice.png':null,sourceSha256:createHash('sha256').update(src).digest('hex'),model:'interfaze',fixture:'genuine',receivedAt:'2026-09-27',summary:parsed.summary,tasks:link(parsed,evidenceFrom(raw.precontext,text)),usage:{promptTokens:raw.usage.prompt_tokens,completionTokens:raw.usage.completion_tokens,costUsd:(raw.usage.prompt_tokens*1.5+raw.usage.completion_tokens*3.5)/1e6}});
}
await mkdir('public/demo',{recursive:true});await copyFile('docs/samples/notice.png','public/demo/notice.png');await writeFile('public/demo/samples.json',JSON.stringify({version:1,samples},null,2)+'\n');
