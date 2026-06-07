const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'GitHub Profile Analyzer API',
    version: '1.0.0',
    description: 'REST API that analyzes a GitHub user\'s public profile using the GitHub REST API and stores calculated insights in a MySQL database.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local development server'
    }
  ],
  paths: {
    '/api/profiles/analyze': {
      post: {
        summary: 'Analyze and save a GitHub profile',
        description: 'Accepts a GitHub username, fetches profile data and repository details, calculates aggregated insights, saves the profile in MySQL, and returns the result.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username'],
                properties: {
                  username: {
                    type: 'string',
                    example: 'octocat'
                  }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Profile analyzed and saved successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProfileResponse'
                }
              }
            }
          },
          400: {
            description: 'Bad request (missing or invalid username)'
          },
          404: {
            description: 'GitHub user not found'
          },
          409: {
            description: 'Conflict (profile already analyzed)'
          },
          500: {
            description: 'Internal server or database error'
          }
        }
      }
    },
    '/api/profiles': {
      get: {
        summary: 'Get all analyzed profiles',
        description: 'Retrieves a paginated list of analyzed profiles with search, filter, and sorting options.',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            schema: { type: 'integer', default: 10 }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search string to filter by username or name',
            schema: { type: 'string' }
          },
          {
            name: 'minFollowers',
            in: 'query',
            description: 'Filter profiles with followers greater than or equal to this value',
            schema: { type: 'integer' }
          },
          {
            name: 'maxFollowers',
            in: 'query',
            description: 'Filter profiles with followers less than or equal to this value',
            schema: { type: 'integer' }
          },
          {
            name: 'sortBy',
            in: 'query',
            description: 'Field to sort profiles by',
            schema: {
              type: 'string',
              enum: ['followers', 'public_repos', 'total_stars_received', 'created_at', 'analysis_date'],
              default: 'analysis_date'
            }
          },
          {
            name: 'sortOrder',
            in: 'query',
            description: 'Sort direction',
            schema: {
              type: 'string',
              enum: ['ASC', 'DESC'],
              default: 'DESC'
            }
          }
        ],
        responses: {
          200: {
            description: 'Success list of profiles',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Profile' }
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        totalItems: { type: 'integer', example: 1 },
                        totalPages: { type: 'integer', example: 1 },
                        currentPage: { type: 'integer', example: 1 },
                        itemsPerPage: { type: 'integer', example: 1 },
                        hasNextPage: { type: 'boolean', example: false },
                        hasPrevPage: { type: 'boolean', example: false }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/profiles/{username}': {
      get: {
        summary: 'Get single profile',
        description: 'Retrieves a single analyzed profile from the database by username.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'GitHub username'
          }
        ],
        responses: {
          200: {
            description: 'Success profile found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Profile' }
                  }
                }
              }
            }
          },
          404: {
            description: 'Profile not found in database'
          }
        }
      },
      delete: {
        summary: 'Delete profile',
        description: 'Removes an analyzed profile from the database by username.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'GitHub username'
          }
        ],
        responses: {
          200: {
            description: 'Profile deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: "Profile for 'octocat' deleted successfully." }
                  }
                }
              }
            }
          },
          404: {
            description: 'Profile not found'
          }
        }
      }
    },
    '/api/profiles/{username}/reanalyze': {
      put: {
        summary: 'Reanalyze existing profile',
        description: 'Fetches the latest data from GitHub API and updates the existing profile in the database.',
        parameters: [
          {
            name: 'username',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'GitHub username'
          }
        ],
        responses: {
          200: {
            description: 'Profile updated successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ProfileResponse'
                }
              }
            }
          },
          404: {
            description: 'Profile does not exist in database'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Profile: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          github_id: { type: 'integer', example: 5832347 },
          username: { type: 'string', example: 'octocat' },
          name: { type: 'string', example: 'The Octocat' },
          bio: { type: 'string', example: 'Testing branch merges' },
          company: { type: 'string', example: 'GitHub' },
          location: { type: 'string', example: 'San Francisco' },
          blog: { type: 'string', example: 'https://github.blog' },
          followers: { type: 'integer', example: 9820 },
          following: { type: 'integer', example: 9 },
          public_repos: { type: 'integer', example: 8 },
          public_gists: { type: 'integer', example: 8 },
          account_created_at: { type: 'string', example: '2011-01-25 18:44:36' },
          total_stars_received: { type: 'integer', example: 250 },
          total_forks: { type: 'integer', example: 120 },
          total_watchers: { type: 'integer', example: 250 },
          most_starred_repo: { type: 'string', example: 'Spoon-Knife' },
          most_starred_repo_stars: { type: 'integer', example: 150 },
          average_stars_per_repo: { type: 'number', format: 'float', example: 31.25 },
          average_forks_per_repo: { type: 'number', format: 'float', example: 15.0 },
          total_repo_size: { type: 'integer', example: 1420 },
          latest_repo_updated_at: { type: 'string', example: '2024-05-12 11:20:45' },
          analysis_date: { type: 'string', example: '2026-06-06 07:15:30' },
          created_at: { type: 'string', example: '2026-06-06T01:45:00.000Z' },
          updated_at: { type: 'string', example: '2026-06-06T01:45:00.000Z' }
        }
      },
      ProfileResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Profile analyzed and saved successfully.' },
          data: { $ref: '#/components/schemas/Profile' }
        }
      }
    }
  }
};

export default swaggerDocument;
