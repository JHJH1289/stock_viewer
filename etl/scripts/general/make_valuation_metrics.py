from pathlib import Path
import pandas as pd
import numpy as np


ROOT = Path(__file__).resolve().parents[2]

RAW_DIR = ROOT / "etl" / "raw"
PROCESSED_DIR = ROOT / "etl" / "processed"

STOCK_MASTER_PATH = ROOT / "backend" / "src" / "main" / "resources" / "data" / "stock_master.csv"
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


def read_dart_txt(path: Path) -> pd.DataFrame:
    print(f"파일 읽는 중: {path.name}")

    df = pd.read_csv(
        path,
        sep="\t",
        encoding="cp949",
        dtype=str,
        engine="python"
    )

    print(f"컬럼 목록: {list(df.columns)}")
    print(f"행 개수: {len(df)}")

    # 문자열 공백 제거
    for col in df.columns:
        df[col] = df[col].astype(str).str.strip()
        df.loc[df[col].isin(["", "nan", "None"]), col] = np.nan

    # 종목코드: [005930] -> 005930
    df["symbol"] = (
        df["종목코드"]
        .astype(str)
        .str.replace("[", "", regex=False)
        .str.replace("]", "", regex=False)
        .str.zfill(6)
    )

    # 사업연도 추출
    df["year"] = df["결산기준일"].astype(str).str[:4]

    # 금액 컬럼 숫자 변환
    df["amount"] = (
        df["당기"]
        .astype(str)
        .str.replace(",", "", regex=False)
        .str.replace("−", "-", regex=False)
        .str.replace("-", "0", regex=False)
    )

    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")

    return df


def find_raw_file(keyword: str) -> Path:
    files = list(RAW_DIR.glob("*.txt"))

    matched = [file for file in files if keyword in file.name]

    if not matched:
        raise FileNotFoundError(f"{keyword}가 들어간 txt 파일을 찾지 못했습니다. 현재 위치: {RAW_DIR}")

    return matched[0]


def make_financial_base():
    print("프로젝트 루트:", ROOT)
    print("원본 데이터 폴더:", RAW_DIR)
    print("결과 저장 폴더:", PROCESSED_DIR)

    bs_path = find_raw_file("재무상태표")
    pl_path = find_raw_file("포괄손익계산서")

    bs = read_dart_txt(bs_path)
    pl = read_dart_txt(pl_path)

    # 재무상태표에서 자산/부채/자본 추출
    bs_filtered = bs[bs["항목코드"].isin(BS_ACCOUNT_MAP.keys())].copy()
    bs_filtered["metric"] = bs_filtered["항목코드"].map(BS_ACCOUNT_MAP)

    # 손익계산서에서 당기순이익/영업이익/매출액 추출
    pl_filtered = pl[pl["항목코드"].isin(PL_ACCOUNT_MAP.keys())].copy()
    pl_filtered["metric"] = pl_filtered["항목코드"].map(PL_ACCOUNT_MAP)

    print("재무상태표 추출 행 개수:", len(bs_filtered))
    print("손익계산서 추출 행 개수:", len(pl_filtered))

    long_df = pd.concat([bs_filtered, pl_filtered], ignore_index=True)

    financial = long_df.pivot_table(
        index=[
            "symbol",
            "회사명",
            "year",
            "결산기준일",
            "보고서종류",
            "통화",
        ],
        columns="metric",
        values="amount",
        aggfunc="first"
    ).reset_index()

    financial.columns.name = None

    financial = financial.rename(columns={
        "회사명": "name",
        "결산기준일": "fiscal_date",
        "보고서종류": "report_type",
        "통화": "currency",
    })

    # stock_master.csv에서 corpCode 붙이기
    if STOCK_MASTER_PATH.exists():
        stock_master = pd.read_csv(
            STOCK_MASTER_PATH,
            dtype={
                "symbol": str,
                "corpCode": str,
            }
        )

        stock_master = stock_master[["symbol", "corpCode"]].copy()

        financial = financial.merge(
            stock_master,
            on="symbol",
            how="left"
        )
    else:
        print("stock_master.csv를 찾지 못했습니다. corpCode 없이 진행합니다.")
        financial["corpCode"] = np.nan

    result = financial[[
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
    ]]

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    result.to_csv(
        FINANCIAL_OUTPUT_PATH,
        index=False,
        encoding="utf-8-sig"
    )

    print("저장 완료:", FINANCIAL_OUTPUT_PATH)
    print("최종 행 개수:", len(result))
    print(result.head())


def main():
    print("전처리 시작")
    make_financial_base()
    print("전처리 완료")


if __name__ == "__main__":
    main()