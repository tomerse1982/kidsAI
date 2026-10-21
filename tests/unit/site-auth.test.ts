import { describe, expect, it } from "vitest";
import { checkSitePassword } from "@/lib/site-auth";

const basic = (user: string, pass: string) => "Basic " + Buffer.from(`${user}:${pass}`, "utf8").toString("base64");

describe("checkSitePassword", () => {
  it("accepts the right password with any user name", () => {
    expect(checkSitePassword(basic("", "s3cret"), "s3cret")).toBe(true);
    expect(checkSitePassword(basic("anyone", "s3cret"), "s3cret")).toBe(true);
  });

  it("supports non-ASCII passwords and colons inside the password", () => {
    expect(checkSitePassword(basic("x", "סיסמה:كلمة"), "סיסמה:كلمة")).toBe(true);
  });

  it("rejects a wrong, missing or malformed header", () => {
    expect(checkSitePassword(basic("x", "wrong"), "s3cret")).toBe(false);
    expect(checkSitePassword(basic("x", ""), "s3cret")).toBe(false);
    expect(checkSitePassword(null, "s3cret")).toBe(false);
    expect(checkSitePassword("Bearer abc", "s3cret")).toBe(false);
    expect(checkSitePassword("Basic " + Buffer.from("no-colon").toString("base64"), "s3cret")).toBe(false);
  });
});
