import React, { useEffect, useState } from "react";
import DeckEditor from "./DeckEditor.jsx";
import MobileDeckEditor from "./MobileDeckEditorV2.jsx";
import "../styles/mobile-deck-portrait.css";

function matchesMobileDeckEditor() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 1024px)").matches
  );
}

export default function ResponsiveDeckEditor(props) {
  const [mobile, setMobile] = useState(matchesMobileDeckEditor);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const narrow = window.matchMedia("(max-width: 1024px)");
    const update = () => setMobile(matchesMobileDeckEditor());

    coarse.addEventListener?.("change", update);
    narrow.addEventListener?.("change", update);

    return () => {
      coarse.removeEventListener?.("change", update);
      narrow.removeEventListener?.("change", update);
    };
  }, []);

  useEffect(() => {
    if (!mobile) return undefined;

    document.body.classList.add("mobile-deck-editing");

    return () => {
      document.body.classList.remove("mobile-deck-editing");
    };
  }, [mobile]);

  return mobile ? <MobileDeckEditor {...props} /> : <DeckEditor {...props} />;
}
