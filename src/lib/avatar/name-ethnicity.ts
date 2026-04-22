/**
 * Name → Demographics Inference
 *
 * Maps first names to likely ethnicity/gender for avatar pool assignment.
 * Uses a curated dictionary of common names to pick the right photo
 * from the static avatar pool (public/avatars/pool/).
 */

export type Ethnicity =
  | "east_asian"
  | "south_asian"
  | "southeast_asian"
  | "white"
  | "black"
  | "hispanic"
  | "middle_eastern"
  | "mixed";

export type Gender = "male" | "female";

export interface Demographics {
  ethnicity: Ethnicity;
  gender: Gender;
}

// First name → likely ethnicity mapping
// Lowercase keys for case-insensitive lookup
const ETHNICITY_MAP: Record<string, Ethnicity> = {
  // East Asian
  mei: "east_asian", lin: "east_asian", chen: "east_asian", wei: "east_asian",
  zhang: "east_asian", wang: "east_asian", li: "east_asian", liu: "east_asian",
  yuki: "east_asian", hiroshi: "east_asian", kenji: "east_asian", akiko: "east_asian",
  takeshi: "east_asian", haruki: "east_asian", naomi: "east_asian", yumi: "east_asian",
  jisoo: "east_asian", hyun: "east_asian", soo: "east_asian", minjun: "east_asian",
  hana: "east_asian", jun: "east_asian", sato: "east_asian", tanaka: "east_asian",
  park: "east_asian", kim: "east_asian", wong: "east_asian", chang: "east_asian",
  huang: "east_asian", zhao: "east_asian", yang: "east_asian", wu: "east_asian",
  xu: "east_asian", sun: "east_asian", guo: "east_asian", he: "east_asian",
  liang: "east_asian", xiao: "east_asian", cheng: "east_asian", deng: "east_asian",

  // South Asian
  priya: "south_asian", arjun: "south_asian", sharma: "south_asian", patel: "south_asian",
  kumar: "south_asian", singh: "south_asian", mehta: "south_asian", gupta: "south_asian",
  ananya: "south_asian", deepika: "south_asian", kavya: "south_asian", nisha: "south_asian",
  rahul: "south_asian", vikram: "south_asian", sanjay: "south_asian", amit: "south_asian",
  ravi: "south_asian", suresh: "south_asian", anil: "south_asian", prakash: "south_asian",
  reddy: "south_asian", verma: "south_asian", krishnan: "south_asian", desai: "south_asian",
  aditya: "south_asian", varun: "south_asian", rohan: "south_asian", neha: "south_asian",
  pooja: "south_asian", shreya: "south_asian", divya: "south_asian", anjali: "south_asian",

  // Southeast Asian
  linh: "southeast_asian", nguyen: "southeast_asian", tran: "southeast_asian",
  pham: "southeast_asian", minh: "southeast_asian", duc: "southeast_asian",
  santos: "southeast_asian", reyes: "southeast_asian", cruz: "southeast_asian",
  budi: "southeast_asian", siti: "southeast_asian", hartono: "southeast_asian",
  putri: "southeast_asian", dewi: "southeast_asian", rizal: "southeast_asian",
  ramon: "southeast_asian", leilani: "southeast_asian",

  // White/European
  emma: "white", james: "white", claire: "white", hannah: "white", rachel: "white",
  daniel: "white", ryan: "white", luca: "white", sofia: "white", obrien: "white",
  kowalski: "white", campbell: "white", moretti: "white", dubois: "white",
  mueller: "white", thompson: "white", johnson: "white", smith: "white",
  anderson: "white", wilson: "white", taylor: "white", brown: "white",
  miller: "white", davis: "white", garcia: "white", martinez: "white",
  emily: "white", sarah: "white", michael: "white", david: "white",
  robert: "white", jennifer: "white", christopher: "white", matthew: "white",
  laura: "white", jessica: "white", brian: "white", kevin: "white",
  andersson: "white", erik: "white", lars: "white", nina: "white",

  // Black
  aisha: "black", zara: "black", imani: "black", thandiwe: "black",
  marcus: "black", derek: "black", kwame: "black", jordan: "black",
  emeka: "black", obi: "black", okafor: "black", nkosi: "black",
  asante: "black", jamal: "black", ebony: "black", malik: "black",
  tyrone: "black", keisha: "black", lamar: "black", darnell: "black",
  washington: "black", brooks: "black", williams: "black",

  // Hispanic/Latino
  carlos: "hispanic", diego: "hispanic", miguel: "hispanic", andres: "hispanic",
  pablo: "hispanic", sofia_r: "hispanic", camila: "hispanic", valentina: "hispanic",
  lucia: "hispanic", isabella: "hispanic", rodriguez: "hispanic", morales: "hispanic",
  fernandez: "hispanic", torres: "hispanic", mendez: "hispanic", vargas: "hispanic",
  gutierrez: "hispanic", alejandro: "hispanic", ricardo: "hispanic",
  gabriela: "hispanic", mariana: "hispanic", elena: "hispanic", javier: "hispanic",
  fernando: "hispanic", raul: "hispanic", carmen: "hispanic",
  matias: "hispanic", "matías": "hispanic", mateo: "hispanic", "matéo": "hispanic",
  sebastian: "hispanic", "sebastián": "hispanic", tomas: "hispanic", "tomás": "hispanic",
  nicolas: "hispanic", "nicolás": "hispanic", santiago: "hispanic", lucas: "hispanic",
  joaquin: "hispanic", "joaquín": "hispanic", benjamin: "hispanic", "benjamín": "hispanic",
  agustin: "hispanic", "agustín": "hispanic", martin: "hispanic", "martín": "hispanic",
  julian: "hispanic", "julián": "hispanic", facundo: "hispanic", ignacio: "hispanic",
  gonzalo: "hispanic", federico: "hispanic", emiliano: "hispanic", leonardo: "hispanic",
  cristian: "hispanic", "cristián": "hispanic", esteban: "hispanic", juan: "hispanic",
  luis: "hispanic", jose: "hispanic", "josé": "hispanic", pedro: "hispanic",
  antonio: "hispanic", manuel: "hispanic", francisco: "hispanic", sergio: "hispanic",
  jorge: "hispanic", hector: "hispanic", "héctor": "hispanic", oscar: "hispanic",
  "óscar": "hispanic", rafael: "hispanic", victor: "hispanic", "víctor": "hispanic",
  alberto: "hispanic", mauricio: "hispanic", felipe: "hispanic", guillermo: "hispanic",
  renata: "hispanic", daniela: "hispanic", paula: "hispanic", ana: "hispanic",
  maria: "hispanic", "maría": "hispanic", laura_h: "hispanic", patricia: "hispanic",
  natalia: "hispanic", andrea: "hispanic", florencia: "hispanic", martina: "hispanic",
  antonella: "hispanic", agustina: "hispanic", catalina: "hispanic", emilia: "hispanic",
  alba: "hispanic", rocio: "hispanic", "rocío": "hispanic", pilar: "hispanic",
  beatriz: "hispanic", ines: "hispanic", "inés": "hispanic", silvia: "hispanic",
  mercedes: "hispanic", guadalupe: "hispanic", ximena: "hispanic", regina: "hispanic",

  // Middle Eastern
  fatima: "middle_eastern", leila: "middle_eastern", noor: "middle_eastern",
  sara_k: "middle_eastern", yasmin: "middle_eastern", omar: "middle_eastern",
  ali: "middle_eastern", karim: "middle_eastern", tariq: "middle_eastern",
  rami: "middle_eastern", hassan: "middle_eastern", rashid: "middle_eastern",
  abbasi: "middle_eastern", khoury: "middle_eastern", ibrahim: "middle_eastern",
  mansour: "middle_eastern", tehrani: "middle_eastern", farah: "middle_eastern",
  ahmed: "middle_eastern", mohammed: "middle_eastern", youssef: "middle_eastern",
  layla: "middle_eastern", maryam: "middle_eastern", amira: "middle_eastern",
};

