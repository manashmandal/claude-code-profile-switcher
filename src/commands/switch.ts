import { select } from "@inquirer/prompts";
import {
  loadProfiles,
  getProfile,
  setActiveProfile,
} from "../config";
import {
  applyProfile,
  dryRunApplyProfile,
  formatApiKeyHelperForDisplay,
} from "../settings";

export async function switchProfile(
  name: string | undefined,
  options: { dryRun?: boolean }
): Promise<void> {
  const config = await loadProfiles();
  const profileNames = Object.keys(config.profiles);

  if (profileNames.length === 0) {
    console.error("No profiles configured. Run 'claude-profile add' to create one.");
    process.exit(1);
  }

  let targetName: string;

  if (name) {
    if (!(name in config.profiles)) {
      console.error(`Profile '${name}' not found.`);
      console.error(`Available profiles: ${profileNames.join(", ")}`);
      process.exit(1);
    }
    targetName = name;
  } else {
    const choices = profileNames.map((n) => {
      const profile = config.profiles[n]!;
      const typeLabel = profile.type === "max" ? "max" : "api-key";
      const activeLabel = config.active === n ? " (active)" : "";
      return {
        name: `${n} (${typeLabel})${activeLabel}`,
        value: n,
      };
    });

    targetName = await select({
      message: "Select a profile to switch to:",
      choices,
      default: config.active ?? undefined,
    });
  }

  const profile = await getProfile(targetName);
  if (!profile) {
    console.error(`Profile '${targetName}' not found.`);
    process.exit(1);
  }

  if (options.dryRun) {
    const result = await dryRunApplyProfile(profile);
    console.log(`\nDry run for profile '${targetName}':\n`);
    console.log(`File: ${result.settingsPath}`);
    console.log(`  apiKeyHelper: ${formatApiKeyHelperForDisplay(result.oldApiKeyHelper)} → ${formatApiKeyHelperForDisplay(result.newApiKeyHelper)}`);
    if (result.changed) {
      console.log("\nNo changes made (dry run)");
    } else {
      console.log("\nNo changes needed (already set)");
    }
    return;
  }

  const result = await applyProfile(profile);
  await setActiveProfile(targetName);

  const typeLabel = profile.type === "max" ? "Max plan" : "API key";
  console.log(`Switched to profile '${targetName}' (${typeLabel})`);

  if (result.changed) {
    console.log(`Updated: ${result.settingsPath}`);
  }
}
