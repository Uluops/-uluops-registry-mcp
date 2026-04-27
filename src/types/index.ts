/**
 * Type exports for registry MCP client
 */

// Configuration types
export type {
  LogLevel,
  ApiClientConfig,
  ServerConfig,
  SecurityConfig,
  RegistryMcpConfig,
} from './config.js';

// MCP types
export type { McpTextContent, McpToolResponse } from './mcp.js';
export { createSuccessResponse, createErrorResponse } from './mcp.js';

// Server types
export type {
  ToolHandler,
  ResourceContent,
  ResourceResponse,
  ResourceHandler,
  ResourceMetadata,
  McpServerToolRegistration,
  McpServerResourceRegistration,
  McpServer,
} from './server.js';

// Shared Zod schemas for runtime validation
export {
  DefinitionTypeSchema,
  DefinitionStatusSchema,
  DomainSchema,
  AgentTypeSchema,
  VisibilitySchema,
  SortFieldSchema,
  SortOrderSchema,
  ModelTierSchema,
  ModelStatusSchema,
  ChangeTypeSchema,
  AuthorshipTypeSchema,
  ProvenanceInputSchema,
} from './schemas.js';
