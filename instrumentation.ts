export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startAllWorkers } = await import("@/lib/queue");
  await startAllWorkers();
}
