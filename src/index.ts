#!/usr/bin/env bun

import { Command } from "commander";
import { switchProfile } from "./commands/switch";
import { addProfileCommand } from "./commands/add";
import { listProfilesCommand } from "./commands/list";
import { removeProfileCommand } from "./commands/remove";
import { currentProfileCommand } from "./commands/current";

const program = new Command();

program
  .name("claude-profile")
  .description("Switch Claude Code authentication profiles")
  .version("1.0.0");

program
  .argument("[name]", "Profile name to switch to")
  .option("-d, --dry-run", "Show what would change without modifying files")
  .action(async (name: string | undefined, options: { dryRun?: boolean }) => {
    await switchProfile(name, options);
  });

program
  .command("add [name]")
  .description("Add a new profile")
  .option("--max", "Create a Max plan profile")
  .option("--api-key <key>", "Create an API key profile")
  .action(async (name: string | undefined, options: { max?: boolean; apiKey?: string }) => {
    await addProfileCommand(name, options);
  });

program
  .command("list")
  .description("List all profiles")
  .action(async () => {
    await listProfilesCommand();
  });

program
  .command("remove <name>")
  .description("Remove a profile")
  .action(async (name: string) => {
    await removeProfileCommand(name);
  });

program
  .command("current")
  .description("Show current active profile")
  .action(async () => {
    await currentProfileCommand();
  });

program.parse();
