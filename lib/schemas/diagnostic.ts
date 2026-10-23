import { z } from "zod";

export const diagnosticSchema = z.object({
  line: z.number().int().positive(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string().min(1).max(300),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;
