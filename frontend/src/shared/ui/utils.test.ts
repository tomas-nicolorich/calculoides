import { expect, test } from 'vitest';
import { cn } from '../lib/utils';

test('cn utility combines classes correctly', () => {
  expect(cn('a', 'b')).toBe('a b');
  expect(cn('a', { b: true, c: false })).toBe('a b');
  expect(cn('px-2', 'px-4')).toBe('px-4'); // tailwind-merge in action
});
