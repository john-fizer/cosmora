import { ORACLE_MODELS } from "@/lib/oracle/models";

export async function GET() {
  const availability = Object.fromEntries(
    ORACLE_MODELS.map(m => [
      m.id,
      {
        available: Boolean(
          m.envKey === "ANTHROPIC_API_KEY" ? process.env.ANTHROPIC_API_KEY :
          m.envKey === "OPENAI_API_KEY"    ? process.env.OPENAI_API_KEY :
          m.envKey === "GOOGLE_AI_KEY"     ? process.env.GOOGLE_AI_KEY :
          m.envKey === "GROQ_API_KEY"      ? process.env.GROQ_API_KEY :
          false
        ),
      },
    ])
  );
  return Response.json({ availability });
}
