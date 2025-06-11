# YNAB Off-Target Assignment Analysis

A comprehensive Next.js web application that integrates with the YNAB API to analyze budget target alignment, helping users understand how their monthly budget assignments compare against their predefined targets.

## 🎯 Project Status: Planning Phase Complete ✅ API Research Confirmed

This project has completed comprehensive planning and **thorough YNAB API research**. **✅ CONFIRMED: All target/goal data IS available through the YNAB API v1.** The project is 100% feasible and ready for development.

## 📋 Planning Documents

### Core Documentation
- **[Product Requirements](docs/PRODUCT_REQUIREMENTS.md)** - Complete feature specifications and user stories
- **[Data Architecture](docs/DATA_ARCHITECTURE.md)** - Data models, processing logic, and API integration
- **[System Architecture](docs/SYSTEM_ARCHITECTURE.md)** - Technical architecture with Mermaid diagrams
- **[API Documentation](docs/API_DOCUMENTATION.md)** - REST API endpoints and validation system
- **[User Guide](docs/USER_GUIDE.md)** - Complete user manual and feature explanations
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)** - Technical implementation details and recent fixes
- **[Security Plan](docs/SECURITY_PLAN.md)** - Comprehensive security implementation strategy
- **[Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)** - Detailed timeline and milestones
- **[Project Summary](docs/PROJECT_SUMMARY.md)** - Executive overview and key decisions
- **[YNAB API Research Findings](docs/YNAB_API_RESEARCH_FINDINGS.md)** - ✅ Definitive API capability confirmation

## 🚀 Key Features (Planned)

### Monthly Budget Analysis Dashboard
- Total money assigned in selected month
- Amount and percentage assigned in alignment with targets
- Amount and percentage assigned not in alignment with targets
- Visual charts and interactive components

### Detailed Category Analysis
- Categories that received assignments above their targets
- Specific over-target amounts for each category
- Categories that received assignments but had no targets set
- Advanced filtering, sorting, and export capabilities

### Security & Performance
- Secure YNAB API integration with Personal Access Token
- Local-only processing with no data persistence
- Rate limiting compliance (200 requests/hour)
- Sub-3-second dashboard loading performance

## 🏗️ Technical Architecture

### Technology Stack
- **Frontend**: Next.js 14+ with React 18+ and TypeScript
- **Styling**: Tailwind CSS for responsive design
- **API Integration**: YNAB API v1 with secure authentication
- **Development**: ESLint, Prettier, and modern tooling

### System Components
- YNAB API Client with rate limiting and caching
- Data Processing Engine for target alignment calculations
- Interactive Dashboard with visualizations
- Security Layer with token management
- Category Analysis with drill-down capabilities

## 🔒 Security Implementation

### Data Protection
- Environment variable storage for API tokens
- No sensitive data in browser storage
- HTTPS-only API communications
- Comprehensive input validation

### API Security
- Built-in rate limiting
- Token format validation
- Error message sanitization
- Request validation

## 📊 System Architecture Diagrams

The planning phase includes detailed Mermaid diagrams showing:
- High-level system architecture
- Data flow sequences
- Component hierarchies
- Security layers
- Technology stack relationships

## 🛣️ Development Roadmap

### Phase 1: Foundation (Week 1)
- Project setup and environment configuration
- YNAB API integration foundation
- Security implementation

### Phase 2: Core Processing (Week 2)
- Target alignment calculation engine
- Data processing pipeline
- Caching and optimization

### Phase 3: User Interface (Week 3)
- Dashboard implementation
- Category analysis views
- Data visualization components

### Phase 4: Advanced Features (Week 4)
- Settings and configuration
- Error handling and polish
- Performance optimization

### Phase 5: Testing & Documentation (Week 5-6)
- Comprehensive testing suite
- Security validation
- Documentation completion

## 🎯 Success Criteria

- All core features implemented and working correctly
- Dashboard loads within 3 seconds
- >90% test coverage achieved
- Zero critical security vulnerabilities
- Calculations match YNAB data exactly

## 🚦 Next Steps

1. **Review Planning Documents** - Review all documentation for completeness
2. **Environment Setup** - Prepare development environment
3. **Project Initialization** - Create Next.js project structure
4. **Begin Development** - Start Phase 1 implementation

## 📚 YNAB API Integration ✅ CONFIRMED FULLY SUPPORTED

This application integrates with the YNAB API v1:
- **Authentication**: Personal Access Token (for individual use)
- **Rate Limiting**: 200 requests per hour
- **Data Format**: JSON with milliunits for currency
- **Target Data**: ✅ ALL goal/target fields confirmed available
- **Endpoints**: Budgets, categories, and monthly data with complete goal information
- **Historical Analysis**: ✅ Month-by-month target data fully accessible

## 🔧 Development Requirements

- Node.js 18+ development environment
- YNAB account with API access
- Personal Access Token from YNAB
- Modern web browser for testing

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd YNAB_Off_Target_Assignment
npm install
```

### 2. Configure YNAB API Access
1. **Get your YNAB Personal Access Token:**
   - Visit [YNAB Developer Settings](https://app.ynab.com/settings/developer)
   - Click "New Token" and follow the instructions
   - Copy the generated token (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

2. **Update Environment Variables:**
   - Open the `.env.local` file in the project root
   - Replace `your-ynab-personal-access-token-here` with your actual token:
   ```
   YNAB_ACCESS_TOKEN=your-actual-token-here
   ```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Open Application
- Navigate to [http://localhost:3000](http://localhost:3000)
- Verify the connection status shows "Connected to YNAB API"

## 🔧 Troubleshooting

### Configuration Issues
- **"Missing required environment variables"**: Ensure `.env.local` exists and contains `YNAB_ACCESS_TOKEN`
- **"Invalid YNAB access token format"**: Token should be in format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **"Unable to connect to YNAB API"**: Verify your token is valid and has not expired

### Common Solutions
1. **Restart the development server** after changing environment variables
2. **Check token validity** by visiting YNAB Developer Settings
3. **Verify internet connection** for API access

## 📖 Documentation Structure

```
docs/
├── PRODUCT_REQUIREMENTS.md    # Feature specs and user stories
├── DATA_ARCHITECTURE.md       # Data models and processing
├── SYSTEM_ARCHITECTURE.md     # Technical architecture
├── SECURITY_PLAN.md          # Security implementation
├── DEVELOPMENT_ROADMAP.md     # Timeline and milestones
└── PROJECT_SUMMARY.md        # Executive overview
```

## 🤝 Contributing

This project follows modern development practices:
- TypeScript for type safety
- Test-driven development
- Security-first approach
- Comprehensive documentation
- Code quality standards

---

**Note**: This project is currently in the planning phase. All documentation has been completed and the project is ready for development implementation.
