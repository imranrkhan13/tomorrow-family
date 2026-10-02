/** One-shot provider check addressed by a saved record hash. It works only for the single hash named in
 * TOMORROW_ONESHOT_RECORD, so it cannot open recurring or arbitrary spend. The per-record ledger entry
 * still stops a repeat, and the 100k reserve / 200k cap stay in force. */
export function oneShotRecord(body:unknown):string|null{
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const keys=Object.keys(body);const record=(body as {record?:unknown}).record;
 if(keys.length!==1||keys[0]!=='record'||typeof record!=='string'||!/^[a-f0-9]{64}$/.test(record))return null;
 return process.env.TOMORROW_ONESHOT_RECORD===record?record:null;
}
