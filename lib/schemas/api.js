'use strict';

const { z } = require('zod');

/** POST /api/notify/signup — activation email + Telegram notify. */
const notifySignupBodySchema = z
  .object({
    type: z.enum(['person', 'company']).optional(),
    skipEmail: z.boolean().optional(),
    firstName: z.string().max(100).optional(),
    surname: z.string().max(100).optional(),
    email: z.string().min(1).max(320),
    dob: z.union([z.string(), z.null()]).optional(),
    mobile: z.string().max(40).optional(),
    landline: z.union([z.string(), z.null()]).optional(),
    address: z.union([z.string(), z.null()]).optional(),
    bankDetails: z.union([z.string(), z.null()]).optional(),
    companyName: z.union([z.string(), z.null()]).optional(),
    companyNumber: z.union([z.string(), z.null()]).optional(),
    companyContactNumber: z.union([z.string(), z.null()]).optional(),
    companyPrincipalContact: z.union([z.string(), z.null()]).optional()
  })
  .strict();

/** POST /api/account/request-deletion */
const accountDeletionBodySchema = z
  .object({
    confirmPhrase: z.string().max(120),
    password: z.string().max(2048).optional()
  })
  .strict();

/** PATCH /api/me — only known profile keys; no account email change here. */
const profilePatchBodySchema = z
  .object({
    firstName: z.string().optional(),
    surname: z.string().optional(),
    dob: z.union([z.string(), z.null()]).optional(),
    mobile: z.string().optional(),
    landline: z.union([z.string(), z.null()]).optional(),
    contactEmail: z.union([z.string(), z.null()]).optional(),
    address: z.string().optional(),
    bankDetails: z.union([z.string(), z.null()]).optional(),
    companyName: z.string().optional(),
    companyNumber: z.string().optional(),
    companyContactNumber: z.union([z.string(), z.null()]).optional(),
    companyPrincipalContact: z.union([z.string(), z.null()]).optional()
  })
  .strict();

/** POST /api/claim-account */
const claimAccountBodySchema = z
  .object({
    token: z.string().min(1).max(256),
    password: z.string().min(1).max(2048),
    confirmPassword: z.string().max(2048).optional()
  })
  .strict();

const lineItemInputSchema = z
  .object({
    price: z.union([z.number(), z.string()]).optional(),
    name: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(),
    id: z.union([z.string(), z.number()]).optional(),
    productId: z.union([z.string(), z.number()]).optional()
  })
  .passthrough();

/** POST /api/create-checkout-session */
const createCheckoutSessionBodySchema = z
  .object({
    priceId: z.string().max(200).optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    lineItems: z.array(lineItemInputSchema).max(200).optional(),
    guestEmail: z.string().max(320).optional(),
    guestName: z.string().max(200).optional(),
    guestPhone: z.string().max(40).optional(),
    shippingAddress: z.record(z.string(), z.unknown()).optional(),
    locale: z.enum(['en', 'fa']).optional(),
    fulfillmentType: z.enum(['collection', 'delivery']).optional(),
    pendingOrderId: z.string().max(200).optional()
  })
  .strict();

/** POST /api/orders/guest-cancel, guest-resume-checkout */
const guestOrderTokenBodySchema = z
  .object({
    token: z.string().min(10).max(512),
    locale: z.enum(['en', 'fa']).optional()
  })
  .strict();

/** POST /api/orders/:orderId/resume-checkout */
const resumeCheckoutBodySchema = z
  .object({
    locale: z.enum(['en', 'fa']).optional()
  })
  .strict();

/** POST /api/orders/confirm-by-session/:sessionId — no fields expected. */
const emptyJsonBodySchema = z.object({}).strict();

/** GET /api/orders/guest-lookup */
const guestLookupQuerySchema = z
  .object({
    email: z.string().min(1).max(320),
    order_id: z.string().min(1).max(120)
  })
  .strict();

module.exports = {
  notifySignupBodySchema,
  accountDeletionBodySchema,
  profilePatchBodySchema,
  claimAccountBodySchema,
  createCheckoutSessionBodySchema,
  guestOrderTokenBodySchema,
  resumeCheckoutBodySchema,
  emptyJsonBodySchema,
  guestLookupQuerySchema
};
