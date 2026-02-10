/**
 * Batch avatar pool generation script.
 *
 * Generates ~80 casual, realistic profile photos using Imagen 4.
 * Photos are saved as public/avatars/pool/{firstname-lastname}.jpg
 *
 * 8 ethnic groups × 2 genders × 5 people = 80 photos
 * Cost: ~$3.20 one-time (80 × $0.04)
 *
 * Usage: npx tsx scripts/generate-avatar-pool.ts
 *
 * To resume after a failure, the script skips files that already exist.
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY not found in environment");
  process.exit(1);
}

const gemini = new GoogleGenAI({ apiKey });
const IMAGE_MODEL = "imagen-4.0-generate-001";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, "../public/avatars/pool");

// Varied backgrounds to distribute across people
const BACKGROUNDS = [
  "in a bright modern office with blurred desks and monitors behind them",
  "outdoors on a sunny day with trees softly blurred in the background",
  "at a coffee shop with warm ambient lighting and blurred tables behind",
  "in a cozy home office with bookshelves blurred in background",
  "at a rooftop or balcony with blurred city buildings in background",
];

// Varied casual clothing
const CLOTHING = [
  "a simple t-shirt",
  "a casual button-down shirt",
  "a cozy sweater",
  "a hoodie",
  "a polo shirt",
];

// Age descriptors to add variety
const AGES = [
  "in their mid 20s",
  "in their late 20s",
  "in their early 30s",
  "in their mid 30s",
  "in their late 30s",
];

// ============================================================
// People definitions: 8 groups × 2 genders × 5 people = 80
// ============================================================

interface PersonDef {
  name: string; // firstname-lastname (kebab case for filename)
  ethnicity: string; // prompt descriptor
  gender: string; // "man" or "woman"
  group: string; // demographic group tag
}

const PEOPLE: PersonDef[] = [
  // === East Asian (female) ===
  { name: "mei-lin", ethnicity: "East Asian", gender: "woman", group: "east-asian" },
  { name: "yuki-tanaka", ethnicity: "East Asian", gender: "woman", group: "east-asian" },
  { name: "jisoo-park", ethnicity: "East Asian", gender: "woman", group: "east-asian" },
  { name: "sarah-chen", ethnicity: "East Asian", gender: "woman", group: "east-asian" },
  { name: "hana-kim", ethnicity: "East Asian", gender: "woman", group: "east-asian" },

  // === East Asian (male) ===
  { name: "wei-zhang", ethnicity: "East Asian", gender: "man", group: "east-asian" },
  { name: "kevin-wong", ethnicity: "East Asian", gender: "man", group: "east-asian" },
  { name: "hiroshi-sato", ethnicity: "East Asian", gender: "man", group: "east-asian" },
  { name: "david-liu", ethnicity: "East Asian", gender: "man", group: "east-asian" },
  { name: "jun-park", ethnicity: "East Asian", gender: "man", group: "east-asian" },

  // === South Asian (female) ===
  { name: "priya-sharma", ethnicity: "South Asian Indian", gender: "woman", group: "south-asian" },
  { name: "ananya-patel", ethnicity: "South Asian Indian", gender: "woman", group: "south-asian" },
  { name: "deepika-gupta", ethnicity: "South Asian Indian", gender: "woman", group: "south-asian" },
  { name: "kavya-reddy", ethnicity: "South Asian Indian", gender: "woman", group: "south-asian" },
  { name: "nisha-kumar", ethnicity: "South Asian Indian", gender: "woman", group: "south-asian" },

  // === South Asian (male) ===
  { name: "arjun-mehta", ethnicity: "South Asian Indian", gender: "man", group: "south-asian" },
  { name: "rahul-verma", ethnicity: "South Asian Indian", gender: "man", group: "south-asian" },
  { name: "vikram-singh", ethnicity: "South Asian Indian", gender: "man", group: "south-asian" },
  { name: "sanjay-krishnan", ethnicity: "South Asian Indian", gender: "man", group: "south-asian" },
  { name: "amit-desai", ethnicity: "South Asian Indian", gender: "man", group: "south-asian" },

  // === Southeast Asian (female) ===
  { name: "linh-nguyen", ethnicity: "Southeast Asian Vietnamese", gender: "woman", group: "southeast-asian" },
  { name: "grace-santos", ethnicity: "Southeast Asian Filipino", gender: "woman", group: "southeast-asian" },
  { name: "nina-tran", ethnicity: "Southeast Asian Vietnamese", gender: "woman", group: "southeast-asian" },
  { name: "maya-reyes", ethnicity: "Southeast Asian Filipino", gender: "woman", group: "southeast-asian" },
  { name: "siti-rahman", ethnicity: "Southeast Asian Malay", gender: "woman", group: "southeast-asian" },

  // === Southeast Asian (male) ===
  { name: "minh-pham", ethnicity: "Southeast Asian Vietnamese", gender: "man", group: "southeast-asian" },
  { name: "rafael-cruz", ethnicity: "Southeast Asian Filipino", gender: "man", group: "southeast-asian" },
  { name: "duc-le", ethnicity: "Southeast Asian Vietnamese", gender: "man", group: "southeast-asian" },
  { name: "jay-santos", ethnicity: "Southeast Asian Filipino", gender: "man", group: "southeast-asian" },
  { name: "budi-hartono", ethnicity: "Southeast Asian Indonesian", gender: "man", group: "southeast-asian" },

  // === White (female) ===
  { name: "emma-johnson", ethnicity: "White European American", gender: "woman", group: "white" },
  { name: "sofia-andersson", ethnicity: "White Scandinavian", gender: "woman", group: "white" },
  { name: "claire-dubois", ethnicity: "White French European", gender: "woman", group: "white" },
  { name: "hannah-mueller", ethnicity: "White German European", gender: "woman", group: "white" },
  { name: "rachel-thompson", ethnicity: "White American", gender: "woman", group: "white" },

  // === White (male) ===
  { name: "james-obrien", ethnicity: "White Irish American", gender: "man", group: "white" },
  { name: "alex-rivera", ethnicity: "White European American", gender: "man", group: "white" },
  { name: "daniel-kowalski", ethnicity: "White Polish European", gender: "man", group: "white" },
  { name: "ryan-campbell", ethnicity: "White American", gender: "man", group: "white" },
  { name: "luca-moretti", ethnicity: "White Italian European", gender: "man", group: "white" },

  // === Black (female) ===
  { name: "aisha-johnson", ethnicity: "Black African American", gender: "woman", group: "black" },
  { name: "zara-okafor", ethnicity: "Black Nigerian", gender: "woman", group: "black" },
  { name: "maya-williams", ethnicity: "Black African American", gender: "woman", group: "black" },
  { name: "imani-brooks", ethnicity: "Black African American", gender: "woman", group: "black" },
  { name: "thandiwe-nkosi", ethnicity: "Black South African", gender: "woman", group: "black" },

  // === Black (male) ===
  { name: "marcus-thompson", ethnicity: "Black African American", gender: "man", group: "black" },
  { name: "derek-washington", ethnicity: "Black African American", gender: "man", group: "black" },
  { name: "kwame-asante", ethnicity: "Black Ghanaian", gender: "man", group: "black" },
  { name: "jordan-davis", ethnicity: "Black African American", gender: "man", group: "black" },
  { name: "emeka-obi", ethnicity: "Black Nigerian", gender: "man", group: "black" },

  // === Hispanic/Latino (female) ===
  { name: "sofia-rodriguez", ethnicity: "Hispanic Latina", gender: "woman", group: "hispanic" },
  { name: "camila-morales", ethnicity: "Hispanic Latina", gender: "woman", group: "hispanic" },
  { name: "valentina-garcia", ethnicity: "Hispanic Latina", gender: "woman", group: "hispanic" },
  { name: "lucia-fernandez", ethnicity: "Hispanic Latina", gender: "woman", group: "hispanic" },
  { name: "isabella-torres", ethnicity: "Hispanic Latina", gender: "woman", group: "hispanic" },

  // === Hispanic/Latino (male) ===
  { name: "carlos-mendez", ethnicity: "Hispanic Latino", gender: "man", group: "hispanic" },
  { name: "diego-vargas", ethnicity: "Hispanic Latino", gender: "man", group: "hispanic" },
  { name: "miguel-santos", ethnicity: "Hispanic Latino", gender: "man", group: "hispanic" },
  { name: "andres-gutierrez", ethnicity: "Hispanic Latino", gender: "man", group: "hispanic" },
  { name: "pablo-reyes", ethnicity: "Hispanic Latino", gender: "man", group: "hispanic" },

  // === Middle Eastern (female) ===
  { name: "fatima-al-rashid", ethnicity: "Middle Eastern Arab", gender: "woman", group: "middle-eastern" },
  { name: "leila-hassan", ethnicity: "Middle Eastern Arab", gender: "woman", group: "middle-eastern" },
  { name: "noor-abbasi", ethnicity: "Middle Eastern Persian", gender: "woman", group: "middle-eastern" },
  { name: "sara-khoury", ethnicity: "Middle Eastern Lebanese", gender: "woman", group: "middle-eastern" },
  { name: "yasmin-farah", ethnicity: "Middle Eastern Arab", gender: "woman", group: "middle-eastern" },

  // === Middle Eastern (male) ===
  { name: "omar-hassan", ethnicity: "Middle Eastern Arab", gender: "man", group: "middle-eastern" },
  { name: "ali-tehrani", ethnicity: "Middle Eastern Persian Iranian", gender: "man", group: "middle-eastern" },
  { name: "karim-mansour", ethnicity: "Middle Eastern Egyptian", gender: "man", group: "middle-eastern" },
  { name: "tariq-ibrahim", ethnicity: "Middle Eastern Arab", gender: "man", group: "middle-eastern" },
  { name: "rami-khoury", ethnicity: "Middle Eastern Lebanese", gender: "man", group: "middle-eastern" },

  // === Mixed/Ambiguous (female) ===
  { name: "alex-morgan", ethnicity: "mixed race", gender: "woman", group: "mixed" },
  { name: "jordan-lee", ethnicity: "mixed race with ambiguous ethnicity", gender: "woman", group: "mixed" },
  { name: "taylor-santos", ethnicity: "mixed race", gender: "woman", group: "mixed" },
  { name: "sam-chen-williams", ethnicity: "mixed race half Asian half white", gender: "woman", group: "mixed" },
  { name: "riley-patel", ethnicity: "mixed race", gender: "woman", group: "mixed" },

  // === Mixed/Ambiguous (male) ===
  { name: "kai-nakamura", ethnicity: "mixed race half Asian", gender: "man", group: "mixed" },
  { name: "eden-tadesse", ethnicity: "mixed race East African", gender: "man", group: "mixed" },
  { name: "marco-silva", ethnicity: "mixed race Brazilian", gender: "man", group: "mixed" },
  { name: "jayden-kim", ethnicity: "mixed race half Asian half Black", gender: "man", group: "mixed" },
  { name: "nico-fernandez", ethnicity: "mixed race", gender: "man", group: "mixed" },
];

function buildPrompt(person: PersonDef, index: number): string {
  const bg = BACKGROUNDS[index % BACKGROUNDS.length];
  const clothing = CLOTHING[(index + 2) % CLOTHING.length];
  const age = AGES[(index + 1) % AGES.length];

  return `Casual profile photo of a ${person.ethnicity} ${person.gender} ${age}, ${bg}.
Wearing ${clothing}, natural relaxed expression with a genuine smile.
Shot on a phone camera, natural lighting, slightly shallow depth of field.
Looks like a real Slack or LinkedIn profile picture, not a studio headshot.
Candid, authentic, warm. Head and upper shoulders visible.`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generatePool() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Generating ${PEOPLE.length} avatar photos...`);
  console.log(`Output: ${OUTPUT_DIR}\n`);

  for (let i = 0; i < PEOPLE.length; i++) {
    const person = PEOPLE[i];
    const filename = `${person.name}.jpg`;
    const outputPath = path.join(OUTPUT_DIR, filename);

    // Skip if already exists (for resume after failures)
    if (fs.existsSync(outputPath)) {
      console.log(`[${i + 1}/${PEOPLE.length}] SKIP ${filename} (already exists)`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${PEOPLE.length}] Generating ${filename} (${person.group}, ${person.gender})...`);

    const prompt = buildPrompt(person, i);

    // Retry up to 3 times
    let success = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await gemini.models.generateImages({
          model: IMAGE_MODEL,
          prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/jpeg",
            aspectRatio: "1:1",
          },
        });

        if (!response.generatedImages?.length) {
          throw new Error("No image returned");
        }

        const imageData = response.generatedImages[0].image?.imageBytes;
        if (!imageData) {
          throw new Error("No image bytes");
        }

        const buffer = Buffer.from(imageData, "base64");
        fs.writeFileSync(outputPath, buffer);

        console.log(`  OK (${(buffer.length / 1024).toFixed(0)} KB)`);
        generated++;
        success = true;
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  Attempt ${attempt + 1}/3 failed: ${msg}`);
        if (attempt < 2) {
          const delay = 2000 * Math.pow(2, attempt);
          console.log(`  Retrying in ${delay / 1000}s...`);
          await sleep(delay);
        }
      }
    }

    if (!success) {
      console.error(`  FAILED: ${filename}`);
      failed++;
    }

    // Small delay between images to avoid rate limits
    if (i < PEOPLE.length - 1) {
      await sleep(500);
    }
  }

  console.log(`\n========================================`);
  console.log(`Done! Generated: ${generated}, Skipped: ${skipped}, Failed: ${failed}`);
  console.log(`Total files: ${generated + skipped}`);
  console.log(`========================================`);
}

generatePool().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
