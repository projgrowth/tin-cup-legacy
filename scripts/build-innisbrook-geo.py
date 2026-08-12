#!/usr/bin/env python3
"""
Rebuild src/data/geo/innisbrook-geo.json from /tmp/osm-*.json Overpass extracts.

Improvements over v1:
- Length-aware hole assignment (match OSM play-line yards to Black scorecard)
- Synthetic fairway corridor when OSM fairway missing
- Proximity to play line (not just centroid) for bunkers/water
"""
from __future__ import annotations

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/geo/innisbrook-geo.json"
TMP = Path("/tmp")


def load_ways(name: str) -> list:
    path = TMP / name
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
    return [sum(c[0] for c in coords) / len(coords), sum(c[1] for c in coords) / len(coords)]


def dist2(a: list, b: list) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def hav_yards(a: list, b: list) -> float:
    r = 6_371_000 * 1.0936133
    lat1, lon1 = math.radians(a[1]), math.radians(a[0])
    lat2, lon2 = math.radians(b[1]), math.radians(b[0])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    x = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(x)))


def line_length(coords: list) -> float:
    return sum(hav_yards(coords[i - 1], coords[i]) for i in range(1, len(coords)))


def bbox_of(coords: list, pad: float = 0.0004) -> list:
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return [min(lons) - pad, min(lats) - pad, max(lons) + pad, max(lats) + pad]


def expand_bbox(b: list, pad: float = 0.00015) -> list:
    return [b[0] - pad, b[1] - pad, b[2] + pad, b[3] + pad]


def nearest_dist_to_line(pt: list, line: list) -> float:
    best = 1e18
    for i in range(1, len(line)):
        a, b = line[i - 1], line[i]
        for t in (0.0, 0.5, 1.0):
            q = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
            best = min(best, math.sqrt(dist2(pt, q)))
    return best


