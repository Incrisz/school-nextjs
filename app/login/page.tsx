"use client";

import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

const passthroughLoader: ImageLoader = ({ src }) => src;

export default function LoginPage() {
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
          <Suspense fallback={<div className="text-center py-4">Loading…</div>}>
            <LoginForm />
          </Suspense>
        </div>
        <div className="sign-up">
          Don&apos;t your School have an account ?{" "}
          <Link href="/register">Create One now!</Link>
        </div>
        <div className="text-center mt-3 text-muted">
          {/* Placeholder for backend URL if needed */}
        </div>
      </div>
    </div>
  );
}
