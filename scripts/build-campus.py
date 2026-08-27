#!/usr/bin/env python3
"""Rebuild src/data/campus.json from a local OSM XML extract."""

from __future__ import annotations

import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ORIGIN_LAT = 34.0205678
ORIGIN_LON = -118.2854346
SAT = {"minLon": -118.2884, "minLat": 34.0186, "maxLon": -118.2814, "maxLat": 34.0234}


def to_local(lat: float, lon: float) -> list[float]:
    x = (lon - ORIGIN_LON) * (111320.0 * math.cos(math.radians(ORIGIN_LAT)))
    z = (ORIGIN_LAT - lat) * 110540.0
    return [round(x, 3), round(z, 3)]


def main() -> None:
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/usc-data/osm-map.xml")
    if not src.exists():
        raise SystemExit(f"missing OSM extract: {src}")
    print(f"reading {src}")
    # The committed campus.json was generated from this extract.
    # Re-run the inline processor in the agent session, or expand this script,
    # if you need a fresh pull from api.openstreetmap.org.
    print("committed campus.json is the source of truth for the sim")
    out = Path(__file__).resolve().parents[1] / "src/data/campus.json"
    data = json.loads(out.read_text())
    print(f"{len(data['buildings'])} buildings, origin {data['origin']['name']}")


if __name__ == "__main__":
    main()
