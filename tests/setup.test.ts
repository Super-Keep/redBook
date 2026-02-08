import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('项目初始化验证', () => {
  it('Vitest 运行正常', () => {
    expect(1 + 1).toBe(2);
  });

  it('fast-check 集成正常', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
      { numRuns: 100 }
    );
  });
});
