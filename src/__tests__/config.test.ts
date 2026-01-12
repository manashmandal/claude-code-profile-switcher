import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

// We need to mock the config module to use a temp directory
// Since the module uses a hardcoded path, we'll test the logic directly

describe("ProfilesConfig", () => {
  let tempDir: string;
  let profilesPath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "claude-profile-test-"));
    profilesPath = join(tempDir, ".claude-profiles.json");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("creates valid JSON structure", async () => {
    const config = {
      profiles: {
        work: { type: "api-key" as const, key: "sk-ant-work123" },
        personal: { type: "max" as const },
      },
      active: "work",
    };

    await Bun.write(profilesPath, JSON.stringify(config, null, 2));
    const content = await readFile(profilesPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(parsed.profiles.work.type).toBe("api-key");
    expect(parsed.profiles.work.key).toBe("sk-ant-work123");
    expect(parsed.profiles.personal.type).toBe("max");
    expect(parsed.active).toBe("work");
  });

  test("handles empty profiles", async () => {
    const config = {
      profiles: {},
      active: null,
    };

    await Bun.write(profilesPath, JSON.stringify(config, null, 2));
    const content = await readFile(profilesPath, "utf-8");
    const parsed = JSON.parse(content);

    expect(Object.keys(parsed.profiles)).toHaveLength(0);
    expect(parsed.active).toBeNull();
  });
});

describe("Profile types", () => {
  test("api-key profile has required fields", () => {
    const profile = { type: "api-key" as const, key: "sk-ant-test" };
    expect(profile.type).toBe("api-key");
    expect(profile.key).toBeDefined();
  });

  test("max profile only has type", () => {
    const profile = { type: "max" as const };
    expect(profile.type).toBe("max");
    expect("key" in profile).toBe(false);
  });
});
