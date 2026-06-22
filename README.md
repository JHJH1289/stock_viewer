# Stock Viewer

국내/미국 주식 검색, 시세 조회, 가치 지표, 차트, 모의 매매, 포트폴리오, 종목별 게시판, 뉴스, 로컬 LLM 요약을 제공하는 Spring Boot + React 기반 주식 모니터링 프로젝트입니다.

문서는 다음 순서로 정리합니다.

1. Database
2. Frontend
3. Backend
4. Data Flow
5. 실행 및 외부 공개

## Database

DB는 Oracle을 기준으로 구성되어 있으며, 게시판 v2 구조는 `BOARDS -> POSTS -> COMMENTS` 관계를 중심으로 동작합니다.

### 핵심 테이블

| 테이블 | 역할 | 주요 컬럼 |
| --- | --- | --- |
| `USERS` | 사용자 계정 | `ID`, `USERNAME`, `EMAIL`, `PASSWORD`, `ROLE`, `CREATED_AT` |
| `BALANCE` | 사용자별 현금 잔고 | `USER_ID`, `KRW_AMOUNT`, `USD_AMOUNT`, `UPDATED_AT` |
| `HOLDINGS` | 사용자별 보유 종목 | `HOLDING_ID`, `USER_ID`, `SYMBOL`, `STOCK_NAME`, `MARKET_CODE`, `QUANTITY`, `AVG_BUY_PRICE` |
| `TRADE_ORDERS` | 매수/매도 거래 기록 | `ORDER_ID`, `USER_ID`, `SYMBOL`, `STOCK_NAME`, `MARKET_CODE`, `ORDER_TYPE`, `QUANTITY`, `PRICE`, `TOTAL_AMOUNT`, `CURRENCY` |
| `MARKETS` | 시장 코드 마스터 | `MARKET_CODE`, `MARKET_NAME`, `COUNTRY`, `CURRENCY` |
| `STOCKS` | 종목 마스터 | `STOCK_ID`, `MARKET_CODE`, `SYMBOL`, `STOCK_NAME`, `CORP_CODE`, `SECTOR`, `LISTED` |
| `BOARDS` | 게시판 분류 | `BOARD_ID`, `BOARD_SLUG`, `BOARD_NAME`, `BOARD_TYPE`, `MARKET_CODE`, `STOCK_ID`, `WRITE_ROLE`, `HIDDEN`, `SORT_ORDER` |
| `POSTS` | 게시글 | `POST_ID`, `BOARD_ID`, `USER_ID`, `TITLE`, `CONTENT`, `VIEW_COUNT`, `RECOMMEND_COUNT`, `CREATED_AT`, `UPDATED_AT` |
| `COMMENTS` | 댓글 | `COMMENT_ID`, `POST_ID`, `USER_ID`, `CONTENT`, `CREATED_AT`, `UPDATED_AT` |
| `POST_RECOMMENDATIONS` | 게시글 추천 중복 방지 | `POST_ID`, `USER_ID`, `CREATED_AT` |

### 주요 관계

| 관계 | 설명 |
| --- | --- |
| `USERS 1 -> N HOLDINGS` | 한 사용자는 여러 보유 종목을 가질 수 있습니다. |
| `USERS 1 -> 1 BALANCE` | 사용자별 KRW/USD 현금 잔고를 관리합니다. |
| `USERS 1 -> N TRADE_ORDERS` | 매수/매도 주문 이력을 사용자별로 저장합니다. |
| `MARKETS 1 -> N STOCKS` | 한 시장은 여러 종목을 포함합니다. |
| `MARKETS 1 -> N BOARDS` | 한국/미국 주식 게시판처럼 시장 단위 게시판을 만들 수 있습니다. |
| `STOCKS 1 -> N BOARDS` | 삼성전자, AAPL 같은 종목별 게시판을 연결합니다. |
| `BOARDS 1 -> N POSTS` | 게시글은 반드시 하나의 게시판에 속합니다. |
| `POSTS 1 -> N COMMENTS` | 게시글에는 여러 댓글이 연결됩니다. |
| `POSTS 1 -> N POST_RECOMMENDATIONS` | 사용자별 추천 여부를 관리합니다. |

