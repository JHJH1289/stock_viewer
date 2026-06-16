# Stock Viewer Frontend

React + Vite 기반 주식 모니터링 프론트엔드입니다. TypeScript 없이 JavaScript/JSX로 구성되어 있습니다.

## Structure

```text
src/
  App.jsx
  App.css
  components/
    AppHeader.jsx
    ChangeBadge.jsx
    DashboardView.jsx
    MarketControls.jsx
    MarketDataLoader.jsx
    PriceSparkline.jsx
    QuoteTable.jsx
    SummaryGrid.jsx
    TickerStrip.jsx
  hooks/
    useMarketDashboard.js
  services/
    stockApi.js
  utils/
    market.js
```

## Component Roles

- `MarketDataLoader`: 백엔드 API 데이터를 불러와 하위 화면에 전달합니다.
- `useMarketDashboard`: API health, 외부 연동 키 상태, 관심 종목 데이터를 관리합니다.
- `PriceSparkline`: 종목별 미니 그래프를 렌더링합니다.
- `QuoteTable`: 관심 종목 시세 테이블을 표시합니다.
- `TickerStrip`: 변동폭이 큰 주요 종목 카드를 표시합니다.
- `MarketControls`: 검색, 상승/하락 필터, 갱신 주기 선택 UI입니다.
- `market.js`: 종목 필터링, 요약 계산, 퍼센트 포맷을 담당합니다.

## Stock Search API

프론트 API 호출은 `src/services/stockApi.js`에 모아둡니다.

```js
searchStockMaster(keyword, limit)
```

백엔드 검색 API:

```text
GET /api/stocks/search?keyword=삼성&limit=20
GET /api/stocks/search?keyword=AAPL&limit=20
```

응답 필드:

```text
symbol, name, country, exchange, market, currency, corpCode, source
```

## Environment

`.env`에는 백엔드 API 주소만 둡니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

외부 API 키는 프론트에 두지 않고 백엔드 `.env`에서 관리합니다.

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
```

개발 서버 기본 주소:

```text
http://127.0.0.1:5173
```
