import type { ReviewPilotRole } from "@/types/roles";

export function canAccessBilling(role: ReviewPilotRole | undefined) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export function canAccessSettings(role: ReviewPilotRole | undefined) {
  return role === "OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
}

export function canManageTeam(role: ReviewPilotRole | undefined) {
  return role === "OWNER" || role === "SUPER_ADMIN";
}

export function canManageWorkspaceSettings(role: ReviewPilotRole | undefined) {
  return role === "OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
}

export function canApproveRecovery(role: ReviewPilotRole | undefined) {
  return (
    role === "OWNER" ||
    role === "MANAGER" ||
    role === "STAFF" ||
    role === "SUPER_ADMIN"
  );
}

export function canAccessAgency(role: ReviewPilotRole | undefined) {
  return role === "OWNER" || role === "MANAGER" || role === "SUPER_ADMIN";
}
