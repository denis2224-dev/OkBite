import { en } from '../../copy/strings.en';
import { roStrings } from '../../copy/strings.ro';
import { ru } from '../../copy/strings.ru';
import { foundYogurt } from '../../test/fixtures';

test.each([['ro', roStrings], ['en', en], ['ru', ru]] as const)(
  'formats declared allergens, traces and missing evidence in %s',
  (language, copy) => {
    jest.isolateModules(() => {
      jest.doMock('../../copy/lang', () => ({ getLanguage: () => language }));
      const { declaredAllergenText, formatAllergenNames } =
        jest.requireActual<typeof import('../product/allergenLabel')>('../product/allergenLabel');

      expect(declaredAllergenText({ ...foundYogurt.product, allergens: ['Lapte'] })).toBe(copy.allergens.Lapte);
      expect(formatAllergenNames(['Soia', 'Arahide'])).toBe(`${copy.allergens.Soia}, ${copy.allergens.Arahide}`);
      expect(declaredAllergenText({ ...foundYogurt.product, allergens: [], ingredientsText: '' }))
        .toBe(copy.result.allergenDataUnknown);
    });
    jest.dontMock('../../copy/lang');
  },
);
