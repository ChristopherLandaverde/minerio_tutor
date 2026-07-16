import { describe, it, expect } from 'vitest';
import { findThinPools } from '../src/lib/content-audit';
import { getAvailableLevels } from '../src/lib/adaptive';

// Snapshots today's "thin pool" topics per level (see TODOS.md — thin pools
// mean assembleLesson's seen/unseen rotation runs out of unseen material
// within two sessions). This does NOT block on existing content debt: it
// only fails when the set changes, so a new gap (or a topic getting enough
// content to no longer qualify) shows up as a deliberate `vitest -u` review
// instead of silently drifting unnoticed.
describe('content pool coverage (regression guard)', () => {
  for (const level of getAvailableLevels()) {
    it(`${level} pool gaps match the known baseline`, () => {
      expect(findThinPools(level)).toMatchSnapshot();
    });
  }
});
