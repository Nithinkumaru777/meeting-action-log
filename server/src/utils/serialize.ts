import type { Schema } from 'mongoose';

type Plain = Record<string, unknown>;

function rename(ret: Plain): Plain {
  if (ret._id !== undefined) ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;
  return ret;
}

/** Makes `doc.toJSON()` / `res.json(doc)` emit `id` (string) and drop `_id` / `__v`. */
export function applyToJsonTransform(schema: Schema): void {
  schema.set('toJSON', {
    versionKey: false,
    transform: (_doc: unknown, ret: Plain) => rename(ret),
  });
}

/** Serializes a hydrated document (via its toJSON) or a lean object to the API shape. */
export function serializeDoc<T extends object>(doc: T): Plain {
  const maybe = doc as { toJSON?: () => Plain };
  if (typeof maybe.toJSON === 'function') return rename({ ...maybe.toJSON() });
  return rename({ ...(doc as Plain) });
}
