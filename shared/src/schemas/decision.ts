import { z } from 'zod';
import { actionBaseFields, prioritySchema } from './action';
import { EMPTY_UPDATE, hasAnyField, isoDateField, objectIdField, optionalText } from './common';

const TEXT = 'Write the decision in at least 5 characters.';

const fields = {
  text: z
    .string({ error: TEXT })
    .trim()
    .min(5, TEXT)
    .max(200, 'Keep the decision under 200 characters.'),
  rationale: optionalText(1000, 'Keep the rationale under 1000 characters.'),
  decidedById: objectIdField('Pick who made this decision.'),
};

export const decisionCreateSchema = z.strictObject({
  ...fields,
  decidedAt: isoDateField().optional(),
});
export const decisionUpdateSchema = z
  .strictObject(fields)
  .partial()
  .refine(hasAnyField, { message: EMPTY_UPDATE });

const { title, description, ownerId, dueDate } = actionBaseFields;
export const decisionConvertTaskItemSchema = z.strictObject({
  title,
  description,
  ownerId,
  dueDate,
  priority: prioritySchema.default('medium'),
});
export const decisionConvertSchema = z.strictObject({
  actions: z
    .array(decisionConvertTaskItemSchema, { error: 'Add at least one task.' })
    .min(1, 'Add at least one task.')
    .max(10, 'Create at most 10 tasks at once.'),
});
export const decisionDismissSchema = z.strictObject({
  reason: optionalText(200, 'Keep the reason under 200 characters.'),
});

export const decisionCreate = decisionCreateSchema;
export const decisionUpdate = decisionUpdateSchema;
export const decisionConvert = decisionConvertSchema;
export const decisionDismiss = decisionDismissSchema;
export type DecisionCreate = z.infer<typeof decisionCreateSchema>;
export type DecisionUpdate = z.infer<typeof decisionUpdateSchema>;
export type DecisionConvert = z.infer<typeof decisionConvertSchema>;
export type DecisionConvertInput = z.input<typeof decisionConvertSchema>;
export type DecisionDismiss = z.infer<typeof decisionDismissSchema>;
