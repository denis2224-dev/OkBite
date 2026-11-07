import { z } from 'zod';
import { Code,Uuid,LookupResponse,IdentifyRequest,IdentifyResponse,ReadLabelRequest,ReadLabelResponse,AddProductRequest,ReportRequest,ErrorBody,type ErrorCode } from '@okbite/shared';
import { getDeviceId } from './device';
import { ro } from '../copy/ro';
import { isPreview } from './preview';
import { demoApi } from './demoApi';
export class ApiError extends Error {constructor(public code:ErrorCode|'offline'|'invalid_response'|'configuration'){super(ro.errors[code]);this.name='ApiError';}}
// Photo analysis waits past the server's 40 s provider deadline (supabase/functions/_lib/claude.ts AI_DEADLINE_MS).
const TIMEOUT_MS=20000,AI_TIMEOUT_MS=55000;
const demo=()=>isPreview&&!(process.env.EXPO_PUBLIC_SUPABASE_URL&&process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function request<T>(name:string,schema:z.ZodType<T>,body?:unknown,query?:Record<string,string>,timeoutMs=TIMEOUT_MS):Promise<T>{
 const base=process.env.EXPO_PUBLIC_SUPABASE_URL,key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)throw new ApiError('configuration');
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(`${base}/functions/v1/${name}${query?'?'+new URLSearchParams(query):''}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json','x-device-id':await getDeviceId(),apikey:key,Authorization:`Bearer ${key}`},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});
  let json:unknown;try{json=await response.json();}catch{throw new ApiError('invalid_response');}
  if(!response.ok){const error=ErrorBody.safeParse(json);throw new ApiError(error.success?error.data.error:'upstream_failed');}
  const result=schema.safeParse(json);if(!result.success)throw new ApiError('invalid_response');return result.data;
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError('offline');}finally{clearTimeout(timeout);}
}
function validate<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success)throw new ApiError('bad_request');return result.data;}
export const api={
 async lookup(by:{code:string}|{id:string}):Promise<LookupResponse>{const query=validate(z.union([z.object({code:Code}).strict(),z.object({id:Uuid}).strict()]),by);if(demo())return demoApi.lookup(query);return request('lookup',LookupResponse,undefined,query);},
 async identify(photoBase64:string):Promise<IdentifyResponse>{if(demo())return demoApi.identify();return request('identify',IdentifyResponse,validate(IdentifyRequest,{photo:photoBase64}),undefined,AI_TIMEOUT_MS);},
 async readLabel(req:ReadLabelRequest):Promise<ReadLabelResponse>{if(demo())return demoApi.readLabel(validate(ReadLabelRequest,req).nutritionImage!==null);return request('read-label',ReadLabelResponse,validate(ReadLabelRequest,req),undefined,AI_TIMEOUT_MS);},
 async addProduct(req:AddProductRequest):Promise<LookupResponse>{if(demo())return demoApi.addProduct(validate(AddProductRequest,req));return request('add-product',LookupResponse,validate(AddProductRequest,req));},
 async report(req:ReportRequest):Promise<void>{if(demo()){validate(ReportRequest,req);return;}await request('report',z.object({status:z.literal('ok')}),validate(ReportRequest,req));},
};
