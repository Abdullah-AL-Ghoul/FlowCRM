import { crmService } from '../../../services/crmService';
import {
  GroundedEvidence,
  ToolName,
  SearchContactsSchema,
  GetContactSummarySchema,
  GetDealSummarySchema,
  GetTasksSchema,
  GetActivityTimelineSchema,
} from '../types/ai.types';
import { isTaskOverdue, formatCurrency, formatDate } from '../../../lib/utils';

export interface ToolExecutionResult {
  toolName: ToolName;
  data: any;
  evidence: GroundedEvidence[];
  explanation: string;
}

export class CRMToolRegistry {
  /**
   * Executes a registered read-only CRM tool with workspace boundary enforcement
   */
  static async executeTool(
    toolName: ToolName,
    args: Record<string, any>,
    workspaceId: string,
    locale: 'en' | 'ar' = 'en'
  ): Promise<ToolExecutionResult> {
    if (!workspaceId) {
      throw new Error('Workspace ID is required for authorized tool execution');
    }

    switch (toolName) {
      case 'search_contacts': {
        const parsed = SearchContactsSchema.parse(args);
        const contacts = await crmService.getContacts(workspaceId);
        const query = parsed.query.toLowerCase().trim();

        const matches = contacts
          .filter(
            c =>
              c.full_name.toLowerCase().includes(query) ||
              (c.email && c.email.toLowerCase().includes(query)) ||
              (c.company && c.company.toLowerCase().includes(query))
          )
          .slice(0, parsed.limit || 5);

        const evidence: GroundedEvidence[] = matches.map(c => ({
          id: c.id,
          type: 'contact',
          title: c.full_name,
          subtitle: c.company || c.email || undefined,
          route: `/contacts?id=${c.id}`,
          snippet: `${c.status.toUpperCase()} | Rep: ${c.assignee?.full_name || 'Unassigned'}`,
        }));

        return {
          toolName,
          data: matches.map(c => ({
            id: c.id,
            full_name: c.full_name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            job_title: c.job_title,
            status: c.status,
            lead_source: c.lead_source,
            assignee: c.assignee?.full_name || null,
          })),
          evidence,
          explanation:
            matches.length > 0
              ? `Found ${matches.length} matching contact(s).`
              : `No contacts found matching "${parsed.query}".`,
        };
      }

      case 'get_contact_summary': {
        const parsed = GetContactSummarySchema.parse(args);
        const [contacts, deals, tasks, activities] = await Promise.all([
          crmService.getContacts(workspaceId),
          crmService.getDeals(workspaceId),
          crmService.getTasks(workspaceId),
          crmService.getActivities(workspaceId),
        ]);

        const contact = contacts.find(c => c.id === parsed.contactId);
        if (!contact) {
          return {
            toolName,
            data: null,
            evidence: [],
            explanation: `Contact with ID "${parsed.contactId}" does not exist in this workspace.`,
          };
        }

        const relatedDeals = deals.filter(d => d.contact_id === contact.id);
        const relatedTasks = tasks.filter(t => t.contact_id === contact.id);
        const relatedActivities = activities.filter(a => a.contact_id === contact.id);

        const evidence: GroundedEvidence[] = [
          {
            id: contact.id,
            type: 'contact',
            title: contact.full_name,
            subtitle: contact.company || contact.email || undefined,
            route: `/contacts?id=${contact.id}`,
            snippet: `Status: ${contact.status}`,
          },
        ];

        return {
          toolName,
          data: {
            contact: {
              id: contact.id,
              full_name: contact.full_name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              job_title: contact.job_title,
              status: contact.status,
              lead_source: contact.lead_source,
              notes: contact.notes,
              assignee: contact.assignee?.full_name,
            },
            dealsCount: relatedDeals.length,
            deals: relatedDeals.map(d => ({
              id: d.id,
              title: d.title,
              value: formatCurrency(d.value, d.currency, locale),
              stage: d.stage,
              expected_close_date: d.expected_close_date,
            })),
            tasksCount: relatedTasks.length,
            pendingTasks: relatedTasks.filter(t => t.status !== 'completed').map(t => ({
              id: t.id,
              title: t.title,
              due_date: formatDate(t.due_date, locale),
              priority: t.priority,
            })),
            recentActivitiesCount: relatedActivities.length,
          },
          evidence,
          explanation: `Retrieved complete summary for ${contact.full_name}.`,
        };
      }

      case 'get_deal_summary': {
        const parsed = GetDealSummarySchema.parse(args);
        const deals = await crmService.getDeals(workspaceId);
        const deal = deals.find(d => d.id === parsed.dealId);

        if (!deal) {
          return {
            toolName,
            data: null,
            evidence: [],
            explanation: `Opportunity with ID "${parsed.dealId}" not found in this workspace.`,
          };
        }

        const tasks = await crmService.getTasks(workspaceId);
        const dealTasks = tasks.filter(t => t.deal_id === deal.id);

        const evidence: GroundedEvidence[] = [
          {
            id: deal.id,
            type: 'deal',
            title: deal.title,
            subtitle: formatCurrency(deal.value, deal.currency, locale),
            route: `/deals?id=${deal.id}`,
            snippet: `Stage: ${deal.stage.toUpperCase()}`,
          },
        ];

        return {
          toolName,
          data: {
            id: deal.id,
            title: deal.title,
            value: Number(deal.value),
            formattedValue: formatCurrency(deal.value, deal.currency, locale),
            currency: deal.currency,
            stage: deal.stage,
            expected_close_date: deal.expected_close_date,
            contact: deal.contact ? { id: deal.contact.id, name: deal.contact.full_name, company: deal.contact.company } : null,
            assignee: deal.assignee?.full_name || 'Unassigned',
            notes: deal.notes,
            pendingTasksCount: dealTasks.filter(t => t.status !== 'completed').length,
          },
          evidence,
          explanation: `Retrieved opportunity details for ${deal.title}.`,
        };
      }

      case 'get_open_tasks': {
        const parsed = GetTasksSchema.parse(args);
        const tasks = await crmService.getTasks(workspaceId);
        const openTasks = tasks
          .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
          .slice(0, parsed.limit || 10);

        const evidence: GroundedEvidence[] = openTasks.map(t => ({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: formatDate(t.due_date, locale),
          route: `/tasks?id=${t.id}`,
          snippet: `Priority: ${t.priority}`,
        }));

        return {
          toolName,
          data: openTasks.map(t => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            formattedDueDate: formatDate(t.due_date, locale),
            priority: t.priority,
            contactName: t.contact?.full_name || null,
            dealTitle: t.deal?.title || null,
            assignee: t.assignee?.full_name || null,
          })),
          evidence,
          explanation: `Found ${openTasks.length} pending task(s).`,
        };
      }

