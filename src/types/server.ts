/**
 * MCP Server interface types
 */

import type { ZodRawShape } from 'zod';
import type { McpToolResponse } from './mcp.js';

export type ToolHandler = (args: unknown) => Promise<McpToolResponse>;

export interface ResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface ResourceResponse {
  contents: ResourceContent[];
}

export type ResourceHandler = () => Promise<ResourceResponse>;

export interface ResourceMetadata {
  description?: string;
  mimeType?: string;
}

export interface McpServerToolRegistration {
  tool: (name: string, description: string, schema: ZodRawShape, handler: ToolHandler) => void;
}

export interface McpServerResourceRegistration {
  resource: (
    name: string,
    uri: string,
    metadataOrHandler: ResourceMetadata | ResourceHandler,
    handler?: ResourceHandler
  ) => void;
}

export interface McpServer extends McpServerToolRegistration, McpServerResourceRegistration {}
