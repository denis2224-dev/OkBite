export class MissingPhotoError extends Error {
  constructor() { super('Queued photo is missing'); this.name = 'MissingPhotoError'; }
}