      case 'get_overdue_tasks': {
        const parsed = GetTasksSchema.parse(args);
        const tasks = await crmService.getTasks(workspaceId);
        const overdueTasks = tasks
          .filter(t => isTaskOverdue(t.due_date, t.status))
          .slice(0, parsed.limit || 10);

        const evidence: GroundedEvidence[] = overdueTasks.map(t => ({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `Overdue since ${formatDate(t.due_date, locale)}`,
          route: `/tasks?id=${t.id}`,
          snippet: `Urgency: ${t.priority}`,
        }));

        return {
          toolName,
          data: overdueTasks.map(t => ({
            id: t.id,
            title: t.title,
            due_date: t.due_date,
            formattedDueDate: formatDate(t.due_date, locale),
            priority: t.priority,
            contactName: t.contact?.full_name || null,
            dealTitle: t.deal?.title || null,
          })),
          evidence,
          explanation: `Found ${overdueTasks.length} overdue task(s) requiring immediate attention.`,
        };
      }

      case 'get_sales_metrics': {
        const metrics = await crmService.getDashboardMetrics(workspaceId);

        const evidence: GroundedEvidence[] = [
          {
            id: 'metric-winrate',
            type: 'metric',
            title: `Win Rate: ${metrics.winRate}%`,
            subtitle: `${metrics.wonDealsCount} Won Opportunities`,
            route: '/reports',
          },
          {
            id: 'metric-pipeline',
            type: 'metric',
            title: `Open Pipeline: ${formatCurrency(metrics.openPipelineValue, 'USD', locale)}`,
            subtitle: `${metrics.activeDealsCount} Active Opportunities`,
            route: '/deals',
          },
        ];

        return {
          toolName,
          data: {
            totalContacts: metrics.totalContacts,
            activeDealsCount: metrics.activeDealsCount,
            openPipelineValue: metrics.openPipelineValue,
            formattedOpenPipelineValue: formatCurrency(metrics.openPipelineValue, 'USD', locale),
            wonDealsCount: metrics.wonDealsCount,
            wonDealsValue: metrics.wonDealsValue,
            formattedWonDealsValue: formatCurrency(metrics.wonDealsValue, 'USD', locale),
            winRate: metrics.winRate,
            tasksDueToday: metrics.tasksDueToday,
            tasksOverdue: metrics.tasksOverdue,
          },
          evidence,
          explanation: `Retrieved authoritative sales metrics for workspace.`,
        };
      }

      case 'get_pipeline_breakdown': {
        const breakdown = await crmService.getPipelineStageBreakdown(workspaceId);

        const evidence: GroundedEvidence[] = [
          {
            id: 'pipeline-breakdown',
            type: 'metric',
            title: 'Pipeline Breakdown by Stage',
            route: '/deals',
          },
        ];

        return {
          toolName,
          data: breakdown.map(b => ({
            stage: b.stage,
            count: b.count,
            totalValue: b.totalValue,
            formattedValue: formatCurrency(b.totalValue, 'USD', locale),
          })),
          evidence,
          explanation: `Retrieved distribution across all 6 pipeline stages.`,
        };
      }

      case 'get_activity_timeline': {
        const parsed = GetActivityTimelineSchema.parse(args);
        const activities = await crmService.getActivities(workspaceId);

        let filtered = activities;
        if (parsed.contactId) {
          filtered = filtered.filter(a => a.contact_id === parsed.contactId);
        }
        if (parsed.dealId) {
          filtered = filtered.filter(a => a.deal_id === parsed.dealId);
        }

        const limited = filtered.slice(0, parsed.limit || 10);

        const evidence: GroundedEvidence[] = limited.map(a => ({
          id: a.id,
          type: 'activity',
          title: a.description,
          subtitle: formatDate(a.occurred_at, locale),
          route: '/activities',
          snippet: a.type.toUpperCase(),
        }));

        return {
          toolName,
          data: limited.map(a => ({
            id: a.id,
            type: a.type,
            description: a.description,
            occurred_at: a.occurred_at,
            formattedDate: formatDate(a.occurred_at, locale),
            userName: a.user?.full_name || 'System',
          })),
          evidence,
          explanation: `Retrieved ${limited.length} activity event(s).`,
        };
      }

      default:
        throw new Error(`Unsupported tool: ${toolName}`);
    }
  }
}
