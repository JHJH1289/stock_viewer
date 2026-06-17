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
    DetailPriceChart.jsx
    IntegrationStatusList.jsx
    MarketControls.jsx
    MarketDataLoader.jsx
    PriceSparkline.jsx
    QuoteTable.jsx
    StockDetailPage.jsx
    StockLink.jsx
    StockSearchResults.jsx
    TickerStrip.jsx
  hooks/
    useMarketDashboard.js
    useStockSearch.js
  services/
    stockApi.js
  utils/
    market.js
```

## Component Responsibilities

### `App.jsx`

앱 최상위 컴포넌트입니다. 검색어, 등락 필터, 갱신 주기 같은 화면 상태를 관리하고 `MarketDataLoader`와 `DashboardView`를 연결합니다. 실제 데이터 호출이나 테이블 렌더링은 하위 컴포넌트에 위임합니다.

### `DashboardView.jsx`

대시보드 화면의 조립 컴포넌트입니다. `AppHeader`, `TickerStrip`, `IntegrationStatusList`, `MarketControls`, `StockSearchResults`, `QuoteTable`을 배치합니다. 검색 결과와 관심종목 필터링처럼 화면에 필요한 파생 데이터를 `useMemo`로 계산합니다.

### `MarketDataLoader.jsx`

백엔드 대시보드 데이터를 불러오는 컨테이너 컴포넌트입니다. 내부에서 `useMarketDashboard`를 호출하고, health 상태, 연동 상태, 관심종목 시세, 로딩 상태, 에러 상태를 children render function으로 전달합니다.

### `AppHeader.jsx`

상단 헤더입니다. 앱 제목, API 연결 상태, 수동 새로고침 버튼을 표시합니다. 새로고침 버튼 클릭 시 상위에서 받은 `onRefresh`를 실행합니다.

### `TickerStrip.jsx`

상단 주요 종목 카드 목록입니다. 변동폭이 큰 종목을 카드 형태로 보여주며, 각 카드에 회사명, 종목코드, 가격, 등락률, 미니 그래프를 표시합니다.

### `IntegrationStatusList.jsx`

백엔드 외부 API 연동 상태 목록입니다. OpenDART, Korea Investment 같은 연동 항목을 리스트로 보여주고, 각 항목이 연결되어 있는지 표시합니다.

### `MarketControls.jsx`

검색과 필터 컨트롤입니다. 종목 검색어 입력, 전체/상승/하락 필터, 자동 갱신 주기 선택 UI를 담당합니다. 상태 자체는 `App.jsx`에서 관리하고, 이 컴포넌트는 입력 이벤트만 전달합니다.

### `StockSearchResults.jsx`

검색 결과 테이블입니다. `stock_master.csv` 기반 검색 결과를 표시하고, 검색 결과에 포함된 종목만 별도로 가격 조회한 값을 함께 보여줍니다. 컬럼은 `Name`, `Symbol`, `Price`, `Change`, `Country`, `Exchange`, `Currency`, `Corp Code` 순서입니다. 굵은 표시는 `Name`에 적용합니다.

### `StockDetailPage.jsx`

개별 종목 상세 화면입니다. 라우트는 `/{종목코드}` 형식이며, 예를 들면 `/005930`, `/AAPL`입니다. URL의 종목코드로 백엔드 단건 quote API를 호출하고 현재가, 등락률, 시장, 통화, 세부 그래프를 표시합니다.

### `DetailPriceChart.jsx`

상세 페이지 전용 큰 캔들 차트입니다. 현재는 단건 quote의 현재가와 등락률을 기반으로 OHLC 형태의 캔들, 거래량 막대, MA 5/MA 10 이동평균선을 생성합니다. 추후 실제 일봉/분봉 API가 붙으면 이 컴포넌트가 실제 시계열 배열을 받아 그리도록 확장하면 됩니다.

### `StockLink.jsx`

종목 상세 페이지로 이동하는 공통 링크 컴포넌트입니다. 회사명 텍스트, 종목코드, 그래프 등 클릭 가능한 요소가 동일한 라우팅 규칙을 사용하도록 감쌉니다.

### `QuoteTable.jsx`

메인 관심종목 시세 테이블입니다. 실제 watchlist API에서 받은 종목의 회사명, 종목코드, 시장, 가격, 등락률, 미니 그래프를 표시합니다.

### `PriceSparkline.jsx`

종목 흐름 미니 그래프 컴포넌트입니다. 현재는 실제 시계열 데이터가 아니라 등락률과 심볼을 기반으로 안정적인 SVG 스파크라인을 생성합니다. 추후 분봉/일봉 API가 붙으면 이 컴포넌트만 실제 시계열 입력을 받도록 확장하면 됩니다.

### `ChangeBadge.jsx`

등락률 배지입니다. 양수는 초록색, 음수는 빨간색, `0.00%`는 회색으로 표시합니다.

## Hooks

### `useMarketDashboard.js`

대시보드 초기 로딩과 자동 갱신을 담당합니다. `/health`, `/integrations/status`, `/stocks/watchlist`를 호출하고 관심종목 시세를 주기적으로 갱신합니다.

### `useStockSearch.js`

검색어 변경을 감지해 `/stocks/search`를 호출합니다. 검색 결과가 있으면 해당 결과 목록만 `/stocks/quotes`로 가격 조회합니다. 디바운스를 적용해 입력 중 API 호출이 과도하게 발생하지 않도록 합니다.

## Services

### `stockApi.js`

백엔드 API 호출을 모아둔 서비스 모듈입니다.

- `fetchMarketDashboard()`: 대시보드에 필요한 health, 연동 상태, watchlist 데이터를 가져옵니다.
- `searchStockMaster(keyword, limit)`: 주식 마스터에서 종목을 검색합니다.
- `fetchStockQuotes(stocks)`: 검색 결과에 포함된 종목들의 가격 정보를 가져옵니다.

## Utils

### `market.js`

화면 계산과 표시 포맷을 담당합니다.

- `filterStocks()`: 관심종목 목록에 검색어/등락 필터를 적용합니다.
- `getTopMovers()`: 변동폭이 큰 종목을 계산합니다.
- `formatPercent()`: 등락률 문자열을 만듭니다.
- `formatPrice()`: KRW/USD 가격을 통화에 맞게 포맷합니다.
- `getPrimaryStockLabel()`: 회사명을 주요 라벨로 반환합니다.
- `getSecondaryStockLabel()`: 종목코드를 보조 라벨로 반환합니다.

## Stock Search API

프론트 API 호출은 `src/services/stockApi.js`에 모아둡니다.

```js
searchStockMaster(keyword, limit)
fetchStockQuotes(stocks)
```

백엔드 검색 API:

```text
GET /api/stocks/search?keyword=삼성&limit=20
POST /api/stocks/quotes
GET /api/stocks/quote/{symbol}
```

검색 응답 필드:

```text
symbol, name, country, exchange, market, currency, corpCode, source
```

가격 응답 필드:

```text
symbol, name, price, changePercent, market, currency
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
