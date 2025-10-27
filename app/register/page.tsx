"use client";

import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL } from "@/lib/config";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    address: "",
    subdomain: "",
    password: "",
    password_confirmation: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (
    key: keyof typeof formData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (formData.password !== formData.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`${BACKEND_URL}/api/v1/register-school`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          const data = await response.json();
          if (data.errors) {
            const firstError = Object.values<string[]>(data.errors).flat()[0];
            throw new Error(firstError ?? "Unable to register school.");
          }
          throw new Error(data.message ?? "Unable to register school.");
        }
        throw new Error(
          `Registration failed. Server returned status: ${response.status}.`,
        );
      }

      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to register. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <form id="register-form" className="login-form" onSubmit={handleSubmit}>
            {error ? (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            ) : null}
            <div className="row">
              <div className="col-12">
                <h4>Register Your School</h4>
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="name">School Name *</label>
                <input
                  id="name"
                  type="text"
                  placeholder="Enter school name"
                  className="form-control"
                  required
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="email">School Email *</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter school email"
                  className="form-control"
                  required
                  value={formData.email}
                  onChange={(event) => updateField("email", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="address">Address *</label>
                <input
                  id="address"
                  type="text"
                  placeholder="Enter school address"
                  className="form-control"
                  required
                  value={formData.address}
                  onChange={(event) => updateField("address", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="subdomain">Subdomain *</label>
                <input
                  id="subdomain"
                  type="text"
                  placeholder="Enter your desired subdomain"
                  className="form-control"
                  required
                  value={formData.subdomain}
                  onChange={(event) => updateField("subdomain", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="password">Password *</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  className="form-control"
                  required
                  value={formData.password}
                  onChange={(event) => updateField("password", event.target.value)}
                />
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="password_confirmation">Confirm Password *</label>
                <input
                  id="password_confirmation"
                  type="password"
                  placeholder="Confirm password"
                  className="form-control"
                  required
                  value={formData.password_confirmation}
                  onChange={(event) =>
                    updateField("password_confirmation", event.target.value)
                  }
                />
              </div>
              <div className="col-12 form-group mg-t-8">
                <button type="submit" className="login-btn" disabled={submitting}>
                  {submitting ? "Registering..." : "Register"}
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="sign-up">
          Already have a School ? <Link href="/login">Login now!</Link>
        </div>
      </div>
    </div>
  );
}
  const passthroughLoader: ImageLoader = ({ src }) => src;
