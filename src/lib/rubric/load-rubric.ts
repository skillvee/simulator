/**
 * Rubric Loader
 *
 * Loads rubric data from the database for a given role family.
 * Used to build evaluation prompts and interpret assessment results.
 *
 * @since 2026-02-06
 */

import { PrismaClient } from "@prisma/client";
import type {
  RubricPromptInput,
  DimensionWithRubric,
  RedFlagData,
  RubricLevelData,
} from "@/prompts/analysis/rubric-evaluation";

/**
 * Loads complete rubric data for a role family, including dimensions,
 * rubric levels (with role-family-specific overrides), and red flags.
 *
 * @param prisma - Prisma client instance
 * @param roleFamilySlug - The role family slug (e.g., "engineering", "sales")
 * @returns RubricPromptInput ready for prompt building
 */
export async function loadRubricForRoleFamily(
  prisma: PrismaClient,
  roleFamilySlug: string
): Promise<RubricPromptInput> {
  // Load the role family with its dimensions and red flags
  const roleFamily = await prisma.roleFamily.findUniqueOrThrow({
    where: { slug: roleFamilySlug },
    include: {
      dimensions: {
        include: {
          dimension: {
            include: {
              rubricLevels: true,
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      redFlags: true,
    },
  });

  // Build dimensions with the correct rubric levels
  // For each dimension, use role-family-specific overrides if they exist,
  // otherwise fall back to the default rubric levels (roleFamilyId = null)
  const dimensions: DimensionWithRubric[] = roleFamily.dimensions.map(
    (rfd) => {
      const dim = rfd.dimension;

      // Separate overrides (for this role family) from defaults (roleFamilyId = null)
      const overrides = dim.rubricLevels.filter(
        (rl) => rl.roleFamilyId === roleFamily.id
      );
      const defaults = dim.rubricLevels.filter(
        (rl) => rl.roleFamilyId === null
      );

      // For each level 1-4, prefer the override if it exists
      const levels: RubricLevelData[] = [1, 2, 3, 4].map((level) => {
        const override = overrides.find((rl) => rl.level === level);
        const fallback = defaults.find((rl) => rl.level === level);
        const source = override || fallback;

        if (!source) {
          throw new Error(
            `Missing rubric level ${level} for dimension ${dim.slug} in role family ${roleFamilySlug}`
          );
        }

        return {
          level: source.level,
          label: source.label,
          pattern: source.pattern,
          evidence: source.evidence as string[],
        };
      });

      return {
        slug: dim.slug,
        name: dim.name,
        description: dim.description,
        isUniversal: dim.isUniversal,
        levels,
      };
    }
  );

  // Build red flags
  const redFlags: RedFlagData[] = roleFamily.redFlags.map((rf) => ({
    slug: rf.slug,
    name: rf.name,
    description: rf.description,
  }));

  return {
    roleFamilyName: roleFamily.name,
    roleFamilySlug: roleFamily.slug,
    dimensions,
    redFlags,
  };
}

/**
 * Loads archetype data including weights and seniority gates.
 *
 * @param prisma - Prisma client instance
 * @param archetypeSlug - The archetype slug (e.g., "frontend_engineer")
 * @returns Archetype with weights and gates
 */
export async function loadArchetype(
  prisma: PrismaClient,
  archetypeSlug: string
) {
  return prisma.archetype.findUniqueOrThrow({
    where: { slug: archetypeSlug },
    include: {
      weights: {
        include: { dimension: true },
      },
      seniorityGates: {
        include: { dimension: true },
      },
      roleFamily: true,
    },
  });
}

/**
 * Loads all archetypes for a role family.
 *
 * @param prisma - Prisma client instance
 * @param roleFamilySlug - The role family slug
 * @returns All archetypes with weights and gates
 */
export async function loadArchetypesForRoleFamily(
  prisma: PrismaClient,
  roleFamilySlug: string
) {
  const roleFamily = await prisma.roleFamily.findUniqueOrThrow({
    where: { slug: roleFamilySlug },
  });

  return prisma.archetype.findMany({
    where: { roleFamilyId: roleFamily.id },
    include: {
      weights: {
        include: { dimension: true },
      },
      seniorityGates: {
        include: { dimension: true },
      },
    },
  });
}
