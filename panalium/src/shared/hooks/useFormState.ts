import { useCallback, useState, type ChangeEvent } from "react"

type ControlEvent = ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
type StringKeys<T,> = {
  [K in keyof T]: T[K] extends string ? K : never
}[keyof T]

/**
 * Minimal controlled-form helper.
 * `bind("email")` returns `{ value, onChange }` ready to spread on an input.
 */
export function useFormState<T extends object>(initial: T) {
  const [form, setForm] = useState<T>(initial)

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const bind = useCallback(
    (key: StringKeys<T>) => ({
      value: form[key] as unknown as string,
      onChange: (e: ControlEvent) =>
        setField(key, e.target.value as T[typeof key]),
    }),
    [form, setField],
  )

  const reset = useCallback(() => setForm(initial), [initial])

  return { form, setForm, setField, bind, reset }
}
