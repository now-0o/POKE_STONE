const onlineBattleBridges = new Map();

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

export function registerOnlineBattleBridge(matchId, bridge) {
  if (!matchId || !bridge) return;
  onlineBattleBridges.set(String(matchId), buildBridge(bridge));
}

export function unregisterOnlineBattleBridge(matchId) {
  if (!matchId) return;
  onlineBattleBridges.delete(String(matchId));
}

export function getOnlineBattleBridge(game) {
  const matchId = game?._onlineMatch?.id;
  if (!matchId) return null;
  return onlineBattleBridges.get(String(matchId)) || null;
}

export function getOnlineBattleBridgeByMatchId(matchId) {
  if (!matchId) return null;
  return onlineBattleBridges.get(String(matchId)) || null;
}
