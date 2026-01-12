# claude-profile-switcher

CLI tool to switch Claude Code authentication profiles. Manage multiple Claude Code authentication methods (Max plan OAuth vs API keys) and switch between them.

## Installation

### Homebrew (macOS/Linux)

```bash
brew tap manashmandal/tap
brew install claude-profile
```

### From source

```bash
git clone https://github.com/manashmandal/claude-code-profile-switcher.git
cd claude-code-profile-switcher
bun install
bun link
```

## Usage

### Add profiles

```bash
# Interactive
claude-profile add

# Non-interactive
claude-profile add work --api-key sk-ant-...
claude-profile add personal --max
```

### Switch profiles

```bash
# Switch and apply to current shell
eval $(claude-profile work)

# Interactive selection
eval $(claude-profile)

# Dry run (see what would happen)
claude-profile work --dry-run
```

### Other commands

```bash
claude-profile list      # List all profiles
claude-profile current   # Show active profile
claude-profile remove <name>  # Remove a profile
```

## How it works

This tool manages authentication by setting the `ANTHROPIC_API_KEY` environment variable:

- **API key profiles**: Sets `export ANTHROPIC_API_KEY='sk-ant-...'`
- **Max plan profiles**: Unsets the variable with `unset ANTHROPIC_API_KEY` (uses OAuth)

Profile configurations are stored in `~/.claude-profiles.json`. The tool **never** modifies `~/.claude/settings.json`.

## Shell integration (optional)

Add to your `~/.zshrc` or `~/.bashrc`:

```bash
# Switch Claude profile
cps() {
  eval $(claude-profile "$@")
}
```

Then use: `cps work` or `cps personal`

## License

MIT
