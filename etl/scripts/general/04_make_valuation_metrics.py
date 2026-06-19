"""
financial_base.csv와 market_snapshot.csv를 합쳐 가치평가 지표와 연속 점수를 생성합니다.

입력
- etl/processed/2025/general/financial_base.csv
- etl/processed/2025/general/market_snapshot.csv

출력
- etl/processed/2025/general/valuation_metrics.csv
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[3]
YEAR = "2025"
SEGMENT = "general"
PROCESSED_DIR = PROJECT_ROOT / "etl" / "processed" / YEAR / SEGMENT

DEFAULT_FINANCIAL = PROCESSED_DIR / "financial_base.csv"
DEFAULT_MARKET = PROCESSED_DIR / "market_snapshot.csv"
DEFAULT_OUTPUT = PROCESSED_DIR / "valuation_metrics.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PER/PBR/ROE/부채비율 기반 가치평가 지표 생성")
    parser.add_argument("--financial", type=Path, default=DEFAULT_FINANCIAL, help="financial_base.csv 경로")
    parser.add_argument("--market", type=Path, default=DEFAULT_MARKET, help="market_snapshot.csv 경로")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="valuation_metrics.csv 출력 경로")
    return parser.parse_args()


def read_csv(path: Path, symbol_columns: list[str]) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {path}")

    dtype = {column: "string" for column in symbol_columns}
    return pd.read_csv(path, dtype=dtype, encoding="utf-8-sig")


def normalize_symbol(series: pd.Series) -> pd.Series:
    return (
        series.astype("string")
        .str.strip()
        .str.replace(r"\.0$", "", regex=True)
        .str.zfill(6)
    )


def to_number(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    for column in columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    return df


def safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    return numerator / denominator.replace({0: np.nan})


def percentile_score(series: pd.Series, higher_is_better: bool) -> pd.Series:
    """전체 종목 내 분위 순위를 0~25점의 연속 점수로 변환합니다."""
    valid = series.dropna()
    if valid.empty:
        return pd.Series(0.0, index=series.index)

    percentile = series.rank(pct=True, method="average")
    score = percentile * 25 if higher_is_better else (1 - percentile) * 25
    return score.fillna(0).clip(lower=0, upper=25).round(2)


def main() -> int:
    args = parse_args()

    print("valuation_metrics 생성 시작")
    print(f"재무 데이터: {args.financial}")
    print(f"시세 데이터: {args.market}")
    print(f"출력 경로: {args.output}")

    financial = read_csv(args.financial, ["symbol", "corpCode"])
    market = read_csv(args.market, ["symbol"])

    financial["symbol"] = normalize_symbol(financial["symbol"])
    market["symbol"] = normalize_symbol(market["symbol"])

    financial = to_number(
        financial,
        [
            "total_assets",
            "total_liabilities",
            "total_equity",
            "net_income",
            "operating_income",
            "revenue",
        ],
    )
    market = to_number(market, ["price", "market_cap"])

    market = market.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")
    financial = financial.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")

    merged = financial.merge(market, on="symbol", how="inner")

    merged["per"] = safe_divide(merged["market_cap"], merged["net_income"])
    merged.loc[merged["net_income"] <= 0, "per"] = np.nan

    merged["pbr"] = safe_divide(merged["market_cap"], merged["total_equity"])
    merged.loc[merged["total_equity"] <= 0, "pbr"] = np.nan

    merged["roe"] = safe_divide(merged["net_income"], merged["total_equity"]) * 100
    merged.loc[merged["total_equity"] <= 0, "roe"] = np.nan

    merged["debt_ratio"] = safe_divide(merged["total_liabilities"], merged["total_equity"]) * 100
    merged.loc[merged["total_equity"] <= 0, "debt_ratio"] = np.nan

    # 계단형 점수 대신 전체 분포 기준 연속 점수를 사용합니다.
    # PER/PBR/부채비율은 낮을수록, ROE는 높을수록 높은 점수를 받습니다.
    merged["per_score"] = percentile_score(merged["per"], higher_is_better=False)
    merged["pbr_score"] = percentile_score(merged["pbr"], higher_is_better=False)
    merged["roe_score"] = percentile_score(merged["roe"], higher_is_better=True)
    merged["debt_score"] = percentile_score(merged["debt_ratio"], higher_is_better=False)
    merged["valuation_score"] = merged[["per_score", "pbr_score", "roe_score", "debt_score"]].sum(axis=1).round(2)

    for column in ["per", "pbr", "roe", "debt_ratio"]:
        merged[column] = merged[column].round(2)

    columns = [
        "symbol",
        "corpCode",
        "name",
        "year",
        "fiscal_date",
        "price_date",
        "price",
        "market_cap",
        "total_assets",
        "total_liabilities",
        "total_equity",
        "net_income",
        "operating_income",
        "revenue",
        "per",
        "pbr",
        "roe",
        "debt_ratio",
        "per_score",
        "pbr_score",
        "roe_score",
        "debt_score",
        "valuation_score",
    ]
    merged = merged[[column for column in columns if column in merged.columns]]
    merged = merged.sort_values(["valuation_score", "symbol"], ascending=[False, True])

    args.output.parent.mkdir(parents=True, exist_ok=True)
    merged.to_csv(args.output, index=False, encoding="utf-8-sig")

    print("valuation_metrics 생성 완료")
    print(f"재무 데이터 행 수: {len(financial):,}")
    print(f"시세 데이터 행 수: {len(market):,}")
    print(f"결합 결과 행 수: {len(merged):,}")
    print(f"저장: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
