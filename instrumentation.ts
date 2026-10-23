// Validate the environment once when the server boots so misconfiguration fails loudly.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { serverEnv, publicEnv } = await import("./lib/env");
    publicEnv();
    serverEnv();
  }
}
