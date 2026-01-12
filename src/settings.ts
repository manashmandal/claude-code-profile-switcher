import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";
import type { Profile } from "./config";

export type ShellType = "fish" | "posix";

export interface ClaudeSettings {
  apiKeyHelper?: string;
  [key: string]: unknown;
}

export interface ApplyResult {
  settingsPath: string;
  oldApiKeyHelper: string | undefined;
  newApiKeyHelper: string | undefined;
  changed: boolean;
}

// Default settings path - can be overridden for testing
let settingsPath = join(homedir(), ".claude", "settings.json");

/**
 * Set custom settings path (for testing)
 */
export function setSettingsPath(path: string): void {
  settingsPath = path;
}

/**
 * Get current settings path
 */
export function getSettingsPath(): string {
  return settingsPath;
}

/**
 * Reset settings path to default
 */
export function resetSettingsPath(): void {
  settingsPath = join(homedir(), ".claude", "settings.json");
}

/**
 * Load Claude settings from settings.json
 */
export async function loadSettings(): Promise<ClaudeSettings> {
  if (!existsSync(settingsPath)) {
    return {};
  }

  const file = Bun.file(settingsPath);
  const content = await file.text();
  return JSON.parse(content) as ClaudeSettings;
}

/**
 * Save Claude settings to settings.json
 */
export async function saveSettings(settings: ClaudeSettings): Promise<void> {
  await Bun.write(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

/**
 * Apply a profile by modifying settings.json
 * - API key profiles: set apiKeyHelper to echo the key
 * - Max profiles: remove apiKeyHelper (uses OAuth)
 */
export async function applyProfile(profile: Profile): Promise<ApplyResult> {
  const settings = await loadSettings();
  const oldApiKeyHelper = settings.apiKeyHelper;

  let newApiKeyHelper: string | undefined;

  if (profile.type === "api-key") {
    newApiKeyHelper = `echo '${profile.key}'`;
    settings.apiKeyHelper = newApiKeyHelper;
  } else {
    newApiKeyHelper = undefined;
    delete settings.apiKeyHelper;
  }

  const changed = oldApiKeyHelper !== newApiKeyHelper;

  if (changed) {
    await saveSettings(settings);
  }

  return {
    settingsPath,
    oldApiKeyHelper,
    newApiKeyHelper,
    changed,
  };
}

/**
 * Dry run - show what would change without modifying files
 */
export async function dryRunApplyProfile(profile: Profile): Promise<ApplyResult> {
  const settings = await loadSettings();
  const oldApiKeyHelper = settings.apiKeyHelper;

  const newApiKeyHelper = profile.type === "api-key"
    ? `echo '${profile.key}'`
    : undefined;

  return {
    settingsPath,
    oldApiKeyHelper,
    newApiKeyHelper,
    changed: oldApiKeyHelper !== newApiKeyHelper,
  };
}

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
 * This is supplementary to settings.json modification.
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
 * Format apiKeyHelper for display (masks the key inside)
 */
export function formatApiKeyHelperForDisplay(apiKeyHelper: string | undefined): string {
  if (!apiKeyHelper) {
    return "(not set - using OAuth)";
  }

  const match = apiKeyHelper.match(/echo\s+'([^']+)'/);
  if (match && match[1]) {
    const key = match[1];
    if (key.length > 20) {
      return `echo '${key.slice(0, 10)}...${key.slice(-6)}'`;
    }
    return apiKeyHelper;
  }

  // Unknown format, truncate if too long
  return apiKeyHelper.length > 40 ? `${apiKeyHelper.slice(0, 37)}...` : apiKeyHelper;
}
