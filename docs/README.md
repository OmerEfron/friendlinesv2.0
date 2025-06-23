# Friendlines v2.0 - Documentation Hub

This is the central documentation hub for the Friendlines backend API. All project documentation is organized here for easy navigation.

## 📚 API Documentation

The primary API documentation is located in the `api_docs/` directory:

- **[API Overview](../api_docs/README.md)** - Central API documentation hub
- **[Endpoints](../api_docs/endpoints/)** - All API endpoint documentation
  - [Authentication & Friendship](../api_docs/endpoints/authentication_endpoints.md)
  - [Posts & Social Features](../api_docs/endpoints/posts_endpoints.md) 
  - [Groups Management](../api_docs/endpoints/groups_endpoints.md)
- **[Social Features](../api_docs/social_features/)** - Advanced feature documentation
  - [Friendship System](../api_docs/social_features/friendship_system.md)
  - [Post Audience Targeting](../api_docs/social_features/post_audience_targeting.md)
- **[Architecture](../api_docs/architecture/)** - Technical architecture docs
  - [Push Notifications](../api_docs/architecture/push_notifications_architecture.md)
  - [HTTP Status Codes](../api_docs/architecture/http_status_codes.md)
- **[General](../api_docs/general/)** - API conventions and policies
  - [Response Format](../api_docs/general/response_format.md)
  - [Rate Limiting](../api_docs/general/rate_limiting.md)

## 📋 Changelog & History

- **[Master Changelog](CHANGELOG.md)** - Comprehensive version history and breaking changes
- **[API Documentation Cleanup](archive/API_DOCS_CLEANUP_SUMMARY.md)** - Documentation restructuring summary
- **[Audience Targeting Demo](archive/AUDIENCE_TARGETING_DEMO.md)** - Post privacy controls implementation
- **[Friendship System Changes](archive/FRIENDSHIP_SYSTEM_CHANGES.md)** - Migration from followers to friendship model
- **[Database Migration Summary](archive/DATABASE_MIGRATION_SUMMARY.md)** - JSON to SQLite migration details

## 🚀 Quick Start

### For Developers
1. Start with the **[API Overview](../api_docs/README.md)** for high-level understanding
2. Reference **[Endpoints documentation](../api_docs/endpoints/)** for specific API usage
3. Check **[Changelog](CHANGELOG.md)** for recent updates and breaking changes

### For Frontend Integration
1. Review **[Authentication endpoints](../api_docs/endpoints/authentication_endpoints.md)** for user management
2. Study **[Posts endpoints](../api_docs/endpoints/posts_endpoints.md)** for newsflash functionality
3. Understand **[Friendship System](../api_docs/social_features/friendship_system.md)** for social features

### For API Testing
1. Use **[Quick Start examples](../api_docs/README.md#quick-start)** from the API overview
2. Reference **[Response Format](../api_docs/general/response_format.md)** for expected API responses
3. Check **[HTTP Status Codes](../api_docs/architecture/http_status_codes.md)** for error handling

## 📖 Documentation Standards

All documentation in this project follows these standards:
- **Markdown format** with consistent formatting
- **Complete API examples** with request/response bodies
- **Error response documentation** with proper HTTP status codes
- **Validation rules** clearly specified for all endpoints
- **Cross-references** between related documentation files

## 🔧 Project Structure

```
friendlinesv2.0/
├── docs/                           # Documentation hub
│   ├── README.md                   # This file - central documentation index
│   ├── CHANGELOG.md               # Master changelog with version history
│   └── archive/                   # Historical development documentation
│       ├── README.md              # Archive explanation
│       ├── API_DOCS_CLEANUP_SUMMARY.md
│       ├── AUDIENCE_TARGETING_DEMO.md
│       ├── DATABASE_MIGRATION_SUMMARY.md
│       └── FRIENDSHIP_SYSTEM_CHANGES.md
├── api_docs/                      # Current API documentation
│   ├── README.md                  # API overview and quick start
│   ├── endpoints/                 # Endpoint documentation
│   ├── social_features/           # Feature documentation
│   ├── architecture/              # Technical architecture docs
│   └── general/                   # API conventions and policies
├── controllers/                   # Express controllers
├── routes/                        # Express routes  
├── utils/                         # Utility functions
├── data/                          # Database and storage
├── tests/                         # Test suites
└── README.md                      # Main project README
```

## 🏷️ Version Information

- **Current Version**: v2.0.0
- **API Status**: Production Ready
- **Documentation Status**: Complete and up-to-date
- **Last Updated**: December 2024

---

For questions about this documentation or to report issues, please refer to the main project README or contact the development team. 