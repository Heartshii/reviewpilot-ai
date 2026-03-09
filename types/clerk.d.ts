import type { ReviewPilotRole } from "./roles";

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: ReviewPilotRole;
    };
  }
}
