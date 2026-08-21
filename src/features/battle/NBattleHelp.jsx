import React, { useState } from "react";
import "./n-battle-help.css";

export default function NBattleHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="n-battle-help-wrap">
      <button
        type="button"
        className="n-battle-help-button"
        aria-label="N 배틀 기믹 설명"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>

      {open && (
        <div className="n-battle-help-popover" role="dialog" aria-label="N 배틀 기믹">
          <div className="n-battle-help-title-row">
            <div>
              <span className="n-battle-help-kicker">N BATTLE GIMMICK</span>
              <h3>포켓몬의 마음</h3>
            </div>
            <button
              type="button"
              className="n-battle-help-close"
              aria-label="닫기"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <ul>
            <li>
              내 포켓몬은 <strong>친밀도 3</strong>으로 시작합니다.
            </li>
            <li>
              <strong>체력이 절반 이하</strong>인 상태, <strong>상태이상</strong> 상태,
              또는 <strong>연속으로 무리하게 공격</strong>시키면 친밀도가 내려갈 수 있습니다.
            </li>
            <li>
              한 턴에 친밀도는 최대 <strong>2</strong>까지 감소합니다.
            </li>
            <li>
              친밀도가 <strong>0</strong>이 되면 그 포켓몬은 N에게 넘어가
              <strong> 2턴 동안 적으로 싸운 뒤</strong> 친밀도 2로 돌아옵니다.
            </li>
            <li>
              N의 HP가 약 <strong>2/3</strong>이 되면 <strong>레시라무</strong>, 약
              <strong> 1/3</strong>이 되면 <strong>제크로무</strong>가 합류합니다.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
