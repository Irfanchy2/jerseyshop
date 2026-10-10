import type { ShipmentStatus } from "@prisma/client";

export type ShipmentRequest = {
  invoice: string; // our order number — used as merchant reference
  recipientName: string;
  recipientPhone: string;
  altPhone?: string | null;
  recipientEmail?: string | null;
  address: string;
  district: string;
  area: string;
  codAmountMinor: number;
  itemCount: number;
  itemDescription: string;
  note?: string | null;
  weightKg?: number;
  pathao?: { cityId: number; zoneId: number; areaId?: number | null } | null;
};

export type ShipmentResult = {
  consignmentId: string;
  trackingCode: string | null;
  providerStatus: string;
  deliveryFeeMinor: number | null;
  raw: unknown;
};

export type StatusResult = { providerStatus: string; status: ShipmentStatus | null; raw: unknown };

export interface CourierAdapter {
  code: "steadfast" | "pathao";
  createShipment(req: ShipmentRequest): Promise<ShipmentResult>;
  getStatus(ref: { consignmentId: string; trackingCode?: string | null; invoice: string }): Promise<StatusResult>;
  testConnection(): Promise<{ ok: boolean; message: string; details?: Record<string, unknown> }>;
}

export class CourierError extends Error {
  constructor(message: string, public httpStatus?: number, public retryable = false, public details?: unknown) {
    super(message);
  }
}
