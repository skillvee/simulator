import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ParsedProfileDisplay } from "./parsed-profile-display";
import type { ParsedProfile } from "@/lib/candidate";

// Factory function to create test profiles
function createTestProfile(
  overrides: Partial<ParsedProfile> = {}
): ParsedProfile {
  return {
    summary:
      "Experienced software engineer with 5+ years in full-stack development.",
    workExperience: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    parsedAt: "2024-01-15T10:00:00Z",
    parseQuality: "high",
    ...overrides,
  };
}

describe("ParsedProfileDisplay component", () => {
  describe("null handling", () => {
    it("renders nothing when profile is null", () => {
      const { container } = render(<ParsedProfileDisplay profile={null} />);
      expect(container.firstChild).toBeNull();
    });

    it("renders nothing when profile is undefined", () => {
      const { container } = render(
        <ParsedProfileDisplay profile={undefined} />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("header section", () => {
    it("renders section title", () => {
      const profile = createTestProfile({ name: "John Doe" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Parsed Profile")).toBeInTheDocument();
    });

    it("displays candidate name when available", () => {
      const profile = createTestProfile({ name: "Jane Smith" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("displays email when available", () => {
      const profile = createTestProfile({ email: "jane@example.com" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    });

    it("displays location when available", () => {
      const profile = createTestProfile({ location: "San Francisco, CA" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("San Francisco, CA")).toBeInTheDocument();
    });

    it("displays phone when available", () => {
      const profile = createTestProfile({ phone: "+1 (555) 123-4567" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("+1 (555) 123-4567")).toBeInTheDocument();
    });
  });

  describe("contact links", () => {
    it("renders LinkedIn link when available", () => {
      const profile = createTestProfile({
        linkedIn: "https://linkedin.com/in/janesmith",
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const link = container.querySelector(
        'a[href="https://linkedin.com/in/janesmith"]'
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("LinkedIn");
    });

    it("renders GitHub link when available", () => {
      const profile = createTestProfile({
        github: "https://github.com/janesmith",
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const link = container.querySelector(
        'a[href="https://github.com/janesmith"]'
      );
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("GitHub");
    });

    it("renders website link when available", () => {
      const profile = createTestProfile({
        website: "https://janesmith.dev",
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const link = container.querySelector('a[href="https://janesmith.dev"]');
      expect(link).toBeInTheDocument();
      expect(link).toHaveTextContent("Website");
    });
  });

  describe("seniority badge", () => {
    it("displays junior seniority badge", () => {
      const profile = createTestProfile({ seniorityLevel: "junior" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("JUNIOR")).toBeInTheDocument();
    });

    it("displays mid seniority badge", () => {
      const profile = createTestProfile({ seniorityLevel: "mid" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("MID-LEVEL")).toBeInTheDocument();
    });

    it("displays senior seniority badge", () => {
      const profile = createTestProfile({ seniorityLevel: "senior" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("SENIOR")).toBeInTheDocument();
    });

    it("displays lead seniority badge", () => {
      const profile = createTestProfile({ seniorityLevel: "lead" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("LEAD")).toBeInTheDocument();
    });

    it("displays principal seniority badge", () => {
      const profile = createTestProfile({ seniorityLevel: "principal" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("PRINCIPAL")).toBeInTheDocument();
    });

    it("does not display badge for unknown seniority", () => {
      const profile = createTestProfile({ seniorityLevel: "unknown" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("UNKNOWN")).not.toBeInTheDocument();
    });

    it("does not display badge when seniority is not set", () => {
      const profile = createTestProfile({ seniorityLevel: undefined });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const badges = container.querySelectorAll(
        '[data-testid="seniority-badge"]'
      );
      expect(badges).toHaveLength(0);
    });
  });

  describe("parse quality indicator", () => {
    it("does not show indicator when parseQuality is high", () => {
      const profile = createTestProfile({ parseQuality: "high" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText(/parse quality/i)).not.toBeInTheDocument();
    });

    it("shows warning for medium parse quality", () => {
      const profile = createTestProfile({ parseQuality: "medium" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/medium quality/i)).toBeInTheDocument();
    });

    it("shows warning for low parse quality", () => {
      const profile = createTestProfile({ parseQuality: "low" });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/low quality/i)).toBeInTheDocument();
    });
  });

  describe("summary section", () => {
    it("renders summary text", () => {
      const profile = createTestProfile({
        summary: "A passionate developer who loves building products.",
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(
        screen.getByText("A passionate developer who loves building products.")
      ).toBeInTheDocument();
    });

    it("renders summary section heading", () => {
      const profile = createTestProfile();
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Summary")).toBeInTheDocument();
    });
  });

  describe("work experience section", () => {
    it("renders work experience section when experiences exist", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Senior Engineer",
            startDate: "Jan 2020",
            endDate: "Present",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Work Experience")).toBeInTheDocument();
    });

    it("does not render work experience section when empty", () => {
      const profile = createTestProfile({ workExperience: [] });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("Work Experience")).not.toBeInTheDocument();
    });

    it("displays company name", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "Acme Inc",
            title: "Developer",
            startDate: "2021",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Acme Inc")).toBeInTheDocument();
    });

    it("displays job title", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Staff Software Engineer",
            startDate: "2020",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Staff Software Engineer")).toBeInTheDocument();
    });

    it("displays date range with Present for current jobs", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Engineer",
            startDate: "Jan 2020",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/Jan 2020 - Present/)).toBeInTheDocument();
    });

    it("displays date range for past jobs", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "OldCorp",
            title: "Engineer",
            startDate: "Jan 2018",
            endDate: "Dec 2019",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/Jan 2018 - Dec 2019/)).toBeInTheDocument();
    });

    it("displays duration when available", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Engineer",
            startDate: "2020",
            endDate: "2022",
            duration: "2 years",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/2 years/)).toBeInTheDocument();
    });

    it("displays highlights when available", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Engineer",
            startDate: "2020",
            highlights: ["Led team of 5 engineers", "Reduced latency by 50%"],
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Led team of 5 engineers")).toBeInTheDocument();
      expect(screen.getByText("Reduced latency by 50%")).toBeInTheDocument();
    });

    it("displays technologies when available", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "TechCorp",
            title: "Engineer",
            startDate: "2020",
            technologies: ["React", "TypeScript", "Node.js"],
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });
  });

  describe("education section", () => {
    it("renders education section when entries exist", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "MIT",
            degree: "Bachelor of Science",
            field: "Computer Science",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Education")).toBeInTheDocument();
    });

    it("does not render education section when empty", () => {
      const profile = createTestProfile({ education: [] });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("Education")).not.toBeInTheDocument();
    });

    it("displays institution name", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "Stanford University",
            degree: "MS",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Stanford University")).toBeInTheDocument();
    });

    it("displays degree and field", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "MIT",
            degree: "Bachelor of Science",
            field: "Computer Science",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/Bachelor of Science/)).toBeInTheDocument();
      expect(screen.getByText(/Computer Science/)).toBeInTheDocument();
    });

    it("displays graduation year", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "MIT",
            degree: "BS",
            endDate: "2018",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/2018/)).toBeInTheDocument();
    });

    it("displays GPA when available", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "MIT",
            degree: "BS",
            gpa: "3.9",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/GPA: 3.9/)).toBeInTheDocument();
    });

    it("displays honors when available", () => {
      const profile = createTestProfile({
        education: [
          {
            institution: "MIT",
            degree: "BS",
            honors: ["Magna Cum Laude", "Dean's List"],
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Magna Cum Laude")).toBeInTheDocument();
      expect(screen.getByText("Dean's List")).toBeInTheDocument();
    });
  });

  describe("skills section", () => {
    it("renders skills section when skills exist", () => {
      const profile = createTestProfile({
        skills: [{ name: "TypeScript", category: "programming_language" }],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Skills")).toBeInTheDocument();
    });

    it("does not render skills section when empty", () => {
      const profile = createTestProfile({ skills: [] });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("Skills")).not.toBeInTheDocument();
    });

    it("groups skills by category", () => {
      const profile = createTestProfile({
        skills: [
          { name: "TypeScript", category: "programming_language" },
          { name: "Python", category: "programming_language" },
          { name: "React", category: "framework" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Programming Languages")).toBeInTheDocument();
      expect(screen.getByText("Frameworks")).toBeInTheDocument();
    });

    it("displays skill names", () => {
      const profile = createTestProfile({
        skills: [
          { name: "JavaScript", category: "programming_language" },
          { name: "PostgreSQL", category: "database" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("JavaScript")).toBeInTheDocument();
      expect(screen.getByText("PostgreSQL")).toBeInTheDocument();
    });

    it("displays proficiency level when available", () => {
      const profile = createTestProfile({
        skills: [
          {
            name: "TypeScript",
            category: "programming_language",
            proficiencyLevel: "expert",
          },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/expert/i)).toBeInTheDocument();
    });

    it("shows all skill categories correctly", () => {
      const profile = createTestProfile({
        skills: [
          { name: "Python", category: "programming_language" },
          { name: "React", category: "framework" },
          { name: "PostgreSQL", category: "database" },
          { name: "AWS", category: "cloud" },
          { name: "Git", category: "tool" },
          { name: "Communication", category: "soft_skill" },
          { name: "Agile", category: "methodology" },
          { name: "GraphQL", category: "other" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Programming Languages")).toBeInTheDocument();
      expect(screen.getByText("Frameworks")).toBeInTheDocument();
      expect(screen.getByText("Databases")).toBeInTheDocument();
      expect(screen.getByText("Cloud")).toBeInTheDocument();
      expect(screen.getByText("Tools")).toBeInTheDocument();
      expect(screen.getByText("Soft Skills")).toBeInTheDocument();
      expect(screen.getByText("Methodologies")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });
  });

  describe("certifications section", () => {
    it("renders certifications section when entries exist", () => {
      const profile = createTestProfile({
        certifications: [{ name: "AWS Solutions Architect", issuer: "Amazon" }],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Certifications")).toBeInTheDocument();
    });

    it("does not render certifications section when empty", () => {
      const profile = createTestProfile({ certifications: [] });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("Certifications")).not.toBeInTheDocument();
    });

    it("displays certification name and issuer", () => {
      const profile = createTestProfile({
        certifications: [
          { name: "Professional Scrum Master", issuer: "Scrum.org" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Professional Scrum Master")).toBeInTheDocument();
      expect(screen.getByText("Scrum.org")).toBeInTheDocument();
    });

    it("displays date obtained when available", () => {
      const profile = createTestProfile({
        certifications: [
          { name: "AWS Cert", issuer: "AWS", dateObtained: "Jan 2023" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/Jan 2023/)).toBeInTheDocument();
    });
  });

  describe("languages section", () => {
    it("renders languages section when entries exist", () => {
      const profile = createTestProfile({
        languages: [{ language: "English", proficiency: "native" }],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Languages")).toBeInTheDocument();
    });

    it("does not render languages section when empty", () => {
      const profile = createTestProfile({ languages: [] });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.queryByText("Languages")).not.toBeInTheDocument();
    });

    it("displays language name and proficiency", () => {
      const profile = createTestProfile({
        languages: [
          { language: "Spanish", proficiency: "professional" },
          { language: "French", proficiency: "conversational" },
        ],
      });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText("Spanish")).toBeInTheDocument();
      expect(screen.getByText(/professional/i)).toBeInTheDocument();
      expect(screen.getByText("French")).toBeInTheDocument();
      expect(screen.getByText(/conversational/i)).toBeInTheDocument();
    });
  });

  describe("experience overview", () => {
    it("displays total years of experience when available", () => {
      const profile = createTestProfile({ totalYearsOfExperience: 7 });
      render(<ParsedProfileDisplay profile={profile} />);
      expect(screen.getByText(/7 years/i)).toBeInTheDocument();
    });
  });

  describe("neo-brutalist design compliance", () => {
    it("uses border-2 for sections", () => {
      const profile = createTestProfile({
        name: "Test User",
        workExperience: [{ company: "Test", title: "Dev", startDate: "2020" }],
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const sections = container.querySelectorAll(".border-2");
      expect(sections.length).toBeGreaterThan(0);
    });

    it("has no rounded corners", () => {
      const profile = createTestProfile({
        name: "Test User",
        skills: [{ name: "JS", category: "programming_language" }],
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        expect(el.className).not.toMatch(/rounded/);
      });
    });

    it("has no shadow classes", () => {
      const profile = createTestProfile({ name: "Test User" });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        expect(el.className).not.toMatch(/shadow/);
      });
    });

    it("uses font-mono for dates and metadata", () => {
      const profile = createTestProfile({
        workExperience: [
          {
            company: "Test",
            title: "Dev",
            startDate: "Jan 2020",
            endDate: "Dec 2022",
          },
        ],
      });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const monoElements = container.querySelectorAll(".font-mono");
      expect(monoElements.length).toBeGreaterThan(0);
    });

    it("uses gold (bg-secondary) for emphasis", () => {
      const profile = createTestProfile({ seniorityLevel: "senior" });
      const { container } = render(<ParsedProfileDisplay profile={profile} />);
      const goldElements = container.querySelectorAll(".bg-secondary");
      expect(goldElements.length).toBeGreaterThan(0);
    });
  });
});
