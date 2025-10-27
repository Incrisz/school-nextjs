"use client";

import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getCookie } from "@/lib/cookies";
import { BACKEND_URL } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });

      const next = searchParams.get("next");
      router.push(next || "/v10/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (loading) {
      return;
    }
    const token = typeof window !== "undefined" ? getCookie("token") : null;
    if (token) {
      router.replace("/v10/dashboard");
    }
  }, [loading, router]);

  return (
    <div className="login-page-wrap">
      <div className="login-page-content">
        <div className="login-box">
          <div className="item-logo">
            <Image
              src="/assets/img/logo2.png"
              alt="logo"
              width={160}
              height={60}
              unoptimized
              loader={passthroughLoader}
              style={{ width: "auto", height: "auto" }}
            />
          </div>
          <form id="login-form" className="login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter email"
                className="form-control"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <i className="far fa-envelope" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                className="form-control"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <i className="fas fa-lock" />
            </div>
            <div className="form-group d-flex align-items-center justify-content-between">
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="remember-me"
                  disabled
                />
                <label htmlFor="remember-me" className="form-check-label">
                  Remember Me
                </label>
              </div>
              <span className="forgot-btn text-muted">Forgot Password?</span>
            </div>
            <div className="form-group">
              <button
                type="submit"
                className="login-btn"
                disabled={submitting || loading}
              >
                {submitting ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
        <div className="sign-up">
          Don&apos;t your School have an account ?{" "}
          <Link href="/register">Create One now!</Link>
        </div>
        <div className="text-center mt-3 text-muted">
          <small>Connecting to: {BACKEND_URL}</small>
        </div>
      </div>
    </div>
  );
}
  const passthroughLoader: ImageLoader = ({ src }) => src;
