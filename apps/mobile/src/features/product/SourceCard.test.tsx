import { render, screen } from '@testing-library/react-native';
import { SourceCard, roDate } from './SourceCard';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
it('formats contract dates in Romanian order without timezone conversion', async () => {
  expect(roDate('2026-11-05')).toBe('05.11.2026');
  await render(<SourceCard product={{ ...foundYogurt.product, addedAt: '2026-11-05', verifiedAt: '2026-11-06' }} />);
  expect(screen.getByText(`${ro.result.added}: 05.11.2026`)).toBeTruthy();
  expect(screen.getByText(`${ro.result.checked}: 06.11.2026`)).toBeTruthy();
});
it('preserves the unverified text when no verification date is known', async () => {
  await render(<SourceCard product={{ ...foundYogurt.product, verifiedAt: null }} />);
  expect(screen.getByText(ro.result.unverified)).toBeTruthy();
  expect(screen.queryByText(new RegExp(ro.result.checked))).toBeNull();
});
it.each([
  ['Open Food Facts import', 'Open Food Facts (ODbL)', () => ro.result.imported],
  ['shopper photos', 'Fotografiile utilizatorului', () => ro.result.added],
])('labels the added date for %s', async (_, source, label) => {
  await render(<SourceCard product={{ ...foundYogurt.product, source, addedAt: '2026-11-12', status: 'unverified', verifiedAt: null }} />);
  expect(screen.getByText(`${label()}: 12.11.2026`)).toBeTruthy();
  const other = label() === ro.result.added ? ro.result.imported : ro.result.added;
  expect(screen.queryByText(new RegExp(`^${other}`))).toBeNull();
});
