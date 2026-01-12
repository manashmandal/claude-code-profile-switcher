import { listProfiles } from "../config";

export async function listProfilesCommand(): Promise<void> {
  const profiles = await listProfiles();

  if (profiles.length === 0) {
    console.log("No profiles configured. Run 'claude-profile add' to create one.");
    return;
  }

  console.log("\nProfiles:\n");

  for (const { name, profile, active } of profiles) {
    const typeLabel = profile.type === "max" ? "max" : "api-key";
    const activeMarker = active ? " *" : "";
    console.log(`  ${name} (${typeLabel})${activeMarker}`);
  }

  console.log("\n* = active profile");
}
