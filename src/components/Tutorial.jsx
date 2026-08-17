import React, { useMemo, useState } from "react";
import { playSfx } from "../audio.js";

const SECTIONS = [
  { id: "start", label: "처음 시작", icon: "▶" },
  { id: "battle", label: "배틀 기본", icon: "⚔" },
  { id: "evolve", label: "진화 · 메가진화", icon: "✦" },
  { id: "type", label: "약점 · 반감", icon: "◎" },
  { id: "status", label: "상태이상", icon: "!" },
  { id: "keyword", label: "특성 · 키워드", icon: "★" },
  { id: "deck", label: "덱 만들기", icon: "▤" },
];

function RuleCard({ title, children, accent = false }) {
  return (
    <article className={`tutorial-rule-card ${accent ? "is-accent" : ""}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function Tip({ children }) {
  return <div className="tutorial-tip">TIP · {children}</div>;
}

function StartSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">POKE STONE 입문</span>
        <h2>처음이라면 이것만 먼저 알아두세요</h2>
        <p>
          포켓몬을 필드에 내고, 마나를 사용해 전개한 뒤 공격으로 상대를 쓰러뜨리는
          카드 배틀입니다. 아래 순서만 익혀도 첫 배틀은 바로 진행할 수 있습니다.
        </p>
      </div>

      <div className="tutorial-flow" aria-label="기본 진행 순서">
        <span><b>1</b> 카드 뽑기</span>
        <i>→</i>
        <span><b>2</b> 포켓몬 소환</span>
        <i>→</i>
        <span><b>3</b> 기술 · 진화</span>
        <i>→</i>
        <span><b>4</b> 공격</span>
        <i>→</i>
        <span><b>5</b> 턴 종료</span>
      </div>

      <div className="tutorial-grid two">
        <RuleCard title="승리 조건" accent>
          <p>
            기본 배틀은 <strong>상대 트레이너의 HP를 0</strong>으로 만들면 승리합니다.
            일부 특수 배틀은 별도 승리 조건이나 필드 기믹이 있으므로 배틀 화면의
            <strong> ? 버튼</strong> 설명을 먼저 확인하세요.
          </p>
        </RuleCard>
        <RuleCard title="선공과 첫 손패">
          <p>
            코인토스로 선공을 정합니다. <strong>선공은 3장</strong>, 후공은
            <strong> 4장</strong>으로 시작하며 선공 플레이어는 첫 턴의 일반 드로우를
            건너뜁니다.
          </p>
        </RuleCard>
        <RuleCard title="마나">
          <p>
            턴 시작마다 최대 마나가 <strong>1씩 증가</strong>하고 현재 마나가 최대치까지
            전부 회복됩니다. 기본 최대치는 <strong>10</strong>입니다. 카드 왼쪽 위 숫자가
            사용하는 마나 비용입니다.
          </p>
        </RuleCard>
        <RuleCard title="필드와 손패">
          <p>
            기본 필드는 최대 <strong>6마리</strong>, 손패는 최대 <strong>10장</strong>입니다.
            손패가 가득 찬 상태에서 뽑힌 카드는 사라지므로 손패 관리도 중요합니다.
          </p>
        </RuleCard>
      </div>

      <Tip>처음에는 저비용 기본 포켓몬을 먼저 내고, 남은 마나로 기술이나 진화를 쓰는 흐름이 가장 안정적입니다.</Tip>
    </>
  );
}

function BattleSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">BATTLE</span>
        <h2>포켓몬을 내고 공격하는 방법</h2>
        <p>손패의 카드를 드래그하거나 선택해 사용할 수 있습니다. 공격은 필드의 포켓몬으로 합니다.</p>
      </div>

      <div className="tutorial-grid two">
        <RuleCard title="기본 포켓몬 소환" accent>
          <p>
            진화 전 기본 포켓몬 카드는 빈 필드에 낼 수 있습니다. 비용만큼 마나를 사용하며,
            보통은 <strong>소환한 턴에 바로 공격하지 못합니다.</strong>
          </p>
        </RuleCard>
        <RuleCard title="포켓몬끼리 공격">
          <p>
            내 포켓몬이 상대 포켓몬을 공격하면 공격력과 타입 상성으로 피해를 줍니다.
            일반적으로 상대도 동시에 <strong>반격 피해</strong>를 주므로 체력을 계산해서 싸우세요.
          </p>
        </RuleCard>
        <RuleCard title="트레이너 직접 공격">
          <p>
            상대 트레이너를 직접 공격하면 포켓몬의 공격력만큼 HP를 깎습니다. 이때는 포켓몬에게
            받는 일반 반격이 없습니다. 단, 상대 필드에 <strong>도발</strong> 포켓몬이 있으면 직접 공격할 수 없습니다.
          </p>
        </RuleCard>
        <RuleCard title="기술 · 도구 카드">
          <p>
            기술 카드는 피해, 회복, 날씨, 상태이상 등 다양한 효과를 냅니다. 도구는 아군 포켓몬에
            장착하며 <strong>한 포켓몬은 도구 1개</strong>만 가질 수 있습니다.
          </p>
        </RuleCard>
        <RuleCard title="덱이 비면 탈진">
          <p>
            덱이 빈 상태에서 카드를 뽑으려 하면 트레이너가 탈진 피해를 받습니다.
            피해는 <strong>1 → 2 → 3 → …</strong>으로 계속 증가합니다.
          </p>
        </RuleCard>
        <RuleCard title="카드를 오래 눌러 확인">
          <p>
            손패나 필드의 카드를 <strong>꾹 눌러 크게 보기</strong>로 확인하면 특성 설명과 현재 체력 등
            세부 정보를 읽을 수 있습니다. 모르는 특성이 나오면 먼저 카드 설명을 확인하세요.
          </p>
        </RuleCard>
      </div>
    </>
  );
}

function EvolveSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">EVOLUTION</span>
        <h2>진화는 필드의 포켓몬 위에 사용합니다</h2>
        <p>진화 카드는 혼자 필드에 낼 수 없고, 카드에 맞는 이전 단계 포켓몬이 필요합니다.</p>
      </div>

      <div className="tutorial-evolve-example">
        <span>파이리</span><i>→</i><span>리자드</span><i>→</i><span>리자몽</span>
      </div>

      <div className="tutorial-grid two">
        <RuleCard title="일반 진화" accent>
          <p>
            손에 진화 카드가 있고 필드에 그 카드의 <strong>진화 전 포켓몬</strong>이 있으면,
            비용을 지불하고 해당 포켓몬을 선택해 진화합니다. 진화 전 카드가 필드에 없으면 사용할 수 없습니다.
          </p>
        </RuleCard>
        <RuleCard title="받은 피해는 유지">
          <p>
            진화한다고 완전히 회복되지는 않습니다. 예를 들어 진화 전 포켓몬이 3의 피해를 받았다면,
            진화 후에도 <strong>3의 피해를 받은 상태</strong>가 유지됩니다.
          </p>
        </RuleCard>
        <RuleCard title="메가진화">
          <p>
            메가진화 카드는 지정된 포켓몬이 필드에 있을 때 사용합니다. 능력치와 특성이 강화되며
            <strong>한 배틀에서 한 번만</strong> 메가진화할 수 있습니다.
          </p>
        </RuleCard>
        <RuleCard title="진화 카드가 막혔을 때">
          <p>
            지금 진화할 대상이 없어 쓸 수 없는 진화 카드는 <strong>턴당 1회 버리고 카드 1장을 뽑는</strong>
            선택지로 바꿀 수 있습니다. 손패가 진화 카드만 남았을 때 활용하세요.
          </p>
        </RuleCard>
      </div>
    </>
  );
}

function TypeSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">TYPE MATCHUP</span>
        <h2>약점은 1.5배, 반감은 0.5배</h2>
        <p>포켓몬 공격과 타입이 붙은 기술 피해는 상대 타입에 따라 달라집니다.</p>
      </div>

      <div className="tutorial-mult-row">
        <div className="is-strong"><b>약점</b><strong>×1.5</strong><span>피해 증가</span></div>
        <div><b>보통</b><strong>×1</strong><span>그대로</span></div>
        <div className="is-resist"><b>반감</b><strong>×0.5</strong><span>최소 피해 1</span></div>
        <div className="is-immune"><b>무효</b><strong>×0</strong><span>피해 없음</span></div>
      </div>

      <div className="tutorial-grid two">
        <RuleCard title="쉽게 외우는 대표 상성" accent>
          <div className="tutorial-matchups">
            <span>🔥 불꽃 <b>▶</b> 🌿 풀</span>
            <span>💧 물 <b>▶</b> 🔥 불꽃</span>
            <span>⚡ 전기 <b>▶</b> 💧 물</span>
            <span>🌍 땅 <b>▶</b> ⚡ 전기</span>
            <span>🥊 격투 <b>▶</b> 🪨 바위</span>
            <span>🐉 드래곤 <b>▶</b> 🐉 드래곤</span>
          </div>
        </RuleCard>
        <RuleCard title="무효도 있습니다">
          <p>
            상성에 따라 피해가 완전히 0이 되는 경우가 있습니다. 예를 들어
            <strong> 노말 → 고스트</strong>, <strong>전기 → 땅</strong>,
            <strong> 땅 → 비행</strong>은 기본적으로 피해를 주지 못합니다.
          </p>
        </RuleCard>
        <RuleCard title="반격에도 상성이 적용">
          <p>
            포켓몬끼리 싸울 때는 공격하는 쪽뿐 아니라 반격하는 포켓몬의 타입도 계산됩니다.
            내가 약점을 찔러도 상대의 반격에 내 약점이 찔릴 수 있습니다.
          </p>
        </RuleCard>
        <RuleCard title="특성은 상성을 바꿀 수 있음">
          <p>
            부유, 저수, 축전처럼 특정 타입 피해를 무효화하거나 흡수하는 특성도 있습니다.
            최종 판단은 카드의 특성 설명을 함께 확인하세요.
          </p>
        </RuleCard>
      </div>
    </>
  );
}

const STATUS = [
  {
    name: "화상",
    mark: "🔥",
    text: "공격력이 절반으로 줄고, 자신의 턴 종료마다 피해 1을 받습니다.",
    immune: "불꽃 타입은 화상에 걸리지 않습니다.",
  },
  {
    name: "독",
    mark: "☠",
    text: "자신의 턴 종료마다 피해가 1 → 2 → 3 → …으로 누적 증가합니다.",
    immune: "독 · 강철 타입은 독에 걸리지 않습니다.",
  },
  {
    name: "마비",
    mark: "⚡",
    text: "자신의 턴마다 30% 확률로 그 턴 공격을 할 수 없습니다.",
    immune: "전기 타입은 마비에 걸리지 않습니다.",
  },
  {
    name: "얼음",
    mark: "❄",
    text: "공격할 수 없습니다. 자신의 턴마다 40% 확률로 풀리며, 불꽃 피해를 받으면 즉시 녹습니다.",
    immune: "얼음 타입은 얼지 않으며, 쾌청 날씨에도 얼음 상태가 걸리지 않습니다.",
  },
  {
    name: "잠듦",
    mark: "Zz",
    text: "잠든 동안 공격할 수 없습니다. 턴이 지날수록 깨어날 확률이 높아지고 결국 반드시 깨어납니다.",
    immune: "일부 특성은 잠듦을 막거나 되돌릴 수 있습니다.",
  },
];

function StatusSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">STATUS</span>
        <h2>상태이상은 한 포켓몬에 하나만</h2>
        <p>이미 상태이상에 걸린 포켓몬에게 다른 기본 상태이상을 추가로 겹쳐 걸 수는 없습니다.</p>
      </div>

      <div className="tutorial-status-list">
        {STATUS.map((status) => (
          <article key={status.name} className="tutorial-status-card">
            <span className="tutorial-status-mark">{status.mark}</span>
            <div>
              <h3>{status.name}</h3>
              <p>{status.text}</p>
              <small>{status.immune}</small>
            </div>
          </article>
        ))}
      </div>

      <Tip>상태이상 치료 카드와 완전회복 계열 카드는 중요한 포켓몬이 행동 불능이 되었을 때 큰 차이를 만듭니다.</Tip>
    </>
  );
}

const KEYWORDS = [
  ["돌진", "낸 턴에 바로 공격할 수 있습니다."],
  ["도발", "상대는 도발 포켓몬을 먼저 공격해야 합니다. 도발이 남아 있으면 트레이너 직접 공격도 막힙니다."],
  ["스킬링크", "한 턴에 두 번 공격할 수 있습니다."],
  ["옹골참", "체력이 가득 찬 상태에서 한 번에 기절할 피해를 받으면 체력 1로 버팁니다."],
  ["부유", "땅 타입 기술 피해를 받지 않습니다."],
  ["재생력", "자신의 턴 종료 시 체력을 1 회복합니다."],
  ["저수 / 축전", "각각 물 / 전기 타입 피해를 무효화하고 체력을 회복합니다."],
  ["나왔을 때", "포켓몬을 필드에 내거나 진화해 해당 특성을 얻는 순간 효과가 발동합니다."],
];

function KeywordSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">KEYWORDS</span>
        <h2>자주 보이는 특성부터 익히세요</h2>
        <p>모든 특성을 외울 필요는 없습니다. 아래 핵심 용어만 알아도 대부분의 전투 상황을 읽을 수 있습니다.</p>
      </div>

      <div className="tutorial-keyword-list">
        {KEYWORDS.map(([name, text]) => (
          <article key={name}>
            <strong>{name}</strong>
            <p>{text}</p>
          </article>
        ))}
      </div>

      <div className="tutorial-weather">
        <h3>날씨도 기억해두세요</h3>
        <div>
          <span><b>비</b> 물 포켓몬 공격력 +1 · 물 기술 피해 +1 · 불꽃 기술 피해 -1</span>
          <span><b>쾌청</b> 불꽃 포켓몬 공격력 +1 · 불꽃 기술 피해 +1 · 물 기술 피해 -1</span>
          <span><b>모래바람</b> 턴 종료마다 바위 · 땅 · 강철 이외의 포켓몬이 피해 1</span>
        </div>
      </div>
    </>
  );
}

function DeckSection() {
  return (
    <>
      <div className="tutorial-lead">
        <span className="tutorial-kicker">DECK BUILDING</span>
        <h2>배틀에 들어가려면 30장 덱이 필요합니다</h2>
        <p>강한 카드만 넣기보다 초반에 낼 기본 포켓몬과 진화 라인을 함께 맞추는 것이 중요합니다.</p>
      </div>

      <div className="tutorial-deck-limit">
        <span><b>덱</b><strong>30장</strong></span>
        <span><b>C · R · E</b><strong>같은 카드 최대 2장</strong></span>
        <span><b>L</b><strong>같은 카드 최대 1장</strong></span>
        <span><b>전설 포켓몬</b><strong>덱 전체 최대 3장</strong></span>
      </div>

      <div className="tutorial-grid two">
        <RuleCard title="기본 포켓몬을 충분히" accent>
          <p>
            진화 포켓몬만 손에 잡히면 필드에 아무것도 못 낼 수 있습니다. 낮은 비용의 기본 포켓몬을
            충분히 넣어 첫 턴부터 필드를 만들 수 있게 하세요.
          </p>
        </RuleCard>
        <RuleCard title="진화 라인을 같이 넣기">
          <p>
            리자몽을 쓰고 싶다면 리자몽만 넣는 것이 아니라 파이리와 리자드도 함께 구성해야 실제로 진화할 수 있습니다.
          </p>
        </RuleCard>
        <RuleCard title="기술 카드 역할 분담">
          <p>
            피해 기술만 채우기보다 포켓몬 탐색, 회복, 상태이상 치료 같은 카드를 섞으면 손패가 꼬였을 때 복구하기 쉽습니다.
          </p>
        </RuleCard>
        <RuleCard title="도구는 핵심 포켓몬 위주">
          <p>
            생명의구슬, 기합의띠 같은 도구는 한 포켓몬에 하나만 장착할 수 있습니다. 오래 살아남거나 공격을 맡을 핵심 포켓몬에게 주세요.
          </p>
        </RuleCard>
      </div>

      <Tip>처음에는 컬렉션 · 덱 화면에서 자동으로 30장을 채우기보다, 기본 포켓몬과 진화 카드의 이름을 함께 보며 한 줄씩 맞춰보는 게 가장 이해하기 쉽습니다.</Tip>
    </>
  );
}

const SECTION_CONTENT = {
  start: <StartSection />,
  battle: <BattleSection />,
  evolve: <EvolveSection />,
  type: <TypeSection />,
  status: <StatusSection />,
  keyword: <KeywordSection />,
  deck: <DeckSection />,
};

export default function Tutorial({ onBack }) {
  const [section, setSection] = useState("start");
  const currentIndex = useMemo(
    () => Math.max(0, SECTIONS.findIndex((item) => item.id === section)),
    [section],
  );

  function moveTo(id) {
    playSfx("click");
    setSection(id);
    document.querySelector(".tutorial-content")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="tutorial-screen">
      <header className="tutorial-header">
        <button
          type="button"
          className="btn-ghost tutorial-back"
          onClick={() => {
            playSfx("click");
            onBack();
          }}
        >
          ◀ 메인 메뉴
        </button>
        <div>
          <span>BEGINNER GUIDE</span>
          <h1>게임 튜토리얼</h1>
        </div>
        <span className="tutorial-progress">{currentIndex + 1} / {SECTIONS.length}</span>
      </header>

      <div className="tutorial-shell">
        <nav className="tutorial-nav" aria-label="튜토리얼 목차">
          {SECTIONS.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={section === item.id ? "is-active" : ""}
              onMouseEnter={() => playSfx("cursor")}
              onClick={() => moveTo(item.id)}
            >
              <span className="tutorial-nav-num">{String(index + 1).padStart(2, "0")}</span>
              <i>{item.icon}</i>
              <strong>{item.label}</strong>
            </button>
          ))}
        </nav>

        <main className="tutorial-content">
          {SECTION_CONTENT[section]}

          <div className="tutorial-pager">
            <button
              type="button"
              className="btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => moveTo(SECTIONS[currentIndex - 1]?.id)}
            >
              ◀ 이전
            </button>
            {currentIndex < SECTIONS.length - 1 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => moveTo(SECTIONS[currentIndex + 1].id)}
              >
                다음 ▶
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  playSfx("click");
                  onBack();
                }}
              >
                튜토리얼 완료
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
