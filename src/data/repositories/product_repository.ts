import { z } from "zod";
import {
  Code,
  Uuid,
  LookupResponse,
  IdentifyRequest,
  IdentifyResponse,
  ReadLabelRequest,
  ReadLabelResponse,
  AddProductRequest,
  ReportRequest,
  ErrorBody,
  type ErrorCode,
} from "../models/contract";
import { getDeviceId } from "../../core/services/device_service";
import { ro } from "../../core/constants/strings_ro";
export class ApiError extends Error {
  constructor(
    public code: ErrorCode | "offline" | "invalid_response" | "configuration",
  ) {
    super(ro.errors[code]);
    this.name = "ApiError";
  }
}
async function request<T>(
  name: string,
  schema: z.ZodType<T>,
  body?: unknown,
  query?: Record<string, string>,
): Promise<T> {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL,
    key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) throw new ApiError("configuration");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(
      `${base}/functions/v1/${name}${query ? "?" + new URLSearchParams(query) : ""}`,
      {
        method: body === undefined ? "GET" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-device-id": await getDeviceId(),
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      },
    );
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ApiError("invalid_response");
    }
    if (!response.ok) {
      const error = ErrorBody.safeParse(json);
      throw new ApiError(error.success ? error.data.error : "upstream_failed");
    }
    const result = schema.safeParse(json);
    if (!result.success) throw new ApiError("invalid_response");
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("offline");
  } finally {
    clearTimeout(timeout);
  }
}
function validate<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError("bad_request");
  return result.data;
}
export const api = {
  async lookup(by: { code: string } | { id: string }): Promise<LookupResponse> {
    const query = validate(
      z.union([
        z.object({ code: Code }).strict(),
        z.object({ id: Uuid }).strict(),
      ]),
      by,
    );
    return request("lookup", LookupResponse, undefined, query);
  },
  async identify(photoBase64: string): Promise<IdentifyResponse> {
    return request(
      "identify",
      IdentifyResponse,
      validate(IdentifyRequest, { photo: photoBase64 }),
    );
  },
  async readLabel(req: ReadLabelRequest): Promise<ReadLabelResponse> {
    return request(
      "read-label",
      ReadLabelResponse,
      validate(ReadLabelRequest, req),
    );
  },
  async addProduct(req: AddProductRequest): Promise<LookupResponse> {
    return request(
      "add-product",
      LookupResponse,
      validate(AddProductRequest, req),
    );
  },
  async report(req: ReportRequest): Promise<void> {
    await request(
      "report",
      z.object({ status: z.literal("ok") }),
      validate(ReportRequest, req),
    );
  },
};
