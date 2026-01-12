import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import {
  detectShell,
  generateEnvCommands,
  formatProfileForDisplay,
  formatApiKeyHelperForDisplay,
  setSettingsPath,
  resetSettingsPath,
  loadSettings,
  saveSettings,
  applyProfile,
  dryRunApplyProfile,
  getSettingsPath,
} from "../settings";
import type { Profile } from "../config";

describe("detectShell", () => {
  const originalEnv = process.env.FISH_VERSION;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.FISH_VERSION;
    } else {
      process.env.FISH_VERSION = originalEnv;
    }
  });

  test("returns 'fish' when FISH_VERSION is set", () => {
    process.env.FISH_VERSION = "3.6.0";
    expect(detectShell()).toBe("fish");
  });

  test("returns 'posix' when FISH_VERSION is not set", () => {
    delete process.env.FISH_VERSION;
    expect(detectShell()).toBe("posix");
  });
});

describe("generateEnvCommands", () => {
  const apiKeyProfile: Profile = { type: "api-key", key: "sk-ant-test123" };
  const maxProfile: Profile = { type: "max" };

  describe("posix shell (bash/zsh)", () => {
    test("generates export command for api-key profile", () => {
      const result = generateEnvCommands(apiKeyProfile, "posix");
      expect(result).toBe("export ANTHROPIC_API_KEY='sk-ant-test123'");
    });

    test("generates unset command for max profile", () => {
      const result = generateEnvCommands(maxProfile, "posix");
      expect(result).toBe("unset ANTHROPIC_API_KEY");
    });
  });

  describe("fish shell", () => {
    test("generates set -gx command for api-key profile", () => {
      const result = generateEnvCommands(apiKeyProfile, "fish");
      expect(result).toBe("set -gx ANTHROPIC_API_KEY 'sk-ant-test123'");
    });

    test("generates set -e command for max profile", () => {
      const result = generateEnvCommands(maxProfile, "fish");
      expect(result).toBe("set -e ANTHROPIC_API_KEY");
    });
  });
});

describe("formatProfileForDisplay", () => {
  test("returns placeholder for max profile", () => {
    const profile: Profile = { type: "max" };
    expect(formatProfileForDisplay(profile)).toBe("(Max plan / OAuth)");
  });

  test("returns full key for short api keys", () => {
    const profile: Profile = { type: "api-key", key: "sk-ant-short" };
    expect(formatProfileForDisplay(profile)).toBe("sk-ant-short");
  });

  test("masks long api keys", () => {
    const profile: Profile = {
      type: "api-key",
      key: "sk-ant-api03-verylongapikeythatshouldbemaksed123456",
    };
    const result = formatProfileForDisplay(profile);
    expect(result).toBe("sk-ant-api...123456");
    expect(result.length).toBeLessThan(profile.key.length);
  });
});

describe("formatApiKeyHelperForDisplay", () => {
  test("returns OAuth message when not set", () => {
    expect(formatApiKeyHelperForDisplay(undefined)).toBe("(not set - using OAuth)");
  });

  test("returns full helper for short keys", () => {
    const helper = "echo 'sk-ant-short'";
    expect(formatApiKeyHelperForDisplay(helper)).toBe(helper);
  });

  test("masks long keys in helper", () => {
    const helper = "echo 'sk-ant-api03-verylongapikeythatshouldbemaksed123456'";
    const result = formatApiKeyHelperForDisplay(helper);
    expect(result).toBe("echo 'sk-ant-api...123456'");
  });

  test("truncates unknown format helpers", () => {
    const helper = "some-custom-command --with-very-long-arguments-that-should-be-truncated";
    const result = formatApiKeyHelperForDisplay(helper);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(40);
  });
});

