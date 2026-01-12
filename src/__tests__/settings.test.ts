import { test, expect, describe, afterEach } from "bun:test";
import {
  detectShell,
  generateEnvCommands,
  formatProfileForDisplay,
  generateDryRunOutput,
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

  test("handles api keys with special characters", () => {
    const profile: Profile = { type: "api-key", key: "sk-ant-abc'def" };
    const result = generateEnvCommands(profile, "posix");
    expect(result).toContain("sk-ant-abc'def");
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
    // First 10 chars + "..." + last 6 chars
    expect(result).toBe("sk-ant-api...123456");
    expect(result.length).toBeLessThan(profile.key.length);
  });
});

describe("generateDryRunOutput", () => {
  test("shows what would be set for api-key profile (posix)", () => {
    const profile: Profile = { type: "api-key", key: "sk-ant-short" };
    const result = generateDryRunOutput(profile, "posix");
    expect(result).toContain("bash/zsh");
    expect(result).toContain("ANTHROPIC_API_KEY");
  });

  test("shows what would be set for api-key profile (fish)", () => {
    const profile: Profile = { type: "api-key", key: "sk-ant-short" };
    const result = generateDryRunOutput(profile, "fish");
    expect(result).toContain("fish");
    expect(result).toContain("ANTHROPIC_API_KEY");
  });

  test("shows unset message for max profile", () => {
    const profile: Profile = { type: "max" };
    const result = generateDryRunOutput(profile, "posix");
    expect(result).toContain("unset");
    expect(result).toContain("OAuth");
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
    // zsh uses same syntax as bash for export/unset
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

    test("detects fish with any version string", () => {
      process.env.FISH_VERSION = "3.1.2-beta";
      expect(detectShell()).toBe("fish");
    });

    test("falls back to posix when FISH_VERSION is empty", () => {
      process.env.FISH_VERSION = "";
      expect(detectShell()).toBe("posix");
    });
  });
});
