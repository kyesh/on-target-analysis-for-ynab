# Component Architecture

This document provides a comprehensive overview of the React component architecture for the On Target Analysis for YNAB application, including component relationships, data flow, and design patterns.

## Architecture Overview

The application follows a modular component architecture with clear separation of concerns, reusable components, and consistent design patterns. Components are organized by functionality and follow React best practices for maintainability and performance.

## Component Hierarchy

```
App (layout.tsx)
├── SecurityInitializer
├── AnalyticsInitializer
├── ConsentBanner
└── Main Application
    ├── BudgetSelector
    │   └── AuthenticationError (on error)
    ├── MonthSelector
    └── AnalysisDashboard
        ├── MonthlyOverview
        ├── CategoryDebugPanel
        ├── ExportButton
        └── AuthenticationError (on error)
```

## Core Components

### 1. AnalysisDashboard

**Purpose**: Main dashboard component that orchestrates budget analysis display

**Location**: `src/components/AnalysisDashboard.tsx`

**Key Features**:
- Fetches and displays monthly analysis data
- Handles loading states and error conditions
- Integrates with authentication error handling
- Manages category filtering and sorting

**Props Interface**:
```typescript
interface AnalysisDashboardProps {
  budgetId?: string;
  month?: string;
}
```

**State Management**:
- Analysis data from YNAB API
- Loading and error states
- Category filtering preferences

### 2. BudgetSelector

**Purpose**: Dropdown component for selecting YNAB budgets

**Location**: `src/components/BudgetSelector.tsx`

**Key Features**:
- Fetches available budgets from YNAB API
- Auto-selects most recently modified budget
- Handles authentication errors gracefully
- Provides loading states and error recovery

**Props Interface**:
```typescript
interface BudgetSelectorProps {
  selectedBudgetId?: string;
  onBudgetSelect: (budgetId: string) => void;
}
```

### 3. MonthSelector

**Purpose**: Date picker component for selecting analysis month

**Location**: `src/components/MonthSelector.tsx`

**Key Features**:
- Month navigation with previous/next buttons
- Dropdown for direct month selection
- Validates available months based on budget data
- Responsive design for mobile and desktop

**Props Interface**:
```typescript
interface MonthSelectorProps {
  selectedMonth?: string;
  onMonthSelect: (month: string) => void;
  availableMonths?: string[];
}
```

### 4. AuthenticationError

**Purpose**: Enhanced error handling component for authentication issues

**Location**: `src/components/AuthenticationError.tsx`

**Key Features**:
- Smart error detection and user-friendly messaging
- Auto-redirect functionality with countdown timer
- Manual navigation with "Connect to YNAB" button
- Retry functionality for transient errors
- Responsive design and accessibility support

**Props Interface**:
```typescript
interface AuthenticationErrorProps {
  error: string;
  onRetry?: () => void;
  showAutoRedirect?: boolean;
  redirectDelay?: number;
}
```

### 5. MonthlyOverview

**Purpose**: Displays high-level financial metrics and summary

**Location**: `src/components/MonthlyOverview.tsx`

**Key Features**:
- Income, budgeted, and activity summaries
- Variance calculations and visual indicators
- Budget discipline scoring
- Responsive card layout

**Props Interface**:
```typescript
interface MonthlyOverviewProps {
  analysis: MonthlyAnalysisResponse;
}
```

### 6. CategoryDebugPanel

**Purpose**: Interactive debugging interface for calculation details

**Location**: `src/components/CategoryDebugPanel.tsx`

**Key Features**:
- Expandable debug information for each category
- YNAB API field display with formatting
- Calculation rule explanations
- Toggle for showing/hiding debug information

**Props Interface**:
```typescript
interface CategoryDebugPanelProps {
  category: ProcessedCategory;
  isOpen: boolean;
  onToggle: () => void;
}
```

### 7. ExportButton

**Purpose**: CSV export functionality for analysis data

**Location**: `src/components/ExportButton.tsx`

**Key Features**:
- Generates CSV files from analysis data
- Includes all category details and calculations
- Progress indicators during export
- Error handling for export failures

**Props Interface**:
```typescript
interface ExportButtonProps {
  analysis: MonthlyAnalysisResponse | null;
  budgetName?: string;
  month?: string;
}
```

## UI Components

### 1. SecureInput

**Purpose**: XSS-protected input component with sanitization

**Location**: `src/components/ui/SecureInput.tsx`

**Key Features**:
- Automatic input sanitization
- XSS prevention utilities
- Configurable validation patterns
- Security violation callbacks

**Props Interface**:
```typescript
interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  sanitize?: boolean;
  maxLength?: number;
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
  onSecurityViolation?: (violation: string, originalValue: string) => void;
}
```

## Analytics Components

### 1. AnalyticsInitializer

**Purpose**: Initializes PostHog analytics and error tracking

**Location**: `src/components/analytics/AnalyticsInitializer.tsx`

**Key Features**:
- PostHog client initialization
- Global error tracking setup
- Privacy-compliant event tracking
- Performance monitoring hooks

### 2. ConsentBanner

**Purpose**: GDPR/CCPA compliant consent management

