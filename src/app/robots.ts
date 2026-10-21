import type { MetadataRoute } from "next";

/** Private shared deployment: no crawler may index any page. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
