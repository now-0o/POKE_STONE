import { PATCH_NOTES } from "../../patchNotes.js";
import { PATCH_NOTE_V27 } from "./v27.js";
import { PATCH_NOTE_V28 } from "./v28.js";
import { PATCH_NOTE_V30 } from "./v30.js";
import { PATCH_NOTE_V31 } from "./v31.js";
import { PATCH_NOTE_V32 } from "./v32.js";

export const ALL_PATCH_NOTES = [
  PATCH_NOTE_V32,
  PATCH_NOTE_V31,
  PATCH_NOTE_V30,
  PATCH_NOTE_V28,
  PATCH_NOTE_V27,
  ...PATCH_NOTES,
];
