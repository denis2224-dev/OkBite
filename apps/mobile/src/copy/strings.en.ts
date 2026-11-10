import type { RedesignCopy } from './strings.ro';
// N2 additions only; the full English catalog and language switch belong to N17.
export const redesignEn: RedesignCopy = {
 nav: {scan:'Scan', about:'About', history:'History', profile:'Profile', settings:'Settings'},
 tiers: {excellent:'Excellent', good:'Good', fair:'Fair', poor:'Poor', bad:'Bad', why:'Why?', nutriScore:'Nutri-Score'},
 ledger: {
  sugar:'Sugars', sat:'Saturated fat', salt:'Salt', kcal:'Energy', nutrition_other:'Other nutrition',
  additive:'Additive', processing:'Processing', cap:'High-risk additive cap', points:(n:number)=>`−${n} points`,
 },
 processing: {
  title:'Processing level', 1:'Unprocessed or minimally processed', 2:'Processed culinary ingredients',
  3:'Processed', 4:'Ultra-processed', unknown:'Processing level unknown',
  level1:'Unprocessed foods or foods with minimal processing.', level2:'Culinary ingredients obtained from foods.',
  level3:'Foods processed by combining foods with culinary ingredients.',
  level4:'Industrial formulations with ingredients and processes specific to ultra-processing.',
 },
 additives: {
  title:'Additives', low:'Low risk', moderate:'Moderate risk', high:'High risk', notAssessed:'Not assessed',
  source:'Assessment source', explanationSource:'Explanation source', role:'Role', romanianOnly:'The explanation is available in Romanian.',
  open:(name:string)=>`View details about ${name}`, empty:'We have no additive information for this product.',
 },
 profile: {
  title:'Profile', goalTitle:'What matters to you?', allergensTitle:'Allergens to watch for', avoidTitle:'Foods and ingredients to avoid',
  health:'More balanced food choices', allergies:'Food allergies', family:'Choices for the family',
  weight:'Weight management', other:'Another goal', added_sugar:'Added sugar', sweeteners:'Sweeteners',
  ultra_processed:'Ultra-processed foods', colourings:'Colourings', palm_oil:'Palm oil',
  flagNote:'We flag these when you scan a product.', savedLocally:'Saved only on this phone',
  pending:'Your profile will be available once local preferences are connected.',
 },
 onboarding: {
  goalTitle:'What matters to you?', allergensTitle:'Which allergens do you want to watch for?', avoidTitle:'What do you want to avoid?',
  skip:'Skip', continue:'Continue', done:'Done, let’s start', flagNote:'We flag these when you scan a product.',
  savedLocally:'Your preferences are saved only on this phone.', step:(n:number)=>`Step ${n} of 3`,
 },
 settings: {
  title:'Settings', language:'Language', romanian:'Română', english:'English', theme:'Theme', system:'Use device setting',
  light:'Light', dark:'Dark', install:'Install the app', clearHistory:'Clear history',
  clearHistoryTitle:'Clear all history?', clearHistoryBody:'This clears history on this phone. Pending searches and published contributions remain.',
  clearHistoryConfirm:'Yes, clear history', cancel:'Cancel', privacy:'Privacy', terms:'Terms of use',
  method:'How we calculate the score', version:'Version', resetOnboarding:'Restart profile setup',
  pending:'More settings will be available once they are connected.',
 },
 about: {
  title:'About OkBite', whatTitle:'Understand the label',
  whatBody:'Scan a product to see nutrition information, allergens and ingredient explanations, with their sources.',
  methodTitle:'How the score works',
  methodBody:'The score uses the available product information. Missing data is never estimated. See the calculation method for the rules applied.',
  tiersTitle:'Five tiers, explained', tiersBody:'Excellent, good, fair, poor and bad. The score does not tell you whether a product is safe for someone with allergies.',
  nutriScoreTitle:'The Nutri-Score letter', nutriScoreBody:'The A to E scale describes nutritional quality. We draw our own representation without the official logo.',
  sourcesTitle:'Our sources', sourcesBody:'Product packaging, Open Food Facts and reviewed explanations, each with its source shown.',
  promiseTitle:'Simple access', promiseBody:'Free, with no ads or advertising tracking. No account needed.',
 },
 scan: {aimHint:'Keep the barcode inside the frame', flashOn:'Turn flash on', flashOff:'Turn flash off', manualCode:'Manual code', photoLabel:'Photograph the label', loadingReader:'Preparing the reader…'},
 result: {
  profileAllergens:'Allergens in your profile', profileMayContain:'May contain allergens in your profile',
  profileAvoid:'Ingredients you want to avoid', profileUnknown:'We cannot check all your preferences.',
  nutriScoreLabel:'Nutri-Score letter', closeSheet:'Close product analysis',
 },
 history: {
  search:'Search by name or brand', noMatches:'No products found.', remove:(name:string)=>`Delete ${name} from history`,
  removed:'Product removed from history.', undo:'Undo deletion', removeError:'Could not remove the product. Try again.',
  scoreUnavailable:'Score unavailable',
 },
 allergens: {
  Gluten:'Gluten', Crustacee:'Crustaceans', Ouă:'Eggs', Pește:'Fish', Arahide:'Peanuts', Soia:'Soybeans', Lapte:'Milk',
  'Fructe cu coajă lemnoasă':'Nuts', Țelină:'Celery', Muștar:'Mustard', Susan:'Sesame',
  'Dioxid de sulf și sulfiți':'Sulphur dioxide and sulphites', Lupin:'Lupin', Moluște:'Molluscs',
 },
};
