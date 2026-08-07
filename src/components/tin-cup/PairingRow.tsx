import { AvatarPair } from "@/components/tin-cup/Avatar";

export type PairingPerson = {
  name: string;
  teamSlug?: string | null;
  src?: string | null;
};

/** Quiet match/Day-1 row: faces + short labels, optional highlight. */
export function PairingRow({
  index,
  sideALabel,
  sideBLabel,
  sideAPeople,
  sideBPeople,
  highlight = false,
  meta,
}: {
  index?: number | string;
  sideALabel: string;
  sideBLabel: string;
  sideAPeople: PairingPerson[];
  sideBPeople: PairingPerson[];
  highlight?: boolean;
  meta?: string;
}) {
  return (
    <li
      className={`flex items-center gap-2.5 px-3.5 py-3 ${
        highlight ? "bg-secondary/45" : ""
      }`}
    >
      {index != null && (
        <span className="t-micro w-4 shrink-0 tabular-nums text-muted-foreground">{index}</span>
      )}
      <AvatarPair people={sideAPeople} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="t-body truncate font-medium leading-tight text-foreground">
          <span className="text-gold-light">{sideALabel}</span>
          <span className="mx-1.5 text-muted-foreground">vs</span>
          <span className="text-copper">{sideBLabel}</span>
        </p>
        {(meta || highlight) && (
          <p className="t-micro mt-0.5 truncate text-muted-foreground">
            {highlight ? "You · " : ""}
            {meta}
          </p>
        )}
      </div>
      <AvatarPair people={sideBPeople} size="sm" />
    </li>
  );
}
