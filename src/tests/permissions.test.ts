import { describe, it, expect } from 'vitest';
import { WorkspaceRole } from '../types/crm.types';

describe('RBAC Authorization Rules Matrix', () => {
  const canManageWorkspace = (role: WorkspaceRole): boolean => {
    return role === 'owner' || role === 'admin';
  };

  const canDeleteRecords = (role: WorkspaceRole): boolean => {
    return role === 'owner' || role === 'admin' || role === 'manager';
  };

  const canCreateRecords = (_role: WorkspaceRole): boolean => {
    // All authenticated workspace members can create contacts, deals, tasks, activities
    return true;
  };

  it('permits workspace management only to owners and admins', () => {
    expect(canManageWorkspace('owner')).toBe(true);
    expect(canManageWorkspace('admin')).toBe(true);
    expect(canManageWorkspace('manager')).toBe(false);
    expect(canManageWorkspace('sales_rep')).toBe(false);
  });

  it('restricts record deletion to managers and above', () => {
    expect(canDeleteRecords('owner')).toBe(true);
    expect(canDeleteRecords('admin')).toBe(true);
    expect(canDeleteRecords('manager')).toBe(true);
    expect(canDeleteRecords('sales_rep')).toBe(false);
  });

  it('allows all authorized workspace roles to create records', () => {
    expect(canCreateRecords('owner')).toBe(true);
    expect(canCreateRecords('admin')).toBe(true);
    expect(canCreateRecords('manager')).toBe(true);
    expect(canCreateRecords('sales_rep')).toBe(true);
  });
});
