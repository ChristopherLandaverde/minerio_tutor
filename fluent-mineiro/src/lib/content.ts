/**
 * Content index — merges exercises from all CEFR level files.
 * Split by level for maintainability:
 *   content-a2.ts  — A2 exercises (beginner)
 *   content-b1.ts  — B1 exercises (intermediate)
 *   content-b2.ts  — B2 exercises (upper intermediate)
 *
 * IDs are auto-generated per file: A2=1+, B1=1001+, B2=2001+
 * This prevents ID collisions when adding exercises to any file.
 */

import type { Exercise } from './exercises';
import { A2_EXERCISES } from './content-a2';
import { B1_EXERCISES } from './content-b1';
import { B2_EXERCISES } from './content-b2';

export const SEED_EXERCISES: Exercise[] = [
  ...A2_EXERCISES,
  ...B1_EXERCISES,
  ...B2_EXERCISES,
];
