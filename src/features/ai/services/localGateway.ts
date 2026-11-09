// Local CRM data gateway + tool context for the Demo/offline mode.
// Mirrors the server gateway (same shared tool implementations run against
// crmService's synthetic or real workspace-scoped data).

import { crmService } from '../../../services/crmService';
import { buildCrmDataGateway, CRMDataGateway } from '../../../../supabase/functions/_shared/gateway';
import { ToolContext } from '../../../../supabase/functions/_shared/crmTools';

export function buildLocalGateway(): CRMDataGateway {
  return buildCrmDataGateway(
    {
      fetchWorkspaceRows: async <T,>(table: string, _select: string, workspaceId: string): Promise<T[]> => {
        // crmService applies its own workspace scoping (demo storage or RLS client).
        switch (table) {
          case 'contacts':
            return (await crmService.getContacts(workspaceId)) as unknown as T[];
          case 'deals':
            return (await crmService.getDeals(workspaceId)) as unknown as T[];
          case 'tasks':
            return (await crmService.getTasks(workspaceId)) as unknown as T[];
          case 'activities':
            return (await crmService.getActivities(workspaceId)) as unknown as T[];
          default:
            return [] as unknown as T[];
        }
      },
    },
    'demo-workspace-01'
  );
}

export function createToolContext(
  workspaceId: string,
  locale: 'en' | 'ar',
  createdAt: Date = new Date()
): ToolContext {
  return {
    gateway: buildLocalGateway(),
    workspaceId,
    locale,
    now: createdAt,
    tzOffsetMinutes: new Date().getTimezoneOffset(),
  };
}
