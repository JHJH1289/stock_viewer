"""
OpenDART 2023년 연결 재무제표 원본을 일반/금융기타/은행/보험/증권까지 통합해
valuation 계산용 financial_base.csv를 생성

입력 기본 경로
- etl/raw/dart/2023/bs/{general,finance,bank,insurance,securities}/*.txt
- etl/raw/dart/2023/pl/{general,finance,bank,insurance,securities}/*.txt

출력 기본 경로
- etl/processed/2023/financial_base.csv

실행
    python etl/scripts/01_make_financial_base_2023_all.py

주의
- OpenDART 원본 파일에는 corpCode가 없으므로, 기존 general/financial_base.csv에 corpCode가 있으면
  일반기업 corpCode만 보조로 채움. 금융업 corpCode는 빈 값일 수 있음
- 종목코드가 [null]인 비상장/기타법인은 제외
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

# 파일 위치 기준으로 프로젝트 루트 찾음
PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "etl" / "raw" / "dart" / "2023" # 원본 데이터 폳더
PROCESSED_ROOT = PROJECT_ROOT / "etl" / "processed" / "2023"
DEFAULT_OUTPUT = PROCESSED_ROOT / "financial_base.csv"
DEFAULT_GENERAL_BASE = PROCESSED_ROOT / "general" / "financial_base.csv"

# 업종별 원본 데이터 읽음
SECTOR_CONFIG = {
    "general": {"sector_name": "일반", "bs_subdir": "general", "pl_subdir": "general"},
    "finance": {"sector_name": "금융기타", "bs_subdir": "finance", "pl_subdir": "finance"},
    "bank": {"sector_name": "은행", "bs_subdir": "bank", "pl_subdir": "bank"},
    "insurance": {"sector_name": "보험", "bs_subdir": "insurance", "pl_subdir": "insurance"},
    "securities": {"sector_name": "증권", "bs_subdir": "securities", "pl_subdir": "securities"},
}

OUTPUT_COLUMNS = [
    "symbol",
    "corpCode",
    "name",
    "year",
    "fiscal_date",
    "currency",
    "sector_group",
    "sector_name",
    "market_type",
    "industry_code",
    "industry_name",
    "total_assets",
    "total_liabilities",
    "total_equity",
    "net_income",
    "operating_income",
    "revenue",
]

KEY_COLUMNS = [
    "symbol",
    "name",
    "fiscal_date",
    "currency",
    "sector_group",
    "sector_name",
    "market_type",
    "industry_code",
    "industry_name",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="OpenDART 2023 통합 financial_base 생성")
    parser.add_argument("--raw-root", type=Path, default=RAW_ROOT, help="etl/raw/dart/2023 경로")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="통합 financial_base.csv 출력 경로")
    parser.add_argument("--general-base", type=Path, default=DEFAULT_GENERAL_BASE, help="corpCode 보조 입력 CSV")
    parser.add_argument("--include-non-listed", action="store_true", help="[null] 종목코드도 포함")
    return parser.parse_args()


DART_REQUIRED_COLUMNS = [
    "종목코드",
    "회사명",
    "시장구분",
    "업종",
    "업종명",
    "결산기준일",
    "통화",
    "항목코드",
    "항목명",
    "당기",
]

DART_BASE_COLUMNS = [
    "재무제표종류",
    "종목코드",
    "회사명",
    "시장구분",
    "업종",
    "업종명",
    "결산월",
    "결산기준일",
    "보고서종류",
    "통화",
    "항목코드",
    "항목명",
    "당기",
    "전기",
    "전전기",
]


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out.columns = (
        out.columns.astype(str)
        .str.replace("\ufeff", "", regex=False)
        .str.strip()
    )
    return out

# 원본 데이터 파일 읽음
def read_dart_txt(path: Path) -> pd.DataFrame:

    candidates: list[tuple[int, str, pd.DataFrame]] = []
    errors: list[str] = []

    for encoding in ("cp949", "euc-kr", "utf-8-sig", "utf-8"):
        try:
            df = pd.read_csv(path, sep="\t", dtype="string", encoding=encoding, low_memory=False)
            df = normalize_columns(df)
            score = sum(column in df.columns for column in DART_REQUIRED_COLUMNS) # 필요한 칼럼이 잘 있는지 확인하는 점수
            candidates.append((score, encoding, df))
        except Exception as error:  # noqa: BLE001
            errors.append(f"{encoding}: {error}")

    if not candidates:
        raise RuntimeError(f"파일 읽기 실패: {path} / {' | '.join(errors)}")

    candidates.sort(key=lambda item: item[0], reverse=True)
    best_score, best_encoding, best_df = candidates[0]

    if best_score < len(DART_REQUIRED_COLUMNS) and len(best_df.columns) >= len(DART_BASE_COLUMNS):
        # 파일 인코딩 문제로 컬럼명을 복구
        repaired = best_df.copy()
        extra_columns = list(repaired.columns[len(DART_BASE_COLUMNS):])
        repaired.columns = DART_BASE_COLUMNS + extra_columns
        repaired = normalize_columns(repaired)
        repaired_score = sum(column in repaired.columns for column in DART_REQUIRED_COLUMNS)
        if repaired_score > best_score:
            print(f"컬럼명 위치 기준 복구: {path} / encoding={best_encoding}")
            return repaired

    if best_score < len(DART_REQUIRED_COLUMNS):
        print(f"경고: 필요한 컬럼 일부를 찾지 못했습니다: {path}")
        print(f"선택 encoding={best_encoding}, 컬럼={best_df.columns.tolist()}")

    return best_df

# 텍스트를 읽어 하나의 데이터(DataFrame)로 합침
def read_all_txt(directory: Path) -> pd.DataFrame:
    files = sorted(directory.glob("*.txt"))
    if not files:
        raise FileNotFoundError(f"DART txt 파일을 찾을 수 없습니다: {directory}")
    frames = []
    for path in files:
        df = read_dart_txt(path)
        df["_source_file"] = path.name # _source_file을 칼럼 추가 - 원본 파일이 어딘지 찾기 위함
        frames.append(df)
    return pd.concat(frames, ignore_index=True)

# 종목코드 정리 함수
def normalize_symbol(value: Any) -> str:
    text = "" if pd.isna(value) else str(value).strip()
    text = text.replace("[", "").replace("]", "").strip()
    if not text or text.lower() == "null" or text.lower() == "nan":
        return ""
    text = re.sub(r"\.0$", "", text) # 함국 주식은 6자리 - 앞에 0이 빠지면 채워줌
    digits = re.sub(r"\D", "", text) 
    return digits.zfill(6) if digits else ""


def normalize_corp_code(value: Any) -> str:
    text = "" if pd.isna(value) else str(value).strip()
    text = re.sub(r"\.0$", "", text)
    return text

# 금액 데이터 숫자 수정
def to_number(value: Any) -> float:
    if pd.isna(value):
        return np.nan
    text = str(value).strip().replace(",", "")
    if not text or text.lower() == "nan":
        return np.nan
    # 괄호 음수 표기 보정: (123) -> -123
    if re.fullmatch(r"\([0-9.\-]+\)", text):
        text = "-" + text.strip("()")
    try:
        return float(text)
    except ValueError:
        return np.nan

# 항목명 수정 -> 번호, 공백 제거 등
def clean_item_name(value: Any) -> str:
    text = "" if pd.isna(value) else str(value)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"^[IVXLCDMⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ0-9]+[.．)\-]*", "", text)
    text = re.sub(r"^제[0-9]+\(?[가-힣]*\)?", "", text)
    text = text.replace("（", "(").replace("）", ")")
    return text.strip()

# 원본 데이터 분석 쉽게 형태 변경
def prepare_raw(df: pd.DataFrame, sector_group: str, sector_name: str, include_non_listed: bool) -> pd.DataFrame:
    df = normalize_columns(df)
    missing = [column for column in DART_REQUIRED_COLUMNS if column not in df.columns]
    if missing:
        raise ValueError(f"원본 파일에 필요한 컬럼이 없습니다: {missing} / 현재 컬럼: {df.columns.tolist()}")

    out = df.copy()
    out = out.loc[:, ~out.columns.str.startswith("Unnamed")]
    out["symbol"] = out["종목코드"].map(normalize_symbol)
    if not include_non_listed:
        out = out[out["symbol"].ne("")].copy()

    out["name"] = out["회사명"].astype("string").str.strip()
    out["fiscal_date"] = out["결산기준일"].astype("string").str.strip()
    out["currency"] = out["통화"].astype("string").str.strip()
    out["market_type"] = out["시장구분"].astype("string").str.strip()
    out["industry_code"] = out["업종"].astype("string").str.strip()
    out["industry_name"] = out["업종명"].astype("string").str.strip()
    out["sector_group"] = sector_group
    out["sector_name"] = sector_name
    out["item_code"] = out["항목코드"].astype("string").str.strip()
    out["item_name"] = out["항목명"].astype("string")
    out["item_clean"] = out["항목명"].map(clean_item_name)
    out["amount"] = out["당기"].map(to_number)
    return out

# 기업 중복 제거 및 필요 정보 추출 - 기업마다 한 행만 남기게
def base_company_frame(bs: pd.DataFrame, pl: pd.DataFrame) -> pd.DataFrame:
    cols = KEY_COLUMNS
    base = pd.concat([bs[cols], pl[cols]], ignore_index=True)
    base = base.dropna(subset=["symbol", "name"])
    base = base[base["symbol"].astype(str).str.len().gt(0)]
    base = base.drop_duplicates(subset=["symbol"], keep="first")
    return base

# 기업명, 코드 보고 원하는 값 찾기
def select_account(df: pd.DataFrame, account: str, sector_group: str) -> pd.DataFrame:
    candidates = df.copy()
    candidates["_priority"] = np.nan

    code = candidates["item_code"].fillna("")
    name = candidates["item_clean"].fillna("")

# 총자산 찾기
    if account == "total_assets":
        candidates.loc[code.eq("ifrs-full_Assets") | name.isin(["자산총계", "총자산"]), "_priority"] = 1
    elif account == "total_liabilities":
        candidates.loc[code.eq("ifrs-full_Liabilities") | name.eq("부채총계"), "_priority"] = 1
    elif account == "total_equity":
        candidates.loc[code.eq("ifrs-full_Equity") | name.eq("자본총계"), "_priority"] = 1
    # 당기순이익
    elif account == "net_income":
        generic_names = [
            "당기순이익(손실)",
            "당기순이익",
            "연결당기순이익",
            "연결당기순이익(손실)",
        ]
        owner_names = [
            "지배기업의소유주에게귀속되는당기순이익(손실)",
            "지배기업의소유주에게귀속되는연결당기순이익(손실)",
            "지배기업주주지분당기순이익",
            "지배지분당기순이익",
            "지배기업소유주지분당기순이익",
        ]
        candidates.loc[code.eq("ifrs-full_ProfitLoss") | name.isin(generic_names), "_priority"] = 1
        candidates.loc[name.isin(owner_names), "_priority"] = 2
    # 영업이익
    elif account == "operating_income":
        exact_names = ["영업이익", "영업이익(손실)", "영업손익"]
        candidates.loc[code.eq("dart_OperatingIncomeLoss") | name.isin(exact_names), "_priority"] = 1
        # 금융업에는 일반적인 영업이익 대신 순영업이익 등만 있는 경우가 있어 보조 후보로.
        if sector_group in {"finance", "bank", "insurance", "securities"}:
            candidates.loc[name.isin(["순영업이익", "총영업이익", "III.영업이익", "Ⅲ.영업이익"]), "_priority"] = 2
    elif account == "revenue":
        if sector_group == "general":
            candidates.loc[
                code.isin(["ifrs-full_Revenue", "ifrs-full_RevenueFromContractsWithCustomersExcludingAssessedTax"])
                | name.isin(["매출액", "수익(매출액)", "영업수익"]),
                "_priority",
            ] = 1
        elif sector_group == "insurance":
            candidates.loc[name.isin(["영업수익", "보험영업수익", "투자영업수익"]), "_priority"] = 1
        else:
            candidates.loc[name.isin(["영업수익", "I.영업수익", "Ⅰ.영업수익"]), "_priority"] = 1

    candidates = candidates[candidates["_priority"].notna() & candidates["amount"].notna()].copy()
    if candidates.empty:
        return pd.DataFrame(columns=["symbol", account])

    # 같은 회사에 후보가 여러 개면 가장 우선순위가 높은 계정, 그 안에서 절대금액이 큰 값을 선택.
    candidates["_abs_amount"] = candidates["amount"].abs()
    candidates = candidates.sort_values(["symbol", "_priority", "_abs_amount"], ascending=[True, True, False])
    selected = candidates.drop_duplicates(subset=["symbol"], keep="first")[["symbol", "amount"]]
    selected = selected.rename(columns={"amount": account})
    return selected

# 매핑
def load_corp_code_map(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=["symbol", "corpCode"])
    df = pd.read_csv(path, dtype={"symbol": "string", "corpCode": "string"}, encoding="utf-8-sig")
    if "symbol" not in df.columns or "corpCode" not in df.columns:
        return pd.DataFrame(columns=["symbol", "corpCode"])
    df = df[["symbol", "corpCode"]].copy()
    df["symbol"] = df["symbol"].map(normalize_symbol)
    df["corpCode"] = df["corpCode"].map(normalize_corp_code)
    df = df[df["symbol"].ne("")].drop_duplicates(subset=["symbol"], keep="first")
    return df

# 업종별로 처리
def process_sector(raw_root: Path, sector_group: str, include_non_listed: bool) -> pd.DataFrame:
    config = SECTOR_CONFIG[sector_group]
    bs_dir = raw_root / "bs" / config["bs_subdir"]
    pl_dir = raw_root / "pl" / config["pl_subdir"]

    bs = prepare_raw(read_all_txt(bs_dir), sector_group, config["sector_name"], include_non_listed)
    pl = prepare_raw(read_all_txt(pl_dir), sector_group, config["sector_name"], include_non_listed)

    result = base_company_frame(bs, pl)
    for account in ["total_assets", "total_liabilities", "total_equity"]:
        result = result.merge(select_account(bs, account, sector_group), on="symbol", how="left")
    for account in ["net_income", "operating_income", "revenue"]:
        result = result.merge(select_account(pl, account, sector_group), on="symbol", how="left")

    return result


def main() -> int:
    args = parse_args()

    print("2023년 일반+금융업 통합 financial_base 생성 시작")
    print(f"raw root: {args.raw_root}")
    print(f"output: {args.output}")

    frames = []
    for sector_group in SECTOR_CONFIG:
        try:
            frame = process_sector(args.raw_root, sector_group, args.include_non_listed)
            frames.append(frame)
            print(f"{sector_group:10s} {len(frame):,}개 기업")
        except FileNotFoundError as error:
            print(f"{sector_group:10s} 건너뜀: {error}")

    if not frames:
        raise RuntimeError("처리할 DART 파일이 없습니다.")

    financial = pd.concat(frames, ignore_index=True)
    financial = financial.drop_duplicates(subset=["symbol"], keep="first")
    financial["year"] = 2023

    corp_map = load_corp_code_map(args.general_base)
    financial = financial.merge(corp_map, on="symbol", how="left")
    financial["corpCode"] = financial["corpCode"].fillna("")

    # 핵심 계산에 필요한 자본총계가 없거나 종목코드가 없는 행은 제외합니다.
    financial = financial[financial["symbol"].astype(str).str.len().gt(0)].copy()

    for column in ["total_assets", "total_liabilities", "total_equity", "net_income", "operating_income", "revenue"]:
        financial[column] = pd.to_numeric(financial[column], errors="coerce")

    financial = financial[OUTPUT_COLUMNS]
    financial = financial.sort_values(["sector_group", "symbol"]).reset_index(drop=True)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    financial.to_csv(args.output, index=False, encoding="utf-8-sig")

    print("financial_base 생성 완료")
    print(f"총 기업 수: {len(financial):,}")
    print(financial.groupby("sector_group")["symbol"].count().to_string())
    print(f"저장: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
