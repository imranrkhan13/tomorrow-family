import {test} from 'node:test';import assert from 'node:assert/strict';import {awaitSavedResult,resumeRecoveredResult} from '../web/recovery.js';
test('read-only polling recovers after pending and transient read failures',async()=>{let reads=0,waits=0;const result=await awaitSavedResult(async()=>{reads++;if(reads===1)throw Error('network');return reads===2?{status:'pending'}:{status:'ok'};},async()=>{waits++;},5);assert.equal(result.status,'ok');assert.equal(reads,3);assert.equal(waits,2);});
test('pending exits after bounded reads and never calls a write',async()=>{let reads=0;const result=await awaitSavedResult(async()=>{reads++;return{status:'pending'};},async()=>{},3);assert.equal(result.status,'pending');assert.equal(reads,3);});
test('definitive failure stops polling',async()=>{for(const status of ['failed'] as const){let reads=0;const result=await awaitSavedResult(async()=>{reads++;return{status,error:'not found'};},async()=>{},4);assert.equal(result.status,status);assert.equal(reads,1);}});

test('missing entry can precede a pending write',async()=>{let reads=0;const result=await awaitSavedResult(async()=>{reads++;return reads===1?{status:'missing'}:{status:'ok'};},async()=>{},3);assert.equal(result.status,'ok');assert.equal(reads,2);});


test('recovered prescription is saved before exactly one Jev text check',async()=>{
 const events:string[]=[];const result={useCase:'prescription'};
 const found=await awaitSavedResult(async()=>({status:'ok',result:result as never}),async()=>{});
 assert.equal(await resumeRecoveredResult(found,async r=>{assert.equal(r,result);events.push('save');},async r=>{assert.equal(r,result);events.push('jev');}),true);
 assert.deepEqual(events,['save','jev']);
});
test('missing or pending recovery never triggers Jev',async()=>{
 for(const status of ['missing','pending','failed','ok']){
 let calls=0;assert.equal(await resumeRecoveredResult({status},async()=>{calls++;},async()=>{calls++;}),false);assert.equal(calls,0);
 }
});
