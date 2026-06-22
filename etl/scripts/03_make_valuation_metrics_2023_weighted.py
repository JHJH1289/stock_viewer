"""
2023년 통합 financial_base.csv와 한국투자증권 market_snapshot.csv를 결합해
PER/PBR/ROE/부채비율을 계산하고, 업종별 가중치를 적용한 valuation_score를 생성.

입력 기본 경로
- etl/processed/2023/financial_base.csv
- etl/processed/2023/market_snapshot.csv

출력 기본 경로
- etl/processed/2023/valuation_metrics.csv
- etl/processed/2023/market_snapshot_missing_symbols.csv

실행
    python etl/scripts/03_make_valuation_metrics_2023_weighted.py
    
    - 백엔드에 바로 저장
    python etl/scripts/03_make_valuation_metrics_2023_weighted.py --copy-to-backend

- 프론트에서는 valuation_score 또는 industry_adjusted_score 숫자를 기준으로 라벨을 판단.
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_ALL = PROJECT_ROOT / "etl" / "processed" / "2023" 
DEFAULT_FINANCIAL = PROCESSED_ALL / "financial_base.csv"
DEFAULT_MARKET = PROCESSED_ALL / "market_snapshot.csv"
DEFAULT_OUTPUT = PROCESSED_ALL / "valuation_metrics.csv"
DEFAULT_MISSING = PROCESSED_ALL / "market_snapshot_missing_symbols.csv" # 한국투자증권에서 시세가 없는 기업만 따로 정리
DEFAULT_BACKEND_OUTPUT = PROJECT_ROOT / "backend" / "src" / "main" / "resources" / "data" / "valuation_metrics_2023.csv"

# 재무제표의 시세 데이터를 숫자형으로 변경
NUMERIC_FINANCIAL_COLUMNS = [
    "total_assets",
    "total_liabilities",
    "total_equity",
    "net_income",
    "operating_income",
    "revenue",
]
NUMERIC_MARKET_COLUMNS = ["price", "market_cap"]

# 업종별 가중치!!!! - 각 업종마다 지표별 점수를 다르게 책정, 합계는 100
# 관련 업종마다 중요하게 보는 지표가 다름(ex. 금융업은 부채비율보다 PBR/ROE를 더 중요하게 봄)
# IT/소프트웨어는 현재 단일연도 데이터에서 성장률을 계산할 수 없으므로 영업이익률을 더 반영
MODEL_WEIGHTS = {
    "general": {"per": 25, "pbr": 25, "roe": 25, "debt": 25, "op_margin": 0},
    "manufacturing": {"per": 25, "pbr": 20, "roe": 20, "debt": 15, "op_margin": 20},
    "it_software": {"per": 10, "pbr": 10, "roe": 25, "debt": 15, "op_margin": 40},
    "bio_pharma": {"per": 5, "pbr": 10, "roe": 35, "debt": 25, "op_margin": 25},
    "finance": {"per": 15, "pbr": 35, "roe": 35, "debt": 15, "op_margin": 0},
    "bank": {"per": 10, "pbr": 40, "roe": 40, "debt": 10, "op_margin": 0},
    "insurance": {"per": 10, "pbr": 40, "roe": 35, "debt": 15, "op_margin": 0},
    "securities": {"per": 15, "pbr": 35, "roe": 35, "debt": 15, "op_margin": 0},
}

MODEL_NAMES_KO = {
    "general": "일반형",
    "manufacturing": "제조업형",
    "it_software": "IT/소프트웨어형",
    "bio_pharma": "바이오/제약형",
    "finance": "금융기타형",
    "bank": "은행형",
    "insurance": "보험형",
    "securities": "증권형",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="2023년 업종 가중 valuation_metrics 생성")
    parser.add_argument("--financial", type=Path, default=DEFAULT_FINANCIAL, help="financial_base.csv 경로")
    parser.add_argument("--market", type=Path, default=DEFAULT_MARKET, help="market_snapshot.csv 경로")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="valuation_metrics.csv 출력 경로")
    parser.add_argument("--missing-output", type=Path, default=DEFAULT_MISSING, help="시가총액 미수집 종목 CSV 경로")
    parser.add_argument("--copy-to-backend", action="store_true", help="백엔드 resources/data로 valuation_metrics.csv 복사")
    parser.add_argument("--backend-output", type=Path, default=DEFAULT_BACKEND_OUTPUT, help="백엔드 복사 경로")
    parser.add_argument("--min-peer-size", type=int, default=5, help="같은 업종 비교에 필요한 최소 기업 수")
    return parser.parse_args()

# csv 읽기
def read_csv(path: Path, symbol_columns: list[str]) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(f"파일을 찾을 수 없습니다: {path}")
    dtype = {column: "string" for column in symbol_columns}
    return pd.read_csv(path, dtype=dtype, encoding="utf-8-sig")

# 종목코드 정리 - 6자리로 변경
def normalize_symbol(series: pd.Series) -> pd.Series:
    return (
        series.astype("string")
        .str.strip()
        .str.replace(r"\.0$", "", regex=True)
        .str.replace(r"\D", "", regex=True)
        .str.zfill(6)
    )

def to_number(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    for column in columns:
        if column in df.columns:
            df[column] = pd.to_numeric(df[column], errors="coerce")
    return df

# PER, PBR, ROE, 부채비율, 영업이익률 계산에 사용되는 계산식 정리
def safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    denominator = denominator.replace({0: np.nan})
    return numerator / denominator


def normalize_component(score_25: int | float) -> float:
    if pd.isna(score_25):
        return 0.0
    return float(score_25) * 4.0


def interpolate_score(value: float, points: list[tuple[float, float]]) -> float:
    """기준점 사이를 선형 보간해 계단형이 아닌 연속 점수로 환산."""
    if pd.isna(value):
        return 0.0
    if value <= points[0][0]:
        return points[0][1]
    for (left_value, left_score), (right_value, right_score) in zip(points, points[1:]):
        if value <= right_value:
            ratio = (value - left_value) / (right_value - left_value)
            return left_score + ratio * (right_score - left_score)
    return points[-1][1]


def score_per(per: float) -> float:
    """PER 절대점수. 낮을수록 좋고 적자/음수/결측은 0점."""
    if pd.isna(per) or per <= 0:
        return 0.0
    return interpolate_score(per, [(5, 25), (10, 20), (15, 15), (20, 10), (30, 5), (40, 0)])


def score_pbr(pbr: float) -> float:
    """PBR 절대점수. 낮을수록 좋고 자본잠식/음수/결측은 0점."""
    if pd.isna(pbr) or pbr <= 0:
        return 0.0
    return interpolate_score(pbr, [(0.5, 25), (1, 20), (1.5, 15), (2, 10), (3, 5), (5, 0)])


def score_roe(roe: float) -> float:
    """ROE 절대점수. 높을수록 좋음."""
    if pd.isna(roe):
        return 0.0
    return interpolate_score(roe, [(0, 0), (5, 15), (10, 20), (15, 25)])


def score_debt_ratio(debt_ratio: float) -> float:
    """부채비율 절대점수. 낮을수록 좋음."""
    if pd.isna(debt_ratio) or debt_ratio < 0:
        return 0.0
    return interpolate_score(debt_ratio, [(100, 25), (150, 15), (200, 10), (300, 5), (500, 0)])


def score_operating_margin(operating_margin: float) -> int:
    """영업이익률 절대점수. 제조업/IT/바이오 보조지표로 사용"""
    if pd.isna(operating_margin):
        return 0
    if operating_margin >= 20:
        return 25
    if operating_margin >= 10:
        return 20
    if operating_margin >= 5:
        return 15
    if operating_margin > 0:
        return 5
    return 0

# 업종별 평가 모델 분류
'''
예시

삼성전자 → 제조업형
네이버 → IT/소프트웨어형
셀트리온 → 바이오/제약형
KB금융 → 금융기타형 또는 은행형

'''
def classify_model(row: pd.Series) -> str:
    sector_group = str(row.get("sector_group", "") or "").strip()
    industry = str(row.get("industry_name", "") or "").strip()

    if sector_group in {"finance", "bank", "insurance", "securities"}:
        return sector_group

    # 일반기업 안에서 업종명 키워드로 세부 모델을 나눕니다.
    bio_keywords = ["의약품", "의료용 물질", "바이오", "제약", "생물학적 제제", "의료기기"]
    it_keywords = ["소프트웨어", "컴퓨터 프로그래밍", "정보서비스", "자료처리", "데이터베이스", "게임", "인터넷", "시스템 통합"]

    if any(keyword in industry for keyword in bio_keywords):
        return "bio_pharma"
    if any(keyword in industry for keyword in it_keywords):
        return "it_software"
    if "제조업" in industry:
        return "manufacturing"
    return "general"


def weighted_average(row: pd.Series, score_columns: dict[str, str]) -> float:
    model = row.get("valuation_model_type", "general")
    weights = MODEL_WEIGHTS.get(str(model), MODEL_WEIGHTS["general"])
    total = 0.0
    used_weight = 0.0
    for key, weight in weights.items():
        if weight <= 0:
            continue
        column = score_columns[key]
        value = row.get(column, np.nan)
        if pd.isna(value):
            value = 0
        total += float(value) * weight
        used_weight += weight
    return total / used_weight if used_weight else 0.0


def risk_penalty(row: pd.Series) -> int:
    """적자, 자본잠식, 과도한 부채비율에 대한 감점입니다."""
    penalty = 0
    if pd.notna(row.get("net_income")) and row["net_income"] <= 0:
        penalty += 15
    if pd.notna(row.get("total_equity")) and row["total_equity"] <= 0:
        penalty += 30
    debt_ratio = row.get("debt_ratio", np.nan)
    sector_group = str(row.get("sector_group", "") or "")
    # 금융업은 구조적으로 부채비율이 높기 때문에 과도 감점 기준을 완화
    high_debt_limit = 1000 if sector_group in {"finance", "bank", "insurance", "securities"} else 300
    very_high_debt_limit = 2000 if sector_group in {"finance", "bank", "insurance", "securities"} else 500
    if pd.notna(debt_ratio):
        if debt_ratio > very_high_debt_limit:
            penalty += 20
        elif debt_ratio > high_debt_limit:
            penalty += 10
    return penalty


# 업종 비교 그룹 - 어떤 기업끼리 비교할지 지정
def build_peer_group(df: pd.DataFrame, min_peer_size: int) -> pd.DataFrame:
    out = df.copy()
    out["industry_name"] = out.get("industry_name", "").fillna("").astype("string")
    out["sector_name"] = out.get("sector_name", "").fillna("").astype("string")

    # 1순위: 세부 업종명. 단, 같은 업종 표본이 너무 적으면 2순위 모델 그룹으로 비교
    industry_size = out.groupby("industry_name")["symbol"].transform("count")
    model_size = out.groupby("valuation_model_type")["symbol"].transform("count")
    sector_size = out.groupby("sector_group")["symbol"].transform("count")

    out["peer_group_name"] = np.where(
        (out["industry_name"].str.len() > 0) & (industry_size >= min_peer_size),
        out["industry_name"],
        out["valuation_model_name"],
    )
    out["peer_group_level"] = np.where(
        (out["industry_name"].str.len() > 0) & (industry_size >= min_peer_size),
        "industry",
        "model",
    )
    out["peer_group_size"] = np.where(
        out["peer_group_level"].eq("industry"),
        industry_size,
        model_size,
    )

    # 모델 그룹도 2개 미만이면 sector_group으로 보정
    needs_sector = out["peer_group_size"] < 2
    out.loc[needs_sector, "peer_group_name"] = out.loc[needs_sector, "sector_name"]
    out.loc[needs_sector, "peer_group_level"] = "sector"
    out.loc[needs_sector, "peer_group_size"] = sector_size[needs_sector]
    return out


def rank_score_within_group(df: pd.DataFrame, column: str, group_column: str, higher_is_better: bool) -> pd.Series:
    """같은 peer_group 안에서 백분위 점수 0~100을 계산."""
    result = pd.Series(np.nan, index=df.index, dtype="float")

    valid = df[column].notna()
    if column in {"per", "pbr"}:
        valid &= df[column] > 0
    if column == "debt_ratio":
        valid &= df[column] >= 0

    for _, index in df[valid].groupby(group_column).groups.items():
        idx = list(index)
        n = len(idx)
        if n <= 1:
            continue
        values = df.loc[idx, column]
        ascending = True
        ranks = values.rank(method="average", ascending=ascending)
        # 낮을수록 좋은 지표는 낮은 값이 100점, 높을수록 좋은 지표는 높은 값이 100점
        if higher_is_better:
            score = (ranks - 1) / (n - 1) * 100
        else:
            score = (n - ranks) / (n - 1) * 100
        result.loc[idx] = score

    return result

# 업종 평균 계산
def add_peer_statistics(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    group = out.groupby("peer_group_name", dropna=False)

    # 평균은 계산 가능한 정상값 기준으로 산출합니다.
    out["peer_per_avg"] = group["per"].transform(lambda s: s.where(s > 0).mean())
    out["peer_pbr_avg"] = group["pbr"].transform(lambda s: s.where(s > 0).mean())
    out["peer_roe_avg"] = group["roe"].transform("mean")
    out["peer_debt_ratio_avg"] = group["debt_ratio"].transform(lambda s: s.where(s >= 0).mean())
    out["peer_operating_margin_avg"] = group["operating_margin"].transform("mean")

    out["per_vs_peer_pct"] = (out["peer_per_avg"] - out["per"]) / out["peer_per_avg"] * 100
    out["pbr_vs_peer_pct"] = (out["peer_pbr_avg"] - out["pbr"]) / out["peer_pbr_avg"] * 100
    out["roe_vs_peer_pctp"] = out["roe"] - out["peer_roe_avg"]
    out["debt_ratio_vs_peer_pct"] = (out["peer_debt_ratio_avg"] - out["debt_ratio"]) / out["peer_debt_ratio_avg"] * 100
    out["operating_margin_vs_peer_pctp"] = out["operating_margin"] - out["peer_operating_margin_avg"]

    return out

# 절대점수 계산
def add_scores(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()

    # 절대점수: 사용자가 보내준 표의 기준처럼 낮은 PER/PBR, 높은 ROE, 낮은 부채비율에 점수 부여
    out["per_score"] = out["per"].apply(score_per)
    out["pbr_score"] = out["pbr"].apply(score_pbr)
    out["roe_score"] = out["roe"].apply(score_roe)
    out["debt_score"] = out["debt_ratio"].apply(score_debt_ratio)
    out["operating_margin_score"] = out["operating_margin"].apply(score_operating_margin)
    out["absolute_score"] = out[["per_score", "pbr_score", "roe_score", "debt_score"]].sum(axis=1)

    # 절대점수를 0~100 컴포넌트로 환산해 업종 가중치용 보조점수 생성
    for source, target in [
        ("per_score", "per_abs_component"),
        ("pbr_score", "pbr_abs_component"),
        ("roe_score", "roe_abs_component"),
        ("debt_score", "debt_abs_component"),
        ("operating_margin_score", "op_margin_abs_component"),
    ]:
        out[target] = out[source].map(normalize_component)

    out["weighted_absolute_score"] = out.apply(
        weighted_average,
        axis=1,
        score_columns={
            "per": "per_abs_component",
            "pbr": "pbr_abs_component",
            "roe": "roe_abs_component",
            "debt": "debt_abs_component",
            "op_margin": "op_margin_abs_component",
        },
    )

    # 업종 상대평가 점수: 같은 업종/모델 그룹 안에서 순위 백분위 0~100 산출
    out["per_peer_score"] = rank_score_within_group(out, "per", "peer_group_name", higher_is_better=False)
    out["pbr_peer_score"] = rank_score_within_group(out, "pbr", "peer_group_name", higher_is_better=False)
    out["roe_peer_score"] = rank_score_within_group(out, "roe", "peer_group_name", higher_is_better=True)
    out["debt_peer_score"] = rank_score_within_group(out, "debt_ratio", "peer_group_name", higher_is_better=False)
    out["op_margin_peer_score"] = rank_score_within_group(out, "operating_margin", "peer_group_name", higher_is_better=True)

    # 표본이 너무 작아 상대평가 점수가 비면 절대 컴포넌트로 대체
    fallback_pairs = [
        ("per_peer_score", "per_abs_component"),
        ("pbr_peer_score", "pbr_abs_component"),
        ("roe_peer_score", "roe_abs_component"),
        ("debt_peer_score", "debt_abs_component"),
        ("op_margin_peer_score", "op_margin_abs_component"),
    ]
    for peer_col, abs_col in fallback_pairs:
        out[peer_col] = out[peer_col].fillna(out[abs_col]).clip(lower=0, upper=100)

    out["industry_adjusted_score_before_penalty"] = out.apply(
        weighted_average,
        axis=1,
        score_columns={
            "per": "per_peer_score",
            "pbr": "pbr_peer_score",
            "roe": "roe_peer_score",
            "debt": "debt_peer_score",
            "op_margin": "op_margin_peer_score",
        },
    )

    out["risk_penalty"] = out.apply(risk_penalty, axis=1)
    out["industry_adjusted_score"] = (
        out["industry_adjusted_score_before_penalty"] - out["risk_penalty"]
    ).clip(lower=0, upper=100).round(0).astype(int)

    # 화면의 가치 점수는 사용자가 보는 4개 기본 지표 점수의 합계로 통일합니다.
    # 업종/동종업계 보정 점수는 industry_adjusted_score에 참고용으로 유지합니다.
    out["valuation_score"] = out["absolute_score"].round(2)
    return out


def add_model_weights(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["valuation_model_type"] = out.apply(classify_model, axis=1)
    out["valuation_model_name"] = out["valuation_model_type"].map(MODEL_NAMES_KO).fillna("일반형")
    for key in ["per", "pbr", "roe", "debt", "op_margin"]:
        out[f"weight_{key}"] = out["valuation_model_type"].map(lambda model: MODEL_WEIGHTS.get(model, MODEL_WEIGHTS["general"])[key])
    return out


def write_missing_symbols(financial: pd.DataFrame, market: pd.DataFrame, output: Path) -> None:
    market_symbols = set(market["symbol"].dropna().astype(str))
    missing = financial[~financial["symbol"].isin(market_symbols)].copy()
    columns = [
        "symbol",
        "name",
        "sector_group",
        "sector_name",
        "industry_code",
        "industry_name",
    ]
    columns = [column for column in columns if column in missing.columns]
    missing = missing[columns].sort_values("symbol")
    output.parent.mkdir(parents=True, exist_ok=True)
    missing.to_csv(output, index=False, encoding="utf-8-sig")


def main() -> int:
    args = parse_args()
    print("2023년 업종 가중 valuation_metrics 생성 시작")
    print(f"재무 데이터: {args.financial}")
    print(f"시세 데이터: {args.market}")
    print(f"출력 경로: {args.output}")

    financial = read_csv(args.financial, ["symbol", "corpCode"])
    market = read_csv(args.market, ["symbol"])

    financial["symbol"] = normalize_symbol(financial["symbol"])
    market["symbol"] = normalize_symbol(market["symbol"])

    financial = to_number(financial, NUMERIC_FINANCIAL_COLUMNS)
    market = to_number(market, NUMERIC_MARKET_COLUMNS)

    # 중복 종목은 최신/마지막 행을 사용
    financial = financial.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")
    market = market.dropna(subset=["symbol"]).drop_duplicates(subset=["symbol"], keep="last")

    write_missing_symbols(financial, market, args.missing_output)

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

    merged["operating_margin"] = safe_divide(merged["operating_income"], merged["revenue"]) * 100

    merged = add_model_weights(merged)
    merged = build_peer_group(merged, args.min_peer_size)
    merged = add_peer_statistics(merged)
    merged = add_scores(merged)

    round_columns = [
        "per",
        "pbr",
        "roe",
        "debt_ratio",
        "operating_margin",
        "peer_per_avg",
        "peer_pbr_avg",
        "peer_roe_avg",
        "peer_debt_ratio_avg",
        "peer_operating_margin_avg",
        "per_vs_peer_pct",
        "pbr_vs_peer_pct",
        "roe_vs_peer_pctp",
        "debt_ratio_vs_peer_pct",
        "operating_margin_vs_peer_pctp",
        "weighted_absolute_score",
        "industry_adjusted_score_before_penalty",
        "per_score",
        "pbr_score",
        "roe_score",
        "debt_score",
        "operating_margin_score",
        "absolute_score",
        "per_peer_score",
        "pbr_peer_score",
        "roe_peer_score",
        "debt_peer_score",
        "op_margin_peer_score",
    ]
    for column in round_columns:
        if column in merged.columns:
            merged[column] = merged[column].round(2)

    output_columns = [
        "symbol",
        "corpCode",
        "name",
        "year",
        "fiscal_date",
        "price_date",
        "price",
        "market_cap",
        "currency",
        "sector_group",
        "sector_name",
        "market_type",
        "industry_code",
        "industry_name",
        "valuation_model_type",
        "valuation_model_name",
        "peer_group_name",
        "peer_group_level",
        "peer_group_size",
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
        "operating_margin",
        "peer_per_avg",
        "peer_pbr_avg",
        "peer_roe_avg",
        "peer_debt_ratio_avg",
        "peer_operating_margin_avg",
        "per_vs_peer_pct",
        "pbr_vs_peer_pct",
        "roe_vs_peer_pctp",
        "debt_ratio_vs_peer_pct",
        "operating_margin_vs_peer_pctp",
        "weight_per",
        "weight_pbr",
        "weight_roe",
        "weight_debt",
        "weight_op_margin",
        "per_score",
        "pbr_score",
        "roe_score",
        "debt_score",
        "operating_margin_score",
        "absolute_score",
        "weighted_absolute_score",
        "per_peer_score",
        "pbr_peer_score",
        "roe_peer_score",
        "debt_peer_score",
        "op_margin_peer_score",
        "risk_penalty",
        "industry_adjusted_score",
        "valuation_score",
    ]
    output_columns = [column for column in output_columns if column in merged.columns]

    result = merged[output_columns].sort_values(["valuation_score", "symbol"], ascending=[False, True])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result.to_csv(args.output, index=False, encoding="utf-8-sig")

    if args.copy_to_backend:
        args.backend_output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(args.output, args.backend_output)
        print(f"백엔드용 CSV 복사 완료: {args.backend_output}")

    print("valuation_metrics 생성 완료")
    print(f"financial_base 행 수: {len(financial):,}")
    print(f"market_snapshot 행 수: {len(market):,}")
    print(f"결합 결과 행 수: {len(result):,}")
    print(f"시가총액 미수집 목록: {args.missing_output}")
    print(f"저장: {args.output}")
    if "sector_group" in result.columns:
        print("\nsector_group별 결과 행 수")
        print(result.groupby("sector_group")["symbol"].count().to_string())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
