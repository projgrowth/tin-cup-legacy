#!/usr/bin/env python3
"""
Build src/data/geo/innisbrook-geo.json from Overpass OSM extracts.

Expects /tmp/osm-{hole,fairway,tee,bunker,water_hazard,lateral_water_hazard}.json
produced by scripts/fetch-innisbrook-osm.sh (or manual Overpass queries).

Data © OpenStreetMap contributors (ODbL).
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/geo/innisbrook-geo.json"


def load_ways(path: Path) -> list:
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
    except Exception:
        return []
    return [e for e in data.get("elements", []) if e.get("type") == "way" and e.get("geometry")]


def line_coords(geom: list) -> list:
    return [[p["lon"], p["lat"]] for p in geom]


def ring(geom: list) -> list:
    r = line_coords(geom)
    if r and r[0] != r[-1]:
        r = r + [r[0]]
    return r


def centroid(coords: list) -> list:
    return [
        sum(c[0] for c in coords) / len(coords),
        sum(c[1] for c in coords) / len(coords),
    ]


def dist2(a: list, b: list) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def bbox_of(coords: list, pad: float = 0.0004) -> list:
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return [min(lons) - pad, min(lats) - pad, max(lons) + pad, max(lats) + pad]


def expand_bbox(b: list, pad: float = 0.00025) -> list:
    return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]


def main() -> None:
    holes_json = json.loads((ROOT / "src/data/innisbrook-holes.json").read_text())
    scorecard = {}
    for cid, course in holes_json.items():
        for h in course["holes"]:
            scorecard[(cid, h["h"])] = {
                "par": h["par"],
                "yards": h["yards"],
                "name": h.get("name"),
            }

    tmp = Path("/tmp")
    hole_ways = load_ways(tmp / "osm-hole.json")
    fairway_ways = load_ways(tmp / "osm-fairway.json")
    bunker_ways = load_ways(tmp / "osm-bunker.json")
    tee_ways = load_ways(tmp / "osm-tee.json")
    water_ways = load_ways(tmp / "osm-water_hazard.json") + load_ways(
        tmp / "osm-lateral_water_hazard.json"
    )

    copper: list = []
    others: list = []
    named = {
        "Bridge Hole",
        "O'Alley",
        "Forced Carry",
        "Packard's Double Dogleg",
        "Snake Bite",
        "Moccasin",
        "The Copperhead",
        "The Rattler",
        "Hideaway",
        "Drop Off",
        "Bunkered",
        "Second Thoughts",
        "Narrow Neck",
        "Innisbrook's View",
        "Longview",
    }
    for w in hole_ways:
        t = w.get("tags") or {}
        desc = ((t.get("description") or t.get("desc") or "") + " " + (t.get("name") or "")).lower()
        coords = line_coords(w["geometry"])
        if len(coords) < 2:
            continue
        if not t.get("ref") or not str(t["ref"]).isdigit():
            continue
        rec = {
            "ref": int(t["ref"]),
            "par": int(t["par"]) if t.get("par") and str(t["par"]).isdigit() else None,
            "name": t.get("name"),
            "coords": coords,
            "center": centroid(coords),
            "id": w["id"],
            "copper": "copper" in desc or (t.get("name") or "") in named,
        }
        (copper if rec["copper"] else others).append(rec)

    copper_by: dict = {}
    for r in copper:
        prev = copper_by.get(r["ref"])
        if not prev or len(r["coords"]) > len(prev["coords"]):
            copper_by[r["ref"]] = r

    west = min(others, key=lambda o: o["center"][0])
    east = max(others, key=lambda o: o["center"][0])
    c0, c1 = west["center"][:], east["center"][:]
    g0: list = []
    g1: list = []
    for _ in range(12):
        g0, g1 = [], []
        for o in others:
            if dist2(o["center"], c0) <= dist2(o["center"], c1):
                g0.append(o)
            else:
                g1.append(o)
        if g0:
            c0 = centroid([o["center"] for o in g0])
        if g1:
            c1 = centroid([o["center"] for o in g1])

    if c0[0] < c1[0]:
        south_list, island_list = g0, g1
    else:
        south_list, island_list = g1, g0

    def uniq(rows: list) -> dict:
        by: dict = {}
        for r in rows:
            prev = by.get(r["ref"])
            if not prev or len(r["coords"]) > len(prev["coords"]):
                by[r["ref"]] = r
        return by

    south_by = uniq(south_list)
    island_by = uniq(island_list)

    def fill(by: dict, seed: list, label: str) -> None:
        for n in range(1, 19):
            if n in by:
                continue
            cands = [
                o
                for o in others
                if o["ref"] == n
                and o["id"] not in {x["id"] for x in by.values()}
                and o["id"] not in {x["id"] for x in copper_by.values()}
            ]
            if not cands:
                print(label, "missing", n)
                continue
            cent = centroid([o["center"] for o in by.values()]) if by else seed[0]["center"]
            cands.sort(key=lambda o: dist2(o["center"], cent))
            by[n] = cands[0]

    fill(south_by, south_list, "south")
    fill(island_by, island_list, "island")

    poly_layers = {
        "fairway": [ring(w["geometry"]) for w in fairway_ways],
        "bunker": [ring(w["geometry"]) for w in bunker_ways],
        "tee": [ring(w["geometry"]) for w in tee_ways],
        "water": [ring(w["geometry"]) for w in water_ways],
    }

    def polys_near(line: list, kind: str, max_d: float = 0.0012) -> list:
        mid = centroid(line)
        out = []
        for poly in poly_layers[kind]:
            if len(poly) < 3:
                continue
            if dist2(mid, centroid(poly)) <= max_d**2:
                out.append(poly)
        return out

    def build_hole(course_id: str, rec: dict) -> dict:
        coords = rec["coords"]
        sc = scorecard.get((course_id, rec["ref"]), {})
        return {
            "hole": rec["ref"],
            "par": sc.get("par") or rec.get("par") or 4,
            "blackYards": sc.get("yards") or 0,
            "name": sc.get("name") or rec.get("name"),
            "bounds": expand_bbox(bbox_of(coords, pad=0.0005), pad=0.00015),
            "tee": coords[0],
            "green": coords[-1],
            "playLine": coords,
            "fairways": polys_near(coords, "fairway", 0.0015),
            "bunkers": polys_near(coords, "bunker", 0.0014),
            "tees": polys_near(coords, "tee", 0.0011),
            "water": polys_near(coords, "water", 0.0016),
        }

    courses_out = {}
    for cid, by in [
        ("copperhead", copper_by),
        ("south", south_by),
        ("island", island_by),
    ]:
        holes = []
        for n in range(1, 19):
            if n not in by:
                print("STILL MISSING", cid, n)
                continue
            holes.append(build_hole(cid, by[n]))
        allc = [p for h in holes for p in h["playLine"]]
        courses_out[cid] = {
            "id": cid,
            "holes": holes,
            "holeCount": len(holes),
            "bounds": bbox_of(allc, pad=0.0009) if allc else None,
            "source": "OpenStreetMap · ODbL",
        }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(courses_out, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
