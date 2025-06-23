# Friendlines v2.0 - Changelog

This document tracks major changes and improvements to the Friendlines backend API.

## Recent Updates

### 🔧 December 2024 - Documentation Cleanup
- **Status**: ✅ Complete
- **Summary**: Streamlined API documentation structure, removed redundant files
- **Details**: [API_DOCS_CLEANUP_SUMMARY.md](archive/API_DOCS_CLEANUP_SUMMARY.md)

### 🎯 December 2024 - Post Audience Targeting
- **Status**: ✅ Complete  
- **Summary**: Added granular privacy controls for posts (friends/groups/specific friend)
- **Details**: [AUDIENCE_TARGETING_DEMO.md](archive/AUDIENCE_TARGETING_DEMO.md)

### 🤝 December 2024 - Friendship System
- **Status**: ✅ Complete
- **Summary**: Replaced followers system with bidirectional friendship model
- **Details**: [FRIENDSHIP_SYSTEM_CHANGES.md](archive/FRIENDSHIP_SYSTEM_CHANGES.md)

### 🗄️ December 2024 - SQLite Database Migration  
- **Status**: ✅ Complete
- **Summary**: Migrated from JSON file storage to SQLite database
- **Details**: [DATABASE_MIGRATION_SUMMARY.md](archive/DATABASE_MIGRATION_SUMMARY.md)

## Version History

### v2.0.0 (Current)
- **Friendship System**: Mutual consent based friendships
- **Audience Targeting**: Granular post privacy controls
- **SQLite Database**: Improved performance and reliability
- **Push Notifications**: Real-time notifications via Expo
- **Enhanced Documentation**: Streamlined, production-ready docs

### v1.0.0 (Legacy)
- Basic user authentication
- Simple post creation with newsflash generation
- File-based JSON storage
- Followers/following system

## Breaking Changes

### v2.0.0
- **Friendship System**: API endpoints changed from `/follow` to `/friend-request`
- **Database**: Moved from JSON files to SQLite (automatic migration)
- **Post Structure**: Added audience targeting fields

## Migration Guides

### From v1.0 to v2.0
1. **Friendship System**: Update client code to use new friend request endpoints
2. **Database**: Automatic migration on server restart - no action needed  
3. **Post Targeting**: Optional - can continue using legacy post format

## Upcoming Features

- [ ] Real-time messaging system
- [ ] Enhanced group management features  
- [ ] Advanced notification preferences
- [ ] Content moderation tools

---

For technical implementation details, see the individual change documents linked above. 