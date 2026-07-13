import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const toConfigArray = (config) => (Array.isArray(config) ? config : [config]);

const eslintConfig = defineConfig([
  ...toConfigArray(nextCoreWebVitals),
  ...toConfigArray(nextTypescript),
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
