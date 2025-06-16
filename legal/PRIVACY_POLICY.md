# Privacy Policy

**Effective Date:** 06-16-2025
**Last Updated:** 06-16-2025

## 1. Introduction

This Privacy Policy describes how On Target Analysis for YNAB ("we," "our," or "us") collects, uses, and protects your information when you use our Service. We are committed to protecting your privacy and handling your data responsibly.

**YNAB API Compliance**: This application integrates with the YNAB (You Need A Budget) API to provide budget analysis services. We are not affiliated with YNAB and operate as an independent third-party application under YNAB's API terms.

## 2. Information We Collect

### 2.1 YNAB Data

When you authorize our application through YNAB's OAuth system, we access:

- **Budget Information**: Budget names, categories, and structure
- **Financial Data**: Budget amounts, actual spending, and target information
- **Account Metadata**: Budget creation dates and modification timestamps

**Important**: We do NOT access:

- Bank account information
- Transaction details
- Personal identification information
- Payment methods

### 2.2 Authentication Data

- **YNAB User ID**: Unique identifier from YNAB (anonymized)
- **OAuth Tokens**: Encrypted access and refresh tokens
- **Session Data**: Temporary session information for application functionality

### 2.3 Analytics Data (Optional)

With your explicit consent, we collect:

- **Usage Patterns**: Features used, pages visited, time spent
- **Performance Data**: Page load times, error rates
- **Device Information**: Browser type, screen resolution (anonymized)
- **Interaction Data**: Button clicks, navigation patterns

### 2.4 Technical Data

- **Log Data**: Server logs for debugging and security
- **Error Reports**: Application errors and performance issues
- **Security Data**: IP addresses for security monitoring (temporarily)

## 3. How We Use Your Information

### 3.1 Data Purpose - YNAB Budget Analysis

**Primary Purpose**: We collect and process your YNAB data exclusively for budget target alignment analysis and spending pattern identification.

**Specific Use Cases**:
- **Target Alignment Calculations**: Compare your monthly budget assignments against predefined targets
- **Variance Analysis**: Identify categories where spending doesn't align with financial goals
- **Budget Performance Insights**: Provide detailed breakdowns of budget discipline and goal achievement
- **Real-time Analysis**: Process your YNAB data in real-time to generate immediate insights
- **Category-Level Analysis**: Analyze individual budget categories for over/under target performance
- **Monthly Trend Analysis**: Compare budget performance across different months
- **Debug Information**: Provide detailed calculation breakdowns for transparency and verification

**Data Processing Scope**: All YNAB data processing is limited to budget analysis functionality and is never used for any other purpose.

### 3.2 Service Improvement

- **Performance Optimization**: Identify and fix performance issues
- **Feature Development**: Understand user needs and preferences
- **Bug Fixes**: Diagnose and resolve application issues

### 3.3 Security and Compliance

- **Fraud Prevention**: Detect and prevent unauthorized access
- **Security Monitoring**: Monitor for security threats
- **Compliance**: Meet legal and regulatory requirements

## 4. Data Handling Disclosure

### 4.1 YNAB Data Access Method

- **OAuth 2.0 Authentication**: We use YNAB's official OAuth 2.0 Implicit Grant Flow for secure authentication
- **Read-Only Access**: We request only read-only permissions to your YNAB data
- **API Integration**: All data access occurs through YNAB's official API endpoints
- **User Authorization**: You explicitly authorize our application through YNAB's secure authentication system
- **Token-Based Access**: We use encrypted access tokens provided by YNAB for API requests

### 4.2 Data Processing Architecture

- **Real-Time Analysis**: YNAB data is processed in real-time when you request analysis
- **In-Memory Processing**: All calculations are performed in server memory without persistent storage
- **No Database Storage**: We do not maintain any database containing your YNAB financial data
- **Session-Only Retention**: Data is retained only during your active session for analysis purposes
- **Automatic Disposal**: All YNAB data is automatically discarded when your session ends

### 4.3 Data Security Measures

- **HTTPS Encryption**: All data transmission occurs over encrypted HTTPS connections
- **Token Encryption**: OAuth tokens are encrypted and stored securely during sessions
- **No Third-Party Sharing**: Your YNAB financial data is never shared with third parties (except as noted in Section 5.2)
- **Secure Infrastructure**: Application hosted on Google Cloud Platform with enterprise-grade security
- **Access Controls**: Strict access controls limit data processing to authorized application functions

### 4.4 Data Retention Policy

- **Session-Based Only**: YNAB data is retained only during your active application session
- **Automatic Expiration**: All cached data expires within 5 minutes of inactivity
- **No Persistent Storage**: No YNAB financial data is stored permanently on our servers
- **Token Revocation**: You can revoke our access to your YNAB data at any time through your YNAB account settings

## 5. Third-Party Data Sharing Guarantee

### 5.1 Explicit Third-Party Guarantee

**WE GUARANTEE**: Your YNAB financial data is NEVER shared with third parties without your explicit knowledge and consent.

**Specific Guarantees**:
- **No Data Sales**: We will never sell your YNAB data to any third party
- **No Marketing Use**: Your financial data is never used for marketing or advertising purposes
- **No Unauthorized Sharing**: We do not share your YNAB data with any third party except as explicitly disclosed below
- **No Data Brokers**: We do not provide your data to data brokers or aggregation services
- **No Financial Institutions**: We do not share your data with banks, credit agencies, or other financial institutions

