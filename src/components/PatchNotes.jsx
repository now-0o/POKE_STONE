import React, { useState } from "react";
import { ALL_PATCH_NOTES } from "../features/patch-notes/index.js";
import { playSfx } from "../audio.js";

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
                  {entry.changes.map((change, index) => (
                    <li key={index}>{change}</li>
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
