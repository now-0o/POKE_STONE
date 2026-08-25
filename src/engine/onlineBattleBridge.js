const onlineBattleBridges = new Map();
let bridgeBypassDepth = 0;

function buildBridge(bridge) {
  if (!bridge || bridge.tryDispatch) return bridge;

  return {
    ...bridge,
    tryDispatch(command) {
      if (bridge.canAct && !bridge.canAct()) return false;

      try {
        const result = bridge.dispatch?.(command);
        if (result === false) return false;
        Promise.resolve(result).catch(() => {});
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function withOnlineBattleBridgeBypass(callback) {
  bridgeBypassDepth += 1;
  try {
    return callback();
  } finally {
    bridgeBypassDepth = Math.max(0, bridgeBypassDepth - 1);
  }
}

export function registerOnlineBattleBridge(matchId, bridge) {
  if (!matchId || !bridge) return;
  onlineBattleBridges.set(String(matchId), buildBridge(bridge));
}

export function unregisterOnlineBattleBridge(matchId) {
  if (!matchId) return;
  onlineBattleBridges.delete(String(matchId));
}

export function getOnlineBattleBridge(game) {
  if (bridgeBypassDepth > 0) return null;
  const matchId = game?._onlineMatch?.id;
  if (!matchId) return null;
  return onlineBattleBridges.get(String(matchId)) || null;
}

export function getOnlineBattleBridgeByMatchId(matchId) {
  if (bridgeBypassDepth > 0 || !matchId) return null;
  return onlineBattleBridges.get(String(matchId)) || null;
}
