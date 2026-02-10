/**
 * Test script: Generate sample avatars to validate style/quality.
 *
 * Usage: npx tsx scripts/generate-test-avatar.ts
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

// Different casual/natural settings to vary across the pool
const BACKGROUNDS = [
  "in a bright modern office with blurred desks behind them",
  "outdoors on a sunny day with trees softly blurred in background",
  "at a coffee shop with warm natural lighting",
  "in a cozy home office with a bookshelf blurred behind",
  "at a rooftop with city skyline softly blurred in background",
];

const TEST_PROMPTS = [
  {
    name: "test-1-office",
    prompt: `Casual profile photo of a young East Asian woman in her late 20s, ${BACKGROUNDS[0]}.
She's wearing a simple t-shirt, natural relaxed expression with a genuine smile.
Shot on iPhone, natural lighting, slightly shallow depth of field.
Looks like a real Slack or LinkedIn profile picture taken by a friend, not a studio photo.`,
  },
  {
    name: "test-2-outdoor",
    prompt: `Casual profile photo of a South Asian man in his early 30s, ${BACKGROUNDS[1]}.
He's wearing a casual button-down shirt, natural candid expression.
Shot on a phone camera, warm natural light, slightly off-center framing.
Looks like a real profile picture someone took at a park, not posed or staged.`,
  },
  {
    name: "test-3-coffee",
    prompt: `Casual profile photo of a Black woman in her mid 30s, ${BACKGROUNDS[2]}.
She's wearing a cozy sweater, warm genuine smile, looking at camera.
Natural ambient lighting, slight bokeh background. Shot on a phone.
Looks like a real Slack profile picture, relaxed and authentic.`,
  },
  {
    name: "test-4-home",
    prompt: `Casual profile photo of a white man in his late 20s with a short beard, ${BACKGROUNDS[3]}.
He's wearing a hoodie, friendly relaxed expression.
Natural window lighting, shallow depth of field. Shot casually on a phone.
Looks like a real profile picture for a tech company Slack, not a studio headshot.`,
  },
];

async function generateTestAvatars() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const test of TEST_PROMPTS) {
    console.log(`\nGenerating ${test.name}...`);

    try {
      const response = await gemini.models.generateImages({
        model: IMAGE_MODEL,
        prompt: test.prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1",
        },
      });

      if (!response.generatedImages?.length) {
        console.error(`  No image generated for ${test.name}`);
        continue;
      }

      const imageData = response.generatedImages[0].image?.imageBytes;
      if (!imageData) {
        console.error(`  No image data for ${test.name}`);
        continue;
      }

      const buffer = Buffer.from(imageData, "base64");
      const outputPath = path.join(OUTPUT_DIR, `${test.name}.jpg`);
      fs.writeFileSync(outputPath, buffer);

      console.log(`  Saved: ${test.name}.jpg (${(buffer.length / 1024).toFixed(1)} KB)`);
    } catch (err) {
      console.error(`  Failed ${test.name}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone! Check public/avatars/pool/ for the test images.");
}

generateTestAvatars().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
