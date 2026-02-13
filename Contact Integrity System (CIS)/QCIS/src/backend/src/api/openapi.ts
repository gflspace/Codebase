// ─── OpenAPI 3.0 Specification Generator ──────────────────────────

export function generateOpenAPISpec(): object {
  return {
    openapi: '3.0.3',
    info: {
      title: 'QwickServices Contact Integrity System (CIS) API',
      description: 'Trust & Safety intelligence platform for marketplace fraud detection, enforcement orchestration, and multi-layer risk scoring.',
      version: '2.0.0',
      contact: {
        name: 'QwickServices Engineering',
        email: 'cis@qwickservices.com',
      },
    },
    servers: [
      { url: '/api', description: 'API base' },
    ],
    tags: [
      { name: 'Health', description: 'Health check and monitoring endpoints' },
      { name: 'Auth', description: 'Authentication and authorization' },
      { name: 'Users', description: 'User management' },
      { name: 'Events', description: 'Event ingestion' },
      { name: 'Webhooks', description: 'External webhook ingestion' },
      { name: 'Evaluate', description: 'Real-time risk evaluation' },
      { name: 'Alerts', description: 'Alert management' },
      { name: 'Cases', description: 'Investigation case management' },
      { name: 'Enforcement', description: 'Enforcement actions and reversals' },
      { name: 'Appeals', description: 'Appeal workflow' },
      { name: 'Risk Signals', description: 'Raw risk signals' },
      { name: 'Risk Scores', description: 'Risk score queries' },
      { name: 'Admin', description: 'Administrative operations' },
      { name: 'Intelligence', description: 'Advanced intelligence layers' },
      { name: 'Stats', description: 'Analytics and statistics' },
      { name: 'Stream', description: 'Real-time data streaming' },
    ],
    paths: {
      // ─── Health ───────────────────────────────────────────────
      '/health': {
        get: {
          summary: 'Health check',
          description: 'Returns service health status and dependency checks',
          operationId: 'getHealth',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/HealthResponse' },
                },
              },
            },
            '503': {
              description: 'Service is degraded',
            },
          },
        },
      },
      '/ready': {
        get: {
          summary: 'Readiness check',
          description: 'Returns detailed readiness status for Kubernetes probes',
          operationId: 'getReady',
          tags: ['Health'],
          responses: {
            '200': { description: 'Service is ready' },
            '503': { description: 'Service is not ready' },
          },
        },
      },
      '/metrics': {
        get: {
          summary: 'Prometheus metrics',
          description: 'Returns metrics in Prometheus text format',
          operationId: 'getMetrics',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'Metrics in Prometheus format',
              content: {
                'text/plain': { schema: { type: 'string' } },
              },
            },
          },
        },
      },
      '/api-docs': {
        get: {
          summary: 'OpenAPI specification',
          description: 'Returns this OpenAPI specification as JSON',
          operationId: 'getApiDocs',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'OpenAPI spec',
              content: {
                'application/json': { schema: { type: 'object' } },
              },
            },
          },
        },
      },
      '/api-docs/ui': {
        get: {
          summary: 'Swagger UI',
          description: 'Interactive API documentation',
          operationId: 'getApiDocsUI',
          tags: ['Health'],
          responses: {
            '200': {
              description: 'HTML documentation page',
              content: {
                'text/html': { schema: { type: 'string' } },
              },
            },
          },
        },
      },

      // ─── Auth ─────────────────────────────────────────────────
      '/auth/login': {
        post: {
          summary: 'Authenticate user',
          description: 'Login and receive JWT token',
          operationId: 'login',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Authentication successful' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },

      // ─── Users ────────────────────────────────────────────────
      '/users': {
        get: {
          summary: 'List users',
          description: 'Query users with filtering and pagination',
          operationId: 'listUsers',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'restricted', 'suspended', 'banned'] } },
          ],
          responses: {
            '200': { description: 'List of users' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          summary: 'Create user',
          description: 'Register a new user in the system',
          operationId: 'createUser',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateUserRequest' },
              },
            },
          },
          responses: {
            '201': { description: 'User created' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/users/{id}': {
        get: {
          summary: 'Get user',
          description: 'Retrieve user details by ID',
          operationId: 'getUser',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'User details' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          summary: 'Update user',
          description: 'Update user fields',
          operationId: 'updateUser',
          tags: ['Users'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateUserRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'User updated' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Events ───────────────────────────────────────────────
      '/events': {
        post: {
          summary: 'Ingest event',
          description: 'Submit platform event for processing',
          operationId: 'createEvent',
          tags: ['Events'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Event' },
              },
            },
          },
          responses: {
            '202': { description: 'Event accepted for processing' },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },

      // ─── Webhooks ─────────────────────────────────────────────
      '/webhooks/ingest': {
        post: {
          summary: 'Webhook ingestion',
          description: 'Receive external webhook events',
          operationId: 'ingestWebhook',
          tags: ['Webhooks'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
          responses: {
            '200': { description: 'Webhook processed' },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },

      // ─── Evaluate ─────────────────────────────────────────────
      '/evaluate': {
        post: {
          summary: 'Real-time evaluation',
          description: 'Synchronous risk evaluation for pre-transaction decisions',
          operationId: 'evaluate',
          tags: ['Evaluate'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EvaluateRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Evaluation result' },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },

      // ─── Alerts ───────────────────────────────────────────────
      '/alerts': {
        get: {
          summary: 'List alerts',
          description: 'Query alerts with filtering',
          operationId: 'listAlerts',
          tags: ['Alerts'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'severity', in: 'query', schema: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'investigating', 'resolved', 'false_positive'] } },
          ],
          responses: {
            '200': { description: 'List of alerts' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/alerts/{id}': {
        patch: {
          summary: 'Update alert',
          description: 'Update alert status or assignment',
          operationId: 'updateAlert',
          tags: ['Alerts'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateAlertRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Alert updated' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Cases ────────────────────────────────────────────────
      '/cases': {
        get: {
          summary: 'List cases',
          description: 'Query investigation cases',
          operationId: 'listCases',
          tags: ['Cases'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['open', 'investigating', 'closed'] } },
          ],
          responses: {
            '200': { description: 'List of cases' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          summary: 'Create case',
          description: 'Open new investigation case',
          operationId: 'createCase',
          tags: ['Cases'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateCaseRequest' },
              },
            },
          },
          responses: {
            '201': { description: 'Case created' },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/cases/{id}': {
        get: {
          summary: 'Get case',
          description: 'Retrieve case details',
          operationId: 'getCase',
          tags: ['Cases'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'Case details' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        patch: {
          summary: 'Update case',
          description: 'Update case status or notes',
          operationId: 'updateCase',
          tags: ['Cases'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateCaseRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Case updated' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Enforcement ──────────────────────────────────────────
      '/enforcement-actions': {
        get: {
          summary: 'List enforcement actions',
          description: 'Query enforcement action history',
          operationId: 'listEnforcementActions',
          tags: ['Enforcement'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'List of enforcement actions' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/enforcement-actions/{id}/reverse': {
        post: {
          summary: 'Reverse enforcement action',
          description: 'Reverse a previously applied enforcement action',
          operationId: 'reverseEnforcementAction',
          tags: ['Enforcement'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReverseEnforcementRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Action reversed' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Appeals ──────────────────────────────────────────────
      '/appeals': {
        get: {
          summary: 'List appeals',
          description: 'Query user appeals',
          operationId: 'listAppeals',
          tags: ['Appeals'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'approved', 'rejected'] } },
          ],
          responses: {
            '200': { description: 'List of appeals' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/appeals/{id}/resolve': {
        post: {
          summary: 'Resolve appeal',
          description: 'Approve or reject an appeal',
          operationId: 'resolveAppeal',
          tags: ['Appeals'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ResolveAppealRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Appeal resolved' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Risk Signals ─────────────────────────────────────────
      '/risk-signals': {
        get: {
          summary: 'List risk signals',
          description: 'Query raw risk signals',
          operationId: 'listRiskSignals',
          tags: ['Risk Signals'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'List of risk signals' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ─── Risk Scores ──────────────────────────────────────────
      '/risk-scores': {
        get: {
          summary: 'List risk scores',
          description: 'Query risk score history',
          operationId: 'listRiskScores',
          tags: ['Risk Scores'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          ],
          responses: {
            '200': { description: 'List of risk scores' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/risk-scores/user/{userId}': {
        get: {
          summary: 'Get user risk scores',
          description: 'Retrieve current and historical risk scores for a user',
          operationId: 'getUserRiskScores',
          tags: ['Risk Scores'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '200': { description: 'User risk scores' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Admin Users ──────────────────────────────────────────
      '/admin/users': {
        get: {
          summary: 'List admin users',
          description: 'Query admin user accounts',
          operationId: 'listAdminUsers',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of admin users' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          summary: 'Create admin user',
          description: 'Register new admin user',
          operationId: 'createAdminUser',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateAdminUserRequest' },
              },
            },
          },
          responses: {
            '201': { description: 'Admin user created' },
            '400': { $ref: '#/components/responses/BadRequest' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/admin/users/{id}': {
        patch: {
          summary: 'Update admin user',
          description: 'Update admin user details',
          operationId: 'updateAdminUser',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateAdminUserRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Admin user updated' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Admin Rules ──────────────────────────────────────────
      '/admin/rules': {
        get: {
          summary: 'List detection rules',
          description: 'Query all detection and scoring rules',
          operationId: 'listRules',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'List of rules' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          summary: 'Create rule',
          description: 'Create new detection or scoring rule',
          operationId: 'createRule',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateRuleRequest' },
              },
            },
          },
          responses: {
            '201': { description: 'Rule created' },
            '400': { $ref: '#/components/responses/BadRequest' },
          },
        },
      },
      '/admin/rules/{id}': {
        put: {
          summary: 'Update rule',
          description: 'Update rule configuration',
          operationId: 'updateRule',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateRuleRequest' },
              },
            },
          },
          responses: {
            '200': { description: 'Rule updated' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          summary: 'Delete rule',
          description: 'Soft-delete a rule',
          operationId: 'deleteRule',
          tags: ['Admin'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            '204': { description: 'Rule deleted' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // ─── Intelligence ─────────────────────────────────────────
      '/intelligence/leakage': {
        get: {
          summary: 'Get leakage funnel',
          description: 'Retrieve off-platform leakage analytics',
          operationId: 'getLeakageFunnel',
          tags: ['Intelligence'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'lookback_days', in: 'query', schema: { type: 'integer', default: 30 } },
          ],
          responses: {
            '200': { description: 'Leakage funnel data' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/intelligence/network/{userId}': {
        get: {
          summary: 'Get user network graph',
          description: 'Retrieve relationship network for a user',
          operationId: 'getUserNetwork',
          tags: ['Intelligence'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
            { name: 'depth', in: 'query', schema: { type: 'integer', default: 2 } },
          ],
          responses: {
            '200': { description: 'Network graph data' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/intelligence/clusters': {
        get: {
          summary: 'Get fraud clusters',
          description: 'Retrieve detected fraud/collusion clusters',
          operationId: 'getClusters',
          tags: ['Intelligence'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'min_size', in: 'query', schema: { type: 'integer', default: 3 } },
          ],
          responses: {
            '200': { description: 'Cluster data' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ─── Stats ────────────────────────────────────────────────
      '/stats/overview': {
        get: {
          summary: 'Get overview stats',
          description: 'Dashboard overview statistics',
          operationId: 'getStatsOverview',
          tags: ['Stats'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Overview stats' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/stats/v2/kpi': {
        get: {
          summary: 'Get KPI metrics',
          description: 'Key performance indicators',
          operationId: 'getKpiMetrics',
          tags: ['Stats'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'KPI metrics' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/stats/v2/timeline': {
        get: {
          summary: 'Get timeline data',
          description: 'Time-series analytics',
          operationId: 'getTimeline',
          tags: ['Stats'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
          ],
          responses: {
            '200': { description: 'Timeline data' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // ─── Stream ───────────────────────────────────────────────
      '/stream': {
        get: {
          summary: 'Event stream (SSE)',
          description: 'Server-Sent Events stream for real-time updates',
          operationId: 'getEventStream',
          tags: ['Stream'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'SSE stream',
              content: {
                'text/event-stream': { schema: { type: 'string' } },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login',
        },
      },

      schemas: {
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime: { type: 'integer' },
            environment: { type: 'string' },
            checks: { type: 'object' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        CreateUserRequest: {
          type: 'object',
          properties: {
            external_id: { type: 'string' },
            display_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            metadata: { type: 'object' },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            display_name: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string', format: 'email' },
            verification_status: { type: 'string', enum: ['unverified', 'pending', 'verified'] },
            status: { type: 'string', enum: ['active', 'restricted', 'suspended', 'banned'] },
            metadata: { type: 'object' },
          },
        },
        Event: {
          type: 'object',
          required: ['type', 'payload'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            correlation_id: { type: 'string', format: 'uuid' },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'integer', default: 1 },
            payload: { type: 'object' },
          },
        },
        EvaluateRequest: {
          type: 'object',
          required: ['event_type', 'user_id'],
          properties: {
            event_type: { type: 'string' },
            user_id: { type: 'string', format: 'uuid' },
            metadata: { type: 'object' },
          },
        },
        UpdateAlertRequest: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'investigating', 'resolved', 'false_positive'] },
            assigned_to: { type: 'string', format: 'uuid' },
          },
        },
        CreateCaseRequest: {
          type: 'object',
          required: ['title', 'user_id'],
          properties: {
            title: { type: 'string' },
            user_id: { type: 'string', format: 'uuid' },
            description: { type: 'string' },
          },
        },
        UpdateCaseRequest: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['open', 'investigating', 'closed'] },
            notes: { type: 'string' },
          },
        },
        ReverseEnforcementRequest: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string' },
          },
        },
        ResolveAppealRequest: {
          type: 'object',
          required: ['decision', 'reason'],
          properties: {
            decision: { type: 'string', enum: ['approved', 'rejected'] },
            reason: { type: 'string' },
          },
        },
        CreateAdminUserRequest: {
          type: 'object',
          required: ['email', 'password', 'role'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            role: { type: 'string' },
            display_name: { type: 'string' },
          },
        },
        UpdateAdminUserRequest: {
          type: 'object',
          properties: {
            display_name: { type: 'string' },
            role: { type: 'string' },
            is_active: { type: 'boolean' },
          },
        },
        CreateRuleRequest: {
          type: 'object',
          required: ['rule_type', 'name', 'conditions'],
          properties: {
            rule_type: { type: 'string' },
            name: { type: 'string' },
            conditions: { type: 'object' },
            enabled: { type: 'boolean', default: true },
          },
        },
        UpdateRuleRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            conditions: { type: 'object' },
            enabled: { type: 'boolean' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
          },
        },
      },

      responses: {
        BadRequest: {
          description: 'Invalid request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Unauthorized: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        Forbidden: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
  };
}
