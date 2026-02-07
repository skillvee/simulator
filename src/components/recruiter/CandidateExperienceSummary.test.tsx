import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CandidateExperienceSummary } from "./CandidateExperienceSummary";
import type { CoworkerBuilderData } from "@/lib/scenarios/scenario-builder";

describe("CandidateExperienceSummary", () => {
  const mockCoworkers: CoworkerBuilderData[] = [
    {
      name: "Jordan Kim",
      role: "Engineering Manager",
      personaStyle: "Strategic and supportive, delegates details.",
      knowledge: [
        {
          topic: "code_review",
          triggerKeywords: ["pr", "review"],
          response: "We expect clean, well-tested code.",
          isCritical: true,
        },
        {
          topic: "deployment",
          triggerKeywords: ["deploy", "release"],
          response: "We deploy daily at 3 PM.",
          isCritical: true,
        },
      ],
    },
    {
      name: "Alex Chen",
      role: "Senior Backend Engineer",
      personaStyle: "Helpful and detail-oriented.",
      knowledge: [
        {
          topic: "database",
          triggerKeywords: ["postgres", "db"],
          response: "We use PostgreSQL with migrations.",
          isCritical: true,
        },
        {
          topic: "api",
          triggerKeywords: ["api", "endpoint"],
          response: "Our API uses REST conventions.",
          isCritical: false,
        },
      ],
    },
    {
      name: "Sam Patel",
      role: "Frontend Developer",
      personaStyle: "Energetic and collaborative.",
      knowledge: [
        {
          topic: "components",
          triggerKeywords: ["react", "component"],
          response: "We use functional components.",
          isCritical: true,
        },
        {
          topic: "styling",
          triggerKeywords: ["css", "style"],
          response: "We use Tailwind CSS.",
          isCritical: true,
        },
      ],
    },
  ];

  it("renders with all props", () => {
    render(
      <CandidateExperienceSummary
        roleName="Senior Backend Engineer"
        companyName="Acme Corp"
        coworkers={mockCoworkers}
        taskSummary="Build a new API endpoint for notifications"
      />
    );

    // Check heading
    expect(screen.getByRole("heading", { name: "Candidate Experience" })).toBeInTheDocument();

    // Check narrative contains key elements (use getAllByText for text that appears multiple times)
    const roleElements = screen.getAllByText(/Senior Backend Engineer/);
    expect(roleElements.length).toBeGreaterThan(0);

    expect(screen.getByText(/Acme Corp/)).toBeInTheDocument();
    const managerElements = screen.getAllByText(/Jordan Kim/);
    expect(managerElements.length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Build a new API endpoint for notifications/)
    ).toBeInTheDocument();

    // Check timeline stages
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Team Chat & Coding")).toBeInTheDocument();
    expect(screen.getByText("PR Defense")).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("updates dynamically when props change", () => {
    const { rerender } = render(
      <CandidateExperienceSummary
        roleName="Frontend Developer"
        companyName="StartupCo"
        coworkers={mockCoworkers}
        taskSummary="Fix a UI bug"
      />
    );

    expect(screen.getAllByText(/Frontend Developer/).length).toBeGreaterThan(0);
    expect(screen.getByText(/StartupCo/)).toBeInTheDocument();
    expect(screen.getByText(/Fix a UI bug/)).toBeInTheDocument();

    // Update props
    rerender(
      <CandidateExperienceSummary
        roleName="DevOps Engineer"
        companyName="TechGiant"
        coworkers={mockCoworkers}
        taskSummary="Set up CI/CD pipeline"
      />
    );

    expect(screen.getByText(/DevOps Engineer/)).toBeInTheDocument();
    expect(screen.getByText(/TechGiant/)).toBeInTheDocument();
    expect(screen.getByText(/Set up CI\/CD pipeline/)).toBeInTheDocument();
  });

  it("handles manager correctly", () => {
    render(
      <CandidateExperienceSummary
        roleName="Backend Engineer"
        companyName="Company"
        coworkers={mockCoworkers}
        taskSummary="Build feature"
      />
    );

    // Manager (Jordan Kim) should be mentioned
    const narrative = screen.getByText(/Their manager/).textContent;
    expect(narrative).toContain("Jordan Kim");
  });

  it("lists team members (non-managers)", () => {
    render(
      <CandidateExperienceSummary
        roleName="Backend Engineer"
        companyName="Company"
        coworkers={mockCoworkers}
        taskSummary="Build feature"
      />
    );

    // Alex Chen and Sam Patel should be mentioned (not Jordan Kim who is manager)
    expect(screen.getByText(/Alex Chen/)).toBeInTheDocument();
    expect(screen.getByText(/Sam Patel/)).toBeInTheDocument();
  });

  it("handles single coworker (no manager role)", () => {
    const singleCoworker: CoworkerBuilderData[] = [
      {
        name: "Chris Taylor",
        role: "Senior Developer",
        personaStyle: "Helpful and friendly.",
        knowledge: [
          {
            topic: "testing",
            triggerKeywords: ["test"],
            response: "We use Jest.",
            isCritical: true,
          },
          {
            topic: "ci",
            triggerKeywords: ["ci"],
            response: "We use GitHub Actions.",
            isCritical: true,
          },
        ],
      },
    ];

    render(
      <CandidateExperienceSummary
        roleName="Developer"
        companyName="Company"
        coworkers={singleCoworker}
        taskSummary="Build feature"
      />
    );

    // Should handle gracefully - single coworker becomes manager and there are no team members
    expect(screen.getByRole("heading", { name: "Candidate Experience" })).toBeInTheDocument();
    const nameElements = screen.getAllByText(/Chris Taylor/);
    expect(nameElements.length).toBeGreaterThan(0);
  });

  it("handles empty coworkers array", () => {
    render(
      <CandidateExperienceSummary
        roleName="Developer"
        companyName="Company"
        coworkers={[]}
        taskSummary="Build feature"
      />
    );

    // Should render with fallback text
    expect(screen.getByRole("heading", { name: "Candidate Experience" })).toBeInTheDocument();
    // Check for fallback text in the paragraph
    const paragraph = screen.getByText(/When a candidate joins/);
    expect(paragraph.textContent).toContain("their manager");
    expect(paragraph.textContent).toContain("their team");
  });

  it("formats team member list correctly with 2 members", () => {
    const twoCoworkers: CoworkerBuilderData[] = [
      {
        name: "Manager One",
        role: "Engineering Manager",
        personaStyle: "Strategic.",
        knowledge: [
          {
            topic: "test",
            triggerKeywords: ["test"],
            response: "Test response",
            isCritical: true,
          },
          {
            topic: "test2",
            triggerKeywords: ["test2"],
            response: "Test response 2",
            isCritical: true,
          },
        ],
      },
      {
        name: "Developer One",
        role: "Developer",
        personaStyle: "Helpful.",
        knowledge: [
          {
            topic: "test",
            triggerKeywords: ["test"],
            response: "Test",
            isCritical: true,
          },
          {
            topic: "test2",
            triggerKeywords: ["test2"],
            response: "Test 2",
            isCritical: true,
          },
        ],
      },
    ];

    render(
      <CandidateExperienceSummary
        roleName="Developer"
        companyName="Company"
        coworkers={twoCoworkers}
        taskSummary="Build feature"
      />
    );

    // Should show only the non-manager
    expect(screen.getByText(/Developer One/)).toBeInTheDocument();
  });

  it("displays all 4 timeline stages with correct icons", () => {
    render(
      <CandidateExperienceSummary
        roleName="Developer"
        companyName="Company"
        coworkers={mockCoworkers}
        taskSummary="Build feature"
      />
    );

    // Check all stages are present
    expect(screen.getByText("Welcome")).toBeInTheDocument();
    expect(screen.getByText("Onboarding & intro")).toBeInTheDocument();

    expect(screen.getByText("Team Chat & Coding")).toBeInTheDocument();
    expect(screen.getByText("~60-90 min")).toBeInTheDocument();

    expect(screen.getByText("PR Defense")).toBeInTheDocument();
    expect(screen.getByText("~15 min call")).toBeInTheDocument();

    expect(screen.getByText("Results")).toBeInTheDocument();
    expect(screen.getByText("8-dimension score")).toBeInTheDocument();
  });

  it("has distinct visual treatment with blue accent", () => {
    const { container } = render(
      <CandidateExperienceSummary
        roleName="Developer"
        companyName="Company"
        coworkers={mockCoworkers}
        taskSummary="Build feature"
      />
    );

    // Check for the card with primary border and background classes
    const card = container.querySelector(".border-primary\\/30");
    expect(card).toBeInTheDocument();

    const bgCard = container.querySelector(".bg-primary\\/5");
    expect(bgCard).toBeInTheDocument();
  });
});
