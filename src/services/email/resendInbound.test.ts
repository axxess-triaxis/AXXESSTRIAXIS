import { describe, expect, it } from "vitest";
import { emailAddress, htmlToText } from "./resendInbound";

describe("emailAddress", () => {
  it("reads an address with or without a display name", () => {
    expect(emailAddress("Asha Rao <Asha@Acme.in>")).toBe("asha@acme.in");
    expect(emailAddress("asha@acme.in")).toBe("asha@acme.in");
    expect(emailAddress("\"Rao, Asha\" <asha@acme.in>")).toBe("asha@acme.in");
  });
  it("returns null when there is no address", () => {
    expect(emailAddress("Asha Rao")).toBeNull();
    expect(emailAddress("<not-an-address>")).toBeNull();
  });
  it("stays fast on hostile input", () => {
    const started = Date.now();
    expect(emailAddress(`<!@${"!@".repeat(50_000)}`)).toBeNull();
    expect(emailAddress("!".repeat(100_000))).toBeNull();
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe("htmlToText", () => {
  it("keeps the text and line breaks", () => {
    expect(htmlToText("<p>Hi there</p><p>Call me <b>Thursday</b><br>Asha</p>")).toBe("Hi there\nCall me Thursday\nAsha");
  });
  it("drops script and style content and leaves no tag fragments", () => {
    expect(htmlToText("<style>p{}</style>Hi<script>alert(1)</script>!")).toBe("Hi!");
    expect(htmlToText("<scr<script>ipt>alert(1)</script>ok")).not.toMatch(/[<>]/);
  });
  it("decodes entities once", () => {
    expect(htmlToText("Q&amp;A &amp;lt;b&amp;gt; &lt;x&gt;")).toBe("Q&A &lt;b&gt; x");
  });
});
