import { NUTRIENT_KEYS } from '@okbite/shared';
import { ro, plural } from './ro';
it('labels all eight nutrients on the review screen', () => {
 for (const key of NUTRIENT_KEYS) expect(ro.review.nutrients[key]).toMatch(/\S/);
});
// Every key R5 (B2/B3/B7) reads; keep in sync with `git grep -o "ro\.[a-zA-Z.]*" apps/mobile/src/features`.
const r5Keys = 'add.gallery add.ingredientsDone add.ingredientsHint add.ingredientsTitle add.nutritionHint add.nutritionTitle add.reading add.samePhoto add.stepOf capture.deniedText capture.deniedTitle capture.gallery capture.hint capture.openSettings capture.retry capture.shutter capture.title capture.working compare.per100 errors.duplicate errors.generic errors.invalidResponse errors.notFound errors.rateLimited errors.retry errors.upstreamFailed identify.addButton identify.checkCodeAgain identify.codeNotFound identify.confirmHint identify.confirmNo identify.confirmTitle identify.confirmYes identify.nextSteps identify.nextTitle identify.noneOfThem identify.notFoundText identify.notFoundTitle identify.pickTitle nav.close offline.retry offline.subtitle offline.title result.insufficientData result.mayContain review.allergensDetected review.allergensHint review.allergensNone review.brand review.category review.hint review.ingredients review.name review.nutritionTitle review.per100 review.quantity review.retakePhoto review.retakePhotos review.satOverFat review.save review.title review.unclearField review.unclearText review.unclearTitle review.unreadMark scan.deniedText scan.frameHint scan.manualEmpty scan.manualHint scan.manualInvalid scan.manualTitle scan.search scan.title scan.webManualOnly'.split(' ');
it.each(r5Keys)('has the R5 key ro.%s', key => {
 const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], ro);
 expect(value).toBeDefined();
});
it('words R5 errors the same as the API client', () => {
 expect(ro.errors.rateLimited).toBe(ro.errors.rate_limited);
 expect(ro.errors.invalidResponse).toBe(ro.errors.invalid_response);
});
it('exposes the agreed sections and score disclaimer', () => {
 expect(Object.keys(ro)).toEqual(['app','nav','home','capture','identify','scan','result','score','ingredients','compare','add','review','history','offline','errors','share','legal','pwa','tiers','ledger','processing','additives','profile','onboarding','settings','about','allergens']);
 expect(ro.score.disclaimer).toBe('Calculat la 100 g; nu indică riscul unei boli.');
 expect(JSON.stringify(ro)).not.toMatch(/[şţŞŢ]/);
});
it.each([[1,'1 produs'],[2,'2 produse'],[19,'19 produse'],[20,'20 de produse'],[101,'101 produse'],[120,'120 de produse']])('formats %i', (n,s) => expect(plural(n as number,'produs','produse')).toBe(s));
it('names a score without relying on color', () => expect(ro.score.ringLabel(78,'good')).toBe('78 din 100, calitate nutrițională bună'));
