import { useEffect, useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";

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
      className={`press btn-quiet t-body inline-flex items-center justify-center gap-2 ${className}`}
    >
      <MessageCircle className="size-4" strokeWidth={1.7} />
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
      className={`press btn-quiet t-body inline-flex items-center justify-center gap-2 ${className}`}
    >
      <Share2 className="size-4" strokeWidth={1.7} />
      Share board
    </button>
  );
}

const INSTALL_KEY = "tc-install-hint-dismissed";

/** One-time install tip for home-screen (captains / power users). */
export function InstallHint({ prominent = false }: { prominent?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(INSTALL_KEY) === "1") return;
    } catch {
      return;
    }
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (!standalone) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`flex items-start gap-3 p-3.5 ${
        prominent ? "panel border border-gold/25" : "panel"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="t-title text-foreground">Add to Home Screen</p>
        <p className="t-micro mt-1 text-muted-foreground">
          <span className="font-medium text-foreground/90">iPhone:</span> Share → Add to Home
          Screen.{" "}
          <span className="font-medium text-foreground/90">Android:</span> menu → Install app /
          Add to Home screen. Offline maps + one-tap Live board on the course.
        </p>
      </div>
      <button
        type="button"
        className="press t-micro min-h-11 shrink-0 rounded-lg border border-border px-3 py-2 text-muted-foreground"
        onClick={() => {
          try {
            window.localStorage.setItem(INSTALL_KEY, "1");
          } catch {
            /* ignore */
          }
          setVisible(false);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
