/** Postgres schema for ShotGrade tables (same Supabase project as other apps; isolate by schema). */
export const SHOTGRADE_PG_SCHEMA = "shotgrade" as const

export const supabaseDbOptions = {
  db: { schema: SHOTGRADE_PG_SCHEMA },
} as const
