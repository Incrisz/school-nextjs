import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const studentId = searchParams.get("student_id");

  if (!studentId) {
    return NextResponse.json(
      { message: "student_id is required." },
      { status: 400 },
    );
  }

  const backendUrl = new URL(
    `${BACKEND_URL}/api/v1/students/${studentId}/results/print`,
  );

  const sessionId = searchParams.get("session_id");
  const termId = searchParams.get("term_id");

  if (sessionId) {
    backendUrl.searchParams.set("session_id", sessionId);
  }
  if (termId) {
    backendUrl.searchParams.set("term_id", termId);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? null;

  const proxyHeaders = new Headers({
    Accept: "text/html",
    "X-Requested-With": "XMLHttpRequest",
  });

  if (token) {
    proxyHeaders.set("Authorization", `Bearer ${token}`);
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  if (cookieHeader) {
    proxyHeaders.set("Cookie", cookieHeader);
  }

  const response = await fetch(backendUrl.toString(), {
    headers: proxyHeaders,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response
      .text()
      .catch(() => response.statusText || "Unable to load printable result.");
    return NextResponse.json(
      {
        message:
          message && message.trim().length > 0
            ? message
            : "Unable to load printable result.",
      },
      { status: response.status },
    );
  }

  const html = await response.text();
  const contentType =
    response.headers.get("content-type") ?? "text/html; charset=utf-8";

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": contentType,
    },
  });
}
