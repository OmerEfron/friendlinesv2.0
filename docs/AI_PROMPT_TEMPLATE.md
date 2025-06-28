# 🤖 AI Prompt Template for Route Documentation

## 📋 Copy-Paste Prompt Template

Use this prompt with any AI assistant to generate Swagger documentation for your new routes:

---

**PROMPT:**

```
I need to create OpenAPI/Swagger documentation for a new API route in my Express.js application. Please generate the @swagger comment block following these specifications:

**Route Details:**
- HTTP Method: [GET/POST/PUT/DELETE]
- Route Path: [e.g., /api/posts/:id]
- Controller Function: [e.g., createPost]
- Middleware: [e.g., validateContentType, ensureBodyExists]

**Route Purpose:**
[Describe what this endpoint does - e.g., "Creates a new post with newsflash transformation"]

**Request Parameters:**
- Path Parameters: [e.g., id (string, required) - User ID]
- Query Parameters: [e.g., page (integer, optional) - Page number for pagination]
- Request Body: [Describe the JSON structure expected]

**Response Format:**
- Success Response: [Describe what data is returned on success]
- Error Responses: [List possible error scenarios and status codes]

**Additional Requirements:**
- Use tag: [Authentication/Posts/Groups/Social/Notifications/Upload/Development]
- Follow the standard ApiResponse wrapper format
- Include realistic examples
- Add proper validation rules

**Current Schema References Available:**
- User, Post, Group, ApiResponse, ErrorResponse

Please generate the complete @swagger comment block that I can place directly above my Express route definition.
```

---

## 🎯 Example Usage

### Example 1: Simple GET Route

**PROMPT:**
```
I need to create OpenAPI/Swagger documentation for a new API route in my Express.js application. Please generate the @swagger comment block following these specifications:

**Route Details:**
- HTTP Method: GET
- Route Path: /api/posts/:id
- Controller Function: getPostById
- Middleware: validateIdMiddleware('id')

**Route Purpose:**
Retrieve a specific post by its ID with full details including likes, comments, and newsflash content

**Request Parameters:**
- Path Parameters: id (string, required) - Unique post identifier

**Response Format:**
- Success Response: Returns a Post object with all details
- Error Responses: 404 if post not found, 500 for server errors

**Additional Requirements:**
- Use tag: Posts
- Follow the standard ApiResponse wrapper format
- Include realistic examples
- Add proper validation rules

**Current Schema References Available:**
- User, Post, Group, ApiResponse, ErrorResponse

Please generate the complete @swagger comment block that I can place directly above my Express route definition.
```

**AI RESPONSE:**
```javascript
/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     tags: [Posts]
 *     summary: Get post by ID
 *     description: Retrieve a specific post by its ID with full details including likes, comments, and newsflash content
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique post identifier
 *         example: "post_12345"
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Post'
 *       404:
 *         description: Post not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```

### Example 2: POST Route with Request Body

**PROMPT:**
```
I need to create OpenAPI/Swagger documentation for a new API route in my Express.js application. Please generate the @swagger comment block following these specifications:

**Route Details:**
- HTTP Method: POST
- Route Path: /api/groups/:userId
- Controller Function: createGroup
- Middleware: validateIdMiddleware('userId'), validateContentType, ensureBodyExists

**Route Purpose:**
Create a new group with the specified user as the owner

**Request Parameters:**
- Path Parameters: userId (string, required) - ID of the user creating the group
- Request Body: 
  - name (string, required) - Group name
  - description (string, optional) - Group description
  - isPrivate (boolean, optional, default: false) - Whether the group is private

**Response Format:**
- Success Response: Returns the created Group object with generated ID
- Error Responses: 400 for validation errors, 404 if user not found, 422 for business logic errors

**Additional Requirements:**
- Use tag: Groups
- Follow the standard ApiResponse wrapper format
- Include realistic examples
- Add proper validation rules

**Current Schema References Available:**
- User, Post, Group, ApiResponse, ErrorResponse

Please generate the complete @swagger comment block that I can place directly above my Express route definition.
```

**AI RESPONSE:**
```javascript
/**
 * @swagger
 * /api/groups/{userId}:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group
 *     description: Create a new group with the specified user as the owner
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user creating the group
 *         example: "user_12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Group name
 *                 example: "Coffee Lovers"
 *                 minLength: 1
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 description: Group description
 *                 example: "A group for people who love coffee and want to share their experiences"
 *                 maxLength: 500
 *               isPrivate:
 *                 type: boolean
 *                 description: Whether the group is private
 *                 example: false
 *                 default: false
 *     responses:
 *       201:
 *         description: Group created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Group'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed - business logic error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
```

## 🔧 Quick Fill Template

For faster prompting, use this shortened template:

```
Generate @swagger docs for:
- Route: [METHOD] [PATH]
- Purpose: [DESCRIPTION]
- Tag: [TAG]
- Params: [PARAMETERS]
- Body: [REQUEST_BODY]
- Returns: [RESPONSE_DATA]
- Errors: [ERROR_CODES]

Use ApiResponse wrapper format with realistic examples.
```

## 💡 Pro Tips for AI Prompting

1. **Be Specific**: Include exact field names and types
2. **Mention Validation**: Include min/max lengths, required fields
3. **Reference Existing Schemas**: Use the schemas already defined in `swaggerDef.js`
4. **Include Error Cases**: Think about what can go wrong
5. **Use Realistic Examples**: Match your actual data patterns
6. **Specify the Tag**: Choose from existing tags or create new ones

## 🚀 Workflow with AI

1. **Write your Express route** first
2. **Use the AI prompt** to generate documentation
3. **Copy the generated @swagger block** above your route
4. **Run** `npm run docs:generate` to validate
5. **Test** at `http://localhost:3000/api-docs`
6. **Refine** if needed based on validation errors

This approach saves time while ensuring consistent, high-quality API documentation! 🎯 