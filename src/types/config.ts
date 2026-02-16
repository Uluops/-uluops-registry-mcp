/**
 * Configuration types for registry MCP client
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ApiClientConfig {
  /** Base URL for the registry API */
  baseUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout: number;
  /** Number of retry attempts (default: 3) */
  retries: number;
}

export interface ServerConfig {
  /** MCP server name */
  name: string;
  /** MCP server version */
  version: string;
}

export interface SecurityConfig {
  /** Log level for structured logging */
  logLevel: LogLevel;
  /** Enable file logging */
  enableLogging: boolean;
  /** Directory for log files */
  logDir?: string;
  /** Enable verbose security decision logging */
  verboseLogging: boolean;
  /** Enable performance metrics logging */
  logPerformanceMetrics: boolean;
}

export interface RegistryMcpConfig {
  api: ApiClientConfig;
  server: ServerConfig;
  security: SecurityConfig;
}
