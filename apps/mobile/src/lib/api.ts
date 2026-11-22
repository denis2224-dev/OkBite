import { z } from 'zod';
import { Code,Uuid,LookupResponse,IdentifyRequest,IdentifyResponse,ReadLabelRequest,ReadLabelResponse,AddProductRequest,ReportRequest,ErrorBody,type ErrorCode } from '@okbite/shared';
import { getDeviceId } from './device';
import { ro } from '../copy/ro';
import { isPreview } from './preview';
import { demoApi } from './demoApi';
import { waitForAnalysis, type AnalysisOutcome } from './analysisOutcome';
import { ShelfCategory, TopProductsResponse, TOP_PRODUCTS_LIMIT } from '../features/shelf/topProducts';
type ApiErrorCode = ErrorCode | 'offline' | 'invalid_response' | 'configuration' | 'analysis_timeout';

export class ApiError extends Error {
  constructor(public code: ApiErrorCode) {
    super(ro.errors[code]);
    this.name = 'ApiError';
  }
}

type Deadline = { ms: number; error: 'offline' | 'analysis_timeout' };
const REQUEST_DEADLINE: Deadline = { ms: 20_000, error: 'offline' };
const LEGACY_ANALYSIS_DEADLINE: Deadline = { ms: 55_000, error: 'analysis_timeout' };
// The provider budgets 40 s. Allow additional time for storage, lookup and the response.
const ANALYSIS_DEADLINE: Deadline = { ms: 75_000, error: 'analysis_timeout' };

const demo=()=>isPreview&&!(process.env.EXPO_PUBLIC_SUPABASE_URL&&process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function request<T>(
  name: string,
  schema: z.ZodType<T>,
  body?: unknown,
  query?: Record<string, string>,
  deadline = REQUEST_DEADLINE,
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new ApiError('configuration');

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new ApiError(deadline.error));
      controller.abort();
    }, deadline.ms);
  });

  const send = async () => {
    const deviceId = await getDeviceId();
    if (controller.signal.aborted) throw new ApiError(deadline.error);
    const response = await fetch(`${base}/functions/v1/${name}${query ? '?' + new URLSearchParams(query) : ''}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-device-id': deviceId, apikey: key, Authorization: `Bearer ${key}` },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let json: unknown;
    try { json = await response.json(); }
    catch { throw new ApiError('invalid_response'); }
    if (!response.ok) {
      const error = ErrorBody.safeParse(json);
      throw new ApiError(error.success ? error.data.error : 'upstream_failed');
    }
    const result = schema.safeParse(json);
    if (!result.success) throw new ApiError('invalid_response');
    return result.data;
  };

  try {
    return await Promise.race([send(), expired]);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('offline');
  } finally {
    clearTimeout(timer);
  }
}

function validate<T>(schema:z.ZodType<T>,value:unknown):T {const result=schema.safeParse(value);if(!result.success)throw new ApiError('bad_request');return result.data;}
export const api={
 async lookup(by:{code:string}|{id:string}):Promise<LookupResponse>{const query=validate(z.union([z.object({code:Code}).strict(),z.object({id:Uuid}).strict()]),by);if(demo())return demoApi.lookup(query);return request('lookup',LookupResponse,undefined,query);},
 async identify(photoBase64:string):Promise<IdentifyResponse>{if(demo())return demoApi.identify();return request('identify',IdentifyResponse,validate(IdentifyRequest,{photo:photoBase64}),undefined,LEGACY_ANALYSIS_DEADLINE);},
 async readLabel(req:ReadLabelRequest):Promise<ReadLabelResponse>{if(demo())return demoApi.readLabel(validate(ReadLabelRequest,req).nutritionImage!==null);return request('read-label',ReadLabelResponse,validate(ReadLabelRequest,req),undefined,LEGACY_ANALYSIS_DEADLINE);},
 async identifyOutcome(photoBase64:string):Promise<AnalysisOutcome<IdentifyResponse>>{const body=validate(IdentifyRequest,{photo:photoBase64});return waitForAnalysis(Promise.resolve(demo()?demoApi.identify():request('identify',IdentifyResponse,body,undefined,ANALYSIS_DEADLINE)));},
 async readLabelOutcome(req:ReadLabelRequest):Promise<AnalysisOutcome<ReadLabelResponse>>{const body=validate(ReadLabelRequest,req);return waitForAnalysis(Promise.resolve(demo()?demoApi.readLabel(body.nutritionImage!==null):request('read-label',ReadLabelResponse,body,undefined,ANALYSIS_DEADLINE)));},
 async addProduct(req:AddProductRequest):Promise<LookupResponse>{if(demo())return demoApi.addProduct(validate(AddProductRequest,req));return request('add-product',LookupResponse,validate(AddProductRequest,req));},
 /** Candidates for "Cel mai bun din raft" in one category; the app ranks them (docs/api/top-products.md). */
 async topProducts(category:string):Promise<TopProductsResponse>{
  const slug=validate(ShelfCategory,category);if(demo())return demoApi.topProducts(slug,TOP_PRODUCTS_LIMIT);
  const result=await request('top-products',TopProductsResponse,undefined,{category:slug,limit:String(TOP_PRODUCTS_LIMIT)});
  if(result.category!==slug)throw new ApiError('invalid_response');return result;
 },
 async report(req:ReportRequest):Promise<void>{if(demo()){validate(ReportRequest,req);return;}await request('report',z.object({status:z.literal('ok')}),validate(ReportRequest,req));},
};
