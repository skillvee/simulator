import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  workExperienceSchema,
  educationSchema,
  skillSchema,
  certificationSchema,
  languageSchema,
  parsedProfileSchema,
  formatProfileForPrompt,
  profileToPrismaJson,
  profileFromPrismaJson,
  type ParsedProfile,
  type WorkExperience,
  type Education,
  type Skill,
} from "./cv-parser";

// Mock gemini module
vi.mock("@/lib/gemini", () => ({
  gemini: {
    models: {
      generateContent: vi.fn(),
    },
  },
}));

// Mock supabase module
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn(),
      })),
    },
  },
}));

// ============================================================================
// Schema Tests
// ============================================================================

describe("CV Parser Schemas", () => {
  describe("workExperienceSchema", () => {
    it("should validate valid work experience", () => {
      const experience: WorkExperience = {
        company: "TechCorp Inc.",
        title: "Senior Software Engineer",
        startDate: "Jan 2020",
        endDate: "Dec 2023",
        duration: "3 years 11 months",
        location: "San Francisco, CA",
        description: "Led development of microservices architecture",
        highlights: ["Reduced latency by 40%", "Mentored 5 junior developers"],
        technologies: ["TypeScript", "Node.js", "AWS"],
      };
      expect(() => workExperienceSchema.parse(experience)).not.toThrow();
    });

    it("should allow optional fields", () => {
      const experience = {
        company: "StartupCo",
        title: "Developer",
        startDate: "2022",
      };
      expect(() => workExperienceSchema.parse(experience)).not.toThrow();
    });

    it("should reject missing required fields", () => {
      const experience = {
        company: "TechCorp",
        // missing title and startDate
      };
      expect(() => workExperienceSchema.parse(experience)).toThrow();
    });
  });

  describe("educationSchema", () => {
    it("should validate valid education", () => {
      const education: Education = {
        institution: "MIT",
        degree: "Bachelor of Science",
        field: "Computer Science",
        startDate: "2014",
        endDate: "2018",
        gpa: "3.8",
        honors: ["Dean's List", "Phi Beta Kappa"],
      };
      expect(() => educationSchema.parse(education)).not.toThrow();
    });

    it("should allow minimal education entry", () => {
      const education = {
        institution: "State University",
        degree: "BS",
      };
      expect(() => educationSchema.parse(education)).not.toThrow();
    });
  });

  describe("skillSchema", () => {
    it("should validate valid skill", () => {
      const skill: Skill = {
        name: "TypeScript",
        category: "programming_language",
        proficiencyLevel: "expert",
        yearsOfExperience: 5,
      };
      expect(() => skillSchema.parse(skill)).not.toThrow();
    });

    it("should validate all category types", () => {
      const categories = [
        "programming_language",
        "framework",
        "database",
        "cloud",
        "tool",
        "soft_skill",
        "methodology",
        "other",
      ];
      categories.forEach((category) => {
        const skill = {
          name: "Test Skill",
          category,
        };
        expect(() => skillSchema.parse(skill)).not.toThrow();
      });
    });

    it("should validate proficiency levels", () => {
      const levels = ["beginner", "intermediate", "advanced", "expert"];
      levels.forEach((level) => {
        const skill = {
          name: "Test",
          category: "tool",
          proficiencyLevel: level,
        };
        expect(() => skillSchema.parse(skill)).not.toThrow();
      });
    });

    it("should reject invalid category", () => {
      const skill = {
        name: "Test",
        category: "invalid_category",
      };
      expect(() => skillSchema.parse(skill)).toThrow();
    });
  });

  describe("certificationSchema", () => {
    it("should validate valid certification", () => {
      const cert = {
        name: "AWS Solutions Architect",
        issuer: "Amazon Web Services",
        dateObtained: "Mar 2023",
        expirationDate: "Mar 2026",
        credentialId: "ABC123",
      };
      expect(() => certificationSchema.parse(cert)).not.toThrow();
    });

    it("should allow minimal certification", () => {
      const cert = {
        name: "Google Cloud Professional",
        issuer: "Google",
      };
      expect(() => certificationSchema.parse(cert)).not.toThrow();
    });
  });

  describe("languageSchema", () => {
    it("should validate valid language", () => {
      const lang = {
        language: "Spanish",
        proficiency: "professional",
      };
      expect(() => languageSchema.parse(lang)).not.toThrow();
    });

    it("should validate all proficiency levels", () => {
      const levels = ["basic", "conversational", "professional", "native"];
      levels.forEach((proficiency) => {
        const lang = {
          language: "French",
          proficiency,
        };
        expect(() => languageSchema.parse(lang)).not.toThrow();
      });
    });

    it("should normalize 'fluent' to 'professional'", () => {
      const lang = {
        language: "German",
        proficiency: "fluent",
      };
      const parsed = languageSchema.parse(lang);
      expect(parsed.proficiency).toBe("professional");
    });

    it("should normalize 'advanced' to 'professional'", () => {
      const lang = {
        language: "German",
        proficiency: "advanced",
      };
      const parsed = languageSchema.parse(lang);
      expect(parsed.proficiency).toBe("professional");
    });

    it("should normalize 'beginner' to 'basic'", () => {
      const lang = {
        language: "German",
        proficiency: "beginner",
      };
      const parsed = languageSchema.parse(lang);
      expect(parsed.proficiency).toBe("basic");
    });
  });

  describe("parsedProfileSchema", () => {
    const validProfile: ParsedProfile = {
      name: "John Doe",
      email: "john@example.com",
      phone: "+1-555-123-4567",
      location: "San Francisco, CA",
      linkedIn: "https://linkedin.com/in/johndoe",
      github: "https://github.com/johndoe",
      summary:
        "Experienced software engineer with 8 years in full-stack development.",
      workExperience: [
        {
          company: "TechCorp",
          title: "Senior Engineer",
          startDate: "Jan 2020",
          endDate: "Present",
          technologies: ["React", "Node.js"],
        },
      ],
      education: [
        {
          institution: "Stanford University",
          degree: "MS",
          field: "Computer Science",
          endDate: "2016",
        },
      ],
      skills: [
        {
          name: "JavaScript",
          category: "programming_language",
          proficiencyLevel: "expert",
        },
        {
          name: "React",
          category: "framework",
          proficiencyLevel: "advanced",
        },
      ],
      certifications: [
        {
          name: "AWS Certified Developer",
          issuer: "Amazon",
        },
      ],
      languages: [
        {
          language: "English",
          proficiency: "native",
        },
        {
          language: "Spanish",
          proficiency: "conversational",
        },
      ],
      totalYearsOfExperience: 8,
      seniorityLevel: "senior",
      parsedAt: "2024-01-15T10:00:00Z",
      parseQuality: "high",
    };

    it("should validate complete profile", () => {
      expect(() => parsedProfileSchema.parse(validProfile)).not.toThrow();
    });

    it("should allow minimal profile", () => {
      const minimal = {
        summary: "Software developer",
        workExperience: [],
        education: [],
        skills: [],
        certifications: [],
        languages: [],
        parsedAt: new Date().toISOString(),
        parseQuality: "low",
      };
      expect(() => parsedProfileSchema.parse(minimal)).not.toThrow();
    });

    it("should validate seniority levels", () => {
      const levels = ["junior", "mid", "senior", "lead", "principal", "unknown"];
      levels.forEach((level) => {
        const profile = {
          ...validProfile,
          seniorityLevel: level,
        };
        expect(() => parsedProfileSchema.parse(profile)).not.toThrow();
      });
    });

    it("should validate parse quality levels", () => {
      const qualities = ["high", "medium", "low"];
      qualities.forEach((quality) => {
        const profile = {
          ...validProfile,
          parseQuality: quality,
        };
        expect(() => parsedProfileSchema.parse(profile)).not.toThrow();
      });
    });

    it("should require summary field", () => {
      const noSummary = {
        workExperience: [],
        education: [],
        skills: [],
        certifications: [],
        languages: [],
        parsedAt: new Date().toISOString(),
        parseQuality: "high",
      };
      expect(() => parsedProfileSchema.parse(noSummary)).toThrow();
    });
  });
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("CV Parser Utilities", () => {
  const sampleProfile: ParsedProfile = {
    name: "Jane Smith",
    email: "jane@example.com",
    location: "New York, NY",
    linkedIn: "https://linkedin.com/in/janesmith",
    github: "https://github.com/janesmith",
    summary:
      "Full-stack developer with expertise in React and Node.js. Passionate about building scalable applications.",
    workExperience: [
      {
        company: "BigTech Inc.",
        title: "Staff Engineer",
        startDate: "Jan 2022",
        endDate: undefined, // Current
        duration: "2 years",
        location: "Remote",
        description: "Leading platform architecture initiatives",
        highlights: [
          "Architected microservices platform serving 10M users",
          "Reduced deployment time by 60%",
        ],
        technologies: ["TypeScript", "Kubernetes", "PostgreSQL"],
      },
      {
        company: "StartupXYZ",
        title: "Senior Developer",
        startDate: "Mar 2019",
        endDate: "Dec 2021",
        duration: "2 years 9 months",
        description: "Full-stack development",
        technologies: ["React", "Node.js", "MongoDB"],
      },
    ],
    education: [
      {
        institution: "Carnegie Mellon University",
        degree: "Master of Science",
        field: "Software Engineering",
        endDate: "2019",
        gpa: "3.9",
        honors: ["Outstanding Graduate Award"],
      },
      {
        institution: "UC Berkeley",
        degree: "Bachelor of Science",
        field: "Computer Science",
        endDate: "2017",
      },
    ],
    skills: [
      {
        name: "TypeScript",
        category: "programming_language",
        proficiencyLevel: "expert",
        yearsOfExperience: 5,
      },
      {
        name: "React",
        category: "framework",
        proficiencyLevel: "expert",
      },
      {
        name: "PostgreSQL",
        category: "database",
        proficiencyLevel: "advanced",
      },
      {
        name: "AWS",
        category: "cloud",
        proficiencyLevel: "advanced",
      },
      {
        name: "Leadership",
        category: "soft_skill",
      },
    ],
    certifications: [
      {
        name: "AWS Solutions Architect Professional",
        issuer: "Amazon Web Services",
        dateObtained: "Jun 2023",
      },
    ],
    languages: [
      { language: "English", proficiency: "native" },
      { language: "Mandarin", proficiency: "conversational" },
    ],
    totalYearsOfExperience: 6,
    seniorityLevel: "lead",
    parsedAt: "2024-01-15T10:00:00Z",
    parseQuality: "high",
  };

  describe("formatProfileForPrompt", () => {
    it("should format profile with all sections", () => {
      const formatted = formatProfileForPrompt(sampleProfile);

      // Check for candidate information
      expect(formatted).toContain("### Candidate Information");
      expect(formatted).toContain("Name: Jane Smith");
      expect(formatted).toContain("Email: jane@example.com");
      expect(formatted).toContain("Location: New York, NY");

      // Check for summary
      expect(formatted).toContain("### Professional Summary");
      expect(formatted).toContain("Full-stack developer");

      // Check for work experience
      expect(formatted).toContain("### Work Experience");
      expect(formatted).toContain("**Staff Engineer** at **BigTech Inc.**");
      expect(formatted).toContain("Jan 2022 - Present");
      expect(formatted).toContain("Technologies: TypeScript, Kubernetes, PostgreSQL");

      // Check for education
      expect(formatted).toContain("### Education");
      expect(formatted).toContain("**Master of Science in Software Engineering**");
      expect(formatted).toContain("Carnegie Mellon University");

      // Check for skills
      expect(formatted).toContain("### Technical Skills");
      expect(formatted).toContain("**Programming Languages:**");
      expect(formatted).toContain("TypeScript (expert)");

      // Check for certifications
      expect(formatted).toContain("### Certifications");
      expect(formatted).toContain("AWS Solutions Architect Professional");

      // Check for languages
      expect(formatted).toContain("### Languages");
      expect(formatted).toContain("English (native)");
      expect(formatted).toContain("Mandarin (conversational)");

      // Check for experience overview
      expect(formatted).toContain("### Experience Overview");
      expect(formatted).toContain("Total Experience: 6 years");
      expect(formatted).toContain("Seniority Level: lead");
    });

    it("should handle profile with minimal data", () => {
      const minimal: ParsedProfile = {
        summary: "Junior developer looking for opportunities",
        workExperience: [],
        education: [],
        skills: [],
        certifications: [],
        languages: [],
        parsedAt: new Date().toISOString(),
        parseQuality: "low",
      };

      const formatted = formatProfileForPrompt(minimal);

      expect(formatted).toContain("### Professional Summary");
      expect(formatted).toContain("Junior developer");
      expect(formatted).toContain("parsing quality was low");
      expect(formatted).not.toContain("### Work Experience");
      expect(formatted).not.toContain("### Education");
    });

    it("should show parse quality note for non-high quality", () => {
      const mediumQuality: ParsedProfile = {
        ...sampleProfile,
        parseQuality: "medium",
      };

      const formatted = formatProfileForPrompt(mediumQuality);
      expect(formatted).toContain("parsing quality was medium");
    });

    it("should not show parse quality note for high quality", () => {
      const formatted = formatProfileForPrompt(sampleProfile);
      expect(formatted).not.toContain("parsing quality was high");
    });

    it("should handle missing optional fields gracefully", () => {
      const partial: ParsedProfile = {
        name: "Test User",
        summary: "A test profile",
        workExperience: [
          {
            company: "TestCo",
            title: "Developer",
            startDate: "2020",
            // No endDate, highlights, technologies
          },
        ],
        education: [],
        skills: [],
        certifications: [],
        languages: [],
        parsedAt: new Date().toISOString(),
        parseQuality: "high",
      };

      expect(() => formatProfileForPrompt(partial)).not.toThrow();
      const formatted = formatProfileForPrompt(partial);
      expect(formatted).toContain("**Developer** at **TestCo**");
      expect(formatted).toContain("2020 - Present");
    });

    it("should group skills by category", () => {
      const formatted = formatProfileForPrompt(sampleProfile);

      expect(formatted).toContain("**Programming Languages:**");
      expect(formatted).toContain("**Frameworks & Libraries:**");
      expect(formatted).toContain("**Databases:**");
      expect(formatted).toContain("**Cloud & Infrastructure:**");
      expect(formatted).toContain("**Soft Skills:**");
    });
  });

  describe("profileToPrismaJson", () => {
    it("should convert profile to Prisma JSON format", () => {
      const json = profileToPrismaJson(sampleProfile);
      expect(json).toBeDefined();
      expect(typeof json).toBe("object");
    });
  });

  describe("profileFromPrismaJson", () => {
    it("should convert valid Prisma JSON to profile", () => {
      const profile = profileFromPrismaJson(sampleProfile);
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe("Jane Smith");
      expect(profile?.workExperience).toHaveLength(2);
    });

    it("should return null for null input", () => {
      const profile = profileFromPrismaJson(null);
      expect(profile).toBeNull();
    });

    it("should return null for invalid data", () => {
      const invalid = { not: "a valid profile" };
      const profile = profileFromPrismaJson(invalid);
      expect(profile).toBeNull();
    });

    it("should return null for undefined", () => {
      const profile = profileFromPrismaJson(undefined as unknown as null);
      expect(profile).toBeNull();
    });
  });
});
