import { convergenceLens } from './convergence.js';
import { ideaSpreadLens } from './idea-spread.js';

export const lensList = [convergenceLens, ideaSpreadLens];
export const lenses = Object.fromEntries(lensList.map(lens => [lens.id, lens]));
export const defaultLensId = 'convergence';
