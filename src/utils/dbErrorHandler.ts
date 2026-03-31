/**
 * Centralized database/API error handler.
 *
 * Strips internal Supabase details (`hint`, `details`, internal codes) so they
 * are never leaked to the end-user while still logging the full error for
 * developers.
 */

const FRIENDLY_MESSAGES: Record<string, string> = {
  "42501": "Sem permissão para realizar esta ação.",
  "23505": "Registro duplicado. Verifique os dados e tente novamente.",
  "23503": "Registro referenciado não encontrado.",
  "PGRST301": "Sessão expirada. Faça login novamente.",
  "PGRST204": "Nenhum registro encontrado.",
};

const RLS_PATTERN = /row-level security/i;

export interface SafeError {
  /** User-facing message (never contains internal details) */
  message: string;
}

/**
 * Returns a safe, user-friendly error message.
 *
 * Usage:
 * ```ts
 * const { message } = handleDbError(error);
 * toast({ title: "Erro", description: message, variant: "destructive" });
 * ```
 */
export function handleDbError(error: unknown): SafeError {
  // Always log full details for developers
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    console.error("[DB Error]", {
      code: e.code,
      message: e.message,
      hint: e.hint,
      details: e.details,
    });
  } else {
    console.error("[DB Error]", error);
  }

  // Known Supabase/PostgREST error codes
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as Record<string, unknown>).code);
    if (FRIENDLY_MESSAGES[code]) {
      return { message: FRIENDLY_MESSAGES[code] };
    }
  }

  // RLS violation message check
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string" &&
    RLS_PATTERN.test((error as Record<string, unknown>).message as string)
  ) {
    return { message: "Sem permissão para realizar esta ação. Verifique seu acesso." };
  }

  // Generic safe fallback
  return { message: "Ocorreu um erro. Tente novamente." };
}
