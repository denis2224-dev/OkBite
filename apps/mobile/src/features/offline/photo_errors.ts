import { ro } from '../../copy/ro';
export class MissingPhotoError extends Error {
  constructor() { super(ro.offline.queueError); this.name = 'MissingPhotoError'; }
}