### 게시판 타입

| `BOARD_TYPE` | 의미 | 예시 |
| --- | --- | --- |
| `GENERAL` | 자유게시판 | 자유게시판 |
| `NOTICE` | 공지사항 | 서비스 공지 |
| `MARKET` | 시장별 게시판 | 한국 주식 게시판, 미국 주식 게시판 |
| `STOCK` | 종목별 게시판 | 삼성전자 게시판, Apple 게시판 |

### DB 초기화 및 마이그레이션 파일

| 파일 | 목적 |
| --- | --- |
| `backend/src/main/resources/sql/schema.sql` | Oracle 사용자/기본 스키마 준비 |
| `backend/src/main/resources/sql/user_schema.sql` | 기존 사용자/거래 관련 스키마 |
| `backend/src/main/resources/sql/user_schema_v2.sql` | 신규 설치용 Board v2 포함 통합 스키마 |
| `backend/src/main/resources/sql/board_v2_migration.sql` | 기존 `POSTS.SYMBOL` 중심 게시판 구조를 `BOARDS -> POSTS` 구조로 이전 |
| `backend/src/main/resources/sql/board_v2_apply_existing.sql` | 기존 DB에 Board v2 구조를 적용하기 위한 보조 SQL |

### DB 관점 데이터 플로우

```text
회원가입
USERS 생성
BALANCE 기본 잔고 생성

로그인
USERS 조회
JWT 발급

매수
USERS 인증
BALANCE 차감
HOLDINGS 수량/평단 갱신
TRADE_ORDERS BUY 기록

매도
USERS 인증
HOLDINGS 수량 차감
BALANCE 증가
TRADE_ORDERS SELL 기록

종목 게시글 작성
SYMBOL 요청
STOCKS 조회 또는 생성
BOARDS(STOCK) 조회 또는 생성
POSTS 저장

댓글 작성
POSTS 조회
COMMENTS 저장
```

## Frontend

프론트엔드는 React + Vite로 구성되어 있습니다. API 호출은 `frontend/src/services/stockApi.js`에 모여 있고, 화면은 `frontend/src/components` 하위 컴포넌트로 분리되어 있습니다.

### 라우팅

| 경로 | 컴포넌트 | 기능 |
| --- | --- | --- |
| `/` | `DashboardPage` in `App.jsx` | 랜딩/메인 대시보드 |
| `/mypage` | `MyPage` | 내 포트폴리오 |
| `/posts/:postId` | `PostDetailPage` | 게시글 상세 |
| `/:symbol` | `StockDetailPage` | 종목 상세 페이지 |

### 주요 컴포넌트

| 컴포넌트 | 기능 |
| --- | --- |
| `App.jsx` | 전체 라우팅, 테마 상태, 로그인 모달, 검색 상태, 거래 모달 상태를 관리합니다. |
| `AppHeader` | 상단 헤더, API 상태, 테마 토글, 로그인/회원가입/로그아웃 UI를 담당합니다. |
| `AuthModal` | 회원가입/로그인 폼을 표시하고 인증 성공 시 JWT와 사용자명을 `localStorage`에 저장합니다. |
| `TickerStrip` | 변동률 기준 주요 종목 요약 카드를 표시합니다. |
| `MarketControls` | 검색어, 상승/하락 필터, 자동 새로고침 주기를 조작합니다. |
| `StockSearchResults` | 종목 마스터 검색 결과와 현재가를 표시하고 매수 버튼을 제공합니다. |
| `QuoteTable` | 관심 종목 시세 테이블, 변동률, 간단 차트, 매수 기능을 표시합니다. |
| `PriceSparkline` | 종목별 간단 미니 차트를 렌더링합니다. |
| `ChangeBadge` | 상승/하락률 배지를 통일된 UI로 표시합니다. |
| `AccountSummaryPanel` | 로그인 사용자의 잔고, 보유 종목, 거래 기록을 접고 펼 수 있는 형태로 표시합니다. |
| `PortfolioPanel` | 보유 종목 및 거래 요약을 표시하는 포트폴리오 보조 패널입니다. |
| `TradeModal` | 매수/매도 수량과 가격을 입력하고 거래 API를 호출합니다. |
| `MarketBoardSlots` | 한국/미국 시장 게시판의 최신글을 카드 형태로 노출합니다. |
| `StockLink` | 보유 종목/게시글 등에서 종목 상세 페이지로 이동하는 링크를 제공합니다. |

