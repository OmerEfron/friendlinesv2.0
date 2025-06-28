const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Friendlines API',
    version: '1.0.0',
    description: 'Satirical social news API - Transform everyday updates into newsflashes',
    contact: {
      name: 'Friendlines Team',
      email: 'core@friendlines.app'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://your-production-url.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique user identifier'
          },
          username: {
            type: 'string',
            description: 'User display name'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address'
          },
          avatar: {
            type: 'string',
            description: 'URL to user avatar image'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp'
          }
        }
      },
      Post: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique post identifier'
          },
          userId: {
            type: 'string',
            description: 'ID of the user who created the post'
          },
          content: {
            type: 'string',
            description: 'Original post content'
          },
          newsflashContent: {
            type: 'string',
            description: 'AI-generated newsflash version'
          },
          audience: {
            type: 'string',
            enum: ['friends', 'groups', 'friends_of_friends'],
            description: 'Target audience for the post'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Post creation timestamp'
          },
          likes: {
            type: 'integer',
            description: 'Number of likes'
          },
          comments: {
            type: 'integer',
            description: 'Number of comments'
          }
        }
      },
      Group: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique group identifier'
          },
          name: {
            type: 'string',
            description: 'Group name'
          },
          description: {
            type: 'string',
            description: 'Group description'
          },
          createdBy: {
            type: 'string',
            description: 'ID of the user who created the group'
          },
          members: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Array of user IDs who are group members'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Group creation timestamp'
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful'
          },
          message: {
            type: 'string',
            description: 'Human-readable message'
          },
          data: {
            type: 'object',
            description: 'Response data (varies by endpoint)'
          },
          error: {
            type: 'string',
            description: 'Error message (only present on failures)'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Error message'
          },
          error: {
            type: 'string',
            description: 'Detailed error information'
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and profile management'
    },
    {
      name: 'Posts',
      description: 'Post creation, management, and social interactions'
    },
    {
      name: 'Groups',
      description: 'Group management and membership'
    },
    {
      name: 'Social',
      description: 'Friendship system and social features'
    },
    {
      name: 'Notifications',
      description: 'Push notifications and user alerts'
    },
    {
      name: 'Upload',
      description: 'File upload endpoints'
    },
    {
      name: 'Development',
      description: 'Development and testing utilities'
    }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js', './controllers/*.js'], // Path to the API files
};

module.exports = options; 