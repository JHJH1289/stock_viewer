"""
한국투자증권 API에서 각 종목의 현재가와 시가총액을 가져와 저장

실행
    python etl/scripts/02_make_market_snapshot_2024_all.py --delay 0.5

    기존에 저장된 market_snapshot.csv를 무시하고 처음부터 다시 받고 싶으면:
    python etl/scripts/02_make_market_snapshot_2024_all.py --overwrite

"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
from datetime import date
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = PROJECT_ROOT / "etl" / "processed" / "2024" / "financial_base.csv" 
DEFAULT_OUTPUT = PROJECT_ROOT / "etl" / "processed" / "2024" / "market_snapshot.csv" # 성공한 기업
DEFAULT_FAILED = PROJECT_ROOT / "etl" / "processed" / "2024" / "market_snapshot_failed.csv" # 실패한 기업(제무제표에 아무 정보가 없는 경우)
# 한국투자증권 API 키 읽음
DEFAULT_ENV = PROJECT_ROOT / "backend" / ".env"

DOMESTIC_PRICE_PATH = "/uapi/domestic-stock/v1/quotations/inquire-price"
TOKEN_PATH = "/oauth2/tokenP"
DOMESTIC_PRICE_TR_ID = "FHKST01010100"
# 종목코드, 가격 조회 날짜, 현재가, 시가총액
OUTPUT_FIELDS = ["symbol", "price_date", "price", "market_cap"]
FAILED_FIELDS = ["symbol", "name", "reason"]


def load_dotenv(path: Path) -> None:
    """간단한 .env 로더. 이미 OS 환경변수에 값이 있으면 덮어쓰지 않습니다."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="KIS 2024 통합 대상 종목 현재가/시가총액 수집")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="financial_base.csv 경로")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="market_snapshot.csv 출력 경로")
    parser.add_argument("--failed-output", type=Path, default=DEFAULT_FAILED, help="실패 종목 CSV 경로")
    parser.add_argument("--env", type=Path, default=DEFAULT_ENV, help=".env 파일 경로")
    parser.add_argument("--base-url", default=None, help="KIS_BASE_URL 직접 지정")
    parser.add_argument("--limit", type=int, default=None, help="테스트용 최대 조회 개수. 지정하지 않으면 전체 조회")
    parser.add_argument("--delay", type=float, default=0.25, help="종목 조회 사이 대기 초. 호출 제한 방지용")
    parser.add_argument("--save-every", type=int, default=50, help="N개 성공할 때마다 CSV 저장")
    parser.add_argument("--overwrite", action="store_true", help="기존 market_snapshot.csv를 무시하고 처음부터 다시 수집")
    parser.add_argument("--max-retries", type=int, default=3, help="종목별 재시도 횟수")
    return parser.parse_args()

# financial_base.csv 읽기(symbol과 name만 가져옴)
def read_financial_base(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"financial_base.csv를 찾을 수 없습니다: {path}")

    rows: list[dict[str, str]] = []
    with path.open(newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        required = {"symbol", "name"}
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"financial_base.csv에 필요한 컬럼이 없습니다: {sorted(missing)}")

        seen: set[str] = set()
        for row in reader:
            symbol = normalize_symbol(row.get("symbol", ""))
            if not symbol or symbol in seen:
                continue
            seen.add(symbol)
            rows.append({"symbol": symbol, "name": row.get("name", "")})

    return rows

# 종목코드 6자리로 맞춤
def normalize_symbol(value: Any) -> str:
    symbol = str(value).strip()
    if not symbol or symbol.lower() == "nan":
        return ""
    # CSV가 숫자로 저장/로드되었을 때 20.0처럼 들어오는 경우 보정
    if symbol.endswith(".0") and symbol.replace(".0", "").isdigit():
        symbol = symbol[:-2]
    return symbol.zfill(6)


def read_existing_success(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8-sig") as file:
        return list(csv.DictReader(file))

# csv 저장
def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in fieldnames})
    tmp_path.replace(path)


