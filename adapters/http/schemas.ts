import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});

export const newAccountSchema = z.object({
  email: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
  name: z.string().optional(),
  role: z
    .preprocess(
      (val) => (typeof val === "string" ? val.toUpperCase() : val),
      z.enum(["CUSTOMER", "VENDOR"])
    )
    .optional()
    .default("CUSTOMER"),
});

export const createUserSchema = z.object({
  email: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
  name: z.string().optional(),
  role: z.enum(["USER", "CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"]).optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const createVendorSchema = z.object({
  name: z.string().min(1, "Required"),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const createProductSchema = z.object({
  reference: z.string().min(1, "Required"),
  vendorId: z.string().min(1, "Required"),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
});

export const createOrderSchema = z.object({
  product_list: z.array(z.string().min(1)).min(1, "At least one product is required"),
  userId: z.string().optional(),
});

export const updateDeliverySchema = z.object({
  status: z.string().min(1, "Required"),
  deliveryDate: z.string().optional(),
});

export const createLogSchema = z.object({
  message: z.string().min(1, "Required"),
  level: z.string().optional(),
  timestamp: z.string().optional(),
});

// ---- Request DTOs: the validated shape of each request body -----------------
// Routes parse with these schemas (parseOrThrow), then pass the result to the
// core as a command (core/application/commands.ts), converting where the wire
// format differs (e.g. `product_list` → `products`, date strings → Date).

export type LoginInput = z.infer<typeof loginSchema>;
export type NewAccountInput = z.infer<typeof newAccountSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateDeliveryInput = z.infer<typeof updateDeliverySchema>;
export type CreateLogInput = z.infer<typeof createLogSchema>;
