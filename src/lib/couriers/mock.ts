import "server-only";
import { randomToken } from "@/lib/crypto";
import type { CourierAdapter } from "./types";

/**
 * MOCK mode: no network calls. Returns clearly-marked fake identifiers (prefixed "MOCK-") so the
 * shipment workflow can be exercised before credentials exist. Mock shipments are labelled as such
 * everywhere in the admin and are never presented as real courier bookings.
 */
export function mockAdapter(code: "steadfast" | "pathao"): CourierAdapter {
  return {
    code,
    async createShipment(r) {
      if (r.recipientPhone === "01000000000") throw new Error("Mock failure: rejected test phone number");
      const id = `MOCK-${code.toUpperCase().slice(0, 2)}-${randomToken(5).toUpperCase()}`;
      return { consignmentId: id, trackingCode: id, providerStatus: "mock_booked", deliveryFeeMinor: null, raw: { mock: true } };
    },
    async getStatus() {
      return { providerStatus: "mock_booked", status: null, raw: { mock: true } };
    },
    async testConnection() {
      return { ok: true, message: "Mock mode — no real courier connection is made." };
    },
  };
}
