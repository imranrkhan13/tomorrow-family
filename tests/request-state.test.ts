import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestLock,jevState,needsSavedLookup} from '../web/request-state.js';
import {intake,intakeKey} from '../server/intake.js';
import type {Store} from '../server/store.js';
test('lock covers asynchronous local saves and isolates different request keys',async()=>{
 const lock=requestLock();let release!:()=>void,calls=0;
 const hold=new Promise<void>(r=>{release=r;});
 const send=async()=>{if(!lock.acquire('upload'))return;try{await hold;calls++;}finally{lock.release('upload');}};
 const first=send();await send();assert.equal(calls,0);assert.equal(lock.acquire('jev'),true);release();await first;assert.equal(calls,1);assert.equal(lock.acquire('upload'),true);
});
test('Jev missing and pending responses are not failed, and malformed success is uncertain',()=>{
 assert.equal(jevState({status:'missing'}),'missing');assert.equal(jevState({status:'pending'}),'pending');assert.equal(jevState({status:'failed'}),'failed');assert.equal(jevState({status:'ok',findings:[]}),'ok');assert.equal(jevState({status:'ok'}),'unknown');assert.equal(jevState({status:'disabled'}),'unknown');
});
test('pending duplicate is read-only recoverable and never reserves or calls provider',async()=>{
 const input={text:'fictional Rx',file:null};let calls=0;
 const store={lookup:async(k:string)=>{assert.equal(k,intakeKey(input));return{status:'pending'};},reserve:async()=>{calls++;}} as unknown as Store;
 await assert.rejects(intake(input,store,{key:'mock',freeConfirmed:true,tokenCap:2_000_000,creditCap:2},(async()=>{calls++;throw Error('not allowed');}) as typeof fetch),e=>{assert.equal(needsSavedLookup(e),true);return true;});
 assert.equal(calls,0);assert.equal(needsSavedLookup(Error('INTERFAZE_HTTP_400')),false);
});
