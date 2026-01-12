import { input, select } from "@inquirer/prompts";
import { loadProfiles, addProfile, profileExists, type Profile } from "../config";

export async function addProfileCommand(
  name: string | undefined,
  options: { max?: boolean; apiKey?: string }
): Promise<void> {
  const config = await loadProfiles();

  let profileName: string;
  let profile: Profile;

  if (name && (options.max || options.apiKey)) {
    profileName = name;

    if (profileExists(config, profileName)) {
      console.log(`Profile '${profileName}' already exists. Use a different name.`);
      process.exit(1);
    }

    if (options.max) {
      profile = { type: "max" };
    } else if (options.apiKey) {
      profile = { type: "api-key", key: options.apiKey };
    } else {
      console.log("Specify --max or --api-key <key>");
      process.exit(1);
    }
  } else {
    profileName = name ?? await input({
      message: "Profile name:",
      validate: (value) => {
        if (!value.trim()) return "Name cannot be empty";
        if (profileExists(config, value)) return `Profile '${value}' already exists`;
        return true;
      },
    });

    if (profileExists(config, profileName)) {
      console.log(`Profile '${profileName}' already exists. Use a different name.`);
      process.exit(1);
    }

    const profileType = await select({
      message: "Profile type:",
      choices: [
        { name: "Max plan (OAuth)", value: "max" },
        { name: "API key", value: "api-key" },
      ],
    });

    if (profileType === "max") {
      profile = { type: "max" };
    } else {
      const apiKey = await input({
        message: "API key:",
        validate: (value) => {
          if (!value.trim()) return "API key cannot be empty";
          if (!value.startsWith("sk-ant-")) return "API key should start with 'sk-ant-'";
          return true;
        },
      });
      profile = { type: "api-key", key: apiKey };
    }
  }

  await addProfile(profileName, profile);

  const typeLabel = profile.type === "max" ? "Max plan" : "API key";
  console.log(`Added profile '${profileName}' (${typeLabel})`);
}
