// Thin adapter over the SHARED tool implementations (supabase/functions/_shared).
// The exact same execution code runs server-side inside the edge function.
// The browser never fetches CRM rows outside the workspace boundary here: in
// connected mode, execution happens entirely server-side; this file serves the
// demo/offline engine against crmService data.

import { ToolExecutionPayload } from '../../../../supabase/functions/_shared/types';
import { ToolName } from '../../../../supabase/functions/_shared/types';
import {
  executeSharedTool,
  REGISTERED_TOOL_NAMES,
  isRegisteredTool,
} from '../../../../supabase/functions/_shared/crmTools';
import { createToolContext } from './localGateway';

export interface ToolExecutionResult {
  toolName: ToolName;
  data: unknown;
  evidence: ToolExecutionPayload['evidence'];
  explanation: string;
}

export class CRMToolRegistry {
  /**
   * Executes a registered read-only CRM tool with workspace boundary enforcement.
   * Demo/offline mode only — connected mode routes tool execution server-side.
   */
  static async executeTool(
    toolName: ToolName,
    args: Record<string, unknown>,
    workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<ToolExecutionResult> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required for authorized tool execution');
    }
    const ctx = createToolContext(workspaceId, locale);
    const payload = await executeSharedTool(toolName, args, ctx);
    return {
      toolName: payload.toolName,
      data: payload.data,
      evidence: payload.evidence,
      explanation: payload.explanation,
    };
  }
}

export const REGISTERED_TOOLS = REGISTERED_TOOL_NAMES;
export { isRegisteredTool };
