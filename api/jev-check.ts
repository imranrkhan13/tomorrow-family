import type {IncomingMessage,ServerResponse} from 'node:http';
import {checkJev} from '../server/jev-check.js';
export default function handler(req:IncomingMessage,res:ServerResponse){return checkJev(req,res,false);}