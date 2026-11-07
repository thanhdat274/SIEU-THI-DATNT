"""Trich bai Huong dan (help) tieng Viet tu file ban dia hoa cua game de nghien cuu chuc nang.
Nhan path file JS. Chi doc noi bo.
"""
import re, sys, json

data = open(sys.argv[1], encoding="utf-8", errors="ignore").read()

# Tim khoi tieng Viet: bat dau tu "vi" locale. Thuong file co dạng { "en":{...}, "vi":{...} }
# Tim vung vn: doan sau '"vn":' hoac '"vi":'
keys = ["tab","intro","body"]
out = {}
for k in keys:
    # pattern: "help.<k>_<name>":[ value ]
    for m in re.finditer(r'"help\.(%s)_([a-zA-Z0-9_]+)"\s*:\s*(`[^`]*`|"[^"]*")' % k, data):
        name, v = m.group(1), m.group(2)
        pass

# Cach don gian hon: loc cac gia tri tieng Viet (co dau) bang cach lay chuoi dau tien cua moi key.
# Moi key xuat hien 12 lan (12 ngon ngu); lay lan xuat hien DAU TIEN (thuong la tieng Viet).
seen = {}
for k in ["tab","intro","body"]:
    for m in re.finditer(r'"help\.(%s)_([a-zA-Z0-9_]+)"\s*:\s*(?:(`)([^`]*)(`)|"((?:[^"\\]|\\.)*)")' % k, data):
        kind, name, mt, body, _, sbody = m.groups()
        val = body if mt else sbody
        v = (val or "") #.encode().decode('unicode_escape', errors='ignore')
        key = (k, name)
        if key not in seen:
            seen[key] = v

# sap xep theo ten
order = {}
for (k, name), v in seen.items():
    order.setdefault(name, {})
    order[name][k] = v
for name in sorted(order, key=lambda n: (n not in ("basics","kitchen","staff","customers","machines","toilet","pantry","daily","level","rating","offline"), n)):
    d = order[name]
    print("="*70)
    print("## " + name)
    for k in ["tab","intro","body"]:
        if k in d:
            print(f"[{k}] {d[k]}")
