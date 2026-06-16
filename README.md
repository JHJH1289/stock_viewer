# Stock Viewer

Spring Boot 백엔드와 React + Vite 프론트엔드로 구성한 주식 모니터링 프로젝트입니다.

## Project Structure

```text
stock_viewer/
  backend/    Spring Boot API server
  frontend/   React + Vite client
```

## Frontend

프론트엔드는 JavaScript 기반 React + Vite 환경입니다. TypeScript 설정은 제거되어 있고, 화면은 컴포넌트 단위로 분리되어 있습니다.

```text
frontend/src/
  components/  화면 컴포넌트
  hooks/       데이터 로딩 훅
  services/    백엔드 API 호출
  utils/       필터링/계산 유틸
```

주요 역할:

- `MarketDataLoader`: 백엔드에서 시장 데이터를 불러오는 컴포넌트
- `useMarketDashboard`: health, API 키 상태, 관심 종목 데이터를 관리하는 훅
- `PriceSparkline`: 종목 흐름 그래프 컴포넌트
- `QuoteTable`: 관심 종목 테이블
- `MarketControls`: 검색, 상승/하락 필터, 갱신 주기 컨트롤

## Stock Master Data

Stock search uses a generated CSV master file.

```text
backend/src/main/resources/data/stock_master.csv
```

CSV schema:

```csv
symbol,name,country,exchange,market,currency,corpCode,source
```

Data sources:

- Korea: OpenDART `corpCode.xml`
- US: Nasdaq Trader `nasdaqlisted.txt`
- US: Nasdaq Trader `otherlisted.txt`

Generate or refresh the file:

```bash
python scripts/generate_stock_master.py
```

The script reads `OPENDART_API_KEY` from `backend/.env`. It does not require Python at runtime; Python is only used to generate the CSV file.

Search API:

```text
GET /api/stocks/search?keyword=삼성&limit=20
GET /api/stocks/search?keyword=AAPL&limit=20
GET /api/stocks/master/summary
```

Current generated dataset size:

```text
16,756 rows
```

## Environment

실제 환경변수는 Git에 올리지 않습니다. 각 폴더의 예시 파일을 복사해서 사용합니다.

```text
frontend/.env.example -> frontend/.env
backend/.env.example  -> backend/.env
```

프론트는 공개 가능한 API 주소만 사용합니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

OpenDART, 한국투자증권 키는 백엔드 `.env`에만 넣습니다.

## Run

백엔드:

```bash
cd backend
./gradlew bootRun
```

Windows PowerShell:

```powershell
cd backend
.\gradlew.bat bootRun
```

프론트:

```bash
cd frontend
npm install
npm run dev
```

기본 주소:

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://localhost:8080`

## Check

프론트:

```bash
cd frontend
npm run lint
npm run build
```

백엔드:

```bash
cd backend
./gradlew test
```
