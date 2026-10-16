import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Componentes de @react-pdf: su <Image> no tiene "alt" y el texto con comillas
  // NO debe escaparse con entidades HTML (saldrían literales en el PDF).
  {
    files: [
      "src/features/**/pdf/**/*.tsx",
      "src/components/ReporteTecnicoPDF.tsx",
      "src/app/[[]locale]/cotizaciones-us/components/StandardRatesPDF.tsx",
    ],
    rules: {
      "jsx-a11y/alt-text": "off",
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
