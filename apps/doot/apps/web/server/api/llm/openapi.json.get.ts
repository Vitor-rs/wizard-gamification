export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host') || 'localhost:3000'
  const proto = getRequestHeader(event, 'x-forwarded-proto') || 'http'
  const origin = `${proto}://${host}`

  return {
    openapi: '3.1.0',
    info: {
      title: 'Doot Games API for LLMs',
      description:
        'Create, validate, and save multiplayer party games directly into Doot player accounts from any AI model (ChatGPT, Claude, Gemini, Cursor, etc.).',
      version: '1.0.0',
    },
    servers: [{ url: origin, description: 'Current Doot Server' }],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Personal Access Token from your Doot account (/connect).',
        },
      },
      schemas: {
        ValidateGameRequest: {
          type: 'object',
          required: ['markdown'],
          properties: {
            markdown: {
              type: 'string',
              description: 'The game spec written in Doot markdown format.',
            },
          },
        },
        SaveGameRequest: {
          type: 'object',
          required: ['markdown'],
          properties: {
            markdown: {
              type: 'string',
              description: 'The game spec in Doot markdown format.',
            },
            title: {
              type: 'string',
              description: 'Optional game title override.',
            },
            theme: {
              type: 'string',
              enum: ['doot', 'wizard', 'cutesie', 'cyber', 'professional', 'playful'],
              description: 'Visual theme for the game.',
            },
            description: {
              type: 'string',
              description: 'A one-line summary for cards and catalog.',
            },
            visibility: {
              type: 'string',
              enum: ['private', 'unlisted', 'public'],
              description: 'Who can find and view the game.',
            },
            remixable: {
              type: 'boolean',
              description: 'Whether other users can copy and edit this game.',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Category tags.',
            },
          },
        },
      },
    },
    paths: {
      '/api/llm/guide': {
        get: {
          summary: 'Get Doot markdown format guide',
          description: 'Returns syntax and instructions for authoring party games in Doot format.',
          operationId: 'getFormatGuide',
          responses: {
            '200': {
              description: 'Format guide documentation.',
            },
          },
        },
      },
      '/api/llm/types': {
        get: {
          summary: 'List supported game types and building blocks',
          description: 'Returns the catalog of game types available in Doot.',
          operationId: 'listGameTypes',
          responses: {
            '200': {
              description: 'List of game types.',
            },
          },
        },
      },
      '/api/llm/validate': {
        post: {
          summary: 'Validate a game markdown spec',
          description: 'Parses the game markdown and checks for syntax errors or missing fields.',
          operationId: 'validateGame',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidateGameRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Validation results with warnings and parsed rounds.',
            },
          },
        },
      },
      '/api/llm/save': {
        post: {
          summary: 'Save a validated game to the user account',
          description: 'Creates a new playable game in the authenticated user account and returns URLs to host and play.',
          operationId: 'saveGame',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SaveGameRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Game saved successfully with direct play and host links.',
            },
            '401': {
              description: 'Authentication required.',
            },
          },
        },
      },
      '/api/llm/games': {
        get: {
          summary: 'List games in the user account',
          description: 'Returns all games saved by the authenticated user.',
          operationId: 'listMyGames',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of games.',
            },
            '401': {
              description: 'Authentication required.',
            },
          },
        },
      },
    },
  }
})
