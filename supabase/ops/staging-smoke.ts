import {
  Code,
  ErrorBody,
  LookupResponse,
} from "../functions/_shared/contract.ts";

type Result = { check: string; status: "passed"; httpStatus: number };
const staging = "https://vspdhdqaneofutsvavlc.supabase.co";

function publicKey(value: string | undefined): string {
  let valid = false;
  if (value && value.trim() === value) {
    valid = /^sb_publishable_[A-Za-z0-9_-]+$/.test(value);
    if (
      !valid && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
    ) {
      try {
        const payload = value.split(".")[1].replace(/-/g, "+").replace(
          /_/g,
          "/",
        );
        valid = JSON.parse(atob(payload)).role === "anon";
      } catch { /* Reject without disclosing any credential. */ }
    }
  }
  if (!valid) throw new Error("Use only a public anon/publishable key.");
  return value!;
}

// Operator-run only: no fixtures, provider calls, authorized writes or cleanup.
// A lookup can append routine usage telemetry. Never import local test fixtures.
export async function runStagingSmoke(
  read: (name: string) => string | undefined = (name) => Deno.env.get(name),
  network: typeof fetch = fetch,
): Promise<Result[]> {
  if (read("EXPO_PUBLIC_SUPABASE_URL") !== staging) {
    throw new Error("Probes require the exact authorized staging origin.");
  }
  const key = publicKey(read("EXPO_PUBLIC_SUPABASE_ANON_KEY"));
  const knownCode = read("OKBITE_STAGING_KNOWN_CODE");
  if (knownCode !== undefined && !Code.safeParse(knownCode).success) {
    throw new Error("Known code must be EAN-8 or EAN-13.");
  }
  const results: Result[] = [];
  const headers = {
    apikey: key,
    ...(key.startsWith("sb_publishable_")
      ? {}
      : { authorization: `Bearer ${key}` }),
  };
  const check = async (
    name: string,
    path: string,
    init: RequestInit,
    status: number,
    validate: (response: Response) => Promise<boolean>,
  ) => {
    try {
      const response = await network(`${staging}/functions/v1/${path}`, {
        ...init,
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
        headers: { ...headers, ...init.headers },
      });
      if (response.status !== status || !await validate(response)) {
        throw new Error();
      }
      results.push({
        check: name,
        status: "passed",
        httpStatus: response.status,
      });
    } catch {
      throw new Error(
        `Probe failed: ${name}. No remote response or credential logged.`,
      );
    }
  };
  const error = (code: string) => async (response: Response) => {
    const body = ErrorBody.parse(await response.json());
    return body.error === code;
  };
  await check(
    "allowed-preflight",
    "lookup",
    {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:8081",
        "access-control-request-method": "GET",
        "access-control-request-headers": "x-device-id",
      },
    },
    204,
    async (response) => {
      await response.body?.cancel();
      return response.headers.get("access-control-allow-origin") ===
        "http://localhost:8081";
    },
  );
  await check(
    "rejected-origin",
    "lookup",
    {
      method: "OPTIONS",
      headers: {
        origin: "https://unapproved.invalid",
        "access-control-request-method": "GET",
      },
    },
    403,
    async (response) =>
      !response.headers.has("access-control-allow-origin") &&
      await error("bad_request")(response),
  );
  await check(
    "missing-device",
    "lookup?code=00000000",
    {},
    400,
    error("bad_request"),
  );
  const device = crypto.randomUUID();
  await check(
    "invalid-code",
    "lookup?code=abc",
    {
      headers: { "x-device-id": device },
    },
    400,
    error("bad_request"),
  );
  await check(
    "moderator-denied",
    "moderate",
    {
      method: "POST",
      body: "{}",
      headers: { "content-type": "application/json" },
    },
    401,
    error("unauthorized"),
  );
  await check(
    knownCode ? "known-product" : "lookup-schema",
    `lookup?code=${knownCode ?? "00000000"}`,
    { headers: { "x-device-id": device } },
    200,
    async (response) => {
      const body = LookupResponse.parse(await response.json());
      return knownCode === undefined || body.status === "found";
    },
  );
  return results;
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await runStagingSmoke(), null, 2));
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Staging probe failed.",
    );
    Deno.exitCode = 1;
  }
}
