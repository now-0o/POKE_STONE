import React, { useEffect, useState } from "react";
import DeckEditor from "./DeckEditor.jsx";
import MobileDeckEditorPortrait from "./MobileDeckEditorPortrait.jsx";
import MobileDeckEditorLandscape from "./MobileDeckEditorLandscape.jsx";
import "../styles/mobile-deck-portrait.css";

function getDeckEditorMode() {
  if (typeof window === "undefined") return "desktop";

  const mobile =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1024px)").matches;

  if (!mobile) return "desktop";

  return window.matchMedia("(orientation: portrait)").matches
    ? "portrait-mobile"
    : "landscape-mobile";
}

export default function ResponsiveDeckEditor(props) {
  const [mode, setMode] = useState(getDeckEditorMode);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 1024px)");
    const portrait = window.matchMedia("(orientation: portrait)");
    const update = () => setMode(getDeckEditorMode());

    coarse.addEventListener?.("change", update);
    narrow.addEventListener?.("change", update);
    portrait.addEventListener?.("change", update);

    return () => {
      coarse.removeEventListener?.("change", update);
      narrow.removeEventListener?.("change", update);
      portrait.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    document.body.classList.remove(
      "mobile-deck-editing",
      "mobile-deck-landscape-editing",
    );

    if (mode === "portrait-mobile") {
      document.body.classList.add("mobile-deck-editing");
    } else if (mode === "landscape-mobile") {
      document.body.classList.add("mobile-deck-landscape-editing");
    }

    return () => {
      document.body.classList.remove(
        "mobile-deck-editing",
        "mobile-deck-landscape-editing",
      );
    };
  }, [mode]);

  if (mode === "portrait-mobile") {
    return <MobileDeckEditorPortrait {...props} />;
  }

  if (mode === "landscape-mobile") {
    return <MobileDeckEditorLandscape {...props} />;
  }

  return <DeckEditor {...props} />;
}
