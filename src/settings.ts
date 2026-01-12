import type { Profile } from "./config";

/**
 * Generate shell commands to apply a profile via environment variable.
 * For API key profiles: exports ANTHROPIC_API_KEY
 * For Max profiles: unsets ANTHROPIC_API_KEY (uses OAuth)
 */
export function generateEnvCommands(profile: Profile): string {
  if (profile.type === "api-key") {
    return `export ANTHROPIC_API_KEY='${profile.key}'`;
  } else {
    return "unset ANTHROPIC_API_KEY";
  }
}

/**
 * Format profile for display (masks API key)
 */
export function formatProfileForDisplay(profile: Profile): string {
  if (profile.type === "max") {
    return "(Max plan / OAuth)";
  }

  const key = profile.key;
  if (key.length > 20) {
    return `${key.slice(0, 10)}...${key.slice(-6)}`;
  }
  return key;
}

/**
 * Generate dry run output showing what env var would be set
 */
export function generateDryRunOutput(profile: Profile): string {
  if (profile.type === "api-key") {
    const maskedKey = formatProfileForDisplay(profile);
    return `Would set: ANTHROPIC_API_KEY=${maskedKey}`;
  } else {
    return "Would unset: ANTHROPIC_API_KEY (use OAuth)";
  }
}