### 5.2 PostHog Analytics Disclosure (With Your Consent)

**Important Notice**: Some YNAB data may be captured by PostHog analytics to help us understand how people use our application.

**What PostHog May Capture**:
- **Usage Patterns**: Which features you use and how often
- **Performance Data**: How long analysis takes and error rates
- **Interaction Data**: Button clicks and navigation patterns within the application
- **Anonymized Metrics**: Aggregated usage statistics (no personal identification)

**PostHog Data Protection**:
- **Consent Required**: PostHog analytics only operates with your explicit consent
- **Anonymization**: Personal and financial details are anonymized before transmission
- **Opt-Out Available**: You can decline or disable analytics collection at any time
- **GDPR/CCPA Compliant**: PostHog maintains GDPR and CCPA compliance standards
- **Limited Scope**: Only application usage data is shared, not detailed financial information

### 5.3 YNAB Integration

- **Data Source**: We access your YNAB data through their official API with your authorization
- **YNAB Terms**: Our integration is subject to YNAB's Terms of Service and Privacy Policy
- **Read-Only Access**: We only request read-only permissions to your YNAB data
- **No Data Sharing with YNAB**: We do not share any additional data back to YNAB beyond standard API usage

### 5.4 Google Cloud Platform Infrastructure

- **Hosting Provider**: Application infrastructure hosted on Google Cloud Platform
- **Data Processing Agreement**: Google processes data only as instructed by our application
- **Security Standards**: Subject to Google's enterprise-grade security standards
- **No Data Access**: Google does not access or analyze your YNAB data for their own purposes

## 6. Your Rights and Choices

### 6.1 Access and Control

- **Data Access**: View what data we process through the application
- **YNAB Control**: Manage permissions through your YNAB account
- **Account Deletion**: Delete your account and associated data

### 6.2 Analytics Preferences

- **Opt-Out**: Decline analytics collection at any time
- **Granular Control**: Choose specific analytics features
- **Consent Management**: Update consent preferences

## 7. Data Retention

### 7.1 Retention Periods

- **YNAB Data**: Not permanently retained (processed in real-time)
- **Session Data**: Deleted when session expires
- **Analytics Data**: Retained for 90 days maximum
- **Log Data**: Retained for 30 days for security purposes

### 7.2 Data Deletion Process

**Automatic Deletion**:
- **Session Data**: Automatically deleted when your session expires
- **Cached Data**: Automatically expires within 5 minutes of inactivity
- **YNAB Data**: Never permanently stored, automatically discarded after processing

**Manual Data Deletion Requests**:

If you want to request deletion of any data associated with your use of our application, please contact us at:

**Email**: [on-target-analysis-for-ynab@googlegroups.com](mailto:on-target-analysis-for-ynab@googlegroups.com)

**Subject Line**: "Data Deletion Request"

**Required Information**:
- Your YNAB user ID (if known)
- Approximate dates of application usage
- Specific data deletion requests

**Response Timeline**:
- We will acknowledge your request within 48 hours
- Data deletion will be completed within 7 business days
- You will receive confirmation once deletion is complete

**What We Delete**:
- Any temporary session data associated with your account
- Analytics data (if you previously consented to collection)
- Application logs containing your user identifier
- Any cached authentication tokens

**Note**: Since we do not permanently store YNAB financial data, there is typically no persistent financial data to delete.

## 8. Cookies and Tracking

### 8.1 Essential Cookies

- **Session Management**: Maintain your login session
- **Security**: Prevent cross-site request forgery
- **Functionality**: Remember your preferences

### 8.2 Analytics Cookies (Optional)

- **Usage Analytics**: Track feature usage and performance
- **Consent Required**: Only with your explicit consent
- **Opt-Out Available**: Can be disabled in settings

### 8.3 Third-Party Cookies

- **PostHog**: Analytics cookies (with consent)
- **YNAB OAuth**: Authentication cookies during login process

## 9. Contact Information

**For Privacy Questions or Concerns**:

- **Email**: [on-target-analysis-for-ynab@googlegroups.com](mailto:on-target-analysis-for-ynab@googlegroups.com)
- **Data Deletion Requests**: [on-target-analysis-for-ynab@googlegroups.com](mailto:on-target-analysis-for-ynab@googlegroups.com?subject=Data%20Deletion%20Request)
- **GitHub Repository**: [https://github.com/kyesh/on-target-analysis-for-ynab](https://github.com/kyesh/on-target-analysis-for-ynab)

**Response Timeline**: We aim to respond to all privacy-related inquiries within 48 hours.

## 10. YNAB API Compliance Summary

This Privacy Policy ensures compliance with YNAB API requirements by providing:

1. **✅ Data Purpose Transparency**: Clear explanation of why we collect YNAB data (budget analysis and target calculations)
2. **✅ Data Handling Disclosure**: Comprehensive description of how YNAB data is accessed, used, stored, secured, and retained
3. **✅ Third-Party Guarantee**: Explicit statement that YNAB data is never shared with third parties without user knowledge (with specific PostHog analytics disclosure)
4. **✅ Data Deletion Process**: Clear instructions for users to request data deletion via on-target-analysis-for-ynab@googlegroups.com

**This Privacy Policy is designed to be transparent about our data practices and ensure full compliance with YNAB API requirements. If you have questions or concerns, please contact us using the information above.**
