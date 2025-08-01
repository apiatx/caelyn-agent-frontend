# CryptoHippo - Cryptocurrency Portfolio Management Platform

## Overview
CryptoHippo is a web application for comprehensive cryptocurrency portfolio management, focusing on BASE network and Bittensor (TAO) assets. It offers real-time portfolio tracking, whale transaction monitoring, and in-depth market research insights. The platform aims to provide a streamlined, secure, and data-rich environment for crypto investors, combining real-time market data with advanced analytics and access to essential Web3 tools. Its business vision is to become a leading hub for sophisticated crypto analysis and portfolio management across multiple blockchain ecosystems.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a full-stack monorepo architecture, ensuring clear separation and efficient development.

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with a custom glassmorphism design system for a modern, crypto-themed UI. shadcn/ui and Radix UI are utilized for UI components.
- **State Management**: TanStack Query for efficient server state management.
- **Routing**: Wouter for lightweight client-side routing.
- **Build Tool**: Vite for fast development and optimized production builds.
- **UI/UX Decisions**: Emphasizes a dark theme, glass card UI, and consistent branding with the CryptoHippo mascot. Navigation is streamlined with tabbed interfaces and icon-based cues.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API endpoints under the `/api` prefix.
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations.
- **Session Management**: Prepared for express-session with PostgreSQL store for authentication.

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless PostgreSQL).
- **ORM**: Drizzle ORM, following a schema-first approach.
- **Migrations**: Managed via drizzle-kit.
- **Connection**: Uses @neondatabase/serverless for optimal performance with serverless PostgreSQL.

### Key Components
- **Database Schema**: Comprehensive schema including Users, Portfolios, Holdings, Subnets, Whale Transactions, Premium Access, Market Insights, and Trade Signals tables.
- **Frontend Components**: Dashboard for main interface, dedicated sections for Portfolio, Whale Watching, Market Research, and specialized network analytics (BASE, Bittensor, Solana, Abstract). Features custom glass card UI and dynamic chart displays.
- **API Endpoints**: Dedicated endpoints for portfolio management, holdings tracking, subnet information, and premium features.

### System Design Choices
- **Data Flow**: RESTful API communication with JSON. Type-safe database operations via Drizzle ORM. Polling-based real-time updates and client-side caching with React Query. Centralized error handling.
- **Security**: Enterprise-level security including HTTPS enforcement, XSS/SQL injection prevention, comprehensive CSP headers with trusted domain whitelists, JWT authentication readiness, input sanitization, rate limiting, CORS protection, and Helmet security headers. Secure iframe sandboxing and external link handling are implemented.
- **Performance**: Optimized frontend builds with code splitting, efficient Express.js backend, and optimized Drizzle ORM queries with caching mechanisms.

## External Dependencies

- **Database**: Neon (PostgreSQL serverless).
- **UI Libraries**: Radix UI, shadcn/ui, Tailwind CSS.
- **Data Fetching/Management**: TanStack Query.
- **API Integrations**:
    - **Market Data**: CoinMarketCap API, GeckoTerminal API (for BASE top gainers).
    - **Portfolio Tracking**: DeBank API, TaoStats API, TaoHub, Hyperfolio, DexScreener (via iframe/links).
    - **Blockchain Explorers**: Etherscan v2, Basescan API (architected), BlockCreeper.com.
    - **Analytics Platforms**: Artemis Analytics, Swordscan (for TensorPulse), Moby Screener, Bubblemaps, CoinMarketMan, StockAnalysis.com, Screener.in, AInvest.com, Unusual Whales, MacroEdge, Investing.com, StockTwits, Intellectia AI, Atypica AI, Kavout.
    - **Trading/DEX**: Jupiter Aggregator, Aerodrome Finance, Uniswap (via links/iframes), UniversalX, Hyperliquid, Polymarket.
    - **Bittensor Specific**: TaoStats, Backprop.finance, TaoMarketCap.com.
    - **Treasury Data**: bitcointreasuries.net, strategicethreserve.xyz, taotreasuries.app, thenew.money (SOL).
    - **News**: Cointelegraph.
    - **Social Intelligence**: X.com (formerly Twitter) for sentiment analysis and direct links to key accounts.
    - **AI/DeFAI**: Aya AI, ChatGPT Crypto Trading & Investing GPT, AIxVC, Senpi AI, Arma Protocol, ZYF AI Dashboard.
    - **NFT Analytics**: OpenSea.
    - **Miscellaneous**: Terminal.co, Checkr.social, Virtuals.io, Creator.bid, Bankr.bot, Velvet Capital, Indexy.xyz, OKX Leaderboard, NewHedge.
- **Build Tools**: Vite, esbuild, tsx.
- **Development Tools**: Replit Integration plugins, Hot Reload (Vite HMR), TypeScript.

## Recent Changes (August 2025)
- **MacroEdge Integration**: Added MacroEdge iframe (https://macroedge.ai/app) to Market Overview page above Onchain section with purple branding
- **MacroEdge Security**: Added macroedge.ai domains to both client-side and server-side CSP configurations for proper iframe functionality
- **Additional TradingView Charts**: Added three new cryptocurrency chart iframes to Top Charts page between BNB and DOGE sections: SUI (green theme), AVAX (purple theme), and CHAINLINK (pink theme)
- **Chart Integration**: All new charts use the same TradingView widget format as existing charts for consistent functionality and display
- **Fixed iframe Issues**: Resolved all TypeScript compatibility issues by removing problematic allowtransparency attributes from iframe elements
- **Deployment Health Checks**: Applied comprehensive deployment health check fixes including:
  - Multiple health endpoints (`/`, `/health`, `/api/health`, `/api/ready`) with priority placement before middleware
  - Background service initialization delayed to 2 seconds after server startup to prevent blocking
  - Server timeout configuration (30s timeout, 65s keep-alive) for load balancer compatibility
  - Enhanced error handling that allows server to function even if background services fail
  - Fixed all TypeScript type issues in route handlers to prevent runtime errors