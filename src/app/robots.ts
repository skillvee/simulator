import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/recruiter/", "/candidate/", "/assessments/", "/api/", "/ui-tester"],
    },
    sitemap: "https://www.skillvee.com/sitemap.xml",
  };
}
