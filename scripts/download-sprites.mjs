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

// PokeAPI sprites 저장소 버전 고정
const SPRITE_REVISION = "c10459b9b0129eaca5c5d9b1cac65336debb1d08";

// GitHub Raw 대신 jsDelivr 우선 사용.
// 혹시 jsDelivr가 실패하면 Raw를 마지막 fallback으로만 사용.
const UPSTREAMS = [
  `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@${SPRITE_REVISION}/sprites`,
  `https://raw.githubusercontent.com/PokeAPI/sprites/${SPRITE_REVISION}/sprites`,
];

// 일반 포켓몬 + 메가진화
const pokemonIds = new Set([
  ...Object.values(DEX),
  ...Object.values(MEGA_DEX),

  // 런타임에서 직접 spriteId로 사용하는 특수 폼
  10001,
  10002,
  10003,
  10143,
]);

function spriteRelativePath(url) {
  if (!url || typeof url !== "string") return null;

  // URL 내부에 /sprites/가 두 번 나올 수 있으므로
  // 마지막 /sprites/ 뒤의 실제 경로만 가져온다.
  const marker = "/sprites/";
  const index = url.lastIndexOf(marker);

  if (index === -1) return null;

  return url.slice(index + marker.length);
}

// 아이템 / 몬스터볼 / 재화 UI
const itemPaths = new Set([
  ...Object.values(ITEM_SPRITE).map((name) => `items/${name}.png`),

  ...Object.values(UI_SPRITES).map(spriteRelativePath).filter(Boolean),

  ...Object.values(BALL_SPRITES).map(spriteRelativePath).filter(Boolean),
]);

const files = [
  ...[...pokemonIds]
    .filter((id) => /^\d+$/.test(String(id)))
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

function isValidPng(buffer) {
  if (!buffer || buffer.length < 8) return false;

  return (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

async function fetchImage(url) {
  let lastError;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "poke-stone-sprite-downloader/1.0",
        },
      });

      if (!response.ok) {
        const error = new Error(`${response.status} ${response.statusText}`);

        // 403 / 404는 재시도해봐야 의미 없으므로
        // 즉시 이 서버 포기 → 다음 UPSTREAM으로 이동
        if (response.status === 403 || response.status === 404) {
          error.noRetry = true;
        }

        throw error;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (!isValidPng(buffer)) {
        throw new Error("응답이 정상 PNG 파일이 아님");
      }

      return buffer;
    } catch (error) {
      lastError = error;

      // 403 / 404면 여기서 즉시 종료
      // download()가 다음 CDN 주소를 시도함
      if (error.noRetry) {
        throw error;
      }

      console.warn(`  재시도 ${attempt}/4: ${url} (${error.message})`);

      await sleep(10000 * attempt);
    }
  }

  throw lastError;
}

async function download(relativePath) {
  const outputPath = path.join(OUT_ROOT, relativePath);

  if (await fileExists(outputPath)) {
    return "cached";
  }

  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  let lastError;

  for (const base of UPSTREAMS) {
    const url = `${base}/${relativePath}`;

    try {
      const data = await fetchImage(url);

      await writeFile(outputPath, data);

      await sleep(500); // 요청 간격
      return "downloaded";
    } catch (error) {
      lastError = error;

      console.warn(`실패: ${url} (${error.message})`);
    }
  }

  throw new Error(
    `다운로드 실패: ${relativePath} (${lastError?.message ?? "unknown"})`,
  );
}

await mkdir(OUT_ROOT, {
  recursive: true,
});

console.log(`총 ${files.length}개 스프라이트 다운로드 시작`);

let cursor = 0;
let downloaded = 0;
let cached = 0;
let failed = 0;

// 너무 세게 때리지 않게 8개 병렬
const WORKERS = 1;

async function worker() {
  while (true) {
    const index = cursor;
    cursor += 1;

    if (index >= files.length) {
      return;
    }

    const relativePath = files[index];

    try {
      const result = await download(relativePath);

      if (result === "downloaded") {
        downloaded += 1;
        console.log(`[${index + 1}/${files.length}] 다운로드 ${relativePath}`);
      } else {
        cached += 1;
      }
    } catch (error) {
      failed += 1;

      console.error(
        `[${index + 1}/${files.length}] ❌ ${relativePath}`,
        error.message,
      );
    }
  }
}

await Promise.all(Array.from({ length: WORKERS }, () => worker()));

console.log("");
console.log("==============================");
console.log(`전체       : ${files.length}`);
console.log(`다운로드   : ${downloaded}`);
console.log(`기존 파일  : ${cached}`);
console.log(`실패       : ${failed}`);
console.log("==============================");

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log("✅ 모든 스프라이트 준비 완료");
}
