import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// ─────────────────────────────────────────────
// ESLint flat config (ESLint 9 + eslint-config-next 16).
//
// `next lint` was removed in Next 16, so the `lint` npm script now runs
// `eslint .` directly against this config (finding F-6).
// eslint-config-next 16 ships native flat configs, so no FlatCompat shim is
// needed.
// ─────────────────────────────────────────────

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "e2e/**",
      "documentation/**",
      "prisma/**",
      "**/*.config.*",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Project style: allow intentional unused vars prefixed with _.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Pre-existing code predates the React Compiler-era rules and the
      // strict no-explicit-any rule. Keep them visible as warnings rather than
      // failing the build; tighten incrementally.
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default eslintConfig;
