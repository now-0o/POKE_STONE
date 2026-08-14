import React, { useState } from "react";
import { PATCH_NOTES } from "../patchNotes.js";
import { PATCH_NOTE_V27 } from "../patchNotes-v27.js";
import { playSfx } from "../audio.js";

const ALL_PATCH_NOTES = [PATCH_NOTE_V27, ...PATCH_NOTES];

export default function PatchNotes() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="btn-patchnotes"
        onMouseEnter={() => playSfx("cursor")}
        onClick={() => {
          playSfx("click");
          setOpen((v) => !v);
        }}
        title="패치노트"
      >
        📋 v{ALL_PATCH_NOTES[0].version}
      </button>
      {open && (
        <div className="patchnotes-panel">
          <div className="patchnotes-header">
            <span>패치노트</span>
            <button
              className="btn-ghost small"
              onClick={() => {
                playSfx("click");
                setOpen(false);
              }}
            >
              ✕
            </button>
          </div>
          <div className="patchnotes-body">
            {ALL_PATCH_NOTES.map((entry) => (
              <div key={entry.version} className="patchnotes-entry">
                <div className="patchnotes-entry-head">
                  <span className="patchnotes-version">v{entry.version}</span>
                  <span className="patchnotes-title">{entry.title}</span>
                  <span className="patchnotes-date">{entry.date}</span>
                </div>
                <ul>
                  {entry.changes.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
