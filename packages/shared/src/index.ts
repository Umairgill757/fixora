/** Shared domain types — single source of truth across web, api, mobile. */

export enum Role {
  CUSTOMER = 'CUSTOMER',
  TECHNICIAN = 'TECHNICIAN',
  BUSINESS_OWNER = 'BUSINESS_OWNER',
  ADMIN = 'ADMIN',
}

/** Booking lifecycle. Money moves only on explicit transitions. */
export enum BookingStatus {
  QUOTED = 'QUOTED',
  PAID = 'PAID',
  DISPATCHED = 'DISPATCHED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  INVOICED = 'INVOICED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
}

export enum TechnicianVerification {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  iat?: number;
  exp?: number;
}
