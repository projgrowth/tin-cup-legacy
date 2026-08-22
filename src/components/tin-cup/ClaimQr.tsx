import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, QrCode } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ClaimPlayer = { id: string; name: string; teamName?: string };

function claimUrl(playerId: string) {
  const origin =
    typeof window === "undefined" ? "https://www.tincupinv.com" : window.location.origin;
  return `${origin}/profile?claim=${encodeURIComponent(playerId)}`;
}

function useQr(playerId: string, size = 360) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(claimUrl(playerId), {
      width: size,
      margin: 2,
      color: { dark: "#10241c", light: "#fffdf7" },
      errorCorrectionLevel: "M",
    }).then((value) => active && setUrl(value));
    return () => {
      active = false;
    };
  }, [playerId, size]);
  return url;
}

export function ClaimQrButton({ player }: { player: ClaimPlayer }) {
  const qr = useQr(player.id);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Show claim QR code for ${player.name}`}
          className="press flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <QrCode className="size-5" strokeWidth={1.7} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl border-border p-5">
        <DialogHeader>
          <DialogTitle className="t-title text-foreground">Claim {player.name}</DialogTitle>
          <DialogDescription className="t-micro">
            Scan, sign in, and confirm this roster spot. The link cannot take an already-claimed
            player.
          </DialogDescription>
        </DialogHeader>
        {qr ? (
          <img
            src={qr}
            alt={`QR code linking to the roster claim page for ${player.name}`}
            className="mx-auto aspect-square w-full max-w-72 rounded-xl"
          />
        ) : (
          <div className="mx-auto aspect-square w-full max-w-72 animate-pulse rounded-xl bg-secondary" />
        )}
        <a
          href={qr || undefined}
          download={`tin-cup-claim-${player.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
          aria-disabled={!qr}
          className="press btn-primary t-body flex min-h-11 items-center justify-center gap-2"
        >
          <Download className="size-4" /> Download QR
        </a>
      </DialogContent>
    </Dialog>
  );
}

function PrintableClaimCard({ player }: { player: ClaimPlayer }) {
  const qr = useQr(player.id, 280);
  return (
    <article className="rounded-xl border border-border bg-background p-4 text-center print:break-inside-avoid print:border-black">
      <p className="t-micro">Tin Cup Invitational</p>
      <h3 className="t-title mt-1 text-foreground">{player.name}</h3>
      {player.teamName && <p className="t-micro mt-1">{player.teamName}</p>}
      {qr && (
        <img
          src={qr}
          alt={`Claim QR code for ${player.name}`}
          className="mx-auto mt-3 aspect-square w-44"
        />
      )}
      <p className="t-micro mt-2 text-foreground">Scan → sign in → confirm your spot</p>
    </article>
  );
}

export function ClaimQrSheet({ players }: { players: ClaimPlayer[] }) {
  return (
    <section
      className="surface space-y-3 p-4 print:border-0 print:p-0"
      aria-labelledby="claim-sheet-title"
    >
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div>
          <p className="t-micro">Onboarding</p>
          <h2 id="claim-sheet-title" className="t-section mt-1 text-foreground">
            Player claim sheet
          </h2>
          <p className="t-micro mt-1">
            Player-specific links survive sign-in and require confirmation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="press btn-quiet flex min-h-11 items-center gap-2 px-3"
        >
          <Printer className="size-4" /> Print
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2">
        {players.map((player) => (
          <PrintableClaimCard key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}