**Location**: `src/components/analytics/ConsentBanner.tsx`

**Key Features**:
- Granular consent controls
- Privacy policy integration
- Persistent consent storage
- Customizable themes and positioning

**Props Interface**:
```typescript
interface ConsentBannerProps {
  onConsentChange?: (consent: ConsentSettings) => void;
  position?: 'top' | 'bottom';
  theme?: 'light' | 'dark';
}
```

### 3. AnalyticsDashboard

**Purpose**: Internal analytics dashboard for usage insights

**Location**: `src/components/analytics/AnalyticsDashboard.tsx`

**Key Features**:
- User behavior analytics
- Performance metrics display
- Event tracking visualization
- Privacy-compliant data aggregation

## Security Components

### 1. SecurityInitializer

**Purpose**: Initializes security measures and monitoring

**Location**: `src/components/SecurityInitializer.tsx`

**Key Features**:
- Content Security Policy setup
- XSS prevention initialization
- Security header configuration
- Threat detection monitoring

## Component Design Patterns

### 1. Error Boundary Pattern

Components implement consistent error handling with fallback UI:

```typescript
// Error handling pattern
if (error) {
  return (
    <AuthenticationError
      error={error}
      onRetry={handleRetry}
      showAutoRedirect={true}
    />
  );
}
```

### 2. Loading State Pattern

Consistent loading states across components:

```typescript
// Loading state pattern
if (loading) {
  return (
    <div className="animate-pulse">
      <div className="h-10 rounded-md bg-gray-200"></div>
    </div>
  );
}
```

### 3. Conditional Rendering Pattern

Smart conditional rendering based on authentication state:

```typescript
// Conditional rendering pattern
{isAuthenticated ? (
  <AnalysisDashboard budgetId={budgetId} month={month} />
) : (
  <AuthenticationError error="Authentication required" />
)}
```

## Data Flow Architecture

### 1. Authentication Flow

```
User Action → AuthenticationError → OAuth Flow → Token Storage → API Calls
```

### 2. Budget Analysis Flow

```
Budget Selection → API Fetch → Data Processing → Component Rendering → User Interaction
```

### 3. Error Handling Flow

```
Error Occurrence → Error Detection → User-Friendly Message → Recovery Action → Retry/Redirect
```

## State Management

### 1. Local Component State

Components use React hooks for local state management:

```typescript
const [budgets, setBudgets] = useState<SafeBudget[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 2. Context-Based State

Authentication state is managed through React Context:

```typescript
const { user, isAuthenticated, login, logout } = useAuth();
```

### 3. SWR for Data Fetching

API data is cached and managed using SWR:

```typescript
const { data, error, mutate } = useSWR('/api/budgets', fetcher);
```

## Styling Architecture

### 1. Tailwind CSS Classes

Components use Tailwind CSS for consistent styling:

```typescript
className="rounded-lg border border-red-200 bg-red-50 p-4"
```

### 2. Responsive Design

Mobile-first responsive design patterns:

```typescript
className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
```

### 3. Theme Consistency

Consistent color scheme and typography:

```typescript
// Error states
className="text-red-800 bg-red-50 border-red-200"

// Success states  
className="text-green-800 bg-green-50 border-green-200"

// Action buttons
className="bg-blue-600 text-white hover:bg-blue-700"
```

## Performance Optimizations

### 1. Component Memoization

```typescript
const MemoizedComponent = React.memo(Component);
```

### 2. Lazy Loading

```typescript
const LazyComponent = React.lazy(() => import('./Component'));
```

### 3. Efficient Re-renders

```typescript
const handleCallback = useCallback(() => {
  // Callback logic
}, [dependencies]);
```

## Accessibility Features

### 1. ARIA Labels

```typescript
aria-label="Connect to YNAB account"
aria-describedby="error-description"
```

### 2. Keyboard Navigation

```typescript
onKeyDown={(e) => e.key === 'Enter' && handleAction()}
tabIndex={0}
```

### 3. Screen Reader Support

```typescript
role="alert"
aria-live="polite"
```

## Testing Strategy

### 1. Unit Tests

Each component has comprehensive unit tests:

```typescript
describe('AuthenticationError', () => {
  it('should display user-friendly message', () => {
    render(<AuthenticationError error="Token expired" />);
    expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
  });
});
```

### 2. Integration Tests

Components are tested in realistic usage scenarios:

```typescript
describe('Budget Analysis Flow', () => {
  it('should handle complete analysis workflow', async () => {
    // Test complete user workflow
  });
});
```

### 3. Accessibility Tests

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

it('should have no accessibility violations', async () => {
  const { container } = render(<Component />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Future Enhancements

### 1. Component Library

- Extract reusable components into a shared library
- Implement Storybook for component documentation
- Create design system with consistent tokens

### 2. Advanced State Management

- Consider Redux Toolkit for complex state scenarios
- Implement optimistic updates for better UX
- Add offline support with state persistence

### 3. Performance Monitoring

- Add React DevTools Profiler integration
- Implement bundle size monitoring
- Add Core Web Vitals tracking

---

**This component architecture provides a scalable, maintainable foundation for the application with clear separation of concerns, consistent patterns, and robust error handling.**
