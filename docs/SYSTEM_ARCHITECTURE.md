# YNAB Off-Target Assignment Analysis - System Architecture

**Version:** 1.0
**Last Updated:** June 2025
**Status:** Production Ready

## Architecture Overview

The YNAB Off-Target Assignment Analysis application follows a modern web application architecture using Next.js with a focus on client-side data processing and secure API integration.

## High-Level Architecture

### System Components

1. **Frontend Application (Next.js)**
   - React-based user interface
   - Client-side data processing
   - Responsive design with Tailwind CSS
   - Local state management

2. **YNAB API Integration Layer**
   - HTTP client for YNAB API
   - Authentication handling
   - Rate limiting management
   - Response caching

3. **Data Processing Engine**
   - Category analysis algorithms
   - Target alignment calculations
   - Currency conversion utilities
   - Data transformation logic

4. **Security Layer**
   - Environment variable management
   - Token storage and validation
   - Error handling and logging

## System Architecture Diagram

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[React Components]
        Dashboard[Dashboard View]
        CategoryView[Category Analysis View]
        Settings[Settings/Config]
    end
    
    subgraph "Application Layer"
        NextJS[Next.js Framework]
        StateManager[State Management]
        Router[App Router]
    end
    
    subgraph "Business Logic Layer"
        DataProcessor[Data Processing Engine]
        Calculator[Target Alignment Calculator]
        Formatter[Currency Formatter]
        Validator[Data Validator]
    end
    
    subgraph "Integration Layer"
        APIClient[YNAB API Client]
        Cache[Response Cache]
        RateLimit[Rate Limiter]
        ErrorHandler[Error Handler]
    end
    
    subgraph "Security Layer"
        EnvManager[Environment Manager]
        TokenValidator[Token Validator]
        SecureStorage[Secure Storage]
    end
    
    subgraph "External Services"
        YNABAPI[YNAB API v1]
    end
    
    UI --> NextJS
    Dashboard --> StateManager
    CategoryView --> StateManager
    Settings --> StateManager
    
    NextJS --> DataProcessor
    StateManager --> Calculator
    DataProcessor --> Formatter
    DataProcessor --> Validator
    
    Calculator --> APIClient
    APIClient --> Cache
    APIClient --> RateLimit
    APIClient --> ErrorHandler
    
    APIClient --> EnvManager
    EnvManager --> TokenValidator
    TokenValidator --> SecureStorage
    
    APIClient --> YNABAPI
    
    style UI fill:#e1f5fe
    style NextJS fill:#f3e5f5
    style DataProcessor fill:#e8f5e8
    style APIClient fill:#fff3e0
    style EnvManager fill:#ffebee
    style YNABAPI fill:#f1f8e9
```

## Data Flow Architecture

### Primary Data Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant App as Next.js App
    participant Processor as Data Processor
    participant API as YNAB API Client
    participant Cache as Response Cache
    participant YNAB as YNAB API
    
    User->>UI: Select Month for Analysis
    UI->>App: Request Monthly Data
    App->>Processor: Process Analysis Request
    
    Processor->>API: Check Cache for Data
    API->>Cache: Query Cached Response
    
    alt Cache Hit
        Cache-->>API: Return Cached Data
        API-->>Processor: Cached Budget Data
    else Cache Miss
        API->>YNAB: GET /budgets/{id}/months/{month}
        YNAB-->>API: Budget Month Data
        API->>Cache: Store Response
        API-->>Processor: Fresh Budget Data
    end
    
    Processor->>Processor: Calculate Target Alignment
    Processor->>Processor: Generate Analysis Summary
    Processor-->>App: Processed Analysis Data
    App-->>UI: Render Dashboard
    UI-->>User: Display Analysis Results
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as Settings UI
    participant App as Next.js App
    participant Security as Security Layer
    participant YNAB as YNAB API
    
    User->>UI: Enter YNAB Access Token
    UI->>App: Submit Token
    App->>Security: Validate Token Format
    
    alt Valid Format
        Security->>YNAB: GET /user
        alt Valid Token
            YNAB-->>Security: User Data
            Security->>Security: Store Token Securely
            Security-->>App: Authentication Success
            App-->>UI: Show Success Message
        else Invalid Token
            YNAB-->>Security: 401 Unauthorized
            Security-->>App: Authentication Failed
            App-->>UI: Show Error Message
        end
    else Invalid Format
        Security-->>App: Format Validation Failed
        App-->>UI: Show Format Error
    end
```

## Component Architecture

### Frontend Component Hierarchy

