# 📝 How to Document New API Routes

## 🎯 Overview

This guide shows you how to add proper OpenAPI/Swagger documentation to new routes in the Friendlines backend. Following this process ensures your API documentation stays up-to-date and your frontend developers have everything they need.

## 🚀 Quick Start Template

When creating a new route, copy this template and customize it:

```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   post:
 *     tags: [YourCategory]
 *     summary: Brief description of what this endpoint does
 *     description: Detailed explanation of the endpoint's purpose and behavior
 *     parameters:
 *       - in: path
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *         description: Description of the parameter
 *         example: "example_value"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - requiredField
 *             properties:
 *               requiredField:
 *                 type: string
 *                 description: Description of the field
 *                 example: "example_value"
 *               optionalField:
 *                 type: string
 *                 description: Optional field description
 *                 example: "optional_example"
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/YourSchema'
 *       400:
 *         description: Bad request - validation error
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
router.post('/your-endpoint', middlewareFunction, controllerFunction);
```

## 📋 Step-by-Step Guide

### Step 1: Add the Swagger Comment Block

Place the `@swagger` comment block **directly above** your route definition:

```javascript
// ❌ Wrong - comment too far from route
/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 */

// Other code here...

router.post('/posts', createPost);

// ✅ Correct - comment directly above route
/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 */
router.post('/posts', createPost);
```

### Step 2: Choose the Right HTTP Method

Match your route's HTTP method:

```javascript
// GET endpoint
/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: Get all posts
 */
router.get('/posts', getAllPosts);

// POST endpoint
/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a new post
 */
router.post('/posts', createPost);

// PUT endpoint
/**
 * @swagger
 * /api/posts/{id}:
 *   put:
 *     summary: Update a post
 */
router.put('/posts/:id', updatePost);

// DELETE endpoint
/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete a post
 */
router.delete('/posts/:id', deletePost);
```

### Step 3: Set the Correct Path

Convert Express route parameters to OpenAPI format:

```javascript
// Express route: /api/posts/:id
// OpenAPI path: /api/posts/{id}

// Express route: /api/users/:userId/posts/:postId
// OpenAPI path: /api/users/{userId}/posts/{postId}
```

### Step 4: Choose the Right Tag

Use existing tags or create new ones. Current tags:

- `Authentication` - User auth, profiles, friends
- `Posts` - Post creation, management, social interactions
- `Groups` - Group management and membership
- `Social` - Social features, suggestions
- `Notifications` - Push notifications, alerts
- `Upload` - File uploads
- `Development` - Dev/testing utilities

### Step 5: Document Parameters

#### Path Parameters
```javascript
parameters:
  - in: path
    name: id
    required: true
    schema:
      type: string
    description: Unique identifier for the resource
    example: "post_12345"
```

#### Query Parameters
```javascript
parameters:
  - in: query
    name: page
    required: false
    schema:
      type: integer
      minimum: 1
      default: 1
    description: Page number for pagination
    example: 1
  - in: query
    name: limit
    required: false
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
    description: Number of items per page
    example: 20
```

### Step 6: Document Request Body

For POST/PUT requests with JSON bodies:

```javascript
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - userId
          - content
        properties:
          userId:
            type: string
            description: ID of the user creating the post
            example: "user_12345"
          content:
            type: string
            description: The post content
            example: "Just had the best coffee ever!"
          audience:
            type: string
            enum: ['friends', 'groups', 'friends_of_friends']
            description: Target audience for the post
            example: "friends"
            default: "friends"
```

### Step 7: Document Responses

Always include success and error responses:

```javascript
responses:
  200:
    description: Operation successful
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/ApiResponse'
            - type: object
              properties:
                data:
                  type: array
                  items:
                    $ref: '#/components/schemas/Post'
  400:
    description: Bad request - validation error
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
  404:
    description: Resource not found
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
  500:
    description: Internal server error
    content:
      application/json:
        schema:
          $ref: '#/components/schemas/ErrorResponse'
```

## 🔧 Real Examples from Friendlines

### Example 1: Simple GET Endpoint

```javascript
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Authentication]
 *     summary: Get user profile by ID
 *     description: Retrieve detailed user profile information
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "user_123"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/users/:id', validateIdMiddleware('id'), getUserProfile);
```

### Example 2: POST Endpoint with Request Body

```javascript
/**
 * @swagger
 * /api/posts:
 *   post:
 *     tags: [Posts]
 *     summary: Create a new post
 *     description: Create a new post with newsflash transformation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - content
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the user creating the post
 *                 example: "user_12345"
 *               content:
 *                 type: string
 *                 description: The original post content
 *                 example: "Just had the best coffee ever!"
 *               audience:
 *                 type: string
 *                 enum: ['friends', 'groups', 'friends_of_friends']
 *                 description: Target audience for the post
 *                 example: "friends"
 *                 default: "friends"
 *               groupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of group IDs (required if audience is 'groups')
 *                 example: ["group_1", "group_2"]
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Post'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/posts', validateContentType, ensureBodyExists, validatePostMiddleware, createPost);
```

