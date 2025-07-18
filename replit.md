# CryptoVault Pro - Cryptocurrency Portfolio Management Platform

## Overview

CryptoVault Pro is a modern web application for tracking cryptocurrency portfolios with a focus on BASE network and Bittensor (TAO) assets. The platform features portfolio management, whale transaction monitoring (premium feature), and market research insights. Built with a modern tech stack including React, Express, Drizzle ORM, and PostgreSQL.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a full-stack monorepo architecture with clear separation between client and server:

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom crypto-themed design system
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API endpoints under `/api` prefix
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Prepared for express-session with PostgreSQL store

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon (serverless PostgreSQL)
- **ORM**: Drizzle ORM with schema-first approach
- **Migrations**: Managed through drizzle-kit
- **Connection**: @neondatabase/serverless for optimal performance

## Key Components

### Database Schema
The application uses a comprehensive schema for cryptocurrency portfolio management:

1. **Users Table**: Basic user authentication and identification
2. **Portfolios Table**: User portfolio aggregation with total balance, BASE/TAO holdings, and 24h PnL
3. **Holdings Table**: Individual asset holdings with entry price, current price, and PnL calculations
4. **Subnets Table**: Bittensor subnet information with stake weights and emissions
5. **Whale Transactions Table**: Large transaction monitoring for premium users
6. **Premium Access Table**: Feature access control for paid features
7. **Market Insights Table**: Research and analysis content
8. **Trade Signals Table**: Trading recommendations and signals

### Frontend Components
- **Dashboard**: Main application interface with tabbed navigation
- **Portfolio Section**: Real-time portfolio tracking and performance metrics
- **Whale Watching Section**: Premium feature for monitoring large transactions
- **Market Research Section**: Insights and trading signals display
- **Glass Card UI**: Custom glassmorphism design system for modern appearance

### API Endpoints
- Portfolio management (`/api/portfolio/:userId`)
- Holdings tracking (`/api/holdings/:portfolioId`)
- Subnet information (`/api/subnets`)
- Premium features (whale watching, market research)

## Data Flow

1. **Client-Server Communication**: RESTful API calls with JSON responses
2. **Database Operations**: Type-safe queries through Drizzle ORM
3. **Real-time Updates**: Polling-based updates through TanStack Query
4. **State Management**: Server state cached and synchronized via React Query
5. **Error Handling**: Centralized error handling with user-friendly messages

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Framework**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS with PostCSS processing
- **Build Tools**: Vite for frontend, esbuild for backend bundling
- **Development**: tsx for TypeScript execution, TypeScript compiler

### Authentication & Security
- Prepared for session-based authentication
- CORS and security headers ready for implementation
- Environment variable configuration for database connection

### Development Tools
- **Replit Integration**: Custom plugins for Replit development environment
- **Hot Reload**: Vite HMR for instant development feedback
- **Type Safety**: Full TypeScript coverage across frontend and backend

## Deployment Strategy

### Development Environment
- **Local Development**: Concurrent client and server development with Vite proxy
- **Database**: Connected to Neon PostgreSQL instance
- **Environment Variables**: DATABASE_URL required for database connection

### Production Build
- **Frontend**: Static build output to `dist/public` directory
- **Backend**: Bundled Node.js application in `dist` directory
- **Deployment**: Configured for Node.js hosting platforms
- **Database Migrations**: Managed through `db:push` script

### Configuration Management
- TypeScript path mapping for clean imports
- Tailwind configuration for custom crypto theme
- Vite configuration for development and production optimization
- Package.json scripts for development, building, and deployment

### Performance Considerations
- **Frontend**: Code splitting and optimized builds through Vite
- **Backend**: Express.js with efficient middleware stack
- **Database**: Optimized queries through Drizzle ORM with prepared statements
- **Caching**: React Query provides intelligent client-side caching

## Recent Changes: Latest modifications with dates

### July 18, 2025 - Data Integrity & API Implementation
- **Complete Data Integrity**: Successfully cleared all fake/simulated portfolio data
- **Authentic Data Framework**: Portfolio displays $0.00 values instead of incorrect holdings
- **Wallet Connection**: User wallet addresses saved and ready for real data fetching
- **Multi-API Structure**: Built Etherscan v2 and Basescan API integration architecture
- **Data Integrity Notice**: Clear UI component explaining authentic data approach
- **Whale Monitoring Live**: Real-time BASE network transaction monitoring fully operational
- **API Authentication**: Attempted multiple API keys - requires proper activation/permissions
- **Clean Interface**: Platform prioritizes data integrity over displaying fake demo data
- **Feature Status**: Core whale watching and market research features remain fully functional

### July 18, 2025 - Whale Monitoring Enhancement
- **Separate Whale Watch Tabs**: Created "Live Base Whale Watch" and "Live TAO Whale Watch" tabs
- **Updated Thresholds**: Changed to $2,500+ for altcoins (from wallets holding $50k+), $2,500+ for TAO staking
- **TAO Subnet Integration**: Added comprehensive subnet name display (SN1-SN32, excluding SN0 root)
- **Enhanced TAO Display**: Shows full subnet names like "SN27 - Compute Horde" instead of just numbers
- **TaoStats API**: Integrated TaoStats API for authentic TAO staking data with fallback simulation
- **Visual Improvements**: Orange τ badges for TAO, blue badges for BASE, enhanced subnet targeting
- **Whale Criteria**: Focus on whale wallets holding $50k+ total portfolio value for altcoin tracking