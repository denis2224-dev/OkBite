import { it, expect } from 'vitest';
import { APP_NAME } from './index';

it('exports the app name', () => {
  expect(APP_NAME).toBe('OkBite');
});