def build_url(base_url: str, path: str, query: dict[str, str] | None = None) -> str:
    base_url = base_url.rstrip("/")
    url = f"{base_url}{path}"
    if query:
        url = f"{url}?{urlencode(query)}"
    return url

# API 요청
def request_json(method: str, url: str, headers: dict[str, str] | None = None, body: dict[str, Any] | None = None) -> dict[str, Any]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = Request(url, data=data, method=method.upper())
    for key, value in (headers or {}).items():
        req.add_header(key, value)

    with urlopen(req, timeout=20) as response:
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def get_access_token(base_url: str, app_key: str, app_secret: str) -> str:
    url = build_url(base_url, TOKEN_PATH)
    body = {
        "grant_type": "client_credentials",
        "appkey": app_key,
        "appsecret": app_secret,
    }
    response = request_json(
        "POST",
        url,
        headers={"content-type": "application/json; charset=utf-8"},
        body=body,
    )
    token = response.get("access_token")
    if not token:
        raise RuntimeError(f"KIS access token 발급 실패: {response}")
    return str(token)

# 숫자 파싱
def parse_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).replace(",", "").strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def normalize_market_cap(raw_market_cap: float | None, price: float | None, listed_shares: float | None) -> float | None:
    """
    KIS 주식현재가 시세 output의 hts_avls는 보통 '억원' 단위로 제공.
    기존 샘플 CSV는 원 단위 market_cap을 사용하므로, 작은 값은 억 원 → 원으로 변환.
    hts_avls가 없으면 상장주식수 * 현재가로 보정.
    """
    if raw_market_cap and raw_market_cap > 0:
        # 1e10 미만이면 원 단위 시총이라기보다 억 원 단위 값일 가능성이 큼
        if raw_market_cap < 10_000_000_000:
            return raw_market_cap * 100_000_000
        return raw_market_cap

    if price and listed_shares and price > 0 and listed_shares > 0:
        return price * listed_shares

    return None

# 현재가 조회
def fetch_domestic_quote(base_url: str, app_key: str, app_secret: str, token: str, symbol: str) -> dict[str, Any]:
    url = build_url(
        base_url,
        DOMESTIC_PRICE_PATH,
        {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": symbol,
        },
    )
    response = request_json(
        "GET",
        url,
        headers={
            "authorization": f"Bearer {token}",
            "content-type": "application/json; charset=utf-8",
            "appKey": app_key,
            "appSecret": app_secret,
            "tr_id": DOMESTIC_PRICE_TR_ID,
            "custtype": "P",
        },
    )

    rt_cd = str(response.get("rt_cd", ""))
    if rt_cd and rt_cd != "0":
        message_code = response.get("msg_cd", "UNKNOWN")
        message = response.get("msg1", "KIS request failed")
        raise RuntimeError(f"{message_code} {message}")

    output = response.get("output") or {}
    if not isinstance(output, dict):
        raise RuntimeError(f"KIS output 형식이 올바르지 않습니다: {output}")

    price = parse_float(output.get("stck_prpr"))
    raw_market_cap = parse_float(output.get("hts_avls") or output.get("mrkt_tot_amt"))
    listed_shares = parse_float(output.get("lstn_stcn"))
    market_cap = normalize_market_cap(raw_market_cap, price, listed_shares)

    if price is None or market_cap is None:
        raise RuntimeError(f"price/market_cap 파싱 실패: stck_prpr={output.get('stck_prpr')}, hts_avls={output.get('hts_avls')}, lstn_stcn={output.get('lstn_stcn')}")

    return {
        "symbol": symbol,
        "price_date": date.today().isoformat(),
        "price": price,
        "market_cap": market_cap,
    }

