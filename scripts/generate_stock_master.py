#!/usr/bin/env python3
import csv
import io
import os
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_ENV = ROOT_DIR / "backend" / ".env"
OUTPUT_FILE = ROOT_DIR / "backend" / "src" / "main" / "resources" / "data" / "stock_master.csv"

OPENDART_CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml"
NASDAQ_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/nasdaqlisted.txt"
OTHER_LISTED_URL = "https://www.nasdaqtrader.com/dynamic/symdir/otherlisted.txt"

FIELD_NAMES = [
    "symbol",
    "name",
    "country",
    "exchange",
    "market",
    "currency",
    "corpCode",
    "source",
]

OTHER_EXCHANGE_MAP = {
    "A": "NYSE_AMERICAN",
    "N": "NYSE",
    "P": "NYSE_ARCA",
    "Z": "CBOE_BZX",
    "V": "IEX",
}


def main():
    env = load_env(BACKEND_ENV)
    rows = []

    opendart_key = env.get("OPENDART_API_KEY", "")
    if opendart_key:
        rows.extend(fetch_opendart_rows(opendart_key))
    else:
        print("OPENDART_API_KEY is missing. Korean stock master rows were skipped.")

    rows.extend(fetch_nasdaq_rows())
    rows.extend(fetch_other_listed_rows())

    rows = deduplicate(rows)
    rows.sort(key=lambda row: (row["country"], row["symbol"]))
    write_csv(rows)

    print(f"Wrote {len(rows):,} rows to {OUTPUT_FILE.relative_to(ROOT_DIR)}")


def load_env(path):
    env = {}
    if not path.exists():
        return env

    for line in path.read_text(encoding="utf-8").splitlines():
        value = line.strip()
        if not value or value.startswith("#") or "=" not in value:
            continue

        key, raw_value = value.split("=", 1)
        env[key.strip()] = raw_value.strip()

    return env


def fetch_opendart_rows(api_key):
    query = urllib.parse.urlencode({"crtfc_key": api_key})
    payload = download_bytes(f"{OPENDART_CORP_CODE_URL}?{query}")

    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        xml_name = archive.namelist()[0]
        xml_bytes = archive.read(xml_name)

    root = ElementTree.fromstring(xml_bytes)
    rows = []

    for item in root.findall("list"):
        stock_code = get_xml_text(item, "stock_code")
        if not stock_code:
            continue

        rows.append(
            {
                "symbol": stock_code,
                "name": get_xml_text(item, "corp_name"),
                "country": "KR",
                "exchange": "KRX",
                "market": "",
                "currency": "KRW",
                "corpCode": get_xml_text(item, "corp_code"),
                "source": "OPENDART",
            }
        )

    return rows


def fetch_nasdaq_rows():
    text = download_text(NASDAQ_LISTED_URL)
    rows = []

    for item in pipe_dict_rows(text):
        symbol = item.get("Symbol", "").strip()
        if not symbol or symbol == "File Creation Time":
            continue
        if item.get("Test Issue", "").strip() != "N":
            continue

        rows.append(
            {
                "symbol": symbol,
                "name": item.get("Security Name", "").strip(),
                "country": "US",
                "exchange": "NASDAQ",
                "market": item.get("Market Category", "").strip(),
                "currency": "USD",
                "corpCode": "",
                "source": "NASDAQ_TRADER",
            }
        )

    return rows


def fetch_other_listed_rows():
    text = download_text(OTHER_LISTED_URL)
    rows = []

    for item in pipe_dict_rows(text):
        symbol = item.get("ACT Symbol", "").strip()
        if not symbol or symbol == "File Creation Time":
            continue
        if item.get("Test Issue", "").strip() != "N":
            continue

        exchange_code = item.get("Exchange", "").strip()
        rows.append(
            {
                "symbol": symbol,
                "name": item.get("Security Name", "").strip(),
                "country": "US",
                "exchange": OTHER_EXCHANGE_MAP.get(exchange_code, exchange_code),
                "market": "",
                "currency": "USD",
                "corpCode": "",
                "source": "NASDAQ_TRADER_OTHER",
            }
        )

    return rows


def pipe_dict_rows(text):
    reader = csv.DictReader(io.StringIO(text), delimiter="|")
    for row in reader:
        if row:
            yield row


def deduplicate(rows):
    deduped = {}
    for row in rows:
        key = f"{row['country']}:{row['symbol']}"
        if key not in deduped:
            deduped[key] = row

    return list(deduped.values())


def write_csv(rows):
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as output:
        writer = csv.DictWriter(output, fieldnames=FIELD_NAMES)
        writer.writeheader()
        writer.writerows(rows)


def download_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": "stock-viewer/1.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def download_text(url):
    return download_bytes(url).decode("utf-8", errors="replace")


def get_xml_text(parent, tag_name):
    value = parent.findtext(tag_name, default="")
    return value.strip()


if __name__ == "__main__":
    main()
