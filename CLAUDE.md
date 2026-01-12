# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLI tool to switch Claude Code authentication profiles. Allows users to manage multiple Claude Code authentication methods (Max plan OAuth vs API keys) and switch between them using environment variables.

## Commands

```bash
bun install          # Install dependencies
bun src/index.ts     # Run CLI directly
bun test             # Run tests
bun run lint         # Run ESLint
bun run typecheck    # Run TypeScript type checking
```

## Usage

```bash
# Switch profile (outputs export command)
eval $(claude-profile myprofile)

# Add profiles
claude-profile add work --api-key sk-ant-...
claude-profile add personal --max

# List/manage
claude-profile list
claude-profile current
claude-profile remove <name>
```

## Architecture

CLI application using Commander.js for argument parsing and Inquirer for interactive prompts.

**Key files:**
- `src/index.ts` - CLI entry point, defines commands via Commander
- `src/config.ts` - Profile storage (`~/.claude-profiles.json`) - CRUD operations for profiles
- `src/settings.ts` - Generates env var commands (does NOT modify any files)
- `src/commands/*.ts` - Individual command implementations

**Profile types:**
- `max` - Max plan (OAuth), outputs `unset ANTHROPIC_API_KEY`
- `api-key` - API key auth, outputs `export ANTHROPIC_API_KEY='...'`

**Design principle:** This tool NEVER modifies `~/.claude/settings.json`. It only outputs environment variable commands that the user evals. Profile metadata stored in `~/.claude-profiles.json`.

## Bun

Default to Bun instead of Node.js/npm. Use `bun <file>`, `bun install`, `bun test`. Bun auto-loads `.env` files.
