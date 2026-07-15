import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "./node_modules/eslint-config-next/dist/core-web-vitals.js";
import nextTypescript from "./node_modules/eslint-config-next/dist/typescript.js";

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores(
    [
      ".next/**",
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
      "src/app/components/figma/**",
      "src/app/components/ui/**",
    ],
    "AXXESS generated and build outputs",
  ),
]);

export default eslintConfig;
