import { defaultLensId, lenses, lensList } from './lenses/index.js';

export { defaultLensId, lenses, lensList };
export const defaultConfig = structuredClone(lenses[defaultLensId].config);
