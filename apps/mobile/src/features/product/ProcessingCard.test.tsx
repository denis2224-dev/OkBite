import { render, screen } from '@testing-library/react-native';
import { ProcessingLevel } from './ProcessingCard';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

const withLevel = (level: 1 | 2 | 3 | 4 | null) =>
  ({ ...foundYogurt.product, processing: level ? { level, source: 'Open Food Facts' } : null }) as typeof foundYogurt.product;

it.each([1, 2, 3, 4] as const)('shows level %i with its text', async (level) => {
  await render(<ProcessingLevel product={withLevel(level)} />);
  expect(screen.getByText(`${level} · ${ro.processing[level]}`)).toBeTruthy();
  expect(screen.getByText(ro.processing[`level${level}` as const])).toBeTruthy();
  expect(screen.queryByText(ro.processing.unknown)).toBeNull();
});

it('says the level is unknown when there is none', async () => {
  await render(<ProcessingLevel product={withLevel(null)} />);
  expect(screen.getByText(ro.processing.unknown)).toBeTruthy();
});
