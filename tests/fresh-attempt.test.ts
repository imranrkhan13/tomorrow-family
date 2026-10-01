import {test} from 'node:test';import assert from 'node:assert/strict';
import {intakeKey,FRESH_TEST_SUFFIX,intake} from '../server/intake.js';import {inputHash,type Input} from '../server/extraction.js';
import type {Store,Entry,Ledger} from '../server/store.js';
const image:Input={text:'',file:{name:'fictional.jpg',mime:'image/jpeg',base64:Buffer.from([255,216,255,217]).toString('base64')}};
test('fixed fresh test scope preserves old key and cannot be selected with filename, text, nonce or malformed grant',()=>{
 const before=process.env.OCT1_FRESH_IMAGE_TEST_HASH;try{
 delete process.env.OCT1_FRESH_IMAGE_TEST_HASH;const ordinary=intakeKey(image);assert.equal(ordinary,inputHash(image)+':intake.v1');
 for(const bad of ['',inputHash(image).toUpperCase(),'other','a'.repeat(64)]){process.env.OCT1_FRESH_IMAGE_TEST_HASH=bad;assert.equal(intakeKey(image),ordinary);}
 process.env.OCT1_FRESH_IMAGE_TEST_HASH=inputHash(image);assert.equal(intakeKey(image),ordinary+FRESH_TEST_SUFFIX);
 assert.equal(intakeKey({...image,file:{...image.file!,name:'renamed.jpg'}}),ordinary+FRESH_TEST_SUFFIX);
 assert.equal(intakeKey({...image,text:'nonce'}),inputHash({...image,text:'nonce'})+':intake.v1');
 delete process.env.OCT1_FRESH_IMAGE_TEST_HASH;assert.equal(intakeKey(image),ordinary);
 }finally{if(before===undefined)delete process.env.OCT1_FRESH_IMAGE_TEST_HASH;else process.env.OCT1_FRESH_IMAGE_TEST_HASH=before;}
});
test('fresh test reserves once in same store, keeps old evidence, and failed or pending never retries',async()=>{
 const before=process.env.OCT1_FRESH_IMAGE_TEST_HASH;try{
 delete process.env.OCT1_FRESH_IMAGE_TEST_HASH;const old=intakeKey(image);const oldEntry:Entry={status:'ok',result:{evidence:'original'}};const entries=new Map<string,Entry>([[old,oldEntry]]);let reserves=0,calls=0;
 const store:Store={async lookup(k){return entries.get(k)??null},async reserve(k){assert.ok(!entries.has(k));reserves++;entries.set(k,{status:'pending'})},async finish(k,e){entries.set(k,e)},async fail(k,e){entries.set(k,{status:'failed',error:e})},async ledger():Promise<Ledger>{return{tokens:11760,usd:.020966,halted:false,lastCall:0}}};
 process.env.OCT1_FRESH_IMAGE_TEST_HASH=inputHash(image);const fresh=intakeKey(image);assert.notEqual(fresh,old);
 const transport=(async()=>{calls++;return new Response('failed',{status:500})}) as typeof fetch;const cfg={key:'fixture',freeConfirmed:true,tokenCap:2000000,creditCap:2};
 await assert.rejects(intake(image,store,cfg,transport),/HTTP_500/);await assert.rejects(intake(image,store,cfg,transport),/HTTP_500/);assert.equal(reserves,1);assert.equal(calls,1);assert.equal(entries.get(old),oldEntry);
 entries.set(fresh,{status:'pending'});await assert.rejects(intake(image,store,cfg,transport),/INTAKE_PENDING/);assert.equal(calls,1);assert.equal(reserves,1);
 }finally{if(before===undefined)delete process.env.OCT1_FRESH_IMAGE_TEST_HASH;else process.env.OCT1_FRESH_IMAGE_TEST_HASH=before;}
});