### 종목 상세 컴포넌트

| 컴포넌트 | 기능 |
| --- | --- |
| `StockDetailPage` | 종목 상세 페이지 컨테이너입니다. 시세, 차트, 가치지표, 뉴스, 게시판, AI 요약을 조합합니다. |
| `DetailPriceChart` | 1일/1개월/6개월/1년 차트를 SVG로 렌더링합니다. 드래그 구간 변화량 표시를 지원합니다. |
| `ValuationMetricsPanel` | PER, PBR, ROE, 부채비율, 가치점수, 재무 항목을 시각화합니다. 과거 결산 데이터 선택도 지원합니다. |
| `StockNewsPanel` | 네이버 뉴스 검색 API 결과를 종목 뉴스 목록으로 표시합니다. |
| `StockBoardPanel` | 종목별 게시판 목록, 정렬, 인기글 필터, 글쓰기, 인라인 상세/댓글 UI를 제공합니다. |
| `StockAiSummaryPanel` | 로컬 Ollama LLM으로 뉴스, 가치지표, 차트 흐름을 종합한 기업 요약을 표시합니다. |

### 마이페이지 컴포넌트

| 컴포넌트 | 기능 |
| --- | --- |
| `MyPage` | 내 잔고, 총 손익, 보유 종목 수, 보유 비중 원그래프, 보유 주식 현황을 표시합니다. |
| `PortfolioAiSummaryPanel` | 보유 종목 데이터를 로컬 LLM에 보내 포트폴리오가 어떤 종목/시장 위주인지 요약합니다. 정확한 계산은 앱에서 처리하고 LLM은 정성적 해석만 담당합니다. |

### 게시판 컴포넌트

| 컴포넌트 | 기능 |
| --- | --- |
| `PostDetailPage` | 게시글 단독 상세 페이지입니다. 게시글 본문, 댓글, 추천/비추천 영역을 표시합니다. |
| `PostInlineThread` | 종목 게시판 목록 안에서 게시글을 펼쳐 본문과 댓글을 확인/작성/수정/삭제합니다. |
| `StockBoardPanel` | 종목별 게시판의 목록, 정렬, 인기글, 글쓰기, 인라인 스레드를 관리합니다. |

### 프론트 API 호출 구조

`stockApi.js`는 아래 기능군을 담당합니다.

| 함수군 | 호출 API | 설명 |
| --- | --- | --- |
| 대시보드 | `/api/health`, `/api/integrations/status`, `/api/stocks/watchlist` | 서버 상태, 연동 상태, 관심 종목 시세 로딩 |
| 종목 검색 | `/api/stocks/search`, `/api/stocks/quotes` | 종목 마스터 검색 및 검색 결과 현재가 보강 |
| 종목 상세 | `/api/stocks/quote/{symbol}`, `/api/stocks/history/{symbol}` | 상세 현재가와 차트 데이터 로딩 |
| 가치 지표 | `/api/stocks/valuation/{symbol}`, `/api/stocks/valuation/{symbol}/history` | CSV 기반 PER/PBR/ROE/부채비율 로딩 |
| 인증 | `/api/auth/signup`, `/api/auth/login` | 사용자 가입/로그인 |
| 거래 | `/api/trading/balance`, `/api/trading/holdings`, `/api/trading/orders`, `/api/trading/buy`, `/api/trading/sell` | 잔고, 보유 종목, 거래 기록, 매수/매도 |
| 게시판 | `/api/posts`, `/api/posts/stock/{symbol}`, `/api/posts/markets/{marketCode}`, `/api/posts/{id}` | 게시판 글 목록/상세/작성/수정/삭제 |
| 댓글 | `/api/posts/{postId}/comments` | 댓글 조회/작성/수정/삭제 |
| 뉴스 | `/api/news/major` | 네이버 뉴스 검색 |
| AI | `/api/ai/stock-summary`, `/api/ai/portfolio-summary` | Ollama 기반 종목/포트폴리오 요약 |

