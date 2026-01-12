import { homedir } from "os";
import { join } from "path";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

export interface ApiKeyProfile {
  type: "api-key";
  key: string;
}

export interface MaxProfile {
  type: "max";
}

export type Profile = ApiKeyProfile | MaxProfile;

export interface ProfilesConfig {
  profiles: Record<string, Profile>;
  active: string | null;
}

const PROFILES_PATH = join(homedir(), ".claude-profiles.json");

export function getProfilesPath(): string {
  return PROFILES_PATH;
}

export async function loadProfiles(): Promise<ProfilesConfig> {
  if (!existsSync(PROFILES_PATH)) {
    return { profiles: {}, active: null };
  }

  const content = await readFile(PROFILES_PATH, "utf-8");
  return JSON.parse(content) as ProfilesConfig;
}

export async function saveProfiles(config: ProfilesConfig): Promise<void> {
  await writeFile(PROFILES_PATH, JSON.stringify(config, null, 2) + "\n");
}

export async function getProfile(name: string): Promise<Profile | null> {
  const config = await loadProfiles();
  return config.profiles[name] ?? null;
}

export async function addProfile(name: string, profile: Profile): Promise<void> {
  const config = await loadProfiles();
  config.profiles[name] = profile;
  await saveProfiles(config);
}

export async function removeProfile(name: string): Promise<boolean> {
  const config = await loadProfiles();
  if (!(name in config.profiles)) {
    return false;
  }
  delete config.profiles[name];
  if (config.active === name) {
    config.active = null;
  }
  await saveProfiles(config);
  return true;
}

export async function setActiveProfile(name: string): Promise<void> {
  const config = await loadProfiles();
  config.active = name;
  await saveProfiles(config);
}

export async function getActiveProfile(): Promise<string | null> {
  const config = await loadProfiles();
  return config.active;
}

export async function listProfiles(): Promise<{ name: string; profile: Profile; active: boolean }[]> {
  const config = await loadProfiles();
  return Object.entries(config.profiles).map(([name, profile]) => ({
    name,
    profile,
    active: config.active === name,
  }));
}

export function profileExists(config: ProfilesConfig, name: string): boolean {
  return name in config.profiles;
}
