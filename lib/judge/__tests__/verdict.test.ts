import { describe, it, expect } from "@jest/globals";
import { ALL_VERDICTS } from "../verdict";
import { verdictLabel, ALL_VERDICT_LABELS } from "../verdictLabel";
import { verdictStyle, ALL_VERDICT_STYLES } from "../verdictStyle";

describe("verdictLabel", () => {
  it("returns a friendly label for every verdict code", () => {
    for (const v of ALL_VERDICTS) {
      expect(verdictLabel(v)).toBeTruthy();
      expect(verdictLabel(v).length).toBeGreaterThan(0);
    }
  });

  it("uses Title Case for the labels (not the raw underscore-snake-case)", () => {
    expect(verdictLabel("wrong_answer")).toBe("Wrong Answer");
    expect(verdictLabel("time_limit_exceeded")).toBe("Time Limit Exceeded");
    expect(verdictLabel("runtime_error")).toBe("Runtime Error");
    expect(verdictLabel("compile_error")).toBe("Compile Error");
    expect(verdictLabel("output_limit_exceeded")).toBe("Output Limit Exceeded");
    expect(verdictLabel("accepted")).toBe("Accepted");
  });

  it("exposes the full label table", () => {
    expect(ALL_VERDICT_LABELS.accepted).toBe("Accepted");
    expect(ALL_VERDICT_LABELS.wrong_answer).toBe("Wrong Answer");
  });
});

describe("verdictStyle", () => {
  it("returns a complete style object for every verdict", () => {
    for (const v of ALL_VERDICTS) {
      const s = verdictStyle(v);
      expect(s.borderClass).toMatch(/border-/);
      expect(s.bgClass).toMatch(/bg-/);
      expect(s.textClass).toMatch(/text-/);
      expect(s.pillClass).toMatch(/border/);
      expect(s.iconName).toBeTruthy();
    }
  });

  it("distinguishes accepted (green) from failures (rose or amber)", () => {
    const accepted = verdictStyle("accepted");
    expect(accepted.textClass).toMatch(/emerald/);
    expect(accepted.iconName).toBe("CheckCircle2");

    const wrong = verdictStyle("wrong_answer");
    expect(wrong.textClass).toMatch(/rose/);
    expect(wrong.iconName).toBe("XCircle");
  });

  it("maps TLE/RE/CE/OLE to amber + warning icons (distinct from wrong_answer)", () => {
    const tle = verdictStyle("time_limit_exceeded");
    const re = verdictStyle("runtime_error");
    const ce = verdictStyle("compile_error");
    const ole = verdictStyle("output_limit_exceeded");
    for (const s of [tle, re, ce, ole]) {
      expect(s.textClass).toMatch(/amber/);
    }
    expect(tle.iconName).toBe("Clock");
    expect(re.iconName).toBe("AlertCircle");
    expect(ce.iconName).toBe("FileWarning");
    expect(ole.iconName).toBe("FileX");
  });

  it("exposes the full style table", () => {
    expect(ALL_VERDICT_STYLES.accepted.iconName).toBe("CheckCircle2");
  });
});
