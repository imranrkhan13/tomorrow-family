/** Acquire before any asynchronous work, including local saves. */
export function requestLock(){
 const active=new Set<string>();
 return {acquire(key:string){if(active.has(key))return false;active.add(key);return true;},release(key:string){active.delete(key);}};
}
export type JevStatus='ok'|'skipped'|'failed'|'missing'|'pending'|'unknown'|'held';
/** A successful HTTP response is not necessarily a completed provider check. */
export function jevState(data:{status:string;findings?:unknown}):JevStatus{
 if(data.status==='ok')return Array.isArray(data.findings)?'ok':'unknown';
 if(['skipped','failed','missing','pending','held'].includes(data.status))return data.status as JevStatus;
 return 'unknown';
}
export function needsSavedLookup(error:unknown){return error instanceof TypeError||error instanceof Error&&/fetch|abort|timed out|INTAKE_PENDING|ALREADY_RESERVED|unfinished/i.test(error.message);}
