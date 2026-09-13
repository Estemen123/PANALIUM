/** Outcome of a user action that can fail with a human-readable message. */
export type ActionResult = { ok: true } | ActionFailure

export interface ActionFailure {
  ok: false
  error: string
}

export const ok: ActionResult = { ok: true }

export function fail(error: string): ActionResult {
  return { ok: false, error }
}
