import z from 'zod';

export const CreateUrlValidation = z.object({
  longUrl: z.url('Must be a valid URL').max(2048),
  customAlias: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9-]+$/)
    .optional(),
  expiresAt: z.iso
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const ShortCodeParamsValidation = z.object({
  shortCode: z.string().min(3).max(30),
});
