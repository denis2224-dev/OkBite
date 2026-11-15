import { render, screen } from '@testing-library/react-native';
import type { Profile } from '@okbite/shared';
import { ProfileAllergenAlert } from './ProfileAllergenAlert';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

let mockProfile: Profile;
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: mockProfile, hydrated: true, error: null }) }));
const profile = (extra: Partial<Profile>): Profile => ({ goals: [], allergens: [], avoid: [], onboarded: true, ...extra });

it('renders nothing when no profile allergen or avoid key matches', async () => {
  mockProfile = profile({ allergens: ['Gluten'], avoid: ['palm_oil'] });
  await render(<ProfileAllergenAlert product={foundYogurt.product} />);
  expect(screen.toJSON()).toBeNull();
});
it('flags an avoided ingredient that the label lists', async () => {
  mockProfile = profile({ avoid: ['palm_oil'] });
  await render(<ProfileAllergenAlert product={{ ...foundYogurt.product, ingredientsText: 'făină, ulei de palmier, sare' }} />);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText(ro.result.profileAvoid)).toBeTruthy();
  expect(screen.getByText(ro.profile.palm_oil)).toBeTruthy();
});
it('says it cannot check an avoid key the data cannot answer instead of guessing', async () => {
  mockProfile = profile({ avoid: ['ultra_processed'] });
  await render(<ProfileAllergenAlert product={{ ...foundYogurt.product, processing: null }} />);
  expect(screen.getByText(ro.result.profileUnknown)).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText(ro.result.profileAvoid)).toBeNull();
});
