import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores([
    "**/node_modules",
    "**/dist",
    "**/build",
    "**/coverage",
    "**/*.min.js",
  ]),
  {
    extends: compat.extends("eslint:recommended"),

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.node,
      },

      ecmaVersion: "latest",
      sourceType: "module",
    },

    rules: {
      "no-console": "off",

      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
        },
      ],

      "no-var": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "always"],
      curly: ["error", "all"],
      "no-eval": "error",
      "no-implied-eval": "error",
    },
  },
]);
