"use client";

import React from "react";
import {
  useUser,
  SignIn,
  SignUp,
  UserButton,
  OrganizationSwitcher,
  useOrganization,
} from "@clerk/nextjs";

export type UserRole = "admin" | "member" | "viewer";

export type Permission =
  | "creators:view"
  | "creators:edit"
  | "creators:delete"
  | "outreach:view"
  | "outreach:edit"
  | "outreach:delete"
  | "contracts:view"
  | "contracts:edit"
  | "contracts:delete"
  | "companies:view"
  | "companies:edit"
  | "companies:delete"
  | "deals:view"
  | "deals:edit"
  | "deals:delete"
  | "dashboard:view"
  | "settings:manage"
  | "members:invite"
  | "members:manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "creators:view",
    "creators:edit",
    "creators:delete",
    "outreach:view",
    "outreach:edit",
    "outreach:delete",
    "contracts:view",
    "contracts:edit",
    "contracts:delete",
    "companies:view",
    "companies:edit",
    "companies:delete",
    "deals:view",
    "deals:edit",
    "deals:delete",
    "dashboard:view",
    "settings:manage",
    "members:invite",
    "members:manage",
  ],
  member: [
    "creators:view",
    "creators:edit",
    "outreach:view",
    "outreach:edit",
    "contracts:view",
    "contracts:edit",
    "companies:view",
    "companies:edit",
    "deals:view",
    "deals:edit",
    "dashboard:view",
  ],
  viewer: [
    "creators:view",
    "outreach:view",
    "contracts:view",
    "companies:view",
    "deals:view",
    "dashboard:view",
  ],
};

export function useOrganizationRole(): UserRole | undefined {
  const { organization } = useOrganization();
  if (!organization || !organization.publicMetadata) return undefined;
  const role = (organization.publicMetadata.role as UserRole) || undefined;
  return role;
}

export function useRole(): UserRole | undefined {
  const orgRole = useOrganizationRole();
  const { user } = useUser();
  if (orgRole) return orgRole;
  if (!user) return undefined;
  const fallback = (user.publicMetadata?.role as UserRole) || undefined;
  return fallback;
}

export function usePermissions(): Permission[] {
  const role = useRole();
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

export function useHasPermission(permission: Permission): boolean {
  const perms = usePermissions();
  return perms.includes(permission);
}

export const RoleGuard: React.FC<{
  minimumRole?: UserRole;
  children: React.ReactNode;
}> = ({ minimumRole = "viewer", children }) => {
  const role = useRole();
  if (!role) return null;
  const order: UserRole[] = ["viewer", "member", "admin"];
  if (order.indexOf(role) < order.indexOf(minimumRole)) return null;
  return <>{children}</>;
};

export const PermissionGuard: React.FC<{
  permission: Permission;
  children: React.ReactNode;
}> = ({ permission, children }) => {
  const ok = useHasPermission(permission);
  if (!ok) return null;
  return <>{children}</>;
};

export { SignIn, SignUp, UserButton, OrganizationSwitcher };
