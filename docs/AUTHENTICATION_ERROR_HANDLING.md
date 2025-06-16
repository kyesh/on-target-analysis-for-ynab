# Authentication Error Handling

This document describes the enhanced authentication error handling system implemented in the On Target Analysis for YNAB application, providing a seamless user experience for unauthenticated users.

## Overview

The authentication error handling system transforms confusing technical error messages into clear, actionable guidance that automatically directs users to the authentication flow. This enhancement significantly improves the user experience for new users and those with expired sessions.

## AuthenticationError Component

### Purpose

The `AuthenticationError` component provides a user-friendly interface for handling authentication-related errors with automatic redirect functionality and clear guidance.

### Key Features

- **Smart Error Detection**: Automatically identifies authentication-related errors
- **User-Friendly Messages**: Translates technical errors into clear, actionable language
- **Auto-Redirect Functionality**: 5-second countdown timer with automatic navigation to signin page
- **Manual Navigation**: Prominent "Connect to YNAB" button for immediate action
- **Retry Functionality**: Maintains existing retry capabilities for edge cases
- **Visual Design**: Consistent with application styling and responsive design

### Component Interface

```typescript
interface AuthenticationErrorProps {
  error: string;                    // Error message to display
  onRetry?: () => void;            // Optional retry function
  showAutoRedirect?: boolean;      // Enable/disable auto-redirect (default: true)
  redirectDelay?: number;          // Configurable delay in seconds (default: 5)
}
```

### Usage Examples

#### Basic Usage
```tsx
import { AuthenticationError } from '@/components/AuthenticationError';

// Simple authentication error with auto-redirect
<AuthenticationError 
  error="No authentication token available"
/>
```

#### With Retry Functionality
```tsx
// Authentication error with retry callback
<AuthenticationError 
  error="Authentication failed"
  onRetry={handleRetry}
  showAutoRedirect={true}
  redirectDelay={5}
/>
```

#### Custom Configuration
```tsx
// Custom redirect delay and disabled auto-redirect
<AuthenticationError 
  error="Session expired"
  onRetry={handleRetry}
  showAutoRedirect={false}
/>
```

## Error Message Translation

### Smart Error Detection

The component automatically detects authentication-related errors by checking for keywords:
- "authentication"
- "token" 
- "unauthorized"
- "sign in"

### User-Friendly Message Mapping

| Technical Error | User-Friendly Message |
|----------------|----------------------|
| "No authentication token available" | "Please connect your YNAB account to view budget analysis" |
| "Token has expired" | "Your session has expired. Please sign in again to continue" |
| "Unauthorized" | "Authentication required. Please connect your YNAB account" |
| Generic errors | Original message (for non-auth errors) |

## Auto-Redirect Functionality

### Countdown Timer

- **Duration**: 5 seconds (configurable)
- **Visual Feedback**: "Redirecting to sign-in page in X seconds..."
- **Cancellation**: User can click "Connect to YNAB" to redirect immediately

### Redirect Behavior

- **Target**: `/auth/signin` page
- **Trigger**: Only for authentication-related errors
- **Fallback**: Manual navigation button always available

### Implementation Details

```typescript
useEffect(() => {
  if (!isAuthError || !showAutoRedirect) return;

  const timer = setInterval(() => {
    setCountdown(prev => {
      if (prev <= 1) {
        setIsRedirecting(true);
        router.push('/auth/signin');
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [isAuthError, showAutoRedirect, router]);
```

## Visual Design

### Layout Structure

```
┌─────────────────────────────────────┐
│  🚫 Error Icon                      │
│                                     │
│  User-Friendly Error Message       │
│                                     │
│  Redirecting in X seconds...       │
│                                     │
│  [Connect to YNAB] [Retry]         │
│                                     │
│  Help text and guidance            │
└─────────────────────────────────────┘
```

### Styling Features

- **Error Icon**: Red exclamation circle for visual clarity
- **Color Scheme**: Red for errors, blue for action buttons
- **Typography**: Clear hierarchy with readable fonts
- **Responsive**: Adapts to mobile and desktop layouts
- **Accessibility**: Proper ARIA labels and keyboard navigation

### CSS Classes

```css
/* Main container */
.error-container {
  @apply rounded-lg border border-red-200 bg-red-50 p-4;
}

/* Error message */
.error-message {
  @apply text-sm text-red-800;
}

/* Action buttons */
.connect-button {
  @apply inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white;
}

.retry-button {
  @apply inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700;
}
```

## Integration Points

### BudgetSelector Component

```tsx
if (error) {
  return (
    <AuthenticationError
      error={error}
      onRetry={fetchBudgets}
      showAutoRedirect={true}
      redirectDelay={5}
    />
  );
}
```

### AnalysisDashboard Component

