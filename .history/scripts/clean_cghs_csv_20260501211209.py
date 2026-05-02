import re
import csv
from pathlib import Path

SRC = Path("data/converted.csv")
OUT = Path("data/converted_cleaned.csv")

ROW_RE = re.compile(r"(\d+)\s+([A-Z]{2}\d{3})\s+(.*?)\s+(\d{1,6})\s+(\d{1,6})\s+(\d{1,6})\s+([A-Za-z0-9\-\.,\(\)/&%:\s]+)")

FOOTER_RE = re.compile(r"5-16/CGHS\(HQ\)/HEC/2024\(PartI\).*", re.IGNORECASE)


def clean_text(text: str) -> str:
    text = FOOTER_RE.sub("", text)
    text = re.sub(r"\u00A0", " ", text)
    text = re.sub(r"[ ]{2,}", " ", text)
    return text


def parse_lines(lines):
    rows = []
    for line in lines:
        for m in ROW_RE.finditer(line):
            sr, code, proc, n1, n2, n3, cat = m.groups()
            rows.append([sr, code, proc.strip(), n1, n2, n3, cat.strip()])
    return rows


def main():
    txt = SRC.read_text(encoding='utf-8', errors='ignore')
    txt = clean_text(txt)
    lines = [l.strip() for l in txt.splitlines() if l.strip()]
    rows = parse_lines(lines)

    if not rows:
        print("No table rows parsed. Try relaxing the regex or inspecting the input file.")
        return

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(["SrNo","Code","Procedure","NonNABH","NABH","SuperSpeciality","Category"])
        for r in rows:
            w.writerow(r)

    print(f"Wrote {len(rows)} rows to {OUT}")


if __name__ == '__main__':
    main()
