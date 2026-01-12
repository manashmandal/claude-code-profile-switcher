import { getActiveProfile, getProfile } from "../config";

export async function currentProfileCommand(): Promise<void> {
  const activeName = await getActiveProfile();
  const currentEnvKey = process.env.ANTHROPIC_API_KEY;

  if (!activeName) {
    console.log("No active profile set.");
    if (currentEnvKey) {
      const masked = currentEnvKey.length > 20
        ? `${currentEnvKey.slice(0, 10)}...${currentEnvKey.slice(-6)}`
        : currentEnvKey;
      console.log(`Current ANTHROPIC_API_KEY: ${masked}`);
    }
    return;
  }

  const profile = await getProfile(activeName);

  if (!profile) {
    console.log(`Active profile '${activeName}' not found in config.`);
    return;
  }

  const typeLabel = profile.type === "max" ? "Max plan" : "API key";
  console.log(`Profile: ${activeName} (${typeLabel})`);

  if (currentEnvKey) {
    const masked = currentEnvKey.length > 20
      ? `${currentEnvKey.slice(0, 10)}...${currentEnvKey.slice(-6)}`
      : currentEnvKey;
    console.log(`ANTHROPIC_API_KEY: ${masked}`);
  } else {
    console.log("ANTHROPIC_API_KEY: (not set - using OAuth)");
  }
}
