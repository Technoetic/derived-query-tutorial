import {StorageService} from './storage-service.js';
import {validateLabDraft} from '../tutorial/order-model.js';

export const LAB_DRAFT_KEY='derived-query-tutorial:lab-draft:v1';
export {validateLabDraft};

// Lab and practice have separate keys and shape validators. Explicit constructor
// overrides still work for an embedding app or an isolated test storage.
export class LabStorageService extends StorageService {
  constructor(options={}){super({...options,key:options.key??LAB_DRAFT_KEY,validate:options.validate??validateLabDraft});}
}
