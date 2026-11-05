import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";
import { sep } from "node:path";
import jpeg from "npm:jpeg-js@0.4.4";
import { adminClient } from "../functions/_lib/client.ts";
import { publishPhoto, saveJpeg } from "../functions/_lib/storage.ts";

// Destructive steps are limited to fresh UUID fixtures created by this invocation.
const url = new URL(Deno.env.get("SUPABASE_URL") ?? "");
if (
  url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)
) {
  throw new Error(
    "Photo restore drill requires an explicit local-only Supabase URL",
  );
}
const directory = Deno.args[0];
if (!directory) {
  throw new Error("Pass a private output directory outside the repository");
}
await Deno.mkdir(directory, { recursive: true, mode: 0o700 });
const repository = await Deno.realPath(
  fileURLToPath(new URL("../../", import.meta.url)),
);
const actual = await Deno.realPath(directory);
if (actual === repository || actual.startsWith(repository + sep)) {
  throw new Error("Backups must stay outside the repository");
}
await Deno.chmod(directory, 0o700);
const db = adminClient();
const device = crypto.randomUUID();
const product = crypto.randomUUID();
const fixtures: {
  bucket: string;
  path: string;
  backup: string;
  sha256: string;
}[] = [];
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new Uint8Array(bytes)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0")).join("");
try {
  const image = jpeg.encode(
    { width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) },
    80,
  ).data;
  const privatePath = await saveJpeg(
    btoa(String.fromCharCode(...image)),
    device,
    "front",
  );
  fixtures.push({
    bucket: "uploads",
    path: privatePath,
    backup: `${directory}/uploads-fixture.jpg`,
    sha256: "",
  });
  const publicPath = await publishPhoto(privatePath, product, "front");
  fixtures.push({
    bucket: "products",
    path: publicPath,
    backup: `${directory}/products-fixture.jpg`,
    sha256: "",
  });
  for (const fixture of fixtures) {
    const stored = await db.storage.from(fixture.bucket).download(fixture.path);
    assert.equal(stored.error, null);
    const bytes = new Uint8Array(await stored.data!.arrayBuffer());
    await Deno.writeFile(fixture.backup, bytes, { mode: 0o600 });
    fixture.sha256 = await hash(bytes);
    assert.equal(
      (await db.storage.from(fixture.bucket).remove([fixture.path])).error,
      null,
    );
    assert.equal(
      (await db.storage.from(fixture.bucket).upload(
        fixture.path,
        await Deno.readFile(fixture.backup),
        { contentType: "image/jpeg" },
      )).error,
      null,
    );
    const recovered = await db.storage.from(fixture.bucket).download(
      fixture.path,
    );
    assert.equal(recovered.error, null);
    assert.equal(
      await hash(new Uint8Array(await recovered.data!.arrayBuffer())),
      fixture.sha256,
    );
  }
  await Deno.writeTextFile(
    `${directory}/photo-report.json`,
    JSON.stringify(
      {
        date: new Date().toISOString(),
        scope: "Local UUID fixtures only; not production photo recovery",
        files: fixtures,
        result:
          "Both private and public photo bytes recovered with identical SHA-256",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    "Private and public photo backup/restore verified; fixture objects will be removed.",
  );
} finally {
  for (const fixture of fixtures) {
    assert.equal(
      (await db.storage.from(fixture.bucket).remove([fixture.path])).error,
      null,
    );
  }
}
