import { savedWhen } from './when';

// Local times, so the test does not depend on the machine's time zone.
const now = new Date(2026, 10, 17, 20, 0); // Tuesday 17 Nov 2026, 20:00
const at = (d: number, h: number, m: number) => new Date(2026, 10, d, h, m).toISOString();

it('says "Azi" with the time for today', () => {
  expect(savedWhen(at(17, 18, 40), now)).toBe('Azi, 18:40');
  expect(savedWhen(at(17, 9, 5), now)).toBe('Azi, 09:05');
});
it('says "Ieri" for yesterday', () => {
  expect(savedWhen(at(16, 23, 59), now)).toBe('Ieri');
});
it('names the weekday within the last week, capitalised', () => {
  expect(savedWhen(at(16 - 1, 12, 0), now)).toBe('Duminică');
  expect(savedWhen(at(11, 12, 0), now)).toBe('Miercuri');
});
it('shows the date with dots for anything older', () => {
  expect(savedWhen(at(10, 12, 0), now)).toBe('10.11.2026');
  expect(savedWhen(new Date(2025, 0, 3, 8, 0).toISOString(), now)).toBe('03.01.2025');
});