## Backend

백엔드는 Spring Boot 기반 REST API 서버입니다. Oracle DB, CSV 파일, 외부 API, 로컬 LLM을 조합해서 프론트에 JSON 형태로 전달합니다.

### 주요 패키지

| 패키지 | 역할 |
| --- | --- |
| `auth` | 회원가입/로그인 컨트롤러 |
| `service` | 인증 서비스 |
| `security` | JWT 발급/검증, 인증 필터, 사용자 상세 조회 |
| `entity` | JPA 엔티티: 사용자, 잔고, 보유 종목, 거래 주문, 시장 |
| `repository` | JPA Repository |
| `trading` | 모의 매매, 잔고/보유 종목/거래 기록 처리 |
| `stock` | 관심 종목, 현재가, 차트 히스토리 API |
| `stockmaster` | CSV 종목 마스터 검색 |
| `valuation` | CSV 가치 지표 조회 |
| `kis` | 한국투자증권 Open API 연동 |
| `news` | 네이버 뉴스 검색 API 연동 |
| `ai` | Ollama 로컬 LLM 프록시 |
| `Board` | 게시판, 게시글, 댓글, 종목별 게시판 처리 |
| `config` | CORS, Security, 초기 데이터, 연동 상태 API |

### 주요 컨트롤러

| 컨트롤러 | 엔드포인트 | 프론트 전달 데이터 |
| --- | --- | --- |
| `AuthController` | `POST /api/auth/signup`, `POST /api/auth/login` | JWT 토큰, 사용자명 |
| `StockController` | `GET /api/health`, `GET /api/stocks/watchlist`, `POST /api/stocks/quotes`, `GET /api/stocks/quote/{symbol}`, `GET /api/stocks/history/{symbol}` | 서버 상태, 시세, 차트 포인트 |
| `StockMasterController` | `GET /api/stocks/search`, `GET /api/stocks/master/summary` | 종목 검색 결과, 종목 마스터 요약 |
| `ValuationMetricsController` | `GET /api/stocks/valuation/{symbol}`, `GET /api/stocks/valuation/{symbol}/history` | PER/PBR/ROE/부채비율/가치점수/재무 데이터 |
| `TradingController` | `GET /api/trading/balance`, `GET /api/trading/holdings`, `GET /api/trading/orders`, `POST /api/trading/buy`, `POST /api/trading/sell` | 잔고, 보유 종목, 거래 이력, 거래 결과 |
| `PostController` | `GET/POST/PUT/DELETE /api/posts...` | 게시글 목록/상세/작성/수정/삭제 결과 |
| `CommentController` | `GET/POST/PUT/DELETE /api/posts/{postId}/comments...` | 댓글 목록/작성/수정/삭제 결과 |
| `NaverNewsController` | `GET /api/news/major` | 뉴스 제목, 설명, 링크, 발행 시각 |
| `OllamaAiController` | `POST /api/ai/stock-summary`, `POST /api/ai/portfolio-summary` | LLM 요약문, 모델명, 생성 시각 |
| `IntegrationStatusController` | `GET /api/integrations/status` | OpenDART, KIS, Naver 등 연동 설정 상태 |

### Backend 처리 방식

#### 인증

1. 프론트가 이메일/비밀번호를 `/api/auth/login`으로 전송합니다.
2. `AuthService`가 `USERS`를 조회하고 비밀번호를 검증합니다.
3. `JwtTokenProvider`가 JWT를 발급합니다.
4. 프론트는 JWT를 `localStorage`에 저장합니다.
5. 거래/게시글 작성/댓글 작성 등 인증 API는 `Authorization: Bearer ...` 헤더를 사용합니다.

#### 시세와 차트

