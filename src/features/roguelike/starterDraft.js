import { CARD_MAP } from "../../data/cards.js";

const STARTER_DECK_SIZE = 24;
const EVOLUTION_LINE_COUNT = 4;
const STANDALONE_COUNT = 4;
const SUPPORT_COUNT = 8;

const SUPPORT_POOL = [
  "quickattack", "thunderbolt", "flamethrower", "hydropump", "solarbeam",
  "scald", "voltswitch", "dragontail", "reflect", "lightscreen",
  "potion", "superball", "hyperball", "fullrestore", "lifeorb", "focussash",
].filter((id) => CARD_MAP[id]);

const FALLBACK_POOL = [
  "rattata", "pidgey", "quickattack", "potion", "pokeball",
].filter((id) => CARD_MAP[id]);

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickDistinct(list, count) {
  return shuffle(list).slice(0, Math.max(0, count));
}

function isRewardablePokemon(card) {
  return Boolean(
    card?.id &&
    card.kind === "pokemon" &&
    !card.trainerOnly &&
    !card.signature &&
    card.rarity !== "L",
  );
}

function evolutionChildren(cardId) {
  return Object.values(CARD_MAP).filter(
    (card) => isRewardablePokemon(card) && card.evolvesFrom === cardId,
  );
}

function basePokemon() {
  return Object.values(CARD_MAP).filter(
    (card) =>
      isRewardablePokemon(card) &&
      !card.evolvesFrom &&
      (card.stage == null || card.stage === 0),
  );
}

function evolutionRoots() {
  return basePokemon().filter((card) => evolutionChildren(card.id).length > 0);
}

function standalonePokemon() {
  return basePokemon().filter((card) => evolutionChildren(card.id).length === 0);
}

function fillToSize(deck, size = STARTER_DECK_SIZE) {
  const out = deck.filter((id) => CARD_MAP[id]);
  let cursor = 0;
  while (out.length < size && FALLBACK_POOL.length) {
    out.push(FALLBACK_POOL[cursor % FALLBACK_POOL.length]);
    cursor += 1;
  }
  return shuffle(out.slice(0, size));
}

function dominantType(lines) {
  const counts = new Map();
  for (const line of lines) {
    const type = CARD_MAP[line.sourceId]?.type;
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "혼합";
}

function makeChoice(index) {
  const roots = pickDistinct(evolutionRoots(), EVOLUTION_LINE_COUNT);
  const lines = roots
    .map((root) => {
      const target = pickDistinct(evolutionChildren(root.id), 1)[0];
      return target ? { sourceId: root.id, targetId: target.id } : null;
    })
    .filter(Boolean);

  const deck = [];
  for (const line of lines) {
    // 첫 전투부터 진화가 실제로 가능하도록 기본체 2장 + 다음 진화체 1장을 묶는다.
    deck.push(line.sourceId, line.sourceId, line.targetId);
  }

  const standalones = pickDistinct(standalonePokemon(), STANDALONE_COUNT);
  deck.push(...standalones.map((card) => card.id));

  const supports = pickDistinct(SUPPORT_POOL, SUPPORT_COUNT);
  deck.push(...supports);

  const finalDeck = fillToSize(deck);
  const leadNames = lines
    .slice(0, 2)
    .map((line) => CARD_MAP[line.sourceId]?.name)
    .filter(Boolean);
  const type = dominantType(lines);

  return {
    id: `starter-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    name: leadNames.length ? `${leadNames.join(" · ")} 중심` : `${type} 탐험대`,
    subtitle: `${type} 계열 랜덤 조합`,
    deck: finalDeck,
    lines,
    standaloneIds: standalones.map((card) => card.id),
    supportIds: supports,
    previewIds: [
      ...lines.flatMap((line) => [line.sourceId, line.targetId]),
      ...standalones.map((card) => card.id),
    ].slice(0, 6),
  };
}

export function makeStarterChoices(count = 3) {
  const choices = [];
  const seen = new Set();
  let guard = 0;

  while (choices.length < count && guard < 30) {
    guard += 1;
    const choice = makeChoice(choices.length);
    const signature = choice.lines
      .map((line) => `${line.sourceId}>${line.targetId}`)
      .sort()
      .join("|");
    if (signature && seen.has(signature)) continue;
    if (signature) seen.add(signature);
    choices.push(choice);
  }

  while (choices.length < count) choices.push(makeChoice(choices.length));
  return choices;
}
