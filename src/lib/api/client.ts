import { z } from "zod";
import { apiFailureSchema, apiSuccessSchema, type ApiFailure } from "@/contracts/api";

export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiFailure["error"] };

export async function readApiResponse<T>(response: Response, dataSchema: z.ZodType<T>): Promise<ApiResult<T>> {
  const payload: unknown = await response.json().catch(() => null);
  const success = apiSuccessSchema(dataSchema).safeParse(payload);
  if (response.ok && success.success) return { data: success.data.data as T, error: null };

  const failure = apiFailureSchema.safeParse(payload);
  if (failure.success) return { data: null, error: failure.data.error };

  return {
    data: null,
    error: { code: response.ok ? "INTERNAL" : "UNAVAILABLE", message: "Unable to complete this request right now." },
  };
}
