import { confirm } from "@inquirer/prompts";
import { removeProfile, getProfile } from "../config";

export async function removeProfileCommand(name: string): Promise<void> {
  const profile = await getProfile(name);

  if (!profile) {
    console.log(`Profile '${name}' not found.`);
    process.exit(1);
  }

  const confirmed = await confirm({
    message: `Remove profile '${name}'?`,
    default: false,
  });

  if (!confirmed) {
    console.log("Cancelled.");
    return;
  }

  await removeProfile(name);
  console.log(`Removed profile '${name}'.`);
}
