import type {IntakeLinked} from '../src/intake.js';
export type Item={id:string;name:string;kind:'text'|'photo'|'pdf';createdAt:string;text:string;file:Blob|null;result:IntakeLinked|null;state:'saved'|'review'|'failed';error?:string};
let db:IDBDatabase;
export function init(){return new Promise<void>((resolve,reject)=>{const r=indexedDB.open('tomorrow-intake-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('items',{keyPath:'id'});r.onsuccess=()=>{db=r.result;resolve();};r.onerror=()=>reject(r.error);});}
export function all(){return new Promise<Item[]>((resolve,reject)=>{const r=db.transaction('items').objectStore('items').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export function put(item:Item){return new Promise<void>((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').put(item);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
export function remove(id:string){return new Promise<void>((resolve,reject)=>{const tx=db.transaction('items','readwrite');tx.objectStore('items').delete(id);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
