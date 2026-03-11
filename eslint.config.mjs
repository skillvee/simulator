import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/components/*/*",
                "!@/components/ui/*",
                "!@/components/landing/*",
              ],
              message:
                "Import types from @/types instead of component implementation files. (Note: @/components/ui/* and @/components/landing/* imports are allowed)",
            },
            {
              group: ["@/lib/*/!(index)"],
              message:
                "Import types from @/types instead of lib implementation files",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
