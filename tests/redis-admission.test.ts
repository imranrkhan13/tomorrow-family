import {test} from 'node:test';import assert from 'node:assert/strict';
import {RedisStore} from '../server/store.js';
test('Redis admission Lua has three keys, keeps first-hour TTL, and fails closed before calling provider',async()=>{
 const old=globalThis.fetch;const db=new Map<string,string>();const expiry=new Map<string,number>();let now=1000000;
 globalThis.fetch=(async(_url,options)=>{const [cmd,...args]=JSON.parse(String(options?.body));let result:unknown;
 if(cmd==='EVAL') {const [script,keyCount,...tail]=args as [string,number,...string[]];assert.equal(keyCount,3);const keys=tail.slice(0,keyCount),argv=tail.slice(keyCount);const ledger=JSON.parse(db.get(keys[1])??'{"tokens":0,"usd":0,"halted":false,"lastCall":0}');
 if(db.has(keys[0]))result='ALREADY_RESERVED';else if(ledger.halted)result='HALTED';else if(ledger.tokens+1032000>Number(argv[0])||ledger.usd+1.612>Number(argv[1]))result='CAP_REACHED';else if(Number(argv[2])-ledger.lastCall<1000)result='RATE_LIMIT';else {let count=Number(db.get(keys[2])??'0');if(expiry.has(keys[2])&&now>=expiry.get(keys[2])!){count=0;db.delete(keys[2]);expiry.delete(keys[2]);}if(count>=6)result='DEVICE_RATE_LIMIT';else{db.set(keys[2],String(count+1));if(!count)expiry.set(keys[2],now+3600000);db.set(keys[0],'{"status":"pending"}');db.set(keys[1],JSON.stringify({...ledger,halted:true,lastCall:Number(argv[2])}));result='OK';}}assert.match(script,/if count==0 then redis.call\('EXPIRE',KEYS\[3\],3600\)/);
 } else if(cmd==='GET')result=db.get(args[0])??null;else throw Error('Unexpected Redis action '+cmd);
 return new Response(JSON.stringify({result}));}) as typeof fetch;
 try{const store=new RedisStore('http://fixture.invalid','fixture');for(let i=0;i<6;i++){now+=1001;await store.reserve('r'+i,20_000_000,20,'device');db.set('tomorrow:ledger',JSON.stringify({tokens:0,usd:0,halted:false,lastCall:now}));}assert.equal(expiry.get('tomorrow:device:device'),1001001+3600000);now+=1001;await assert.rejects(store.reserve('r6',20_000_000,20,'device'),/DEVICE_RATE_LIMIT/);assert.equal(db.has('tomorrow:input:r6'),false);}finally{globalThis.fetch=old;}
});