```tsx
if (error) {
  return (
    <AuthenticationError
      error={error}
      onRetry={() => window.location.reload()}
    />
  );
}
```

## User Experience Flow

### Typical User Journey

1. **Error Occurs**: User encounters authentication error (expired token, missing auth, etc.)
2. **Enhanced Display**: Clear, user-friendly error message appears
3. **Action Options**: User sees "Connect to YNAB" button and optional retry button
4. **Auto-Redirect**: 5-second countdown begins with visual feedback
5. **Navigation**: Automatic redirect to signin page or manual button click
6. **Authentication**: User completes OAuth flow
7. **Return**: User returns to original page with working authentication

### Error Recovery Scenarios

#### Scenario 1: Expired Session
- **Trigger**: Token expiration during active use
- **Message**: "Your session has expired. Please sign in again to continue"
- **Action**: Auto-redirect to signin with 5-second countdown
- **Recovery**: User re-authenticates and returns to analysis

#### Scenario 2: Missing Authentication
- **Trigger**: Direct access to protected page without authentication
- **Message**: "Please connect your YNAB account to view budget analysis"
- **Action**: Immediate redirect to signin page
- **Recovery**: User authenticates and accesses requested page

#### Scenario 3: Network/API Error
- **Trigger**: Temporary API connectivity issues
- **Message**: Original error message (not auth-related)
- **Action**: Retry button without auto-redirect
- **Recovery**: User retries operation when connectivity restored

## Configuration Options

### Environment Variables

```bash
# Disable auto-redirect globally (optional)
NEXT_PUBLIC_DISABLE_AUTH_REDIRECT=false

# Custom redirect delay (optional)
NEXT_PUBLIC_AUTH_REDIRECT_DELAY=5
```

### Component Props

```typescript
// Enable/disable auto-redirect per component
showAutoRedirect: boolean = true

// Custom redirect delay per component
redirectDelay: number = 5

// Custom retry function
onRetry?: () => void
```

## Testing

### Unit Tests

```typescript
describe('AuthenticationError', () => {
  it('should display user-friendly message for auth errors', () => {
    render(<AuthenticationError error="No authentication token available" />);
    expect(screen.getByText(/Please connect your YNAB account/)).toBeInTheDocument();
  });

  it('should start countdown for auth errors', () => {
    render(<AuthenticationError error="Token expired" />);
    expect(screen.getByText(/Redirecting.*in 5 seconds/)).toBeInTheDocument();
  });

  it('should not auto-redirect for non-auth errors', () => {
    render(<AuthenticationError error="Network error" />);
    expect(screen.queryByText(/Redirecting/)).not.toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
describe('Authentication Error Flow', () => {
  it('should redirect to signin after countdown', async () => {
    const mockPush = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push: mockPush });
    
    render(<AuthenticationError error="No authentication token" />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    }, { timeout: 6000 });
  });
});
```

## Performance Considerations

### Memory Management

- **Timer Cleanup**: Automatic cleanup of countdown timers on component unmount
- **Event Listeners**: Proper removal of event listeners
- **State Management**: Minimal state updates for countdown

### Accessibility

- **Screen Readers**: Proper ARIA labels for error messages and buttons
- **Keyboard Navigation**: Full keyboard accessibility for all interactive elements
- **Focus Management**: Proper focus handling during redirects

## Security Considerations

### Error Message Sanitization

- **XSS Prevention**: All error messages are properly escaped
- **Information Disclosure**: Generic messages prevent sensitive information leakage
- **Input Validation**: Error props are validated and sanitized

### Redirect Security

- **URL Validation**: Redirect URLs are validated to prevent open redirects
- **CSRF Protection**: Signin flow maintains CSRF protection
- **State Management**: Secure state parameter handling during redirects

## Monitoring and Analytics

### Error Tracking

```typescript
// Track authentication errors
analytics.track('authentication_error', {
  error_type: 'token_expired',
  auto_redirect: true,
  user_action: 'auto_redirect'
});
```

### User Behavior

```typescript
// Track user interactions with error component
analytics.track('auth_error_interaction', {
  action: 'manual_signin_click',
  error_message: 'session_expired',
  time_remaining: countdown
});
```

## Future Enhancements

### Planned Improvements

1. **Smart Retry Logic**: Automatic retry with exponential backoff for transient errors
2. **Error Categorization**: More granular error types and handling
3. **Offline Support**: Enhanced handling for offline scenarios
4. **Customizable Themes**: Support for light/dark mode themes
5. **Internationalization**: Multi-language support for error messages

### Extensibility

The component is designed to be easily extended with additional error types, custom styling, and enhanced functionality while maintaining backward compatibility.

---

**This authentication error handling system provides a professional, user-friendly experience that guides users seamlessly through authentication issues while maintaining the application's security and reliability.**
