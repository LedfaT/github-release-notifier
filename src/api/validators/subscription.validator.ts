import { z } from "zod";

export const createSubscriptionSchema = z.object({
  email: z
    .email("Invalid email format")
    .transform((value) => value.toLowerCase()),
  repository: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, {
      message: "Repository must be in format owner/repo",
    }),
});

export const tokenParamsSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const emailQuerySchema = z.object({
  email: z
    .email("Invalid email format")
    .transform((value) => value.toLowerCase()),
});

export type CreateSubscriptionDto = z.infer<typeof createSubscriptionSchema>;
export type TokenParamsDto = z.infer<typeof tokenParamsSchema>;
export type EmailQueryDto = z.infer<typeof emailQuerySchema>;
