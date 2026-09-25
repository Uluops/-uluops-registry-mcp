/**
 * MCP Server interface types
 */

import type { ZodRawShape } from 'zod';
import type { McpToolResponse } from './mcp.js';

export type ToolHandler = (args: unknown) => Promise<McpToolResponse>;

/** Exactly one of text or blob — the SDK's ReadResourceResult content union (typed since mcp-secure-server 0.0.24). */
export type ResourceContent =
  | { uri: string; mimeType?: string; text: string }
  | { uri: string; mimeType?: string; blob: string };

export type ResourceResponse = {
  contents: ResourceContent[];
};

export type ResourceHandler = () => Promise<ResourceResponse>;

export type ResourceMetadata = {
  description?: string;
  mimeType?: string;
};

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
