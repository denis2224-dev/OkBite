import { render, screen } from '@testing-library/react-native';
import type { Ingredient } from '@okbite/shared';
import { AdditiveSheet } from './AdditiveSheet';
import { ru } from '../../copy/strings.ru';

let mockLang: 'en' | 'ru' = 'en';
jest.mock('../../copy/lang', () => ({ getLanguage: () => mockLang }));
jest.mock('../../copy/ro', () => {
  const { en } = jest.requireActual<typeof import('../../copy/strings.en')>('../../copy/strings.en');
  const { ru: ruCopy } = jest.requireActual<typeof import('../../copy/strings.ru')>('../../copy/strings.ru');
  return {
    ro: new Proxy({}, { get: (_t, prop: string) => (mockLang === 'ru' ? ruCopy : en)[prop as keyof typeof en] }),
  };
});

const additive: Ingredient = {
  slug: 'aspartam-e951', name: 'Aspartam (E951)', group: 'add', role: 'Îndulcitor', explanation: 'Îndulcitor intens.',
  source: 'https://eur-lex.europa.eu/eli/reg/2008/1333', allergen: null, risk: 'high', riskSource: 'https://www.efsa.europa.eu/x',
};

afterEach(() => { mockLang = 'en'; });

it('uses English labels and keeps the Romanian explanation with a note', async () => {
  mockLang = 'en';
  await render(<AdditiveSheet productId="p1" ingredient={additive} onClose={jest.fn()} />);
  expect(screen.getByText('High risk')).toBeTruthy();
  expect(screen.getByText('Îndulcitor')).toBeTruthy(); // E951 is already in the name
  expect(screen.getByText('Îndulcitor intens.')).toBeTruthy();
  expect(screen.getByText('The explanation is available in Romanian.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Assessment source' })).toBeTruthy();
});

it('shows the Romanian-only explanation note in Russian too', async () => {
  mockLang = 'ru';
  await render(<AdditiveSheet productId="p1" ingredient={additive} onClose={jest.fn()} />);
  expect(screen.getByText(ru.additives.high)).toBeTruthy();
  expect(screen.getByText(ru.additives.romanianOnly)).toBeTruthy();
});