describe("settings.json operations (mocked)", () => {
  let tempDir: string;
  let tempSettingsPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "claude-settings-test-"));
    tempSettingsPath = join(tempDir, "settings.json");
    setSettingsPath(tempSettingsPath);
  });

  afterEach(async () => {
    resetSettingsPath();
    await rm(tempDir, { recursive: true, force: true });
  });

  test("setSettingsPath changes the path", () => {
    expect(getSettingsPath()).toBe(tempSettingsPath);
  });

  test("loadSettings returns empty object when file doesn't exist", async () => {
    const settings = await loadSettings();
    expect(settings).toEqual({});
  });

  test("saveSettings creates file with correct content", async () => {
    const settings = { apiKeyHelper: "echo 'test'", otherField: "value" };
    await saveSettings(settings);

    const file = Bun.file(tempSettingsPath);
    const content = await file.text();
    const parsed = JSON.parse(content);

    expect(parsed.apiKeyHelper).toBe("echo 'test'");
    expect(parsed.otherField).toBe("value");
  });

  test("loadSettings reads saved settings", async () => {
    const original = { apiKeyHelper: "echo 'mykey'", customSetting: true };
    await saveSettings(original);

    const loaded = await loadSettings();
    expect(loaded.apiKeyHelper).toBe("echo 'mykey'");
    expect(loaded.customSetting).toBe(true);
  });

  describe("applyProfile", () => {
    test("sets apiKeyHelper for api-key profile", async () => {
      const profile: Profile = { type: "api-key", key: "sk-ant-test123" };
      const result = await applyProfile(profile);

      expect(result.changed).toBe(true);
      expect(result.newApiKeyHelper).toBe("echo 'sk-ant-test123'");

      const settings = await loadSettings();
      expect(settings.apiKeyHelper).toBe("echo 'sk-ant-test123'");
    });

    test("removes apiKeyHelper for max profile", async () => {
      // First set an API key
      await saveSettings({ apiKeyHelper: "echo 'old-key'" });

      const profile: Profile = { type: "max" };
      const result = await applyProfile(profile);

      expect(result.changed).toBe(true);
      expect(result.oldApiKeyHelper).toBe("echo 'old-key'");
      expect(result.newApiKeyHelper).toBeUndefined();

      const settings = await loadSettings();
      expect(settings.apiKeyHelper).toBeUndefined();
    });

    test("preserves other settings when applying profile", async () => {
      await saveSettings({
        apiKeyHelper: "echo 'old'",
        customSetting: "preserved",
        anotherField: 123,
      });

      const profile: Profile = { type: "api-key", key: "sk-ant-new" };
      await applyProfile(profile);

      const settings = await loadSettings();
      expect(settings.apiKeyHelper).toBe("echo 'sk-ant-new'");
      expect(settings.customSetting).toBe("preserved");
      expect(settings.anotherField).toBe(123);
    });

    test("reports no change when already set to same value", async () => {
      await saveSettings({ apiKeyHelper: "echo 'sk-ant-same'" });

      const profile: Profile = { type: "api-key", key: "sk-ant-same" };
      const result = await applyProfile(profile);

      expect(result.changed).toBe(false);
    });

    test("reports no change when max profile and no apiKeyHelper", async () => {
      await saveSettings({ otherSetting: true });

      const profile: Profile = { type: "max" };
      const result = await applyProfile(profile);

      expect(result.changed).toBe(false);
    });
  });

  describe("dryRunApplyProfile", () => {
    test("does not modify file", async () => {
      await saveSettings({ apiKeyHelper: "echo 'original'" });

      const profile: Profile = { type: "api-key", key: "sk-ant-new" };
      const result = await dryRunApplyProfile(profile);

      expect(result.changed).toBe(true);
      expect(result.oldApiKeyHelper).toBe("echo 'original'");
      expect(result.newApiKeyHelper).toBe("echo 'sk-ant-new'");

      // File should still have original value
      const settings = await loadSettings();
      expect(settings.apiKeyHelper).toBe("echo 'original'");
    });

    test("correctly predicts removal for max profile", async () => {
      await saveSettings({ apiKeyHelper: "echo 'will-be-removed'" });

      const profile: Profile = { type: "max" };
      const result = await dryRunApplyProfile(profile);

      expect(result.changed).toBe(true);
      expect(result.newApiKeyHelper).toBeUndefined();

      // File should still have the value
      const settings = await loadSettings();
      expect(settings.apiKeyHelper).toBe("echo 'will-be-removed'");
    });
  });
});

describe("shell compatibility", () => {
  const apiKeyProfile: Profile = { type: "api-key", key: "sk-ant-test-key-12345" };
  const maxProfile: Profile = { type: "max" };

  describe("bash compatibility", () => {
    test("export command is valid bash syntax", () => {
      const cmd = generateEnvCommands(apiKeyProfile, "posix");
      expect(cmd).toMatch(/^export [A-Z_]+='.+'$/);
    });

    test("unset command is valid bash syntax", () => {
      const cmd = generateEnvCommands(maxProfile, "posix");
      expect(cmd).toMatch(/^unset [A-Z_]+$/);
    });
  });

  describe("zsh compatibility", () => {
    test("export command is valid zsh syntax", () => {
      const cmd = generateEnvCommands(apiKeyProfile, "posix");
      expect(cmd).toMatch(/^export [A-Z_]+='.+'$/);
    });

    test("unset command is valid zsh syntax", () => {
      const cmd = generateEnvCommands(maxProfile, "posix");
      expect(cmd).toMatch(/^unset [A-Z_]+$/);
    });
  });

  describe("fish compatibility", () => {
    test("set -gx command is valid fish syntax", () => {
      const cmd = generateEnvCommands(apiKeyProfile, "fish");
      expect(cmd).toMatch(/^set -gx [A-Z_]+ '.+'$/);
    });

    test("set -e command is valid fish syntax", () => {
      const cmd = generateEnvCommands(maxProfile, "fish");
      expect(cmd).toMatch(/^set -e [A-Z_]+$/);
    });
  });

  describe("auto-detection with different FISH_VERSION values", () => {
    const originalEnv = process.env.FISH_VERSION;

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.FISH_VERSION;
      } else {
        process.env.FISH_VERSION = originalEnv;
      }
    });

    test("detects fish 3.x", () => {
      process.env.FISH_VERSION = "3.6.0";
      expect(detectShell()).toBe("fish");
    });

    test("detects fish 4.x", () => {
      process.env.FISH_VERSION = "4.0.0";
      expect(detectShell()).toBe("fish");
    });

    test("falls back to posix when FISH_VERSION is empty", () => {
      process.env.FISH_VERSION = "";
      expect(detectShell()).toBe("posix");
    });
  });
});
