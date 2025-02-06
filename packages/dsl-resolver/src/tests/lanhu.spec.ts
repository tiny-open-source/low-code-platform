import { expect } from 'vitest';
import { sum } from '../resolver/lanhu/index';

it('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3);
});
