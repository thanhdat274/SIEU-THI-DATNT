import json, sys, io
from collections import Counter, defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
D = "C:/Users/Admin/Desktop/GAME/dev/research-happytown/data/"
def load(n): return json.load(open(D + n + ".json", encoding="utf-8"))

f = load("furniture")
F = f["FURNITURE"]
print("== FURNITURE total:", len(F))
cats = Counter((x.get("cat") or x.get("_subC") or "?") for x in F)
print("theo cat:", dict(cats))
subs = Counter(x.get("_sub") or "?" for x in F)
print("theo sub:", dict(subs))
# giá
prices = [x.get("price", 0) for x in F if x.get("price")]
print("giá: min", min(prices), "max", max(prices), "n=", len(prices))
# biến thể màu: vbase items vs variants
vbase = [x for x in F if x.get("vbase")]
print("vbase:", len(vbase), "variants:", len(F) - len(vbase))
# seat count field?
keys = Counter()
for x in F[:200]: keys.update(x.keys())
print("keys phổ biến:", dict(keys))
# Ví dụ sofa dài (nhiều chỗ)
for x in F:
    if x.get("name") in ("Ghế sofa thư giãn dài", "Sofa góc L", "Ghế bành"):
        print("VÍ DỤ:", json.dumps(x, ensure_ascii=False))
# FURNISH catalog (95)
print("\n== FURNISH_CATALOG 95 món (bộ nhà):")
print(json.dumps(f["FURNISH_CATALOG"][:15], ensure_ascii=False))
print("\n== FURNISH3 ROOMS:", json.dumps(f["FURNISH3_ROOMS"], ensure_ascii=False)[:800])
print("\n== FURNISH3 WALLS:", json.dumps(f["FURNISH3_WALLS"], ensure_ascii=False)[:800])
print("\n== FURNISH6 VARS:", json.dumps(f["FURNISH6_VARS"], ensure_ascii=False)[:500])

ex = load("extras")
print("\n== MARKET_PLACES:", json.dumps(ex["MARKET_PLACES"], ensure_ascii=False)[:1500])
print("\n== STAFF_DEFS:", json.dumps(ex["STAFF_DEFS"], ensure_ascii=False)[:1200])
print("\n== PET_DEFS (tên):", [v.get("name") or v.get("vi") for v in (ex["PET_DEFS"] if isinstance(ex["PET_DEFS"], list) else ex["PET_DEFS"].values())][:30])
print("\n== TOPUP_PACKS:", json.dumps(ex["TOPUP_PACKS"], ensure_ascii=False)[:900])
print("\n== BUFFS_KINDS:", json.dumps(ex["BUFFS_KINDS"], ensure_ascii=False)[:900])
print("\n== VENUES_ITEMS n:", len(ex["VENUES_ITEMS"]), json.dumps(ex["VENUES_ITEMS"][:6] if isinstance(ex["VENUES_ITEMS"], list) else list(ex["VENUES_ITEMS"].items())[:6], ensure_ascii=False)[:800])
print("\n== STATION_CFG:", json.dumps(ex["STATION_CFG"], ensure_ascii=False)[:900])
