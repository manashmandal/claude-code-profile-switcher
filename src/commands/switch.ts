import { select } from "@inquirer/prompts";
import {
  loadProfiles,
  getProfile,
  setActiveProfile,
} from "../config";
import {
  generateEnvCommands,
  generateDryRunOutput,
  detectShell,
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
    console.error(`\nDry run for profile '${targetName}':\n`);
    console.error(generateDryRunOutput(profile));
    console.error("\nNo changes made (dry run)");
    return;
  }

  // Update active profile in config
  await setActiveProfile(targetName);

  // Output the env command (to stdout for eval)
  console.log(generateEnvCommands(profile));

  // Info message to stderr so it doesn't interfere with eval
  const typeLabel = profile.type === "max" ? "Max plan" : "API key";
  const shell = detectShell();
  const evalHint = shell === "fish"
    ? `eval (claude-profile ${targetName})`
    : `eval $(claude-profile ${targetName})`;

  console.error(`Switched to profile '${targetName}' (${typeLabel})`);
  console.error(`Run: ${evalHint}`);
}