1. 프론트가 종목 코드로 현재가 또는 히스토리를 요청합니다.
2. `StockController`가 종목 정보를 정규화합니다.
3. 한국 종목은 `KisQuoteService`를 통해 한국투자증권 API에서 현재가/기간별 가격을 가져옵니다.
4. 백엔드는 `StockSnapshot`, `StockHistoryResponse`, `StockHistoryPoint` 형태로 변환합니다.
5. 프론트는 `QuoteTable`, `StockDetailPage`, `DetailPriceChart`에서 렌더링합니다.

#### 종목 마스터

1. 백엔드는 CSV 종목 마스터를 `CsvStockMasterRepository`로 로딩합니다.
2. 프론트가 검색어를 `/api/stocks/search`로 보냅니다.
3. 백엔드는 이름/심볼 기준으로 검색 결과를 반환합니다.
4. 프론트는 검색 결과에 대해 `/api/stocks/quotes`로 현재가를 보강합니다.

#### 가치 지표

1. ETL로 생성된 CSV 가치 지표 파일을 백엔드가 읽습니다.
2. `CsvValuationMetricsRepository`가 심볼별 최신/과거 지표를 구성합니다.
3. 프론트는 `/api/stocks/valuation/{symbol}/history`로 과거 결산 데이터를 받습니다.
4. `ValuationMetricsPanel`은 선택된 결산 연도 기준으로 PER/PBR/ROE/부채비율/가치점수를 표시합니다.

#### 거래

1. 매수 요청은 `TradingController.buy`로 들어옵니다.
2. `TradingService`는 잔고가 충분한지 확인합니다.
3. `BALANCE`를 차감하고 `HOLDINGS`를 추가 또는 평단 갱신합니다.
4. `TRADE_ORDERS`에 BUY 기록을 저장합니다.
5. 매도는 보유 수량 확인 후 `HOLDINGS` 차감, `BALANCE` 증가, SELL 기록 저장 순서로 처리합니다.

#### 게시판

1. 종목 상세 페이지가 `/api/posts/stock/{symbol}`을 호출합니다.
2. 백엔드는 `STOCKS`와 `BOARDS`를 기준으로 해당 종목 게시판을 찾거나 생성합니다.
3. 게시글은 `POSTS.BOARD_ID`로 게시판에 연결됩니다.
4. 댓글은 `COMMENTS.POST_ID`로 게시글에 연결됩니다.
5. 작성자명은 `USERS` 조인을 통해 응답에 포함됩니다.
6. 보유 여부 표시는 게시글 작성자의 `HOLDINGS`를 확인해 응답에 반영합니다.

#### 뉴스

1. 프론트가 종목명/심볼을 포함한 검색어를 `/api/news/major`로 보냅니다.
2. 백엔드는 Naver Search API를 호출합니다.
3. HTML 태그를 제거하고 제목/설명/링크/발행일을 정리해서 반환합니다.

#### 로컬 LLM

1. 종목 상세는 시세, 가치지표, 차트 요약, 뉴스 일부를 `/api/ai/stock-summary`로 보냅니다.
2. 마이페이지는 잔고와 보유 종목 요약을 `/api/ai/portfolio-summary`로 보냅니다.
3. 백엔드는 Ollama `/api/generate`를 호출합니다.
4. 종목 요약은 기업/뉴스/지표/차트 리스크를 요약합니다.
5. 포트폴리오 요약은 정확한 계산을 하지 않고 어떤 시장/종목 위주인지 정성적으로 설명합니다.

## Data Flow

### 메인 대시보드

```text
React App
  -> useMarketDashboard
  -> GET /api/health
  -> GET /api/integrations/status
  -> GET /api/stocks/watchlist
  -> StockController / IntegrationStatusController
  -> KIS API + 서버 설정 상태
  -> JSON
  -> TickerStrip / QuoteTable / AppHeader
```

### 종목 검색과 매수

```text
검색어 입력
  -> useStockSearch
  -> GET /api/stocks/search
  -> CsvStockMasterRepository
  -> 검색 결과 반환
  -> POST /api/stocks/quotes
  -> 현재가 보강
  -> StockSearchResults 표시
  -> TradeModal 매수
  -> POST /api/trading/buy
  -> BALANCE / HOLDINGS / TRADE_ORDERS 갱신
```

### 종목 상세

