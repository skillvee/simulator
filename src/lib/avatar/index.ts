/**
 * Avatar Module (RF-021)
 * Handles avatar images for coworkers.
 *
 * Primary: Static pool of pre-generated photos matched by name demographics.
 * Legacy: AI generation via Imagen for custom/premium scenarios.
 */

export {
  generateAvatarsForScenario,
  generateAvatarForCoworker,
} from "./avatar-generation";

export type { CoworkerData, GenerationResult } from "./avatar-generation";

export { getPoolAvatarPath, inferDemographics } from "./name-ethnicity";
export type { EthnicGroup, Gender, Demographics } from "./name-ethnicity";
