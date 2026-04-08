'use strict';

const { z } = require('zod');

/** Check-email (signup pre-check). */
const checkEmailBodySchema = z
  .object({
    email: z.string().min(1).max(320)
  })
  .strict();

/** Email + password login. */
const loginBodySchema = z
  .object({
    email: z.string().min(1).max(320),
    password: z.string().min(1).max(2048)
  })
  .strict();

/** Supabase session → app JWT. */
const authTokenBodySchema = z
  .object({
    accessToken: z.string().min(1).max(12000)
  })
  .strict();

/**
 * Telegram Login Widget POST body (flat). Required fields for hash verification; rest allowed.
 * @see https://core.telegram.org/widgets/login
 */
const telegramAuthBodySchema = z
  .object({
    hash: z.string().min(1),
    id: z.union([z.string(), z.number()]),
    auth_date: z.union([z.string(), z.number()])
  })
  .passthrough();

/** Forgot-password request. */
const forgotPasswordBodySchema = z
  .object({
    email: z.string().min(1).max(320)
  })
  .strict();

/** App-managed reset token flow. */
const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1).max(256),
    newPassword: z.string().min(1).max(2048),
    confirmPassword: z.string().max(2048).optional()
  })
  .strict();

/** Link Telegram synthetic account to real email + password. */
const linkEmailPasswordBodySchema = z
  .object({
    email: z.string().min(1).max(320),
    password: z.string().min(1).max(2048)
  })
  .strict();

/**
 * POST /api/users — shape + bounds; business rules (regex) stay in the route handler.
 */
const signupUsersBodySchema = z
  .object({
    type: z.enum(['person', 'company']),
    firstName: z.string().min(1).max(80),
    surname: z.string().min(1).max(80),
    dob: z.union([z.string(), z.null()]).optional(),
    mobile: z.string().min(1).max(40),
    landline: z.union([z.string(), z.null()]).optional(),
    email: z.string().min(1).max(320),
    bankDetails: z.union([z.string(), z.null()]).optional(),
    address: z.string().min(1).max(300),
    companyName: z.union([z.string(), z.null()]).optional(),
    companyNumber: z.union([z.string(), z.null()]).optional(),
    companyContactNumber: z.union([z.string(), z.null()]).optional(),
    companyPrincipalContact: z.union([z.string(), z.null()]).optional(),
    password: z.string().min(8).max(2048)
  })
  .strict();

module.exports = {
  checkEmailBodySchema,
  loginBodySchema,
  authTokenBodySchema,
  telegramAuthBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
  linkEmailPasswordBodySchema,
  signupUsersBodySchema
};
