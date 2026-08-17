import { access, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BALL_SPRITES,
  DEX,
  ITEM_SPRITE,
  MEGA_DEX,
  UI_SPRITES,
} from "../src/data/cards.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(__dirname, "../public/sprites");

// PokeAPI sprites 저장소의 특정 커밋에 고정해 빌드 결과가 갑자기 바뀌지 않게 한다.
const SPRITE_REVISION = "c10459b9b0129eaca5c5d9b1cac65336debb1d08";
const UPSTREAMS = [
  `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@${SPRITE_REVISION}/sprites`,
  `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITE_REVISION}/sprites`,
];

const pokemonIds = new Set([
  ...Object.values(DEX),
  ...Object.values(MEGA_DEX),
  // 테오키스 폼 / 따라큐 탈 벗은 모습처럼 런타임에서 직접 번호를 지정하는 스프라이트
  10001,
  10002,
  10003,
  10143,
]);

function spriteRelativePath(url) {
  const marker = "/sprites/";
  const index = url.indexOf(marker);
  return index >= 0 ? url.slice(index + marker.length) : null;
}

const itemPaths = new Set(
  [
    ...Object.values(ITEM_SPRITE).map((name) => `items/${name}.png`),
    ...Object.values(UI_SPRITES).map(spriteRelativePath),
    ...Object.values(BALL_SPRITES).map(spriteRelativePath),
  ].filter(Boolean),
);

const files = [
  ...[...pokemonIds]
    .filter((id) => Number.isInteger(id) || /^\d+$/.test(String(id)))
    .map((id) => `pokemon/${id}.png`),
  ...itemPaths,
];

async function fileExists(filePath) {
  try {
    await access(filePath);
    return (await stat(filePath)).size > 0;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url) {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "user-agent": "poke-stone-netlify-build/1.0",
        },
      });

      if (response.ok) {
        return Buffer.from(await response.arrayBuffer());
      }

      lastError = new Error(`${response.status} ${response.statusText}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }

    await sleep(350 * attempt);
  }

  throw lastError || new Error("download failed");
}

async function download(relativePath) {
  const outputPath = path.join(OUT_ROOT, relativePath);
  if (await fileExists(outputPath)) return "cached";

  await mkdir(path.dirname(outputPath), { recursive: true });

  let lastError;
  for (const base of UPSTREAMS) {
    try {
      const data = await fetchWithRetry(`${base}/${relativePath}`);
      await writeFile(outputPath, data);
      return "downloaded";
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `스프라이트 다운로드 실패: ${relativePath} (${lastError?.message || "unknown error"})`,
  );
}

let cursor = 0;
let downloaded = 0;
let cached = 0;
const WORKERS = 16;

async function worker() {
  while (cursor < files.length) {
    const index = cursor;
    cursor += 1;
    const result = await download(files[index]);
    if (result === "downloaded") downloaded += 1;
    else cached += 1;
  }
}

await mkdir(OUT_ROOT, { recursive: true });
await Promise.all(Array.from({ length: WORKERS }, () => worker()));

console.log(
  `[sprites] ${files.length}개 준비 완료 (다운로드 ${downloaded}, 캐시 ${cached})`,
);
