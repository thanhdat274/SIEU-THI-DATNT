import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
D = "C:/Users/Admin/Desktop/GAME/dev/research-happytown/data/"

def load(n):
    return json.load(open(D + n + ".json", encoding="utf-8"))

core = load("data-core")
print("== BUILDINGS:", len(core["BUILDINGS"]))
for k, v in core["BUILDINGS"].items():
    print(f"  {k} | {v.get('name')} | {v.get('price')} xu | lv{v.get('level')} | size{v.get('size')} | cap={v.get('cap')} | {str(v.get('desc'))[:60]}")
print("== ZONES:", len(core["ZONES"]))
for k, v in core["ZONES"].items():
    print(f"  lv{v.get('level')} {k} | {v.get('name')} | {str(v.get('desc'))[:70]}")
print("== LEVEL_UNLOCKS:", json.dumps(core["LEVEL_UNLOCKS"], ensure_ascii=False)[:900])
print("== BARN:", json.dumps(core["BARN"], ensure_ascii=False)[:400])
print("== CROPS n=", len(core["CROPS"]))
prices = [(v["name"], v["seedPrice"], v["sell"], v["grow"], v["xp"], v["level"]) for v in core["CROPS"].values()]
for p in prices[:8]: print("  ", p)
print("== ANIMALS n=", len(core["ANIMALS"]))
for k, v in list(core["ANIMALS"].items()):
    print(f"  {k} | {v['name']} | {v['price']} xu | {v.get('productName')} bán {v.get('sell')} | mỗi {v.get('every')}s | lv{v.get('level')}")
print("== PRODUCTS n=", len(core["PRODUCTS"]), "| craft:", sum(1 for v in core["PRODUCTS"].values() if v.get("craft")))
print("== P4 =", json.dumps(core["P4"], ensure_ascii=False)[:1200])
