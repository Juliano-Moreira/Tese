# gen_index.py
import json
import pathlib
import pandas as pd
from urllib.parse import quote

ROOT = pathlib.Path(__file__).parent.resolve()
# Procura todos os .xlsx em ".../Resultados/Estudo de Caso */Resultado Final/"
GLOB = ROOT.glob("Resultados/Estudo de Caso */Resultado Final/*.xlsx")
OUT  = ROOT / "index.json"

def sniff_xlsx_columns(path: pathlib.Path, nrows=1):
    try:
        df = pd.read_excel(path, sheet_name=0, nrows=nrows)
        return [str(c) for c in df.columns]
    except Exception as e:
        return {"error": str(e)}

def main():
    files = []
    for p in sorted(GLOB):
        rel = p.relative_to(ROOT).as_posix()          # caminho relativo
        url = quote(rel, safe="/")                    # URL encode (espaços -> %20)
        meta = {
            "name": p.name,
            "folder": p.parent.as_posix(),            # ex.: Resultados/Estudo de Caso 1/Resultado Final
            "relpath": rel,
            "url": url,
        }
        cols = sniff_xlsx_columns(p)
        if isinstance(cols, dict):
            meta["error"] = cols["error"]
            meta["cols"] = []
        else:
            meta["cols"] = cols
        files.append(meta)

    OUT.write_text(json.dumps({"files": files}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] index.json gerado com {len(files)} arquivo(s).")

if __name__ == "__main__":
    main()