def corridor_poly(line: list, half_width_m: float = 30) -> list | None:
    if len(line) < 2:
        return None
    mid_lat = sum(p[1] for p in line) / len(line)
    m_lon = 111_320 * math.cos(math.radians(mid_lat))
    hw_lat = half_width_m / 111_320
    hw_lon = half_width_m / m_lon
    left, right = [], []
    for i, p in enumerate(line):
        if i < len(line) - 1:
            dx, dy = line[i + 1][0] - p[0], line[i + 1][1] - p[1]
        else:
            dx, dy = p[0] - line[i - 1][0], p[1] - line[i - 1][1]
        length = math.hypot(dx, dy) or 1e-9
        nx, ny = -dy / length, dx / length
        left.append([p[0] + nx * hw_lon, p[1] + ny * hw_lat])
        right.append([p[0] - nx * hw_lon, p[1] - ny * hw_lat])
    poly = left + list(reversed(right))
    if poly[0] != poly[-1]:
        poly = poly + [poly[0]]
    return poly


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

    hole_ways = load_ways("osm-hole.json")
    fairway_ways = load_ways("osm-fairway.json")
    bunker_ways = load_ways("osm-bunker.json")
    tee_ways = load_ways("osm-tee.json")
    water_ways = load_ways("osm-water_hazard.json") + load_ways("osm-lateral_water_hazard.json")
    green_ways = load_ways("osm-green.json")

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

    copper, others = [], []
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
            "len": line_length(coords),
            "copper": "copper" in desc or (t.get("name") or "") in named,
        }
        (copper if rec["copper"] else others).append(rec)

    copper_by = {}
    for r in copper:
        sc = scorecard[("copperhead", r["ref"])]
        prev = copper_by.get(r["ref"])
        if not prev or abs(prev["len"] - sc["yards"]) > abs(r["len"] - sc["yards"]):
            copper_by[r["ref"]] = r

    west = min(others, key=lambda o: o["center"][0])
    east = max(others, key=lambda o: o["center"][0])
    c0, c1 = west["center"][:], east["center"][:]
    g0, g1 = [], []
    for _ in range(15):
        g0, g1 = [], []
        for o in others:
            (g0 if dist2(o["center"], c0) <= dist2(o["center"], c1) else g1).append(o)
        if g0:
            c0 = centroid([o["center"] for o in g0])
        if g1:
            c1 = centroid([o["center"] for o in g1])
    if c0[0] < c1[0]:
        south_list, island_list = g0, g1
    else:
        south_list, island_list = g1, g0

    def assign_course(pool: list, course_id: str) -> dict:
        remaining = pool[:]
        assigned = {}
        for n in range(1, 19):
            sc = scorecard[(course_id, n)]
            best, best_score = None, 1e18
            for o in remaining:
                len_err = abs(o["len"] - sc["yards"]) / max(sc["yards"], 1)
                ref_pen = 0 if o["ref"] == n else 0.35
                par_pen = 0 if (o["par"] is None or o["par"] == sc["par"]) else 0.25
                s = len_err + ref_pen + par_pen
                if s < best_score:
                    best_score, best = s, o
            if best:
                assigned[n] = best
                remaining = [o for o in remaining if o["id"] != best["id"]]
        return assigned

    south_by = assign_course(south_list, "south")
    island_by = assign_course(island_list, "island")

    for by, cid in ((south_by, "south"), (island_by, "island")):
        for n in range(1, 19):
            if n in by:
                continue
            sc = scorecard[(cid, n)]
            used = {x["id"] for x in by.values()} | {x["id"] for x in copper_by.values()}
            cands = [o for o in others if o["id"] not in used]
            if not cands:
                print(cid, "missing", n)
                continue
            cands.sort(key=lambda o: abs(o["len"] - sc["yards"]))
            by[n] = cands[0]

    poly_layers = {
        "fairway": [ring(w["geometry"]) for w in fairway_ways],
        "bunker": [ring(w["geometry"]) for w in bunker_ways],
        "tee": [ring(w["geometry"]) for w in tee_ways],
        "water": [ring(w["geometry"]) for w in water_ways],
        "green": [ring(w["geometry"]) for w in green_ways],
    }

    def polys_near_line(line: list, kind: str, max_d: float = 0.0016) -> list:
        out = []
        for poly in poly_layers[kind]:
            if len(poly) < 3:
                continue
            if nearest_dist_to_line(centroid(poly), line) <= max_d:
                out.append(poly)
        return out

    def build_hole(course_id: str, rec: dict) -> dict:
        coords = rec["coords"]
        sc = scorecard[(course_id, rec["ref"])]
        real_fw = polys_near_line(coords, "fairway", 0.0018)
        fw = real_fw
        if not fw:
            c = corridor_poly(coords, half_width_m=32 if sc["par"] >= 4 else 24)
            if c:
                fw = [c]
        return {
            "hole": rec["ref"],
            "par": sc["par"],
            "blackYards": sc["yards"],
            "name": sc.get("name") or rec.get("name"),
            "bounds": expand_bbox(bbox_of(coords, pad=0.00045)),
            "tee": coords[0],
            "green": coords[-1],
            "playLine": coords,
            "fairways": fw,
            "bunkers": polys_near_line(coords, "bunker", 0.0015)[:16],
            "tees": polys_near_line(coords, "tee", 0.0012),
            "water": polys_near_line(coords, "water", 0.0018),
            "greens": polys_near_line(coords, "green", 0.0012),
        }

    courses_out = {}
    for cid, by in (
        ("copperhead", copper_by),
        ("south", south_by),
        ("island", island_by),
    ):
        holes = []
        for n in range(1, 19):
            if n not in by:
                print("STILL MISSING", cid, n)
                continue
            rec = dict(by[n])
            rec["ref"] = n
            holes.append(build_hole(cid, rec))
        allc = [p for h in holes for p in h["playLine"]]
        courses_out[cid] = {
            "id": cid,
            "holes": holes,
            "holeCount": len(holes),
            "bounds": bbox_of(allc, pad=0.0009) if allc else None,
            "source": "OpenStreetMap · ODbL",
        }
        print(cid, len(holes))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(courses_out, separators=(",", ":")))
    print("wrote", OUT, OUT.stat().st_size)


if __name__ == "__main__":
    main()