```mermaid
graph TD
    App[App Component]
    
    App --> Layout[Layout Component]
    App --> Dashboard[Dashboard Page]
    App --> Categories[Categories Page]
    App --> Settings[Settings Page]
    
    Layout --> Header[Header Component]
    Layout --> Navigation[Navigation Component]
    Layout --> Footer[Footer Component]
    
    Dashboard --> MonthSelector[Month Selector]
    Dashboard --> SummaryCards[Summary Cards]
    Dashboard --> AlignmentChart[Alignment Chart]
    Dashboard --> QuickInsights[Quick Insights]
    
    Categories --> CategoryFilter[Category Filter]
    Categories --> CategoryTable[Category Table]
    Categories --> VarianceChart[Variance Chart]
    Categories --> ExportButton[Export Button]
    
    Settings --> TokenInput[Token Input]
    Settings --> BudgetSelector[Budget Selector]
    Settings --> PreferencesForm[Preferences Form]
    
    SummaryCards --> MetricCard[Metric Card]
    CategoryTable --> CategoryRow[Category Row]
    
    style App fill:#e3f2fd
    style Dashboard fill:#f3e5f5
    style Categories fill:#e8f5e8
    style Settings fill:#fff3e0
```

### API Integration Architecture

```mermaid
graph LR
    subgraph "API Client Layer"
        Client[YNAB API Client]
        Auth[Authentication Handler]
        Cache[Response Cache]
        RateLimit[Rate Limiter]
    end
    
    subgraph "Service Layer"
        BudgetService[Budget Service]
        CategoryService[Category Service]
        MonthService[Month Service]
    end
    
    subgraph "Data Layer"
        Transformer[Data Transformer]
        Validator[Data Validator]
        Calculator[Calculation Engine]
    end
    
    Client --> Auth
    Client --> Cache
    Client --> RateLimit
    
    BudgetService --> Client
    CategoryService --> Client
    MonthService --> Client
    
    BudgetService --> Transformer
    CategoryService --> Transformer
    MonthService --> Transformer
    
    Transformer --> Validator
    Transformer --> Calculator
    
    style Client fill:#bbdefb
    style BudgetService fill:#c8e6c9
    style Transformer fill:#ffe0b2
```

## Technology Stack Architecture

### Development Stack

```mermaid
graph TB
    subgraph "Frontend Technologies"
        React[React 18+]
        NextJS[Next.js 14+]
        TypeScript[TypeScript]
        TailwindCSS[Tailwind CSS]
    end
    
    subgraph "Build & Development Tools"
        ESLint[ESLint]
        Prettier[Prettier]
        PostCSS[PostCSS]
        Webpack[Webpack via Next.js]
    end
    
    subgraph "API & Data"
        YNABAPI[YNAB API v1]
        Axios[Axios HTTP Client]
        SWR[SWR for Caching]
    end
    
    subgraph "Utilities"
        DateFns[date-fns]
        Lodash[Lodash]
        Recharts[Recharts for Charts]
    end
    
    NextJS --> React
    NextJS --> TypeScript
    React --> TailwindCSS
    
    NextJS --> ESLint
    NextJS --> Prettier
    NextJS --> PostCSS
    NextJS --> Webpack
    
    NextJS --> Axios
    Axios --> YNABAPI
    NextJS --> SWR
    
    React --> DateFns
    React --> Lodash
    React --> Recharts
    
    style NextJS fill:#000000,color:#ffffff
    style React fill:#61dafb
    style TypeScript fill:#3178c6,color:#ffffff
    style TailwindCSS fill:#06b6d4,color:#ffffff
```

## Security Architecture

### Security Layers and Controls

```mermaid
graph TD
    subgraph "Application Security"
        EnvVars[Environment Variables]
        TokenStorage[Secure Token Storage]
        InputValidation[Input Validation]
        ErrorHandling[Secure Error Handling]
    end
    
    subgraph "API Security"
        HTTPS[HTTPS Only]
        TokenAuth[Bearer Token Auth]
        RateLimit[Rate Limiting]
        RequestValidation[Request Validation]
    end
    
    subgraph "Client Security"
        CSP[Content Security Policy]
        CORS[CORS Configuration]
        NoSensitiveStorage[No Sensitive Local Storage]
        SecureHeaders[Security Headers]
    end
    
    EnvVars --> TokenStorage
    TokenStorage --> TokenAuth
    InputValidation --> RequestValidation
    
    HTTPS --> TokenAuth
    TokenAuth --> RateLimit
    
    CSP --> CORS
    CORS --> NoSensitiveStorage
    NoSensitiveStorage --> SecureHeaders
    
    style EnvVars fill:#ffcdd2
    style HTTPS fill:#c8e6c9
    style CSP fill:#fff9c4
```

## Deployment Architecture

### Local Development Setup

```mermaid
graph LR
    subgraph "Development Environment"
        DevServer[Next.js Dev Server]
        HotReload[Hot Reload]
        DevTools[React Dev Tools]
    end
    
    subgraph "Local Storage"
        EnvFile[.env.local]
        NodeModules[node_modules]
        BuildCache[.next cache]
    end
    
    subgraph "External Dependencies"
        YNABAPI[YNAB API]
        NPMRegistry[NPM Registry]
    end
    
    DevServer --> HotReload
    DevServer --> DevTools
    DevServer --> EnvFile
    DevServer --> NodeModules
    DevServer --> BuildCache
    
    DevServer --> YNABAPI
    NodeModules --> NPMRegistry
    
    style DevServer fill:#4caf50,color:#ffffff
    style YNABAPI fill:#2196f3,color:#ffffff
```

## Performance Architecture

