export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { startAllWorkers } = await import("@/lib/queue");
    await startAllWorkers();
  } catch (e) {
    console.warn("[instrumentation] Queue workers failed to start (Redis unavailable?):", e instanceof Error ? e.message : e);
  }
}
