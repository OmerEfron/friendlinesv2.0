# 📚 Friendlines API Documentation Hub

Welcome to the Friendlines API documentation! This directory contains everything you need to understand, use, and contribute to the API.

## 🚀 Quick Start

1. **View Interactive Documentation**: `http://localhost:3000/api-docs`
2. **Start the server**: `npm run dev`
3. **Generate docs**: `npm run docs:generate`

## 📋 Documentation Files

### 🔧 For Developers Using the API
- **[API_DOCUMENTATION.md](../API_DOCUMENTATION.md)** - Complete API guide for frontend developers
- **[SETUP_COMPLETE.md](../SETUP_COMPLETE.md)** - Setup summary and quick reference

### 📝 For Developers Adding New Routes
- **[HOW_TO_DOCUMENT_NEW_ROUTES.md](HOW_TO_DOCUMENT_NEW_ROUTES.md)** - Step-by-step guide with examples
- **[AI_PROMPT_TEMPLATE.md](AI_PROMPT_TEMPLATE.md)** - AI-powered documentation generation

### ⚙️ Generated Documentation
- **[swagger.json](swagger.json)** - OpenAPI specification (JSON format)
- **[swagger.yaml](swagger.yaml)** - OpenAPI specification (YAML format)

## 🎯 Quick Navigation

### I want to...

**🔍 Explore the API**
→ Visit `http://localhost:3000/api-docs` for interactive documentation

**📱 Integrate with React Native**
→ See [TypeScript Integration](../API_DOCUMENTATION.md#-typescript-support) section

**➕ Add a new API endpoint**
→ Follow the [Route Documentation Guide](HOW_TO_DOCUMENT_NEW_ROUTES.md)

**🤖 Use AI to generate docs**
→ Use the [AI Prompt Template](AI_PROMPT_TEMPLATE.md)

**🐛 Debug API issues**
→ Check [Debugging Section](../API_DOCUMENTATION.md#-debugging) in main docs

**📊 Understand the API structure**
→ Review [API Overview](../API_DOCUMENTATION.md#-api-overview)

## 🔗 Key Endpoints

### Authentication & Users
- `POST /api/login` - User login/registration
- `GET /api/users/{id}` - Get user profile
- `POST /api/users/{id}/friend-request` - Send friend request

### Posts & Social
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post
- `GET /api/posts/{id}` - Get specific post

### Groups
- `POST /api/groups/{userId}` - Create group
- `GET /api/groups/{id}` - Get group details
- `POST /api/groups/{id}/invite` - Invite to group

### Notifications
- `GET /api/notifications/{id}` - Get user notifications
- `POST /api/users/{id}/push-token` - Register push token

## 📊 Current Status

- **Total Endpoints**: 2 documented (more being added)
- **Schemas**: 5 defined (User, Post, Group, ApiResponse, ErrorResponse)
- **Documentation Coverage**: Login and User Profile endpoints
- **Interactive Testing**: ✅ Available at `/api-docs`
- **Type Generation**: ✅ TypeScript support ready

## 🛠️ Development Workflow

### Adding New Documentation

1. **Write your Express route**
2. **Add @swagger comment** (use our guides)
3. **Validate**: `npm run docs:generate`
4. **Test**: Visit `/api-docs` and try it out
5. **Commit** your changes

### Updating Existing Documentation

1. **Modify the @swagger comment** in your route file
2. **Regenerate**: `npm run docs:generate`
3. **Verify changes** at `/api-docs`
4. **Commit** updates

## 🎨 Documentation Standards

- **Use realistic examples** that match your actual data
- **Include all error responses** that can occur
- **Follow the ApiResponse wrapper** format consistently
- **Add proper validation rules** (min/max, required fields)
- **Choose appropriate tags** for organization
- **Test your documentation** using the interactive UI

## 🔧 Tools & Scripts

```bash
# Generate and validate documentation
npm run docs:generate

# Start development server with docs
npm run dev

# Reset development data
npm run dev:reset

# Run tests
npm test
```

## 📞 Support & Contribution

### Getting Help
1. Check the [main documentation](../API_DOCUMENTATION.md)
2. Review [common issues](../API_DOCUMENTATION.md#-debugging)
3. Test your endpoint at `/api-docs`
4. Contact the backend team

### Contributing
1. Follow our [documentation guide](HOW_TO_DOCUMENT_NEW_ROUTES.md)
2. Use consistent formatting and examples
3. Test all documentation changes
4. Submit PRs with both code and docs

## 🚀 Future Enhancements

- [ ] Document remaining endpoints (Posts, Groups, Social, Notifications)
- [ ] Add authentication examples when JWT is implemented
- [ ] Create Postman collection export
- [ ] Add API versioning documentation
- [ ] Implement automated testing of documentation examples

---

**Ready to get started?** Visit `http://localhost:3000/api-docs` to explore the interactive API documentation! 🎉 