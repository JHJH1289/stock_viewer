"""
financial_base.csv와 market_snapshot.csv를 합쳐 PER, PBR, ROE, 부채비율, 점수를 생성합니다.

입력
- etl/processed/financial_base.csv
- etl/processed/market_snapshot.csv

출력
- etl/processed/valuation_metrics.csv

실행
    python etl/scripts/04_make_valuation_metrics.py

"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_FINANCIAL = PROJECT_ROOT / "etl" / "processed" / "financial_base.csv"
DEFAULT_MARKET = PROJECT_ROOT / "etl" / "processed" / "market_snapshot.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "etl" / "processed" / "valuation_metrics.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="PER/PBR/ROE/부채비율/점수 생성")
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
    """종목코드를 6자리 문자열로 통일합니다. 예: 20 -> 000020"""
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
    """0으로 나누는 경우 NaN으로 처리합니다."""
    denominator = denominator.replace({0: np.nan})
    return numerator / denominator


def score_per(per: float) -> int:
    """PER 점수: 낮을수록 높은 점수, 적자/음수/결측은 0점"""
    if pd.isna(per) or per <= 0:
        return 0
    if per <= 5:
        return 25
    if per <= 10:
        return 20
    if per <= 15:
        return 15
    if per <= 20:
        return 10
    if per <= 30:
        return 5
    return 0


def score_pbr(pbr: float) -> int:
    """PBR 점수: 낮을수록 높은 점수, 자본잠식/음수/결측은 0점"""
    if pd.isna(pbr) or pbr <= 0:
        return 0
    if pbr <= 0.5:
        return 25
    if pbr <= 1:
        return 20
    if pbr <= 1.5:
        return 15
    if pbr <= 2:
        return 10
    if pbr <= 3:
        return 5
    return 0


def score_roe(roe: float) -> int:
    """ROE 점수: 높을수록 높은 점수"""
    if pd.isna(roe):
        return 0
    if roe >= 15:
        return 25
    if roe >= 10:
        return 20
    if roe >= 5:
        return 15
    if roe > 0:
        return 5
    return 0


def score_debt_ratio(debt_ratio: float) -> int:
    """부채비율 점수: 낮을수록 높은 점수"""
    if pd.isna(debt_ratio) or debt_ratio < 0:
        return 0
    if debt_ratio <= 100:
        return 25
    if debt_ratio <= 150:
        return 15
    if debt_ratio <= 200:
        return 10
    if debt_ratio <= 300:
        return 5
    return 0


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

    numeric_financial_columns = [
        "total_assets",
        "total_liabilities",
        "total_equity",
        "net_income",
        "operating_income",
        "revenue",
    ]
    numeric_market_columns = ["price", "market_cap"]

    financial = to_number(financial, numeric_financial_columns)
    market = to_number(market, numeric_market_columns)

    # 같은 종목이 중복 수집된 경우 가장 마지막 행을 사용합니다.
    market = market.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")
    financial = financial.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")

    merged = financial.merge(market, on="symbol", how="inner")

    # 핵심 재무지표 계산
    merged["per"] = safe_divide(merged["market_cap"], merged["net_income"])
    merged.loc[merged["net_income"] <= 0, "per"] = np.nan

    merged["pbr"] = safe_divide(merged["market_cap"], merged["total_equity"])
    merged.loc[merged["total_equity"] <= 0, "pbr"] = np.nan

    merged["roe"] = safe_divide(merged["net_income"], merged["total_equity"]) * 100
    merged.loc[merged["total_equity"] <= 0, "roe"] = np.nan

    merged["debt_ratio"] = safe_divide(merged["total_liabilities"], merged["total_equity"]) * 100
    merged.loc[merged["total_equity"] <= 0, "debt_ratio"] = np.nan

    # 점수 계산: 프론트에서 상세 점수도 보여줄 수 있도록 개별 점수와 총점을 모두 저장합니다.
    merged["per_score"] = merged["per"].apply(score_per)
    merged["pbr_score"] = merged["pbr"].apply(score_pbr)
    merged["roe_score"] = merged["roe"].apply(score_roe)
    merged["debt_score"] = merged["debt_ratio"].apply(score_debt_ratio)
    merged["valuation_score"] = merged[["per_score", "pbr_score", "roe_score", "debt_score"]].sum(axis=1).astype(int)

    # 화면 표시/CSV 확인이 쉽도록 소수점 정리
    for column in ["per", "pbr", "roe", "debt_ratio"]:
        merged[column] = merged[column].round(2)

    # valuation_label은 일부러 만들지 않습니다. 라벨링은 프론트에서 처리합니다.
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
    columns = [column for column in columns if column in merged.columns]
    merged = merged[columns].sort_values(["valuation_score", "symbol"], ascending=[False, True])

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
