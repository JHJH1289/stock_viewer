# ETL

2025년 일반 기업 기준으로 DART 재무제표 원천 파일과 KIS 시세 API를 합쳐 가치평가용 CSV를 만듭니다.

## Output

- `processed/2025/general/financial_base.csv`: DART 재무제표에서 추출한 종목별 기초 재무 데이터
- `processed/2025/general/market_snapshot.csv`: KIS API에서 수집한 종목별 현재가와 시가총액
- `processed/2025/general/market_snapshot_failed.csv`: 시세 수집 실패 종목과 실패 사유
- `processed/2025/general/valuation_metrics.csv`: 재무 데이터와 시세 데이터를 결합해 계산한 PER, PBR, ROE, 부채비율, 점수

## Run

```powershell
python -m pip install -r etl/requirements.txt
python etl/scripts/general/01_make_financial_base.py
python etl/scripts/general/03_make_market_snapshot.py
python etl/scripts/general/04_make_valuation_metrics.py
```

`03_make_market_snapshot.py`는 `backend/.env`의 KIS API 키를 사용합니다.
