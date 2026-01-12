# Claude Profile Switcher Design

A CLI tool to switch Claude Code authentication between named profiles.

## Overview

Modifies `~/.claude/settings.json` to switch authentication between Max plan (OAuth) and multiple API keys. Other settings (plugins, model preferences) remain shared across profiles.

## Profile Storage

Profiles stored in `~/.claude-profiles.json`:

```json
{
  "profiles": {
    "work": { "type": "api-key", "key": "sk-ant-..." },
    "personal": { "type": "max" },
    "client-x": { "type": "api-key", "key": "sk-ant-..." }
  },
  "active": "work"
}
```

## Commands

```
claude-profile                    # Interactive menu to pick profile
claude-profile <name>             # Switch to named profile directly
claude-profile add                # Interactive wizard to add profile
claude-profile add <name> --max   # Add Max plan profile
claude-profile add <name> --api-key <key>  # Add API key profile
claude-profile list               # List all profiles (shows active)
claude-profile remove <name>      # Remove a profile
claude-profile current            # Show current active profile
```

## Flags

- `--dry-run` / `-d` - Show what would change without modifying files
- `--help` / `-h` - Show usage

## Switching Logic

- **API key profile**: Sets `apiKeyHelper: "echo '<key>'"` in settings.json
- **Max profile**: Removes `apiKeyHelper` key entirely from settings.json
- Updates `active` in profiles.json to track current profile

## Edge Cases

- Switching to already-active profile: Shows message, no changes
- Switching to non-existent profile: Error with list of valid profiles
- Adding profile with existing name: Error, suggest different name
- No profiles exist: Prompts to add one first
- `settings.json` doesn't exist: Creates it with just the auth setting

## Project Structure

```
claude-profile-switcher/
├── package.json
├── src/
│   ├── index.ts          # Entry point, CLI argument parsing
│   ├── commands/
│   │   ├── switch.ts     # Switch profile (direct + interactive)
│   │   ├── add.ts        # Add profile (wizard + one-liner)
│   │   ├── list.ts       # List profiles
│   │   ├── remove.ts     # Remove profile
│   │   └── current.ts    # Show current profile
│   ├── config.ts         # Read/write ~/.claude-profiles.json
│   └── settings.ts       # Read/write ~/.claude/settings.json
└── README.md
```

## Dependencies

- `@inquirer/prompts` - Interactive prompts and selection menu
- `commander` - CLI argument parsing

## Installation

After building, link globally with `bun link` so `claude-profile` works from anywhere.
