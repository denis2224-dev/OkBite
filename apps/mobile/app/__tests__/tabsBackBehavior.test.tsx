import { tabBackBehavior } from '../(tabs)/_layout';

it('goes back to the tab or page visited just before, not to the first tab', () => {
  expect(tabBackBehavior).toBe('history');
});
