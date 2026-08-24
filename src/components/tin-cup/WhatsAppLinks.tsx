import { useEffect, useState } from "react";

import {
  WHATSAPP_GROUP_CONFIGURED,
  WHATSAPP_GROUP_URL,
  boardShareText,
  whatsappShareUrl,
} from "@/lib/tin-cup";

/** Opens the permanent WhatsApp group invite when configured. */
export function WhatsAppGroupButton({ className = "" }: { className?: string }) {
  if (!WHATSAPP_GROUP_CONFIGURED) return null;
  return (
    <a
      href={WHATSAPP_GROUP_URL}
      target="_blank"
      rel="noreferrer"
      className={`press btn-quiet t-body inline-flex items-center justify-center ${className}`}
    >
      Field chat
    </a>
  );
}

/** Group invite if set; otherwise share the board into WhatsApp. Always visible. */
export function FieldChatLink({
  scoreLine,
  className = "",
}: {
  scoreLine?: string;
  className?: string;
}) {
  if (WHATSAPP_GROUP_CONFIGURED) {
    return <WhatsAppGroupButton className={className} />;
  }
  return <ShareBoardButton scoreLine={scoreLine} className={className} />;
}

/** Share the board into WhatsApp / native share sheet. */
export function ShareBoardButton({
  scoreLine,
  className = "",
}: {
  scoreLine?: string;
  className?: string;
}) {
  const text = boardShareText(scoreLine);

  async function share() {
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "Tin Cup Invitational 2026",
          text,
          url: typeof window !== "undefined" ? window.location.origin : "https://tincupinv.com",
        });
        return;
      }
    } catch {
      /* cancelled or failed */
    }
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className={`press btn-quiet t-body inline-flex items-center justify-center ${className}`}
    >
      Share board
    </button>
  );
}

const INSTALL_KEY = "tc-install-hint-dismissed";

/** One-time install row so Safari chrome stops eating the hole map. */
function installHintOpen() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(INSTALL_KEY) !== "1";
  } catch {
    return false;
  }
}

export function InstallHint({ embedded = false }: { embedded?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(installHintOpen());
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`flex min-h-11 items-center justify-between gap-3 px-4 py-3 ${
        embedded ? "" : "surface"
      }`}
    >
      <p className="t-micro min-w-0">iPhone: Share → Add to Home Screen</p>
      <button
        type="button"
        className="press t-micro min-h-11 shrink-0 px-1 font-semibold text-muted-foreground"
        onClick={() => {
          try {
            window.localStorage.setItem(INSTALL_KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
