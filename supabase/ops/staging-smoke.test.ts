import { strict as assert } from "node:assert";
import { runStagingSmoke } from "./staging-smoke.ts";

const url = "https://vspdhdqaneofutsvavlc.supabase.co";
const publicKey = "sb_publishable_test_public_key";
const read = (values: Record<string, string>) => (key: string) => values[key];
const config = {
  EXPO_PUBLIC_SUPABASE_URL: url,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: publicKey,
};

Deno.test("staging probes reject other projects and privileged credentials before network I/O", async () => {
  let calls = 0;
  const noNetwork: typeof fetch = () => {
    calls++;
    throw new Error("Unexpected network");
  };
  for (
    const endpoint of [
      undefined,
      "http://127.0.0.1:54321",
      "https://other.supabase.co",
      url + "/path",
      url + "?key=private",
      url.replace("https://", "https://user:pass@"),
      url + ".evil.test",
      url + "#fragment",
    ]
  ) {
    await assert.rejects(
      () =>
        runStagingSmoke(
          read({ ...config, EXPO_PUBLIC_SUPABASE_URL: endpoint as string }),
          noNetwork,
        ),
      /authorized staging/,
    );
  }
  const jwt = (role: string) => `e30.${btoa(JSON.stringify({ role }))}.c2ln`;
  for (
    const key of [
      "",
      "sb_secret_never_print_me",
      jwt("service_role"),
      jwt("authenticated"),
      "not-a-public-key",
      publicKey + " ",
    ]
  ) {
    await assert.rejects(
      () =>
        runStagingSmoke(
          read({ ...config, EXPO_PUBLIC_SUPABASE_ANON_KEY: key }),
          noNetwork,
        ),
      (error: Error) => {
        assert.match(error.message, /public anon/);
        assert.ok(!error.message.includes("never_print_me"));
        return true;
      },
    );
  }
  assert.equal(calls, 0);
});

Deno.test("staging probes use only safe HTTP cases and validate status, schemas and CORS", async () => {
  const requests: { method: string; path: string }[] = [];
  const network: typeof fetch = async (input, init) => {
    const target = new URL(String(input));
    assert.equal(target.origin, url);
    assert.equal(init?.redirect, "error");
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("apikey"), publicKey);
    assert.ok(!headers.has("authorization"));
    requests.push({ method: init?.method ?? "GET", path: target.pathname });
    if (init?.method === "OPTIONS") {
      const origin = headers.get("origin");
      if (origin === "https://unapproved.invalid") {
        return Response.json(
          { error: "bad_request", message: "Origin rejected" },
          { status: 403 },
        );
      }
      return new Response(null, {
        status: 204,
        headers: { "access-control-allow-origin": "http://localhost:8081" },
      });
    }
    if (target.pathname.endsWith("/moderate")) {
      assert.equal(init?.body, "{}");
      return Response.json({ error: "unauthorized", message: "Denied" }, {
        status: 401,
      });
    }
    if (
      !headers.has("x-device-id") || target.searchParams.get("code") === "abc"
    ) {
      return Response.json({ error: "bad_request", message: "Invalid" }, {
        status: 400,
      });
    }
    return Response.json({ status: "not_found" });
  };
  const result = await runStagingSmoke(read(config), network);
  assert.equal(result.length, 6);
  assert.ok(result.every((item) => item.status === "passed"));
  assert.equal(requests.filter((r) => r.method === "POST").length, 1);
  assert.deepEqual(
    requests.filter((r) => r.method === "POST").map((r) => r.path),
    ["/functions/v1/moderate"],
  );
});

Deno.test("a broken gateway fails the probe with a sanitized diagnostic", async () => {
  const broken: typeof fetch = async () =>
    Response.json(
      { private: "never_print_me" },
      { status: 502 },
    );
  await assert.rejects(
    () => runStagingSmoke(read(config), broken),
    (error: Error) => {
      assert.match(error.message, /Probe failed/);
      assert.ok(!error.message.includes("never_print_me"));
      return true;
    },
  );
});