// First name → likely gender mapping
// Only includes names where gender is non-obvious or commonly used
const FEMALE_NAMES = new Set([
  "mei", "yuki", "akiko", "naomi", "yumi", "jisoo", "hana",
  "priya", "ananya", "deepika", "kavya", "nisha", "neha", "pooja", "shreya", "divya", "anjali",
  "linh", "nina", "grace", "maya", "siti", "putri", "dewi", "leilani",
  "emma", "claire", "hannah", "rachel", "sofia", "emily", "sarah", "jennifer", "laura", "jessica",
  "aisha", "zara", "imani", "thandiwe", "ebony", "keisha",
  "camila", "valentina", "lucia", "isabella", "gabriela", "mariana", "elena", "carmen",
  "renata", "daniela", "paula", "ana", "maria", "maría", "patricia", "natalia",
  "andrea", "florencia", "martina", "antonella", "agustina", "catalina", "emilia",
  "alba", "rocio", "rocío", "pilar", "beatriz", "ines", "inés", "silvia",
  "mercedes", "guadalupe", "ximena", "regina",
  "fatima", "leila", "noor", "yasmin", "layla", "maryam", "amira", "sara",
  "alex", "taylor", "sam", "riley", "jordan",
]);

const MALE_NAMES = new Set([
  "wei", "hiroshi", "kenji", "takeshi", "haruki", "minjun", "jun",
  "arjun", "rahul", "vikram", "sanjay", "amit", "ravi", "suresh", "anil", "prakash",
  "aditya", "varun", "rohan",
  "minh", "duc", "rafael", "budi", "jay", "rizal", "ramon",
  "james", "daniel", "ryan", "luca", "michael", "david", "robert",
  "christopher", "matthew", "brian", "kevin", "erik", "lars",
  "marcus", "derek", "kwame", "emeka", "jamal", "malik", "tyrone", "lamar", "darnell",
  "carlos", "diego", "miguel", "andres", "pablo", "alejandro", "ricardo",
  "javier", "fernando", "raul",
  "matias", "matías", "mateo", "matéo", "sebastian", "sebastián",
  "tomas", "tomás", "nicolas", "nicolás", "santiago", "lucas", "joaquin", "joaquín",
  "benjamin", "benjamín", "agustin", "agustín", "martin", "martín",
  "julian", "julián", "facundo", "ignacio", "gonzalo", "federico", "emiliano",
  "leonardo", "cristian", "cristián", "esteban", "juan", "luis", "jose", "josé",
  "pedro", "antonio", "manuel", "francisco", "sergio", "jorge", "hector", "héctor",
  "oscar", "óscar", "victor", "víctor", "alberto", "mauricio", "felipe", "guillermo",
  "omar", "ali", "karim", "tariq", "rami", "ahmed", "mohammed", "youssef",
  "kai", "eden", "marco", "jayden", "nico",
]);

