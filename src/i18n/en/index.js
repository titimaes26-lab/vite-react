import { base } from './base.js';
import { dining } from './dining.js';
import { management } from './management.js';
import { statsTranslations } from './stats.js';
import { feedback } from './feedback.js';
import { dialog } from './dialog.js';

// All top-level keys must be unique across the six modules.
export const en = { ...base, ...dining, ...management, ...statsTranslations, ...feedback, ...dialog };