```text
/:symbol 접근
  -> GET /api/stocks/quote/{symbol}
  -> GET /api/stocks/history/{symbol}?range=...
  -> GET /api/stocks/valuation/{symbol}/history
  -> GET /api/news/major
  -> GET /api/posts/stock/{symbol}
  -> StockDetailPage
     - DetailPriceChart
     - ValuationMetricsPanel
     - StockNewsPanel
     - StockBoardPanel
     - StockAiSummaryPanel
```

### 종목별 게시판

```text
StockBoardPanel
  -> GET /api/posts/stock/{symbol}
  -> PostController
  -> STOCKS 조회/생성
  -> BOARDS(STOCK) 조회/생성
  -> POSTS 조회
  -> PostResponse 반환
  -> 게시글 클릭
  -> PostInlineThread
  -> GET /api/posts/{postId}/comments
```

### 마이페이지

```text
/mypage
  -> GET /api/trading/balance
  -> GET /api/trading/holdings
  -> 각 보유 종목 GET /api/stocks/quote/{symbol}
  -> MyPage
     - 요약 카드
     - 보유 비중 원그래프
     - 보유 주식 현황
     - PortfolioAiSummaryPanel
```

### 포트폴리오 LLM

```text
MyPage rows
  -> PortfolioAiSummaryPanel
  -> POST /api/ai/portfolio-summary
  -> OllamaAiController
  -> Ollama local model
  -> 정성적 포트폴리오 요약 반환
```

## 실행

### Backend

```powershell
cd backend
.\gradlew.bat bootRun
```

기본 주소:

```text
http://localhost:8080
```

헬스 체크:

```text
GET http://localhost:8080/api/health
```

### Frontend 개발 서버

```powershell
cd frontend
npm install
npm run dev
```

기본 주소:

```text
http://localhost:5173
```

### 외부 공개용 정적 프론트 + API 프록시

Cloudflare Quick Tunnel처럼 하나의 HTTPS 주소로 프론트와 백엔드를 같이 노출하려면 프론트 빌드 후 프록시 서버를 사용합니다.

```powershell
cd frontend
npm run build
node serve-with-api-proxy.cjs
```

역할:

```text
/
  -> frontend/dist 정적 파일

/api/**
  -> http://localhost:8080/api/**
```

### Cloudflare Quick Tunnel 예시

```powershell
docker run -d --name stock-viewer-cloudflared cloudflare/cloudflared:latest tunnel --no-autoupdate --protocol http2 --url http://host.docker.internal:5173
```

## 환경 변수

### Backend

`backend/.env`

```env
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:5173
SPRING_DATASOURCE_URL=jdbc:oracle:thin:@localhost:1521:xe
SPRING_DATASOURCE_USERNAME=stockviewer
SPRING_DATASOURCE_PASSWORD=1234
JWT_SECRET=...
JWT_EXPIRATION_MS=86400000
OPENDART_API_KEY=...
KIS_BASE_URL=https://openapi.koreainvestment.com:9443
KIS_APP_KEY=...
KIS_APP_SECRET=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma3:4b
```

### Frontend

`frontend/.env`

```env
VITE_API_BASE_URL=/api
```

로컬 개발에서 백엔드로 직접 붙이고 싶다면 다음처럼 사용할 수 있습니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## 검증

### Frontend

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

### Backend

```powershell
cd backend
.\gradlew.bat compileJava
```

## 운영 메모

- Cloudflare Quick Tunnel 주소는 임시 주소입니다. 컨테이너가 내려가면 새 주소가 발급될 수 있습니다.
- 외부 공개 시 프론트는 `/api` 상대경로를 사용하는 것이 안전합니다.
- 로컬 LLM 응답은 Ollama 모델 성능과 로컬 PC 자원에 따라 지연될 수 있습니다.
- 포트폴리오 LLM은 정확한 계산을 담당하지 않습니다. 정확한 수익/손익 계산은 프론트와 백엔드의 숫자 로직에서 처리하고, LLM은 보유 성향 요약만 제공합니다.
- 게시판 구조는 `POSTS`에 `SYMBOL`을 직접 저장하지 않고 `BOARD_ID`로 소속 게시판을 판단합니다.
