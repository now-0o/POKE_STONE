import React, { useRef, useState } from "react";
import OnlineFriendlyRoom from "./OnlineFriendlyRoom.jsx";
import { playSfx } from "../audio.js";

export default function FriendlyLobbyScreen({ save, onOnlineMatched, onBack }) {
  const [active, setActive] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cancelRef = useRef(null);

  async function requestBack() {
    if (!active) {
      playSfx("click");
      onBack?.();
      return;
    }
    playSfx("click");
    setConfirmLeave(true);
  }

  async function leaveAndBack() {
    if (leaving) return;
    setLeaving(true);
    const cancel = cancelRef.current;
    const ok = cancel ? await cancel({ silent: true }) : true;
    if (ok) {
      setConfirmLeave(false);
      setActive(false);
      playSfx("click");
      onBack?.();
    } else {
      playSfx("buzzer");
    }
    setLeaving(false);
  }

  return (
    <div className="main-menu friendly-return-screen">
      <div className="trainer-region-header">
        <button className="btn-ghost small" onClick={requestBack}>
          ◀ 온라인 배틀
        </button>
        <div>
          <strong>친선전</strong>
          <span className="trainer-region-sub"> FRIENDLY MATCH</span>
        </div>
      </div>

      <div className="trainer-list online-matchmaking-trainer-slot">
        <OnlineFriendlyRoom
          save={save}
          onMatched={onOnlineMatched}
          onActivityChange={setActive}
          onRegisterCancel={(handler) => {
            cancelRef.current = handler;
          }}
        />
      </div>

      {confirmLeave && (
        <div className="online-leave-confirm-overlay" role="dialog" aria-modal="true">
          <div className="online-leave-confirm-box">
            <h3>친선전 방에 참가 중입니다</h3>
            <p>온라인 배틀 메뉴로 돌아가면 현재 친선전 방에서 나가게 됩니다.</p>
            <div className="online-leave-confirm-actions">
              <button className="btn-primary" disabled={leaving} onClick={leaveAndBack}>
                {leaving ? "처리 중..." : "방 나가고 이동"}
              </button>
              <button
                className="btn-secondary"
                disabled={leaving}
                onClick={() => setConfirmLeave(false)}
              >
                방에 남기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
