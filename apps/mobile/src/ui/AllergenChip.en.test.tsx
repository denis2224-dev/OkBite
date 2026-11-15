import { render, screen } from '@testing-library/react-native';
import { en } from '../copy/strings.en';
import { AllergenChip } from './AllergenChip';

jest.mock('../copy/ro', () => ({ ro: jest.requireActual('../copy/strings.en').en }));

it('uses the selected language for both the name and the trace announcement', async () => {
  await render(<AllergenChip name="Lapte" tone="trace" />);
  expect(screen.getByText(en.allergens.Lapte)).toBeTruthy();
  expect(screen.getByLabelText(`${en.result.mayContain} ${en.allergens.Lapte}`)).toBeTruthy();
});