/**
 * Simple deterministic hash from a string → number.
 * Used to consistently pick a specific avatar index for a given name.
 */
function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Infer demographics (ethnicity group + gender) from a full name.
 */
export function inferDemographics(fullName: string): Demographics {
  const parts = fullName.toLowerCase().trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";

  // Try first name, then last name for ethnicity
  const ethnicity: Ethnicity = ETHNICITY_MAP[firstName] || ETHNICITY_MAP[lastName] || "mixed";

  // Infer gender from first name
  let gender: Gender;
  if (FEMALE_NAMES.has(firstName)) {
    gender = "female";
  } else if (MALE_NAMES.has(firstName)) {
    gender = "male";
  } else {
    // Fallback: use hash for deterministic but pseudo-random assignment
    gender = hashName(fullName) % 2 === 0 ? "female" : "male";
  }

  return { ethnicity, gender };
}

// All people in the avatar pool, organized by group + gender
// These must match the filenames generated by scripts/generate-avatar-pool.ts
const AVATAR_POOL: Record<string, string[]> = {
  "east_asian-female": ["mei-lin", "yuki-tanaka", "jisoo-park", "sarah-chen", "hana-kim"],
  "east_asian-male": ["wei-zhang", "kevin-wong", "hiroshi-sato", "david-liu", "jun-park"],
  "south_asian-female": ["priya-sharma", "ananya-patel", "deepika-gupta", "kavya-reddy", "nisha-kumar"],
  "south_asian-male": ["arjun-mehta", "rahul-verma", "vikram-singh", "sanjay-krishnan", "amit-desai"],
  "southeast_asian-female": ["linh-nguyen", "grace-santos", "nina-tran", "maya-reyes", "siti-rahman"],
  "southeast_asian-male": ["minh-pham", "rafael-cruz", "duc-le", "jay-santos", "budi-hartono"],
  "white-female": ["emma-johnson", "sofia-andersson", "claire-dubois", "hannah-mueller", "rachel-thompson"],
  "white-male": ["james-obrien", "alex-rivera", "daniel-kowalski", "ryan-campbell", "luca-moretti"],
  "black-female": ["aisha-johnson", "zara-okafor", "maya-williams", "imani-brooks", "thandiwe-nkosi"],
  "black-male": ["marcus-thompson", "derek-washington", "kwame-asante", "jordan-davis", "emeka-obi"],
  "hispanic-female": ["sofia-rodriguez", "camila-morales", "valentina-garcia", "lucia-fernandez", "isabella-torres"],
  "hispanic-male": ["carlos-mendez", "diego-vargas", "miguel-santos", "andres-gutierrez", "pablo-reyes"],
  "middle_eastern-female": ["fatima-al-rashid", "leila-hassan", "noor-abbasi", "sara-khoury", "yasmin-farah"],
  "middle_eastern-male": ["omar-hassan", "ali-tehrani", "karim-mansour", "tariq-ibrahim", "rami-khoury"],
  // Mixed avatars reuse existing pool files (mixed-specific avatars were never generated)
  "mixed-female": ["emma-johnson", "grace-santos", "maya-williams", "rachel-thompson", "aisha-johnson"],
  "mixed-male": ["alex-rivera", "jordan-davis", "rafael-cruz", "daniel-kowalski", "carlos-mendez"],
};