### Example 3: GET with Query Parameters

```javascript
/**
 * @swagger
 * /api/posts:
 *   get:
 *     tags: [Posts]
 *     summary: Get all posts with pagination
 *     description: Retrieve posts with optional filtering and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of posts per page
 *         example: 20
 *       - in: query
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter posts by user ID
 *         example: "user_12345"
 *       - in: query
 *         name: audience
 *         required: false
 *         schema:
 *           type: string
 *           enum: ['friends', 'groups', 'friends_of_friends']
 *         description: Filter posts by audience type
 *         example: "friends"
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         posts:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Post'
 *                         pagination:
 *                           type: object
 *                           properties:
 *                             page:
 *                               type: integer
 *                               example: 1
 *                             limit:
 *                               type: integer
 *                               example: 20
 *                             total:
 *                               type: integer
 *                               example: 150
 *                             hasMore:
 *                               type: boolean
 *                               example: true
 */
router.get('/posts', getAllPosts);
```

## 🎨 Adding New Schemas

If your endpoint uses new data structures, add them to `swaggerDef.js`:

```javascript
// In swaggerDef.js, add to components.schemas:
Comment: {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      description: 'Unique comment identifier'
    },
    postId: {
      type: 'string',
      description: 'ID of the post this comment belongs to'
    },
    userId: {
      type: 'string',
      description: 'ID of the user who created the comment'
    },
    content: {
      type: 'string',
      description: 'Comment content'
    },
    createdAt: {
      type: 'string',
      format: 'date-time',
      description: 'Comment creation timestamp'
    },
    likes: {
      type: 'integer',
      description: 'Number of likes on the comment'
    }
  }
}
```

## ⚡ Testing Your Documentation

### Step 1: Generate Documentation
```bash
npm run docs:generate
```

### Step 2: Start the Server
```bash
npm run dev
```

### Step 3: Test in Browser
1. Open `http://localhost:3000/api-docs`
2. Find your new endpoint
3. Click "Try it out"
4. Fill in the parameters
5. Click "Execute"
6. Verify the response

### Step 4: Validate
The generation script will validate your documentation and show any errors.

## 📚 Common Patterns

### Authentication Endpoints
```javascript
tags: [Authentication]
// Usually include user management, login, profiles, friends
```

### CRUD Operations
```javascript
// Create
responses:
  201: # Created
  400: # Bad Request
  422: # Validation Error

// Read
responses:
  200: # Success
  404: # Not Found

// Update
responses:
  200: # Success
  400: # Bad Request
  404: # Not Found
  422: # Validation Error

// Delete
responses:
  200: # Success (or 204 No Content)
  404: # Not Found
```

### Pagination
```javascript
parameters:
  - in: query
    name: page
    schema:
      type: integer
      minimum: 1
      default: 1
  - in: query
    name: limit
    schema:
      type: integer
      minimum: 1
      maximum: 100
      default: 20
```

## 🚨 Common Mistakes to Avoid

### ❌ Wrong Path Format
```javascript
// Wrong - using Express syntax
/api/posts/:id

// Correct - using OpenAPI syntax
/api/posts/{id}
```

### ❌ Missing Required Fields
```javascript
// Wrong - missing required fields
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          userId: { type: string }

// Correct - specify required fields
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required:
          - userId
        properties:
          userId: { type: string }
```

### ❌ Inconsistent Response Format
```javascript
// Wrong - not using standard response format
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            user: { $ref: '#/components/schemas/User' }

// Correct - using ApiResponse wrapper
responses:
  200:
    content:
      application/json:
        schema:
          allOf:
            - $ref: '#/components/schemas/ApiResponse'
            - type: object
              properties:
                data:
                  $ref: '#/components/schemas/User'
```

## 🔄 Workflow Summary

1. **Write your route** in Express
2. **Add @swagger comment** directly above the route
3. **Run** `npm run docs:generate` to validate
4. **Test** at `http://localhost:3000/api-docs`
5. **Fix any validation errors**
6. **Commit** your changes
7. **Share** with your frontend team

## 💡 Pro Tips

- **Copy existing examples** and modify them
- **Use the validation script** to catch errors early
- **Test your documentation** by actually using the "Try it out" feature
- **Keep examples realistic** - use actual data formats your app uses
- **Document error cases** - frontend developers need to handle them
- **Use consistent naming** - match your actual API responses

Following this guide ensures your API documentation stays professional, up-to-date, and helpful for your frontend developers! 🚀 