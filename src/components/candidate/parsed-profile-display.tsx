import type { ParsedProfile, Skill } from "@/lib/candidate";
import { Card, CardContent, Badge } from "@/components/ui";

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
  JUNIOR: "JUNIOR",
  MID: "MID-LEVEL",
  SENIOR: "SENIOR",
  LEAD: "LEAD",
  PRINCIPAL: "PRINCIPAL",
};

function SeniorityBadge({ level }: { level: string }) {
  const label = SENIORITY_LABELS[level];
  if (!label) return null;

  return (
    <Badge data-testid="seniority-badge" className="font-mono text-xs">
      {label}
    </Badge>
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

  const isLow = quality === "low";

  return (
    <Card
      className={`mb-4 ${isLow ? "border-amber-200 bg-amber-50" : "bg-muted/30"}`}
    >
      <CardContent className="p-3">
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-4 border-b border-border pb-2 text-lg font-semibold">
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
    <Badge variant="secondary" className="mb-2 mr-2">
      {skill.name}
      {skill.proficiencyLevel && (
        <span className="ml-1 text-muted-foreground">
          ({skill.proficiencyLevel})
        </span>
      )}
    </Badge>
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
        <h2 className="text-2xl font-semibold">Parsed Profile</h2>
        {profile.seniorityLevel && profile.seniorityLevel !== "UNKNOWN" && (
          <SeniorityBadge level={profile.seniorityLevel} />
        )}
      </div>

      <ParseQualityWarning quality={profile.parseQuality} />

      <Card className="shadow-sm">
        <CardContent className="space-y-8 p-6">
          {/* Header with basic info */}
          <div className="border-b border-border pb-6">
            {profile.name && (
              <h3 className="mb-2 text-xl font-semibold">{profile.name}</h3>
            )}
            <div className="space-y-1 text-sm">
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
                    className="text-sm text-primary transition-colors hover:text-primary/80"
                  >
                    LinkedIn
                  </a>
                )}
                {profile.github && (
                  <a
                    href={profile.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary transition-colors hover:text-primary/80"
                  >
                    GitHub
                  </a>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary transition-colors hover:text-primary/80"
                  >
                    Website
                  </a>
                )}
              </div>
            )}

            {profile.totalYearsOfExperience !== undefined && (
              <p className="mt-4 text-sm">
                <span className="text-muted-foreground">Total Experience:</span>{" "}
                <span className="font-semibold">
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
                    className="rounded-r-lg border-l-4 border-primary pl-4"
                  >
                    <h4 className="font-semibold">{exp.title}</h4>
                    <p className="font-medium text-muted-foreground">
                      {exp.company}
                    </p>
                    <div className="mt-1 flex items-center text-sm text-muted-foreground">
                      <span>
                        {exp.startDate} - {exp.endDate || "Present"}
                      </span>
                      {exp.duration && (
                        <Badge variant="secondary" className="ml-2">
                          {exp.duration}
                        </Badge>
                      )}
                    </div>
                    {exp.location && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {exp.location}
                      </p>
                    )}
                    {exp.description && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {exp.description}
                      </p>
                    )}
                    {exp.highlights && exp.highlights.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-4 marker:text-primary">
                        {exp.highlights.map((highlight, i) => (
                          <li key={i} className="text-sm">
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    )}
                    {exp.technologies && exp.technologies.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {exp.technologies.map((tech, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
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
                    className="rounded-r-lg border-l-4 border-primary pl-4"
                  >
                    <h4 className="font-semibold">{edu.institution}</h4>
                    <p className="text-muted-foreground">
                      {edu.degree}
                      {edu.field && ` in ${edu.field}`}
                    </p>
                    {(edu.startDate || edu.endDate) && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {edu.startDate && `${edu.startDate} - `}
                        {edu.endDate || "Present"}
                      </p>
                    )}
                    {edu.gpa && <p className="mt-1 text-sm">GPA: {edu.gpa}</p>}
                    {edu.honors && edu.honors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {edu.honors.map((honor, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            {honor}
                          </Badge>
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
                    className="flex items-start justify-between rounded-r-lg border-l-4 border-primary pl-4"
                  >
                    <div>
                      <h4 className="font-semibold">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {cert.issuer}
                      </p>
                    </div>
                    {cert.dateObtained && (
                      <span className="text-xs text-muted-foreground">
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
              <div className="flex flex-wrap gap-3">
                {profile.languages.map((lang, index) => (
                  <Badge
                    key={`${lang.language}-${index}`}
                    variant="outline"
                    className="px-4 py-2 text-sm"
                  >
                    <span className="font-semibold">{lang.language}</span>
                    <span className="ml-2 text-muted-foreground">
                      ({lang.proficiency})
                    </span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
