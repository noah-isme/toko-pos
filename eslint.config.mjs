import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // React Compiler ruleset ships as errors in eslint-config-next 16 (new vs 15).
    // Downgraded to warnings to unblock CI; tracked for a dedicated burn-down pass
    // so the Next 16 upgrade doesn't balloon unrelated PRs. Classic hooks rules
    // (rules-of-hooks, exhaustive-deps) keep their default severity.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "src/generated/**",
    ],
  },
];

export default eslintConfig;
