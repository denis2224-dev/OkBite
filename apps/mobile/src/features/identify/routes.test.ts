import { clearIdentifyDraft } from '../add/draftStore';
import { identifyCandidates } from '../capture/__fixtures__/responses';
import { addProductRoute, identifyPhotoRoute, parseAddParams, parseIdentifyParams } from './routes';

jest.mock('expo-crypto', () => ({ randomUUID: () => 'transient-id' }));

afterEach(() => { clearIdentifyDraft('transient-id'); clearIdentifyDraft('unknown-draft'); });

it('keeps generic identify responses out of route params and resolves their transient id', () => {
  const route = identifyPhotoRoute(identifyCandidates, 'front-photo');
  expect(route.params).toEqual({ source: 'photo', frontPhotoId: 'front-photo', identifyDraftId: 'transient-id' });
  expect(parseIdentifyParams(route.params)).toEqual({ kind: 'confirm', candidate: identifyCandidates.candidates[0], read: identifyCandidates.read, photoPath: identifyCandidates.photoPath });
});

it('stores guided identify responses by their durable unknown draft id', () => {
  const route = identifyPhotoRoute(identifyCandidates, 'front-photo', 'unknown-draft');
  expect(route.params).toEqual({ source: 'photo', frontPhotoId: 'front-photo', unknownDraftId: 'unknown-draft' });
  expect(parseIdentifyParams(route.params)).toEqual({ kind: 'confirm', candidate: identifyCandidates.candidates[0], read: identifyCandidates.read, photoPath: identifyCandidates.photoPath });
});

it('infers water flag and carbonation in addProductRoute even when backend read omits isWater', () => {
  const route = addProductRoute({
    read: { brand: 'DAVIDAN', name: 'Apă potabilă Carbogazificată', quantity: '0,5L', code: null },
    photoPath: 'dev/front.jpg',
    flow: 'guided',
  });
  expect(route.params).toMatchObject({ isWater: '1', carbonation: 'sparkling' });
  expect(parseAddParams(route.params)).toMatchObject({
    isWater: true,
    categorySlug: 'apa',
    carbonation: 'sparkling',
  });
});
