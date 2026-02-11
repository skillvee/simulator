/**
 * Name → Demographics Inference
 *
 * Maps first names to likely ethnicity/gender for avatar pool assignment.
 * Uses a curated dictionary of common names to pick the right photo
 * from the static avatar pool (public/avatars/pool/).
 */

export type EthnicGroup =
  | "east-asian"
  | "south-asian"
  | "southeast-asian"
  | "white"
  | "black"
  | "hispanic"
  | "middle-eastern"
  | "mixed";

export type Gender = "male" | "female";

export interface Demographics {
  group: EthnicGroup;
  gender: Gender;
}

// First name → likely ethnicity mapping
// Lowercase keys for case-insensitive lookup
const ETHNICITY_MAP: Record<string, EthnicGroup> = {
  // East Asian
  mei: "east-asian", lin: "east-asian", chen: "east-asian", wei: "east-asian",
  zhang: "east-asian", wang: "east-asian", li: "east-asian", liu: "east-asian",
  yuki: "east-asian", hiroshi: "east-asian", kenji: "east-asian", akiko: "east-asian",
  takeshi: "east-asian", haruki: "east-asian", naomi: "east-asian", yumi: "east-asian",
  jisoo: "east-asian", hyun: "east-asian", soo: "east-asian", minjun: "east-asian",
  hana: "east-asian", jun: "east-asian", sato: "east-asian", tanaka: "east-asian",
  park: "east-asian", kim: "east-asian", wong: "east-asian", chang: "east-asian",
  huang: "east-asian", zhao: "east-asian", yang: "east-asian", wu: "east-asian",
  xu: "east-asian", sun: "east-asian", guo: "east-asian", he: "east-asian",
  liang: "east-asian", xiao: "east-asian", cheng: "east-asian", deng: "east-asian",

  // South Asian
  priya: "south-asian", arjun: "south-asian", sharma: "south-asian", patel: "south-asian",
  kumar: "south-asian", singh: "south-asian", mehta: "south-asian", gupta: "south-asian",
  ananya: "south-asian", deepika: "south-asian", kavya: "south-asian", nisha: "south-asian",
  rahul: "south-asian", vikram: "south-asian", sanjay: "south-asian", amit: "south-asian",
  ravi: "south-asian", suresh: "south-asian", anil: "south-asian", prakash: "south-asian",
  reddy: "south-asian", verma: "south-asian", krishnan: "south-asian", desai: "south-asian",
  aditya: "south-asian", varun: "south-asian", rohan: "south-asian", neha: "south-asian",
  pooja: "south-asian", shreya: "south-asian", divya: "south-asian", anjali: "south-asian",

  // Southeast Asian
  linh: "southeast-asian", nguyen: "southeast-asian", tran: "southeast-asian",
  pham: "southeast-asian", minh: "southeast-asian", duc: "southeast-asian",
  santos: "southeast-asian", reyes: "southeast-asian", cruz: "southeast-asian",
  budi: "southeast-asian", siti: "southeast-asian", hartono: "southeast-asian",
  putri: "southeast-asian", dewi: "southeast-asian", rizal: "southeast-asian",
  ramon: "southeast-asian", leilani: "southeast-asian",

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

  // Middle Eastern
  fatima: "middle-eastern", leila: "middle-eastern", noor: "middle-eastern",
  sara_k: "middle-eastern", yasmin: "middle-eastern", omar: "middle-eastern",
  ali: "middle-eastern", karim: "middle-eastern", tariq: "middle-eastern",
  rami: "middle-eastern", hassan: "middle-eastern", rashid: "middle-eastern",
  abbasi: "middle-eastern", khoury: "middle-eastern", ibrahim: "middle-eastern",
  mansour: "middle-eastern", tehrani: "middle-eastern", farah: "middle-eastern",
  ahmed: "middle-eastern", mohammed: "middle-eastern", youssef: "middle-eastern",
  layla: "middle-eastern", maryam: "middle-eastern", amira: "middle-eastern",
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
  const group: EthnicGroup = ETHNICITY_MAP[firstName] || ETHNICITY_MAP[lastName] || "mixed";

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

  return { group, gender };
}

// All people in the avatar pool, organized by group + gender
// These must match the filenames generated by scripts/generate-avatar-pool.ts
const AVATAR_POOL: Record<string, string[]> = {
  "east-asian-female": ["mei-lin", "yuki-tanaka", "jisoo-park", "sarah-chen", "hana-kim"],
  "east-asian-male": ["wei-zhang", "kevin-wong", "hiroshi-sato", "david-liu", "jun-park"],
  "south-asian-female": ["priya-sharma", "ananya-patel", "deepika-gupta", "kavya-reddy", "nisha-kumar"],
  "south-asian-male": ["arjun-mehta", "rahul-verma", "vikram-singh", "sanjay-krishnan", "amit-desai"],
  "southeast-asian-female": ["linh-nguyen", "grace-santos", "nina-tran", "maya-reyes", "siti-rahman"],
  "southeast-asian-male": ["minh-pham", "rafael-cruz", "duc-le", "jay-santos", "budi-hartono"],
  "white-female": ["emma-johnson", "sofia-andersson", "claire-dubois", "hannah-mueller", "rachel-thompson"],
  "white-male": ["james-obrien", "alex-rivera", "daniel-kowalski", "ryan-campbell", "luca-moretti"],
  "black-female": ["aisha-johnson", "zara-okafor", "maya-williams", "imani-brooks", "thandiwe-nkosi"],
  "black-male": ["marcus-thompson", "derek-washington", "kwame-asante", "jordan-davis", "emeka-obi"],
  "hispanic-female": ["sofia-rodriguez", "camila-morales", "valentina-garcia", "lucia-fernandez", "isabella-torres"],
  "hispanic-male": ["carlos-mendez", "diego-vargas", "miguel-santos", "andres-gutierrez", "pablo-reyes"],
  "middle-eastern-female": ["fatima-al-rashid", "leila-hassan", "noor-abbasi", "sara-khoury", "yasmin-farah"],
  "middle-eastern-male": ["omar-hassan", "ali-tehrani", "karim-mansour", "tariq-ibrahim", "rami-khoury"],
  "mixed-female": ["alex-morgan", "jordan-lee", "taylor-santos", "sam-chen-williams", "riley-patel"],
  "mixed-male": ["kai-nakamura", "eden-tadesse", "marco-silva", "jayden-kim", "nico-fernandez"],
};

/**
 * Get the avatar file path from the pool for a given name.
 * Returns a path like "/avatars/pool/mei-lin.jpg".
 * Deterministic: same name always returns the same avatar.
 */
export function getPoolAvatarPath(fullName: string): string {
  const { group, gender } = inferDemographics(fullName);
  const key = `${group}-${gender}`;
  const pool = AVATAR_POOL[key];

  if (!pool || pool.length === 0) {
    // Absolute fallback
    return "/avatars/pool/alex-morgan.jpg";
  }

  // Use name hash to pick a consistent index
  const index = hashName(fullName) % pool.length;
  return `/avatars/pool/${pool[index]}.jpg`;
}
