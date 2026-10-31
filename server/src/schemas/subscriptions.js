const { z } = require("zod");

const optionalNumber = (min = 0) =>
  z.coerce.number().min(min).nullable().optional();

const optionalDate = z.coerce.date().nullable().optional();

const taxSchema = z.object({
  name: z.string().trim().min(1, "Tax name is required"),
  percentage: z.coerce.number().min(0).max(100),
  isActive: z.boolean().optional().default(true),
});

const discountSchema = z.object({
  name: z.string().trim().min(1, "Discount name is required"),
  type: z.enum(["FIXED", "PERCENT"]),
  value: z.coerce.number().positive(),
  minPurchase: optionalNumber(),
  minQuantity: z.coerce.number().int().min(1).nullable().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  usageLimit: z.coerce.number().int().min(1).nullable().optional(),
  appliesTo: z.enum(["PRODUCT", "SUBSCRIPTION"]),
  productId: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => !data.startDate || !data.endDate || data.endDate >= data.startDate,
  {
    message: "End date must be on or after start date",
    path: ["endDate"],
  }
).refine(
  (data) => data.appliesTo !== "PRODUCT" || Boolean(data.productId),
  {
    message: "Product is required for product-specific discounts",
    path: ["productId"],
  }
);

const subscriptionSchema = z.object({
  customerId: z.string().trim().min(1, "Customer is required"),
  planId: z.string().trim().min(1, "Plan is required"),
  templateId: z.string().trim().nullable().optional(),
  startDate: z.coerce.date(),
  expiryDate: optionalDate,
  paymentTerms: z.enum(["IMMEDIATE", "NET_15", "NET_30", "NET_60"]),
  status: z.enum([
    "DRAFT",
    "QUOTATION",
    "CONFIRMED",
    "ACTIVE",
    "CLOSED",
  ]).optional().default("DRAFT"),
  quotationValidUntil: optionalDate,
  nextBillingDate: optionalDate,
  lines: z.array(z.object({
    productId: z.string().trim().min(1, "Product is required"),
    variantId: z.string().trim().nullable().optional(),
    quantity: z.coerce.number().positive(),
    unitPrice: z.coerce.number().min(0),
    taxId: z.string().trim().nullable().optional(),
  })).min(1, "At least one subscription line is required"),
}).refine(
  (data) => !data.expiryDate || data.expiryDate >= data.startDate,
  {
    message: "Expiry date must be on or after start date",
    path: ["expiryDate"],
  }
);

module.exports = {
  taxSchema,
  discountSchema,
  subscriptionSchema,
};