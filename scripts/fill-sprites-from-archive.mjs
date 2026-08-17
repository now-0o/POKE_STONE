import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import {
  BALL_SPRITES,
  DEX,
  ITEM_SPRITE,
  MEGA_DEX,
  UI_SPRITES,
} from "../src/data/cards.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT_ROOT = path.resolve(__dirname, "../public/sprites");

const SPRITE_REVISION = "c10459b9b0129eaca5c5d9b1cac65336debb1d08";

// GitHub Raw 이미지 586개를 개별 요청하는 게 아니라
// 저장소 전체 tar.gz 파일을 한 번만 요청한다.
const ARCHIVE_URL = `https://codeload.github.com/PokeAPI/sprites/tar.gz/${SPRITE_REVISION}`;

function spriteRelativePath(url) {
  if (!url || typeof url !== "string") return null;

  // raw.githubusercontent.com/PokeAPI/sprites/.../sprites/items/... 처럼
  // sprites가 URL에 여러 번 들어갈 수 있으므로 마지막 것 사용
  const marker = "/sprites/";
  const index = url.lastIndexOf(marker);

  if (index === -1) return null;

  return url.slice(index + marker.length);
}

const pokemonIds = new Set([
  ...Object.values(DEX),
  ...Object.values(MEGA_DEX),

  // 포케스톤에서 직접 사용하는 특수 폼
  10001,
  10002,
  10003,
  10143,
]);

const itemPaths = new Set(
  [
    ...Object.values(ITEM_SPRITE).map((name) => `items/${name}.png`),

    ...Object.values(UI_SPRITES).map(spriteRelativePath),

    ...Object.values(BALL_SPRITES).map(spriteRelativePath),
  ].filter(Boolean),
);

const requiredFiles = [
  ...[...pokemonIds]
    .filter((id) => /^\d+$/.test(String(id)))
    .map((id) => `pokemon/${id}.png`),

  ...itemPaths,
];

async function exists(filePath) {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function downloadArchive(destination) {
  console.log("PokeAPI sprites 압축파일 다운로드 중...");
  console.log(ARCHIVE_URL);
  console.log("");

  const response = await fetch(ARCHIVE_URL, {
    redirect: "follow",
    headers: {
      "User-Agent": "poke-stone-sprite-archive-downloader/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `압축파일 다운로드 실패: ${response.status} ${response.statusText}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  await writeFile(destination, buffer);

  console.log(
    `압축파일 다운로드 완료: ${(buffer.length / 1024 / 1024).toFixed(1)} MB`,
  );
}

function extractArchive(archive, directory) {
  console.log("압축 해제 중...");

  const result = spawnSync("tar", ["-xzf", archive, "-C", directory], {
    stdio: "inherit",
  });

  if (result.error) {
    throw new Error(`tar 실행 실패: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`압축 해제 실패 (tar 종료 코드 ${result.status})`);
  }
}

async function findExtractedRepository(tempDir) {
  const entries = await readdir(tempDir, {
    withFileTypes: true,
  });

  const directory = entries.find(
    (entry) => entry.isDirectory() && entry.name.startsWith("sprites-"),
  );

  if (!directory) {
    throw new Error("압축 해제된 PokeAPI sprites 디렉터리를 찾지 못했습니다.");
  }

  return path.join(tempDir, directory.name);
}

async function main() {
  await mkdir(OUT_ROOT, {
    recursive: true,
  });

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "poke-stone-sprites-"));

  const archivePath = path.join(tempDir, "sprites.tar.gz");

  try {
    await downloadArchive(archivePath);

    extractArchive(archivePath, tempDir);

    const repositoryRoot = await findExtractedRepository(tempDir);

    const sourceSprites = path.join(repositoryRoot, "sprites");

    console.log("");
    console.log(`필요한 스프라이트 ${requiredFiles.length}개 확인 중...`);
    console.log("");

    let alreadyExists = 0;
    let copied = 0;
    let missingInArchive = 0;

    const missing = [];

    for (let i = 0; i < requiredFiles.length; i += 1) {
      const relativePath = requiredFiles[i];

      const destination = path.join(OUT_ROOT, relativePath);

      if (await exists(destination)) {
        alreadyExists += 1;
        continue;
      }

      const source = path.join(sourceSprites, relativePath);

      if (!(await exists(source))) {
        missingInArchive += 1;
        missing.push(relativePath);

        console.warn(`❌ 압축파일에도 없음: ${relativePath}`);

        continue;
      }

      await mkdir(path.dirname(destination), {
        recursive: true,
      });

      await cp(source, destination);

      copied += 1;

      console.log(`[${i + 1}/${requiredFiles.length}] 복사 ${relativePath}`);
    }

    console.log("");
    console.log("=================================");
    console.log(`필요 파일     : ${requiredFiles.length}`);
    console.log(`이미 있음     : ${alreadyExists}`);
    console.log(`새로 복사     : ${copied}`);
    console.log(`압축에도 없음 : ${missingInArchive}`);
    console.log("=================================");

    if (missing.length) {
      console.log("");
      console.log("못 찾은 파일:");

      for (const file of missing) {
        console.log(`- ${file}`);
      }

      process.exitCode = 1;
      return;
    }

    console.log("");
    console.log("✅ 포케스톤 스프라이트 준비 완료");
  } finally {
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}

main().catch((error) => {
  console.error("");
  console.error("❌ 작업 실패");
  console.error(error);
  process.exitCode = 1;
});
