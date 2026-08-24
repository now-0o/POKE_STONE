import * as rules from "./ai.rules.js";
import { getOnlineBattleBridge } from "./onlineBattleBridge.js";

export * from "./ai.rules.js";

export function aiStep(game, ...args) {
  if (getOnlineBattleBridge(game)) return false;
  return rules.aiStep(game, ...args);
}
