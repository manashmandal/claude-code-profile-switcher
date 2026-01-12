import type { Profile } from "./config";

export type ShellType = "fish" | "posix";

/**
 * Detect the current shell type.
 * Fish sets FISH_VERSION env var, otherwise assume POSIX-compatible (bash/zsh).
 */
export function detectShell(): ShellType {
  if (process.env.FISH_VERSION) {
    return "fish";
  }
  return "posix";
}

/**
 * Generate shell commands to apply a profile via environment variable.
 * For API key profiles: exports ANTHROPIC_API_KEY
 * For Max profiles: unsets ANTHROPIC_API_KEY (uses OAuth)
 */
export function generateEnvCommands(profile: Profile, shell?: ShellType): string {
  const detectedShell = shell ?? detectShell();

  if (profile.type === "api-key") {
    if (detectedShell === "fish") {
      return `set -gx ANTHROPIC_API_KEY '${profile.key}'`;
    }
    return `export ANTHROPIC_API_KEY='${profile.key}'`;
  } else {
    if (detectedShell === "fish") {
      return "set -e ANTHROPIC_API_KEY";
    }
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
export function generateDryRunOutput(profile: Profile, shell?: ShellType): string {
  const detectedShell = shell ?? detectShell();
  const shellName = detectedShell === "fish" ? "fish" : "bash/zsh";

  if (profile.type === "api-key") {
    const maskedKey = formatProfileForDisplay(profile);
    return `Would set (${shellName}): ANTHROPIC_API_KEY=${maskedKey}`;
  } else {
    return `Would unset (${shellName}): ANTHROPIC_API_KEY (use OAuth)`;
  }
}
