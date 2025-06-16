# On Target Analysis for YNAB

A secure, privacy-focused budget analysis tool that identifies categories where spending significantly deviates from YNAB targets, helping users understand their budget discipline and make informed financial decisions.

**🎉 PRODUCTION DEPLOYED**: https://www.ontargetanalysisforynab.com/

![YNAB Analysis Dashboard](https://img.shields.io/badge/Status-Production%20Deployed-brightgreen)
![OAuth 2.0](https://img.shields.io/badge/OAuth%202.0-Secure-green)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)
![React](https://img.shields.io/badge/React-18+-blue)
![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Deployed-blue)

## 🎯 What This Application Does

This tool provides **secure, detailed budget analysis** for YNAB users by:

- **🔐 OAuth 2.0 Authentication**: Secure access without sharing Personal Access Tokens
- **📊 Calculating "Needed This Month"** values using 7 sophisticated rules that mirror YNAB's internal logic
- **🎯 Analyzing target alignment** to show which categories are over-target, under-target, or on-target
- **🔍 Providing comprehensive debugging UI** with detailed calculation breakdowns and rule explanations
- **📈 Offering variance analysis** with dollar amounts and percentage calculations
- **🏷️ Supporting all YNAB goal types** including monthly, weekly, target balance, and months-to-budget goals
- **✨ Enhanced error handling** with user-friendly messages and auto-redirect functionality

### Key Features

✅ **🔐 Secure OAuth 2.0 Authentication**: No Personal Access Tokens required  
✅ **🧮 Smart Calculation Engine**: 7-rule system handles all YNAB goal types accurately  
✅ **🔍 Interactive Debug UI**: See exactly how each calculation is performed  
✅ **📊 Monthly Overview**: Income, activity, budgeted amounts, and variance summaries  
✅ **📋 Category Analysis**: Detailed breakdown of over/under-target categories  
✅ **⚡ Real-time Data**: Direct integration with YNAB API v1  
✅ **📱 Responsive Design**: Works on desktop, tablet, and mobile devices  
✅ **🛡️ Privacy-First Analytics**: GDPR/CCPA compliant with consent management  
✅ **☁️ Production Deployed**: Fully operational at custom domain with SSL  
✅ **✨ Enhanced UX**: Auto-redirect for authentication errors with 5-second countdown  
✅ **🎨 Professional UI**: User-friendly error messages and seamless navigation

## 🚀 Try It Now

**Production Application**: https://www.ontargetanalysisforynab.com/

1. **Visit the application** at the link above
2. **Click "Connect with YNAB"** to authenticate securely
3. **Select your budget** from the dropdown
4. **Choose a month** to analyze
5. **Review your analysis** with detailed breakdowns

## 🔧 Local Development Setup

### Prerequisites

- **Node.js 18+** and npm 8+
- **YNAB account** with budget data
- **YNAB OAuth Application** ([Register here](https://app.ynab.com/settings/developer))

### Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/kyesh/on-target-analysis-for-ynab.git
   cd on-target-analysis-for-ynab
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Register YNAB OAuth Application**

   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Create a new OAuth application
   - Set redirect URI to: `http://localhost:3000/auth/callback` (development)
   - Copy the Client ID

4. **Configure environment**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your configuration:

   ```env
   NEXT_PUBLIC_YNAB_CLIENT_ID=your-oauth-client-id-here
   NEXTAUTH_SECRET=your-nextauth-secret-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Start development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with your YNAB account

## ☁️ Production Deployment

### Quick Deployment to Google Cloud Platform

1. **Set up secrets**

   ```bash
   npm run deploy:secrets
   ```

2. **Deploy to Cloud Run**

   ```bash
   npm run deploy:gcp
   ```

3. **Verify deployment**
   ```bash
   ./scripts/test-integration.sh
   ```

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md).

## 📊 How to Use

### 1. Authentication
- **Visit the application** at https://www.ontargetanalysisforynab.com/
- **Click "Connect with YNAB"** for secure OAuth authentication
- **Enhanced error handling** guides you through any authentication issues

### 2. Select Your Budget
- Choose from your available YNAB budgets
- The most recently modified budget is selected by default

### 3. Choose Analysis Month
- Select any month from your budget's date range
- Navigate between months using the arrow controls

### 4. Review Analysis Results
- **Monthly Overview**: See income, spending, and budget totals
- **Over-Target Categories**: Categories receiving more than their target
- **Under-Target Categories**: Categories receiving less than their target
- **Detailed Category List**: Complete breakdown with variance calculations

### 5. Use Debug Mode (Optional)
- Toggle "Show Debug Information" to see calculation details
- Click debug panels to view:
  - Raw YNAB API fields
  - Applied calculation rules
  - Step-by-step formulas
  - Day counting for weekly goals

## 🧮 Calculation Rules

The application uses a sophisticated 7-rule system to calculate "Needed This Month" values:

1. **Zero-Target Strategy**: Categories without goals → $0
2. **Rule 6**: Future goal creation → $0 (goals created after analysis month)
3. **Rule 1**: Monthly NEED goals → `goal_target`
4. **Rule 2**: Weekly NEED goals → `goal_target × day_occurrences`
5. **Rule 3**: Months to budget → `(goal_overall_left + budgeted) ÷ months_remaining`
6. **Rule 5**: Low months to budget → $0 (completed/overdue goals)
7. **Rule 4**: All other cases → `goal_target`

For complete rule documentation, see [CALCULATION_RULES.md](docs/CALCULATION_RULES.md).

## ✨ Enhanced User Experience

### Authentication Error Handling
- **Smart Error Detection**: Automatically identifies authentication issues
- **User-Friendly Messages**: Clear, actionable guidance instead of technical errors
- **Auto-Redirect**: 5-second countdown with automatic navigation to signin
- **Manual Navigation**: Prominent "Connect to YNAB" button for immediate action
- **Retry Functionality**: Graceful error recovery for transient issues

### Professional Design
- **Responsive Layout**: Optimized for all device sizes
- **Loading States**: Proper loading indicators and skeleton screens
- **Visual Feedback**: Clear status indicators and progress updates
- **Accessibility**: Full keyboard navigation and screen reader support

## 🛠️ Development

### Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run test             # Run test suite
npm run test:watch       # Run tests in watch mode
npm run lint             # Check code quality
npm run type-check       # Verify TypeScript types
npm run deploy:gcp       # Deploy to Google Cloud Platform
npm run deploy:secrets   # Set up Google Cloud secrets
npm run deploy:check     # Check deployment prerequisites
```

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API endpoints with OAuth authentication
│   ├── auth/              # OAuth authentication pages
│   └── page.tsx           # Main application page
├── components/            # React components
│   ├── analytics/         # PostHog analytics components
│   ├── ui/               # Secure UI components
│   ├── AnalysisDashboard.tsx
│   ├── AuthenticationError.tsx  # Enhanced error handling
│   ├── CategoryDebugPanel.tsx
│   └── MonthlyOverview.tsx
├── lib/                  # Core business logic
│   ├── analytics/        # PostHog analytics integration
│   ├── auth/            # OAuth 2.0 authentication
│   ├── security/        # XSS prevention and security
│   ├── api/             # Authenticated API client
│   ├── data-processing.ts    # Calculation engine
│   ├── monthly-analysis.ts   # Analysis functions
│   └── ynab/            # YNAB OAuth client
├── types/               # TypeScript interfaces
├── scripts/             # Deployment and setup scripts
├── docs/               # Comprehensive documentation
└── __tests__/          # Test files
```

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

### **Core Documentation**

- **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)** - Complete implementation overview and production status
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step Google Cloud Platform deployment
- **[Authentication Error Handling](docs/AUTHENTICATION_ERROR_HANDLING.md)** - Enhanced error handling documentation
- **[Component Architecture](docs/COMPONENT_ARCHITECTURE.md)** - React component structure and relationships

### **Technical Guides**

- **[Calculation Rules](docs/CALCULATION_RULES.md)** - Complete rule documentation with examples
- **[API Reference](docs/API_REFERENCE.md)** - OAuth API endpoints and data structures
- **[Debugging Guide](docs/DEBUGGING_GUIDE.md)** - How to use the debugging UI
- **[Security Plan](docs/SECURITY_PLAN.md)** - Security measures and compliance

### **OAuth Implementation**

- **[OAuth Implementation Plan](docs/IMPLICIT_GRANT_IMPLEMENTATION_PLAN.md)** - OAuth 2.0 implementation details
- **[Security Checklist](docs/IMPLICIT_GRANT_SECURITY_CHECKLIST.md)** - Security measures implemented

## 🔐 Security & Privacy

### Security Features
- **OAuth 2.0 Implicit Grant Flow**: Secure authentication without Personal Access Tokens
- **XSS Prevention**: Comprehensive input sanitization and secure components
- **Content Security Policy**: Strict headers preventing script injection
- **HTTPS Enforcement**: All traffic encrypted in production
- **Secure Token Storage**: Memory-first strategy with integrity checking

### Privacy Compliance
- **GDPR/CCPA Compliant**: Privacy-first analytics with consent management
- **Data Minimization**: No persistent storage of financial data
- **User Control**: Granular consent options and opt-out mechanisms
- **Transparency**: Clear privacy policy and data handling practices

## 🎯 Production Status

### Current Deployment
- **Production URL**: https://www.ontargetanalysisforynab.com/
- **Platform**: Google Cloud Run
- **SSL/TLS**: Fully configured with automatic certificates
- **Health Monitoring**: Operational with comprehensive checks
- **Performance**: Sub-3-second page loads

### Verified Functionality
- ✅ Complete OAuth authentication flow
- ✅ YNAB API integration and data processing
- ✅ Enhanced authentication error handling
- ✅ Responsive design across all devices
- ✅ Analytics and privacy compliance
- ✅ Security headers and XSS prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [YNAB](https://www.ynab.com/) for providing the excellent budgeting platform and API
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework

## 📞 Support

If you encounter any issues or have questions:

1. **Try the production application**: https://www.ontargetanalysisforynab.com/
2. Check the [documentation](docs/)
3. Search existing [issues](https://github.com/kyesh/on-target-analysis-for-ynab/issues)
4. Create a new issue with detailed information

---

**Made with ❤️ for the YNAB community**

**🎉 Now live in production with enhanced authentication error handling and professional user experience!**
