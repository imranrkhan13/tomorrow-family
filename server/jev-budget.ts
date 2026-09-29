/** Separate, shared Jev usage ledger. Reservations are serialized across instances.
 * A pending/uncertain request halts all further Jev calls; no automatic retry.
 */
import {mkdir,open,readFile,rename,unlink,writeFile} from 'node:fs/promises';
import type {GateFinding} from './jev-gate.js';
export type JevEntry={status:'pending'|'ok'|'failed';findings?:GateFinding[];error?:string};
export type JevLedger={tokens:number;halted:boolean;reason?:string};
export interface JevBudget{lookup(id:string):Promise<JevEntry|null>;reserve(id:string):Promise<void>;finish(id:string,findings:GateFinding[],tokens:number):Promise<void>;fail(id:string,error:string):Promise<void>;ledger():Promise<JevLedger>}
export const CAP=200_000, RESERVE=100_000;
const blank=():JevLedger=>({tokens:0,halted:false});
export class FileJevBudget implements JevBudget{
 constructor(private dir='.private'){}
 private async read(){await mkdir(this.dir,{recursive:true,mode:0o700});try{return JSON.parse(await readFile(this.dir+'/jev-state.json','utf8')) as {ledger:JevLedger;entries:Record<string,JevEntry>};}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;return{ledger:blank(),entries:{}};}}
 private async change(fn:(s:{ledger:JevLedger;entries:Record<string,JevEntry>})=>void){await mkdir(this.dir,{recursive:true,mode:0o700});const lock=await open(this.dir+'/jev.lock','wx').catch(()=>{throw Error('JEV_BUSY: no provider call.');});try{const s=await this.read();fn(s);await writeFile(this.dir+'/jev.tmp',JSON.stringify(s),{mode:0o600});await rename(this.dir+'/jev.tmp',this.dir+'/jev-state.json');}finally{await lock.close();await unlink(this.dir+'/jev.lock');}}
 async lookup(id:string){return(await this.read()).entries[id]??null;}
 async ledger(){return(await this.read()).ledger;}
 async reserve(id:string){await this.change(s=>{if(s.entries[id])throw Error('JEV_ALREADY_RESERVED: no repeat.');if(s.ledger.halted)throw Error('JEV_HALTED: usage uncertain.');if(s.ledger.tokens+RESERVE>CAP)throw Error('JEV_CAP_REACHED: no provider call.');s.entries[id]={status:'pending'};s.ledger.halted=true;s.ledger.reason='Call pending';});}
 async finish(id:string,findings:GateFinding[],tokens:number){await this.change(s=>{if(s.entries[id]?.status!=='pending')throw Error('JEV_ENTRY_NOT_PENDING');s.entries[id]={status:'ok',findings};s.ledger={tokens:s.ledger.tokens+tokens,halted:!Number.isSafeInteger(tokens)||tokens<0||tokens>RESERVE||s.ledger.tokens+tokens>CAP};if(s.ledger.halted)s.ledger.reason='Usage exceeded reservation; no further calls';});}
 async fail(id:string,error:string){await this.change(s=>{s.entries[id]={status:'failed',error};s.ledger.halted=true;s.ledger.reason=error;});}
}
export class RedisJevBudget implements JevBudget{
 constructor(private url:string,private token:string){}
 private async command(...args:unknown[]){const r=await fetch(this.url,{method:'POST',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('JEV_CACHE_UNAVAILABLE: no provider call.');const j=await r.json() as {result:unknown;error?:string};if(j.error)throw Error('JEV_CACHE_ERROR: '+j.error);return j.result;}
 async lookup(id:string){const v=await this.command('GET','tomorrow:jev:entry:'+id);return v?JSON.parse(String(v)) as JevEntry:null;}
 async ledger(){const v=await this.command('GET','tomorrow:jev:ledger');return v?JSON.parse(String(v)) as JevLedger:blank();}
 async reserve(id:string){const script=`if redis.call('EXISTS',KEYS[1])==1 then return 'ALREADY_RESERVED' end;local v=redis.call('GET',KEYS[2]);local s=v and cjson.decode(v) or {tokens=0,halted=false};if s.halted then return 'HALTED' end;if tonumber(s.tokens)+100000>200000 then return 'CAP_REACHED' end;redis.call('SET',KEYS[1],'{"status":"pending"}');s.halted=true;s.reason='Call pending';redis.call('SET',KEYS[2],cjson.encode(s));return 'OK'`;
 const r=await this.command('EVAL',script,2,'tomorrow:jev:entry:'+id,'tomorrow:jev:ledger');if(r!=='OK')throw Error('JEV_'+r+': no provider call.');}
 async finish(id:string,findings:GateFinding[],tokens:number){if(!Number.isSafeInteger(tokens)||tokens<0)throw Error('JEV_INVALID_USAGE');const script=`local s=cjson.decode(redis.call('GET',KEYS[2]));if redis.call('GET',KEYS[1])~='{"status":"pending"}' then return 'NOT_PENDING' end;s.tokens=s.tokens+tonumber(ARGV[2]);s.halted=tonumber(ARGV[2])>100000 or s.tokens>200000;if s.halted then s.reason='Usage exceeded reservation; no further calls' else s.reason=nil end;redis.call('SET',KEYS[1],ARGV[1]);redis.call('SET',KEYS[2],cjson.encode(s));return 'OK'`;const r=await this.command('EVAL',script,2,'tomorrow:jev:entry:'+id,'tomorrow:jev:ledger',JSON.stringify({status:'ok',findings}),tokens);if(r!=='OK')throw Error('JEV_'+r);}
 async fail(id:string,error:string){await this.command('EVAL',`local s=cjson.decode(redis.call('GET',KEYS[2]));s.halted=true;s.reason=ARGV[2];redis.call('SET',KEYS[1],ARGV[1]);redis.call('SET',KEYS[2],cjson.encode(s));return 'OK'`,2,'tomorrow:jev:entry:'+id,'tomorrow:jev:ledger',JSON.stringify({status:'failed',error}),error);}
   }
