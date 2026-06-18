from pathlib import Path
import pandas as pd
import numpy as np


ROOT = Path(__file__).resolve().parents[2]

PROCESSED_DIR = ROOT / "etl" / "processed"

FINANCIAL_PATH = PROCESSED_DIR / "financial_base.csv"
MARKET_PATH = PROCESSED_DIR / "market_snapshot.csv"

BACKEND_DATA_DIR = ROOT / "backend" / "src" / "main" / "resources" / "data"

OUTPUT_PROCESSED_PATH = PROCESSED_DIR / "valuation_metrics.csv"
OUTPUT_BACKEND_PATH = BACKEND_DATA_DIR / "valuation_metrics.csv"


def safe_divide(a, b):
    return np.where(
        (pd.isna(b)) | (b == 0),
        np.nan,
        a / b
    )


def make_score(row):
    score = 0

    # PER: 낮을수록 저평가 가능성
    if pd.notna(row["per"]):
        if row["per"] < 8:
            score += 25
        elif row["per"] < 15:
            score += 20
        elif row["per"] < 25:
            score += 10

    # PBR: 낮을수록 저평가 가능성
    if pd.notna(row["pbr"]):
        if row["pbr"] < 0.8:
            score += 25
        elif row["pbr"] < 1.5:
            score += 20
        elif row["pbr"] < 3:
            score += 10

    # ROE: 높을수록 수익성 좋음
    if pd.notna(row["roe"]):
        if row["roe"] >= 15:
            score += 25
        elif row["roe"] >= 10:
            score += 20
        elif row["roe"] >= 5:
            score += 10

    # 부채비율: 낮을수록 안정적
    if pd.notna(row["debt_ratio"]):
        if row["debt_ratio"] < 100:
            score += 25
        elif row["debt_ratio"] < 200:
            score += 15
        elif row["debt_ratio"] < 300:
            score += 5

    return score


def make_label(score):
    if score >= 75:
        return "저평가 후보"
    if score >= 50:
        return "보통"
    if score >= 25:
        return "고평가 주의"
    return "분석주의"


def main():
    print("가치평가 지표 계산 시작")

    if not FINANCIAL_PATH.exists():
        raise FileNotFoundError(f"financial_base.csv가 없습니다: {FINANCIAL_PATH}")

    if not MARKET_PATH.exists():
        raise FileNotFoundError(f"market_snapshot.csv가 없습니다: {MARKET_PATH}")

    financial = pd.read_csv(
        FINANCIAL_PATH,
        dtype={
            "symbol": str,
            "corpCode": str,
            "year": str,
        }
    )

    market = pd.read_csv(
        MARKET_PATH,
        dtype={
            "symbol": str,
        }
    )

    # 숫자 컬럼 변환
    financial_number_cols = [
        "total_assets",
        "total_liabilities",
        "total_equity",
        "net_income",
        "operating_income",
        "revenue",
    ]

    for col in financial_number_cols:
        financial[col] = pd.to_numeric(financial[col], errors="coerce")

    market["price"] = pd.to_numeric(market["price"], errors="coerce")
    market["market_cap"] = pd.to_numeric(market["market_cap"], errors="coerce")

    print("재무 데이터 행 개수:", len(financial))
    print("시가총액 데이터 행 개수:", len(market))

    merged = financial.merge(
        market,
        on="symbol",
        how="inner"
    )

    print("병합 후 행 개수:", len(merged))

    # 지표 계산
    merged["per"] = safe_divide(merged["market_cap"], merged["net_income"])
    merged["pbr"] = safe_divide(merged["market_cap"], merged["total_equity"])
    merged["roe"] = safe_divide(merged["net_income"], merged["total_equity"]) * 100
    merged["debt_ratio"] = safe_divide(merged["total_liabilities"], merged["total_equity"]) * 100

    # 적자 기업은 PER 의미가 약하므로 비워둠
    merged.loc[merged["net_income"] <= 0, "per"] = np.nan

    # 소수점 정리
    round_cols = ["per", "pbr", "roe", "debt_ratio"]
    for col in round_cols:
        merged[col] = merged[col].round(2)

    # 점수/라벨 생성
    merged["valuation_score"] = merged.apply(make_score, axis=1)
    merged["valuation_label"] = merged["valuation_score"].apply(make_label)

    result = merged[[
        "symbol",
        "corpCode",
        "name",
        "year",
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
        "valuation_score",
        "valuation_label",
    ]]

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)

    result.to_csv(
        OUTPUT_PROCESSED_PATH,
        index=False,
        encoding="utf-8-sig"
    )

    result.to_csv(
        OUTPUT_BACKEND_PATH,
        index=False,
        encoding="utf-8-sig"
    )

    print("전처리 결과 저장 완료:", OUTPUT_PROCESSED_PATH)
    print("백엔드용 CSV 저장 완료:", OUTPUT_BACKEND_PATH)
    print(result.head())


if __name__ == "__main__":
    main()