/** Permission catalogue. Keys are stored in the Permission table and attached to Roles. */
export const PERMISSIONS = {
  "dashboard.view": { group: "General", description: "View dashboard & analytics" },
  "products.read": { group: "Catalog", description: "View products" },
  "products.write": { group: "Catalog", description: "Create, edit, archive products, categories, collections" },
  "inventory.write": { group: "Catalog", description: "Adjust inventory" },
  "orders.read": { group: "Sales", description: "View orders" },
  "orders.write": { group: "Sales", description: "Update order status & notes" },
  "shipping.write": { group: "Sales", description: "Create courier shipments" },
  "customers.read": { group: "Sales", description: "View customers" },
  "discounts.write": { group: "Marketing", description: "Manage coupons & bundles" },
  "reviews.write": { group: "Marketing", description: "Moderate reviews" },
  "content.write": { group: "Content", description: "Edit homepage, media and appearance" },
  "tryon.manage": { group: "Integrations", description: "Configure AI try-on" },
  "settings.write": { group: "Integrations", description: "Payments, couriers, marketing & system settings" },
  "staff.manage": { group: "Admin", description: "Manage staff and roles" },
  "audit.read": { group: "Admin", description: "View audit logs" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as PermissionKey[];

export const DEFAULT_ROLES: { name: string; description: string; permissions: PermissionKey[] }[] = [
  { name: "Owner", description: "Full access", permissions: ALL_PERMISSIONS },
  {
    name: "Store Manager",
    description: "Runs catalog, orders and content",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "staff.manage" && p !== "settings.write"),
  },
  {
    name: "Fulfilment",
    description: "Processes orders and shipments",
    permissions: ["dashboard.view", "orders.read", "orders.write", "shipping.write", "products.read", "inventory.write", "customers.read"],
  },
  {
    name: "Content Editor",
    description: "Edits storefront content",
    permissions: ["dashboard.view", "products.read", "content.write", "reviews.write"],
  },
];
