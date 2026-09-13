// The backend returns validation errors as either a plain string, or Zod's
// `flatten()` shape ({ formErrors: string[], fieldErrors: Record<string, string[]> }).
// Rendering that object directly as JSX crashes React outright ("objects are
// not valid as a React child") — this always resolves down to a plain string.
export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const data = (err as any)?.response?.data?.error;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    if (Array.isArray(data.formErrors) && data.formErrors.length > 0) {
      return data.formErrors[0];
    }
    if (data.fieldErrors && typeof data.fieldErrors === "object") {
      for (const messages of Object.values(data.fieldErrors)) {
        if (Array.isArray(messages) && messages.length > 0) return messages[0] as string;
      }
    }
  }

  return fallback;
}
