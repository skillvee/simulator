import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { db } from "@/server/db";
import { CandidatesPageClient } from "./client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "candidatesPage.metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

interface ChallengeArchetype {
  slug: string;
  name: string;
  description: string;
  scenarioId: string;
  challengeTagline: string | null;
  roleFamily: {
    slug: string;
    name: string;
  };
}

interface RoleFamilyGroup {
  slug: string;
  name: string;
  archetypes: ChallengeArchetype[];
}

async function getChallengeScenarios(): Promise<RoleFamilyGroup[]> {
  const scenarios = await db.scenario.findMany({
    where: { isChallenge: true, isPublished: true },
    select: {
      id: true,
      name: true,
      challengeTagline: true,
      archetype: {
        select: {
          slug: true,
          name: true,
          description: true,
          roleFamily: {
            select: { slug: true, name: true },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  // Deduplicate by archetype — one card per archetype, pick first scenario
  const archetypeMap = new Map<string, ChallengeArchetype>();

  for (const scenario of scenarios) {
    if (!scenario.archetype) continue;
    const slug = scenario.archetype.slug;

    if (!archetypeMap.has(slug)) {
      archetypeMap.set(slug, {
        slug,
        name: scenario.archetype.name,
        description: scenario.archetype.description,
        scenarioId: scenario.id,
        challengeTagline: scenario.challengeTagline,
        roleFamily: scenario.archetype.roleFamily,
      });
    }
  }

  // Group by role family
  const groupMap = new Map<string, RoleFamilyGroup>();

  for (const archetype of archetypeMap.values()) {
    const familySlug = archetype.roleFamily.slug;

    if (!groupMap.has(familySlug)) {
      groupMap.set(familySlug, {
        slug: familySlug,
        name: archetype.roleFamily.name,
        archetypes: [],
      });
    }

    groupMap.get(familySlug)!.archetypes.push(archetype);
  }

  // Return in a fixed order
  const familyOrder = [
    "engineering",
    "product_management",
    "data_science",
    "program_management",
    "sales",
    "customer_success",
  ];

  return familyOrder
    .map((slug) => groupMap.get(slug))
    .filter((g): g is RoleFamilyGroup => g != null);
}

export default async function CandidatesPage() {
  const groups = await getChallengeScenarios();

  return <CandidatesPageClient groups={groups} />;
}
