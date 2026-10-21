import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

const { AiError, generateJson, imagePart } = await import("@/lib/llm");

const Out = z.object({ ok: z.boolean() });
const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status, headers: { "Content-Type": "application/json" } });

describe("generateJson via OpenRouter", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a chat request with image parts and a json_schema response format", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply('```json\n{"ok": true}\n```'));
    vi.stubGlobal("fetch", fetchMock);
    const schema = { type: "object", properties: { ok: { type: "boolean" } } };
    const out = await generateJson(Out, {
      system: "sys",
      parts: [{ text: "Analyze this photo." }, imagePart("data:image/jpeg;base64,AAAA")],
      jsonSchema: schema,
    });
    expect(out).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    const body = JSON.parse(init.body);
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.messages[1].content).toEqual([
      { type: "text", text: "Analyze this photo." },
      { type: "image_url", image_url: { url: "data:image/jpeg;base64,AAAA" } },
    ]);
    expect(body.response_format).toEqual({ type: "json_schema", json_schema: { name: "response", strict: false, schema } });
  });

  it("retries once on invalid JSON, then throws a parse error", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => reply("{not json"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateJson(Out, { system: "s", parts: [{ text: "t" }] })).rejects.toMatchObject({ kind: "parse" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps a repeated upstream error to AiError('upstream')", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("nope", { status: 500 })));
    const err = await generateJson(Out, { system: "s", parts: [{ text: "t" }] }).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("upstream");
  });

  it("rejects non-image data URLs", () => {
    expect(() => imagePart("https://example.com/cat.png")).toThrow(AiError);
  });
});
