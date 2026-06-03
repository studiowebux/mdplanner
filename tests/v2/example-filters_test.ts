/**
 * Guards that domain filter dropdowns populate against the committed example
 * data. The factory renders a filter's options from
 * `extractFilterOptions(items)[filter.name]`, falling back to the static
 * `filter.options`. A filter declared with `options: []` whose key is never
 * returned by `extractFilterOptions` is permanently empty regardless of data.
 *
 * An audit (2026-06-02, task i4mz) confirmed every empty-`options` filter has a
 * matching `extractFilterOptions` key, so empty filters are a thin-data issue,
 * not a wiring bug. This test locks that in for the data-rich demo domains —
 * including the owner-cited milestone case — across all three derivation
 * styles (portfolio-derived, item-derived, service-derived).
 */

import { assert } from "@std/assert";
import { initServices } from "../../src/singletons/services.ts";
import { milestoneConfig } from "../../src/domains/milestone/config.tsx";
import { taskConfig } from "../../src/domains/task/config.tsx";
import { riskConfig } from "../../src/domains/risk/config.tsx";
import { vacationConfig } from "../../src/domains/vacation/config.tsx";
import { peopleConfig } from "../../src/domains/people/config.tsx";
import { dealConfig } from "../../src/domains/deal/config.tsx";
import { leanCanvasConfig } from "../../src/domains/lean-canvas/config.tsx";
import { businessModelConfig } from "../../src/domains/business-model/config.tsx";
import { eisenhowerConfig } from "../../src/domains/eisenhower/config.tsx";
import { safeConfig } from "../../src/domains/safe/config.tsx";
import { meetingConfig } from "../../src/domains/meeting/config.tsx";
import { projectValueBoardConfig } from "../../src/domains/project-value-board/config.tsx";
import { fishboneConfig } from "../../src/domains/fishbone/config.tsx";
import { habitConfig } from "../../src/domains/habit/config.tsx";
// deno-lint-ignore no-explicit-any
type AnyConfig = any;

const EXAMPLE_DIR = new URL("../../example", import.meta.url).pathname;

const CONFIGS: { name: string; cfg: AnyConfig }[] = [
  { name: "milestone", cfg: milestoneConfig },
  { name: "task", cfg: taskConfig },
  { name: "risk", cfg: riskConfig },
  { name: "vacation", cfg: vacationConfig },
  { name: "people", cfg: peopleConfig },
  { name: "deal", cfg: dealConfig },
  { name: "lean-canvas", cfg: leanCanvasConfig },
  { name: "business-model", cfg: businessModelConfig },
  { name: "eisenhower", cfg: eisenhowerConfig },
  { name: "safe", cfg: safeConfig },
  { name: "meeting", cfg: meetingConfig },
  { name: "project-value-board", cfg: projectValueBoardConfig },
  { name: "fishbone", cfg: fishboneConfig },
  { name: "habit", cfg: habitConfig },
];

Deno.test("example filters — data-derived options populate for demo domains", async () => {
  initServices(EXAMPLE_DIR, { cache: false });

  for (const { name, cfg } of CONFIGS) {
    const emptyOptionFilters = (cfg.filters ?? []).filter(
      (f: AnyConfig) => Array.isArray(f.options) && f.options.length === 0,
    );
    assert(
      emptyOptionFilters.length > 0,
      `${name}: expected at least one dynamic (empty-options) filter`,
    );

    const items = await cfg.getService().list();
    assert(
      items.length >= 2,
      `${name}: needs >= 2 example records to exercise filters, got ${items.length}`,
    );

    const opts = (await cfg.extractFilterOptions?.(items)) ?? {};

    for (const f of emptyOptionFilters) {
      const produced = opts[f.name];
      assert(
        Array.isArray(produced),
        `${name}: extractFilterOptions returns no key for filter "${f.name}" — dropdown would be permanently empty`,
      );
      assert(
        produced.length > 0,
        `${name}: filter "${f.name}" produced 0 options from example data (thin data or broken derivation)`,
      );
    }
  }
});
