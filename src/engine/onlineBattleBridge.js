const onlineBattleBridges = new Map();

export function registerOnlineBattleBridge(matchId, bridge) {
  if (!matchId || !bridge) return;
  onlineBattleBridges.set(String(matchId), bridge);
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
