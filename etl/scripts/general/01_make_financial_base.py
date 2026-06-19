from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[3]
YEAR = "2025"
SEGMENT = "general"

RAW_DIR = PROJECT_ROOT / "etl" / "raw" / "dart" / YEAR
PROCESSED_DIR = PROJECT_ROOT / "etl" / "processed" / YEAR / SEGMENT

STOCK_MASTER_PATH = PROJECT_ROOT / "backend" / "src" / "main" / "resources" / "data" / "stock_master.csv"
FINANCIAL_OUTPUT_PATH = PROCESSED_DIR / "financial_base.csv"

BS_ACCOUNT_MAP = {
    "ifrs-full_Assets": "total_assets",
    "ifrs-full_Liabilities": "total_liabilities",
    "ifrs-full_Equity": "total_equity",
}

PL_ACCOUNT_MAP = {
    "ifrs-full_ProfitLoss": "net_income",
    "dart_OperatingIncomeLoss": "operating_income",
    "ifrs-full_Revenue": "revenue",
}

OUTPUT_COLUMNS = [
    "symbol",
    "corpCode",
    "name",
    "year",
    "fiscal_date",
    "currency",
    "total_assets",
    "total_liabilities",
    "total_equity",
    "net_income",
    "operating_income",
    "revenue",
]


def find_raw_file(statement_type: str) -> Path:
    statement_dir = RAW_DIR / statement_type / SEGMENT
    files = sorted(statement_dir.glob("*.txt"))
    if not files:
        raise FileNotFoundError(f"DART 원천 파일을 찾을 수 없습니다: {statement_dir}")
    return files[0]


def read_dart_txt(path: Path) -> pd.DataFrame:
    print(f"원천 파일 읽는 중: {path}")
    df = pd.read_csv(path, sep="\t", encoding="cp949", dtype=str, engine="python")

    for column in df.columns:
        df[column] = df[column].astype(str).str.strip()
        df.loc[df[column].isin(["", "nan", "None"]), column] = np.nan

    df["symbol"] = (
        df["종목코드"]
        .astype(str)
        .str.replace("[", "", regex=False)
        .str.replace("]", "", regex=False)
        .str.zfill(6)
    )
    df["year"] = df["결산기준일"].astype(str).str[:4]
    amount_text = (
        df["당기"]
        .astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("△", "-", regex=False)
    )
    amount_text = amount_text.mask(amount_text.isin(["-", "nan", "None"]), "0")
    df["amount"] = pd.to_numeric(amount_text, errors="coerce")

    print(f"행 수: {len(df):,}")
    return df


def attach_corp_code(financial: pd.DataFrame) -> pd.DataFrame:
    if not STOCK_MASTER_PATH.exists():
        print("stock_master.csv를 찾지 못했습니다. corpCode 없이 진행합니다.")
        financial["corpCode"] = np.nan
        return financial

    stock_master = pd.read_csv(STOCK_MASTER_PATH, dtype={"symbol": str, "corpCode": str})
    stock_master = stock_master[["symbol", "corpCode"]].drop_duplicates(subset=["symbol"])
    return financial.merge(stock_master, on="symbol", how="left")


def make_financial_base() -> pd.DataFrame:
    print("프로젝트 루트:", PROJECT_ROOT)
    print("원천 데이터 폴더:", RAW_DIR)
    print("결과 저장 폴더:", PROCESSED_DIR)

    bs = read_dart_txt(find_raw_file("bs"))
    pl = read_dart_txt(find_raw_file("pl"))

    bs_filtered = bs[bs["항목코드"].isin(BS_ACCOUNT_MAP)].copy()
    bs_filtered["metric"] = bs_filtered["항목코드"].map(BS_ACCOUNT_MAP)

    pl_filtered = pl[pl["항목코드"].isin(PL_ACCOUNT_MAP)].copy()
    pl_filtered["metric"] = pl_filtered["항목코드"].map(PL_ACCOUNT_MAP)

    print("재무상태표 추출 행 수:", len(bs_filtered))
    print("손익계산서 추출 행 수:", len(pl_filtered))

    long_df = pd.concat([bs_filtered, pl_filtered], ignore_index=True)
    financial = (
        long_df.pivot_table(
            index=["symbol", "회사명", "year", "결산기준일", "보고서종류", "통화"],
            columns="metric",
            values="amount",
            aggfunc="first",
        )
        .reset_index()
        .rename(
            columns={
                "회사명": "name",
                "결산기준일": "fiscal_date",
                "보고서종류": "report_type",
                "통화": "currency",
            }
        )
    )
    financial.columns.name = None

    financial = attach_corp_code(financial)
    result = financial.reindex(columns=OUTPUT_COLUMNS)

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    result.to_csv(FINANCIAL_OUTPUT_PATH, index=False, encoding="utf-8-sig")

    print("저장 완료:", FINANCIAL_OUTPUT_PATH)
    print("최종 행 수:", len(result))
    return result


def main() -> None:
    print("financial_base 생성 시작")
    make_financial_base()
    print("financial_base 생성 완료")


if __name__ == "__main__":
    main()