### Optimization Strategies

1. **Client-Side Optimization**
   - Component lazy loading
   - Memoization of expensive calculations
   - Virtual scrolling for large lists
   - Image optimization

2. **API Optimization**
   - Response caching with TTL
   - Request deduplication
   - Delta requests when available
   - Batch processing

3. **Data Processing Optimization**
   - Efficient algorithms for calculations
   - Minimal data transformation
   - Streaming for large datasets
   - Worker threads for heavy processing

### Caching Strategy

```mermaid
graph TD
    subgraph "Cache Layers"
        BrowserCache[Browser Cache]
        MemoryCache[Memory Cache]
        APICache[API Response Cache]
    end
    
    subgraph "Cache Policies"
        TTL[Time-to-Live]
        LRU[Least Recently Used]
        Invalidation[Cache Invalidation]
    end
    
    BrowserCache --> TTL
    MemoryCache --> LRU
    APICache --> Invalidation
    
    TTL --> Invalidation
    LRU --> Invalidation
    
    style BrowserCache fill:#e1f5fe
    style MemoryCache fill:#f3e5f5
    style APICache fill:#e8f5e8
```

## Current Implementation Data Flow

### Core Metrics Calculation Architecture

The application implements a sophisticated calculation engine for analyzing budget target alignment:

```mermaid
graph TD
    subgraph "Data Input Layer"
        YNABData[YNAB Category Data]
        BudgetInfo[Budget Metadata]
        MonthData[Month Selection]
    end

    subgraph "Processing Layer"
        CategoryProcessor[Category Processor]
        TargetExtractor[Target Extractor]
        AlignmentCalculator[Alignment Calculator]
    end

    subgraph "Calculation Engine"
        TotalAssigned[Total Assigned Calculator]
        TotalTargeted[Total Targeted Calculator]
        VarianceAnalyzer[Variance Analyzer]
        StatusDeterminer[Status Determiner]
    end

    subgraph "Output Layer"
        MonthlyAnalysis[Monthly Analysis]
        CategoryBreakdown[Category Breakdown]
        KeyMetrics[Key Metrics]
    end

    YNABData --> CategoryProcessor
    BudgetInfo --> CategoryProcessor
    MonthData --> CategoryProcessor

    CategoryProcessor --> TargetExtractor
    CategoryProcessor --> AlignmentCalculator

    TargetExtractor --> TotalTargeted
    AlignmentCalculator --> TotalAssigned
    AlignmentCalculator --> VarianceAnalyzer
    AlignmentCalculator --> StatusDeterminer

    TotalAssigned --> MonthlyAnalysis
    TotalTargeted --> MonthlyAnalysis
    VarianceAnalyzer --> CategoryBreakdown
    StatusDeterminer --> KeyMetrics

    style CategoryProcessor fill:#e3f2fd
    style TotalAssigned fill:#e8f5e8
    style TotalTargeted fill:#fff3e0
    style MonthlyAnalysis fill:#f3e5f5
```

### Month Selection and Validation Architecture

```mermaid
graph TD
    subgraph "Budget Data Source"
        BudgetAPI[Budget API Response]
        FirstMonth[firstMonth Property]
        LastMonth[lastMonth Property]
    end

    subgraph "Month Generation"
        MonthGenerator[Month Generator]
        DateValidator[Date Validator]
        RangeChecker[Range Checker]
    end

    subgraph "Frontend Components"
        MonthSelector[MonthSelector Component]
        BudgetSelector[BudgetSelector Component]
        ValidationLayer[Validation Layer]
    end

    subgraph "API Validation"
        ServerValidation[Server-Side Validation]
        ErrorHandler[Error Handler]
        SafeDefault[Safe Default Logic]
    end

    BudgetAPI --> FirstMonth
    BudgetAPI --> LastMonth

    FirstMonth --> MonthGenerator
    LastMonth --> MonthGenerator
    MonthGenerator --> DateValidator
    DateValidator --> RangeChecker

    RangeChecker --> MonthSelector
    MonthSelector --> BudgetSelector
    BudgetSelector --> ValidationLayer

    ValidationLayer --> ServerValidation
    ServerValidation --> ErrorHandler
    ServerValidation --> SafeDefault

    style MonthGenerator fill:#e8f5e8
    style ServerValidation fill:#ffcdd2
    style MonthSelector fill:#e3f2fd
```

### Property Name Compatibility Layer

The system handles both camelCase (frontend) and snake_case (backend) property naming:

```typescript
// Compatibility layer implementation
const firstMonth = budget.firstMonth || budget.first_month;
const lastMonth = budget.lastMonth || budget.last_month;
```

**Key Implementation Files:**
- `src/lib/monthly-analysis.ts`: Core calculation engine
- `src/lib/data-processing.ts`: Utility functions and date handling
- `src/components/MonthSelector.tsx`: Frontend month selection
- `src/app/api/analysis/monthly/route.ts`: Server-side validation

This system architecture provides a robust, scalable, and secure foundation for the YNAB Off-Target Assignment Analysis application while maintaining simplicity for local development and deployment.
