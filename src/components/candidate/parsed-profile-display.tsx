import type { ParsedProfile, Skill } from "@/lib/candidate";

interface ParsedProfileDisplayProps {
  profile: ParsedProfile | null | undefined;
}

const SKILL_CATEGORY_LABELS: Record<string, string> = {
  programming_language: "Programming Languages",
  framework: "Frameworks",
  database: "Databases",
  cloud: "Cloud",
  tool: "Tools",
  soft_skill: "Soft Skills",
  methodology: "Methodologies",
  other: "Other",
};

const SENIORITY_LABELS: Record<string, string> = {
  junior: "JUNIOR",
  mid: "MID-LEVEL",
  senior: "SENIOR",
  lead: "LEAD",
  principal: "PRINCIPAL",
};

function SeniorityBadge({ level }: { level: string }) {
  const label = SENIORITY_LABELS[level];
  if (!label) return null;

  return (
    <span
      data-testid="seniority-badge"
      className="border-2 border-foreground bg-secondary px-3 py-1 font-mono text-xs text-secondary-foreground"
    >
      {label}
    </span>
  );
}

function ParseQualityWarning({
  quality,
}: {
  quality: "high" | "medium" | "low";
}) {
  if (quality === "high") return null;

  const message =
    quality === "medium"
      ? "Medium quality parse - some information may be incomplete"
      : "Low quality parse - significant information may be missing";

  return (
    <div className="bg-muted/30 mb-4 border-2 border-foreground p-3 font-mono text-sm">
      {message}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b-2 border-foreground pb-2 text-lg font-bold">
      {children}
    </h3>
  );
}

function SkillTag({
  skill,
}: {
  skill: { name: string; proficiencyLevel?: string };
}) {
  return (
    <span className="mb-2 mr-2 inline-block border-2 border-foreground px-2 py-1 font-mono text-sm">
      {skill.name}
      {skill.proficiencyLevel && (
        <span className="ml-1 text-muted-foreground">
          ({skill.proficiencyLevel})
        </span>
      )}
    </span>
  );
}

