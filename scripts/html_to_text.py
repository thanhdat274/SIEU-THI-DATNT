import sys, re
from html.parser import HTMLParser

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.skip = 0
        self.out = []
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "nav", "header", "footer"):
            self.skip += 1
        if tag in ("h1", "h2", "h3", "h4", "p", "li", "tr", "br", "table"):
            self.out.append("\n")
        if tag in ("td", "th"):
            self.out.append(" | ")
    def handle_endtag(self, tag):
        if tag in ("script", "style", "nav", "header", "footer") and self.skip:
            self.skip -= 1
    def handle_data(self, d):
        if not self.skip:
            self.out.append(d)

for path in sys.argv[1:]:
    p = P()
    p.feed(open(path, encoding="utf-8", errors="replace").read())
    txt = "".join(p.out)
    txt = re.sub(r"\n\s*\n+", "\n", txt)
    out = path.rsplit(".", 1)[0] + ".txt"
    open(out, "w", encoding="utf-8").write(txt)
    print(out, len(txt))
