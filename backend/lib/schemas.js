/**
 * Zod Schemas for Request & Response Validation
 * Owner: Ivan (Backend Engineer)
 *
 * Implements defenses for:
 * - Attack 5: Type confusion, oversized arrays, invalid enums, unbounded strings
 * - Attack 8: Strip unknown fields to prevent mass assignment / parameter injection
 *
 * Authoritative reference: /contracts/contract.json & /contracts/contract.md
 */

const { z } = require('zod');

/**
 * FormField Schema
 * Represents a single detected form input element on the client page.
 * Strips any unlisted / unknown properties.
 */
const FormFieldSchema = z
  .object({
    id: z
      .string({ required_error: 'Field id is required' })
      .min(1, 'Field id cannot be empty')
      .max(64, 'Field id cannot exceed 64 characters'),
    label: z
      .string({ required_error: 'Field label is required' })
      .max(200, 'Field label cannot exceed 200 characters'),
    type: z.enum(
      [
        'text',
        'email',
        'tel',
        'number',
        'date',
        'select',
        'radio',
        'checkbox',
        'textarea',
        'file'
      ],
      {
        errorMap: () => ({
          message:
            'Field type must be one of: text, email, tel, number, date, select, radio, checkbox, textarea, file'
        })
      }
    ),
    required: z.boolean().optional().default(false),
    options: z
      .array(z.string().max(100, 'Option string cannot exceed 100 characters'))
      .max(50, 'Cannot exceed 50 options')
      .optional()
      .default([]),
    hint: z
      .string()
      .max(200, 'Field hint cannot exceed 200 characters')
      .optional()
      .default('')
  })
  .strip(); // Strips any extra/injected fields (Attack 8)

/**
 * AnalyzeFormRequest Schema
 * Validates the request payload for POST /analyze-form.
 * Strips unknown root keys.
 */
const AnalyzeFormRequestSchema = z
  .object({
    language: z.enum(['en', 'kn', 'hi'], {
      errorMap: () => ({
        message: 'Language must be one of: en, kn, hi'
      })
    }),
    pageTitle: z
      .string()
      .max(200, 'pageTitle cannot exceed 200 characters')
      .optional()
      .default(''),
    fields: z
      .array(FormFieldSchema, {
        required_error: 'fields array is required'
      })
      .min(1, 'fields array must contain at least 1 field')
      .max(100, 'fields array cannot exceed 100 fields')
  })
  .strip(); // Strips unknown root keys (Attack 8)

/**
 * AnalyzeFormFieldResponse Schema
 * Validates the structured analysis for a single field in the response.
 */
const AnalyzeFormFieldResponseSchema = z
  .object({
    id: z.string().max(64),
    explanation: z.string().max(500),
    explanationLocal: z.string().max(500),
    example: z.string().max(200),
    sourceDocument: z.string().max(100)
  })
  .strip();

/**
 * RequiredDocument Schema
 * Validates document checklist items in the response.
 */
const RequiredDocumentSchema = z
  .object({
    name: z.string().max(100),
    why: z.string().max(300)
  })
  .strip();

/**
 * AnalyzeFormResponse Schema
 * Contract-compliant structure for POST /analyze-form responses.
 */
const AnalyzeFormResponseSchema = z
  .object({
    fields: z.array(AnalyzeFormFieldResponseSchema),
    requiredDocuments: z.array(RequiredDocumentSchema)
  })
  .strip();

module.exports = {
  FormFieldSchema,
  AnalyzeFormRequestSchema,
  AnalyzeFormFieldResponseSchema,
  RequiredDocumentSchema,
  AnalyzeFormResponseSchema
};