function SkillsByCategory({ skills }: { skills: Skill[] }) {
  // Group skills by category
  const groupedSkills = skills.reduce(
    (acc, skill) => {
      const category = skill.category || "other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, Skill[]>
  );

  // Define category order for consistent rendering
  const categoryOrder = [
    "programming_language",
    "framework",
    "database",
    "cloud",
    "tool",
    "soft_skill",
    "methodology",
    "other",
  ];

  return (
    <div className="space-y-4">
      {categoryOrder.map((category) => {
        const categorySkills = groupedSkills[category];
        if (!categorySkills || categorySkills.length === 0) return null;

        const label = SKILL_CATEGORY_LABELS[category] || category;

        return (
          <div key={category}>
            <h4 className="mb-2 font-mono text-sm text-muted-foreground">
              {label}
            </h4>
            <div className="flex flex-wrap">
              {categorySkills.map((skill, index) => (
                <SkillTag key={`${skill.name}-${index}`} skill={skill} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ParsedProfileDisplay({ profile }: ParsedProfileDisplayProps) {
  if (!profile) return null;

  const hasContactLinks = profile.linkedIn || profile.github || profile.website;

  return (
    <section className="mb-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Parsed Profile</h2>
        {profile.seniorityLevel && profile.seniorityLevel !== "unknown" && (
          <SeniorityBadge level={profile.seniorityLevel} />
        )}
      </div>

      <ParseQualityWarning quality={profile.parseQuality} />

      <div className="space-y-8 border-2 border-foreground p-6">
        {/* Header with basic info */}
        <div className="border-b-2 border-border pb-6">
          {profile.name && (
            <h3 className="mb-2 text-xl font-bold">{profile.name}</h3>
          )}
          <div className="space-y-1 font-mono text-sm">
            {profile.email && (
              <p className="text-muted-foreground">{profile.email}</p>
            )}
            {profile.phone && (
              <p className="text-muted-foreground">{profile.phone}</p>
            )}
            {profile.location && (
              <p className="text-muted-foreground">{profile.location}</p>
            )}
          </div>

          {hasContactLinks && (
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.linkedIn && (
                <a
                  href={profile.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b-2 border-secondary font-mono text-sm hover:text-secondary"
                >
                  LinkedIn
                </a>
              )}
              {profile.github && (
                <a
                  href={profile.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b-2 border-secondary font-mono text-sm hover:text-secondary"
                >
                  GitHub
                </a>
              )}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-b-2 border-secondary font-mono text-sm hover:text-secondary"
                >
                  Website
                </a>
              )}
            </div>
          )}

          {profile.totalYearsOfExperience !== undefined && (
            <p className="mt-4 font-mono text-sm">
              <span className="text-muted-foreground">Total Experience:</span>{" "}
              <span className="font-bold">
                {profile.totalYearsOfExperience} years
              </span>
            </p>
          )}
        </div>

        {/* Summary */}
        {profile.summary && (
          <div>
            <SectionTitle>Summary</SectionTitle>
            <p className="text-foreground">{profile.summary}</p>
          </div>
        )}

        {/* Work Experience */}
        {profile.workExperience.length > 0 && (
          <div>
            <SectionTitle>Work Experience</SectionTitle>
            <div className="space-y-6">
              {profile.workExperience.map((exp, index) => (
                <div
                  key={`${exp.company}-${index}`}
                  className="border-l-4 border-secondary pl-4"
                >
                  <h4 className="font-bold">{exp.title}</h4>
                  <p className="font-bold text-muted-foreground">
                    {exp.company}
                  </p>
                  <p className="mt-1 font-mono text-sm text-muted-foreground">
                    {exp.startDate} - {exp.endDate || "Present"}
                    {exp.duration && (
                      <span className="ml-2 border border-border bg-muted px-2 py-0.5">
                        {exp.duration}
                      </span>
                    )}
                  </p>
                  {exp.location && (
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {exp.location}
                    </p>
                  )}
                  {exp.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {exp.description}
                    </p>
                  )}
                  {exp.highlights && exp.highlights.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {exp.highlights.map((highlight, i) => (
                        <li
                          key={i}
                          className="text-sm before:mr-2 before:text-secondary before:content-['■']"
                        >
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {exp.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="border border-border bg-muted px-2 py-0.5 font-mono text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <div>
            <SectionTitle>Education</SectionTitle>
            <div className="space-y-4">
              {profile.education.map((edu, index) => (
                <div
                  key={`${edu.institution}-${index}`}
                  className="border-l-4 border-secondary pl-4"
                >
                  <h4 className="font-bold">{edu.institution}</h4>
                  <p className="text-muted-foreground">
                    {edu.degree}
                    {edu.field && ` in ${edu.field}`}
                  </p>
                  {(edu.startDate || edu.endDate) && (
                    <p className="mt-1 font-mono text-sm text-muted-foreground">
                      {edu.startDate && `${edu.startDate} - `}
                      {edu.endDate || "Present"}
                    </p>
                  )}
                  {edu.gpa && (
                    <p className="mt-1 font-mono text-sm">GPA: {edu.gpa}</p>
                  )}
                  {edu.honors && edu.honors.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {edu.honors.map((honor, i) => (
                        <span
                          key={i}
                          className="bg-secondary/20 border border-border px-2 py-0.5 font-mono text-xs"
                        >
                          {honor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills.length > 0 && (
          <div>
            <SectionTitle>Skills</SectionTitle>
            <SkillsByCategory skills={profile.skills} />
          </div>
        )}

        {/* Certifications */}
        {profile.certifications.length > 0 && (
          <div>
            <SectionTitle>Certifications</SectionTitle>
            <div className="space-y-3">
              {profile.certifications.map((cert, index) => (
                <div
                  key={`${cert.name}-${index}`}
                  className="flex items-start justify-between border-l-4 border-secondary pl-4"
                >
                  <div>
                    <h4 className="font-bold">{cert.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {cert.issuer}
                    </p>
                  </div>
                  {cert.dateObtained && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {cert.dateObtained}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {profile.languages.length > 0 && (
          <div>
            <SectionTitle>Languages</SectionTitle>
            <div className="flex flex-wrap gap-4">
              {profile.languages.map((lang, index) => (
                <div
                  key={`${lang.language}-${index}`}
                  className="border-2 border-foreground px-4 py-2"
                >
                  <span className="font-bold">{lang.language}</span>
                  <span className="ml-2 font-mono text-sm text-muted-foreground">
                    ({lang.proficiency})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
