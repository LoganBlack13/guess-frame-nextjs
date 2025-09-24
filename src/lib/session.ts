export const HOST_SESSION_COOKIE = "gtf_host_session";

export function createHostSessionCookie(value: string) {
  return {
    name: HOST_SESSION_COOKIE,
    value,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
}