/**
 * Get the avatar file path from the pool for a given name.
 * Returns a path like "/avatars/pool/mei-lin.jpg".
 * Deterministic: same name always returns the same avatar.
 *
 * If `overrides.gender` or `overrides.ethnicity` is provided, they bypass
 * name-based inference — use these when the LLM or admin explicitly set them,
 * so a name like "Matias" never picks a female pool due to an incomplete dictionary.
 */
export function getPoolAvatarPath(
  fullName: string,
  overrides?: { gender?: Gender | null; ethnicity?: Ethnicity | null }
): string {
  const inferred = inferDemographics(fullName);
  const ethnicity: Ethnicity = overrides?.ethnicity ?? inferred.ethnicity;
  const gender: Gender = overrides?.gender ?? inferred.gender;
  const key = `${ethnicity}-${gender}`;
  const pool = AVATAR_POOL[key];

  if (!pool || pool.length === 0) {
    // Absolute fallback — use an avatar that actually exists in the pool
    return "/avatars/pool/emma-johnson.jpg";
  }

  // Use name hash to pick a consistent index
  const index = hashName(fullName) % pool.length;
  return `/avatars/pool/${pool[index]}.jpg`;
}

export const ETHNICITIES: readonly Ethnicity[] = [
  "east_asian",
  "south_asian",
  "southeast_asian",
  "white",
  "black",
  "hispanic",
  "middle_eastern",
  "mixed",
] as const;

export const GENDERS: readonly Gender[] = ["male", "female"] as const;

export function isEthnicity(value: unknown): value is Ethnicity {
  return typeof value === "string" && (ETHNICITIES as readonly string[]).includes(value);
}

export function isGender(value: unknown): value is Gender {
  return value === "male" || value === "female";
}
