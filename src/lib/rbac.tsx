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
import { ALL_PERMISSIONS, type Permission } from "@/lib/permissions";

export type UserRole = "admin" | "member" | "viewer" | (string & {});
export type { Permission };
export { ALL_PERMISSIONS };

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
  const { user } = useUser();
  if (!role) return [];
  const customPermissions = user?.publicMetadata?.rolePermissions;
  if (role !== "admin" && Array.isArray(customPermissions)) {
    return customPermissions.filter((permission): permission is Permission =>
      ALL_PERMISSIONS.some((item) => item.value === permission)
    );
  }
  return ROLE_PERMISSIONS[role as "admin" | "member" | "viewer"] || ROLE_PERMISSIONS.member;
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
  const effectiveRole = role === "admin" || role === "viewer" ? role : "member";
  if (order.indexOf(effectiveRole) < order.indexOf(minimumRole)) return null;
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
