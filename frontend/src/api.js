// Keep browser-to-backend requests here. Never put API keys in frontend code.
export async function getGreeting(name) {
  const response = await fetch(`/api/hello?name=${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error("The connection did not complete. Please try again.");
  return response.json();
}