# 재시도 처리
def fetch_with_retry(base_url: str, app_key: str, app_secret: str, token: str, symbol: str, max_retries: int) -> dict[str, Any]:
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 1):
        try:
            return fetch_domestic_quote(base_url, app_key, app_secret, token, symbol)
        except HTTPError as error:
            last_error = error
            # 인증 만료/일시 제한/서버 오류는 대기 후 재시도
            if error.code not in {401, 429, 500, 502, 503, 504}:
                break
        except (URLError, TimeoutError, RuntimeError) as error:
            last_error = error
        time.sleep(min(2 ** attempt, 10))

    raise RuntimeError(str(last_error) if last_error else "unknown error")


def main() -> int:
    args = parse_args()
    load_dotenv(args.env)

    app_key = os.environ.get("KIS_APP_KEY", "").strip()
    app_secret = os.environ.get("KIS_APP_SECRET", "").strip()
    base_url = (args.base_url or os.environ.get("KIS_BASE_URL") or "https://openapi.koreainvestment.com:9443").strip()

    if not app_key or not app_secret:
        print("KIS_APP_KEY 또는 KIS_APP_SECRET이 없습니다. backend/.env를 확인하세요.", file=sys.stderr)
        return 1

    if not urlparse(base_url).scheme:
        print(f"KIS_BASE_URL 형식이 올바르지 않습니다: {base_url}", file=sys.stderr)
        return 1

    financial_rows = read_financial_base(args.input)
    if args.limit:
        financial_rows = financial_rows[: args.limit]

    existing_rows = [] if args.overwrite else read_existing_success(args.output)
    existing_symbols = {normalize_symbol(row.get("symbol", "")) for row in existing_rows}
    success_rows: list[dict[str, Any]] = [
        {
            "symbol": normalize_symbol(row.get("symbol", "")),
            "price_date": row.get("price_date", ""),
            "price": row.get("price", ""),
            "market_cap": row.get("market_cap", ""),
        }
        for row in existing_rows
        if normalize_symbol(row.get("symbol", ""))
    ]
    failed_rows: list[dict[str, str]] = []

    targets = [row for row in financial_rows if row["symbol"] not in existing_symbols]

    print("market_snapshot 생성 시작")
    print(f"프로젝트 루트: {PROJECT_ROOT}")
    print(f"입력 경로: {args.input}")
    print(f"출력 경로: {args.output}")
    print(f"전체 대상: {len(financial_rows):,}개")
    print(f"이미 수집됨: {len(existing_symbols):,}개")
    print(f"이번 실행 대상: {len(targets):,}개")

    token = get_access_token(base_url, app_key, app_secret)
    print("KIS access token 발급 완료")

    success_count = 0
    for index, row in enumerate(targets, start=1):
        symbol = row["symbol"]
        name = row.get("name", "")
        try:
            quote = fetch_with_retry(base_url, app_key, app_secret, token, symbol, args.max_retries)
            success_rows.append(quote)
            success_count += 1
            print(f"[{index}/{len(targets)}] OK {symbol} {name} price={quote['price']} market_cap={quote['market_cap']}")
        except Exception as error:  # noqa: BLE001 - 실패 종목을 계속 수집하기 위함
            failed_rows.append({"symbol": symbol, "name": name, "reason": str(error)})
            print(f"[{index}/{len(targets)}] FAIL {symbol} {name}: {error}")

        if success_count > 0 and success_count % args.save_every == 0:
            write_csv(args.output, success_rows, OUTPUT_FIELDS)
            write_csv(args.failed_output, failed_rows, FAILED_FIELDS)
            print(f"중간 저장 완료: 성공 {len(success_rows):,}개, 실패 {len(failed_rows):,}개")

        if args.delay > 0:
            time.sleep(args.delay)

    write_csv(args.output, success_rows, OUTPUT_FIELDS)
    write_csv(args.failed_output, failed_rows, FAILED_FIELDS)
    print("market_snapshot 생성 완료")
    print(f"성공: {len(success_rows):,}개")
    print(f"실패: {len(failed_rows):,}개")
    print(f"저장: {args.output}")
    print(f"실패 목록: {args.failed_output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
