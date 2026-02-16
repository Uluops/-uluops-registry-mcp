/**
 * Definition types MCP resource (static)
 */

import type { McpServerResourceRegistration } from '../types/index.js';
import { createResourceResponse } from './response-helpers.js';

const DEFINITION_TYPES = [
  {
    type: 'agent',
    description: 'AI validation or analysis agents with scoring criteria and decision thresholds',
  },
  {
    type: 'command',
    description: 'Single-step CLI commands that invoke one agent with specific parameters',
  },
  {
    type: 'workflow',
    description: 'Multi-phase orchestration pipelines that sequence commands with gates and dependencies',
  },
  {
    type: 'pipeline',
    description: 'Reusable pipeline templates for common validation patterns',
  },
];

export function registerDefinitionTypesResource(
  server: McpServerResourceRegistration
): void {
  server.resource(
    'definition-types',
    'registry://definition-types',
    {
      description: 'Available definition types with descriptions',
      mimeType: 'application/json',
    },
    () => {
      return Promise.resolve(
        createResourceResponse('registry://definition-types', DEFINITION_TYPES)
      );
    }
  );
}
