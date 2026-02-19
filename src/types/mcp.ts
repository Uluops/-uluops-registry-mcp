/**
 * MCP-specific types for tool responses
 */

export interface McpTextContent {
  type: 'text';
  text: string;
}

export interface McpToolResponse {
  content: McpTextContent[];
  isError?: boolean;
}

/**
 * Create a successful MCP tool response.
 * Handles void/undefined SDK responses (e.g., delete operations).
 */
/** JSON replacer that converts BigInt to string to prevent serialization errors. */
function safeReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function createSuccessResponse(data: unknown): McpToolResponse {
  const text =
    data === undefined || data === null
      ? JSON.stringify({ success: true })
      : JSON.stringify(data, safeReplacer, 2);
  return {
    content: [{ type: 'text', text }],
  };
}

/**
 * Create an error MCP tool response
 */
export function createErrorResponse(message: string): McpToolResponse {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ error: message }),
      },
    ],
    isError: true,
  };
}
