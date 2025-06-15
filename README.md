# YNAB Off-Target Assignment Analysis

A secure, privacy-focused budget analysis tool that identifies categories where spending significantly deviates from YNAB targets, helping users understand their budget discipline and make informed financial decisions.

![YNAB Analysis Dashboard](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![OAuth 2.0](https://img.shields.io/badge/OAuth%202.0-Secure-green)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue)
![React](https://img.shields.io/badge/React-18+-blue)
![Cloud Run](https://img.shields.io/badge/Google%20Cloud-Ready-blue)

## 🎯 What This Application Does

This tool provides **secure, detailed budget analysis** for YNAB users by:

- **🔐 OAuth 2.0 Authentication**: Secure access without sharing Personal Access Tokens
- **📊 Calculating "Needed This Month"** values using 7 sophisticated rules that mirror YNAB's internal logic
- **🎯 Analyzing target alignment** to show which categories are over-target, under-target, or on-target
- **🔍 Providing comprehensive debugging UI** with detailed calculation breakdowns and rule explanations
- **📈 Offering variance analysis** with dollar amounts and percentage calculations
- **🏷️ Supporting all YNAB goal types** including monthly, weekly, target balance, and months-to-budget goals

### Key Features

✅ **🔐 Secure OAuth 2.0 Authentication**: No Personal Access Tokens required
✅ **🧮 Smart Calculation Engine**: 7-rule system handles all YNAB goal types accurately
✅ **🔍 Interactive Debug UI**: See exactly how each calculation is performed
✅ **📊 Monthly Overview**: Income, activity, budgeted amounts, and variance summaries
✅ **📋 Category Analysis**: Detailed breakdown of over/under-target categories
✅ **⚡ Real-time Data**: Direct integration with YNAB API v1
✅ **📱 Responsive Design**: Works on desktop, tablet, and mobile devices
✅ **🛡️ Privacy-First Analytics**: GDPR/CCPA compliant with consent management
✅ **☁️ Cloud-Ready**: One-click deployment to Google Cloud Platform

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm 8+
- **YNAB account** with budget data
- **YNAB OAuth Application** ([Register here](https://app.ynab.com/settings/developer))

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/YNAB_Off_Target_Assignment.git
   cd YNAB_Off_Target_Assignment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Register YNAB OAuth Application**
   - Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Create a new OAuth application
   - Set redirect URI to: `http://localhost:3000/auth/callback`
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

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_YNAB_CLIENT_ID` | Your YNAB OAuth Client ID | ✅ Yes | - |
| `NEXTAUTH_SECRET` | NextAuth JWT signing secret | ✅ Yes | - |
| `NEXT_PUBLIC_APP_URL` | Application URL for OAuth | ✅ Yes | - |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics key | No | - |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host URL | No | `https://app.posthog.com` |

### OAuth Setup

1. Go to [YNAB Developer Settings](https://app.ynab.com/settings/developer)
2. Create a new OAuth application
3. Set redirect URI to your domain + `/auth/callback`
4. Copy the Client ID to your environment configuration

🔐 **Security Note**: OAuth 2.0 eliminates the need for Personal Access Tokens!

## 📊 How to Use

### 1. Select Your Budget
- Choose from your available YNAB budgets
- The most recently modified budget is selected by default

### 2. Choose Analysis Month
- Select any month from your budget's date range
- Navigate between months using the arrow controls

### 3. Review Analysis Results
- **Monthly Overview**: See income, spending, and budget totals
- **Over-Target Categories**: Categories receiving more than their target
- **Under-Target Categories**: Categories receiving less than their target
- **Detailed Category List**: Complete breakdown with variance calculations

### 4. Use Debug Mode (Optional)
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
│   ├── analysis.ts      # Analysis data types
│   └── ynab.ts         # YNAB API types
├── scripts/             # Deployment and setup scripts
├── docs/               # Comprehensive documentation
└── __tests__/          # Test files
```

### Testing

The application includes comprehensive test coverage:

```bash
npm test                    # Run all tests
npm run test:coverage      # Generate coverage report
```

Tests cover:
- All 7 calculation rules
- Edge cases and error handling
- API integration
- Component functionality

## 📚 Documentation

Comprehensive documentation is available in the `/docs` directory:

### **Core Documentation**
- **[Implementation Status](docs/IMPLEMENTATION_STATUS.md)** - Complete implementation overview and decisions
- **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Step-by-step Google Cloud Platform deployment
- **[Calculation Rules](docs/CALCULATION_RULES.md)** - Complete rule documentation with examples
- **[API Reference](docs/API_REFERENCE.md)** - OAuth API endpoints and data structures

### **Technical Guides**
- **[Debugging Guide](docs/DEBUGGING_GUIDE.md)** - How to use the debugging UI
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Technical implementation details
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing procedures and integration tests
- **[Security Plan](docs/SECURITY_PLAN.md)** - Security measures and compliance

### **OAuth Implementation**
- **[OAuth Implementation Plan](docs/IMPLICIT_GRANT_IMPLEMENTATION_PLAN.md)** - OAuth 2.0 implementation details
- **[Security Checklist](docs/IMPLICIT_GRANT_SECURITY_CHECKLIST.md)** - Security measures implemented
- **[Architecture Tradeoffs](docs/IMPLICIT_GRANT_TRADEOFFS_MIGRATION.md)** - Decision rationale

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

1. Check the [documentation](docs/)
2. Search existing [issues](https://github.com/your-username/YNAB_Off_Target_Assignment/issues)
3. Create a new issue with detailed information

---

**Made with ❤️ for the YNAB community**
