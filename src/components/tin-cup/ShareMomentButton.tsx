import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import { shareMoment, type ShareMomentPayload } from "@/lib/share-moment";

export function ShareMomentButton({
  payload,
  children,
  className = "",
}: {
  payload: ShareMomentPayload;
  children: ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await shareMoment(payload);
        setBusy(false);
        if (result === "downloaded")
          toast.success("Share image downloaded. Caption copied when available.");
        else if (result === "copied") toast.success("Share caption copied.");
        else if (result === "failed") toast.error("Could not create the share image.");
      }}
      className={`press btn-quiet t-body inline-flex min-h-11 items-center justify-center ${className}`}
    >
      {busy ? "Creating…" : children}
    </button>
  );
}
