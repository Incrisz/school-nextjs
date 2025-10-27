"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { updateUserProfile, type UpdateUserPayload } from "@/lib/auth";

export default function EditAdminProfilePage() {
  const router = useRouter();
  const { user, refreshAuth } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
    }
  }, [user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password && password !== passwordConfirmation) {
      setError("New passwords do not match.");
      return;
    }

    const payload: UpdateUserPayload = {
      name,
      email,
    };

    if (password) {
      payload.old_password = oldPassword || undefined;
      payload.password = password;
      payload.password_confirmation = passwordConfirmation;
    }

    setSubmitting(true);
    try {
      await updateUserProfile(payload);
      setOldPassword("");
      setPassword("");
      setPasswordConfirmation("");

      await refreshAuth();
      router.push("/v10/profile");
    } catch (err) {
      console.error("Failed to update admin profile", err);
      setError(
        err instanceof Error ? err.message : "Unable to update profile.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Edit Admin Profile</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Edit Profile</li>
        </ul>
      </div>

      {error ? (
        <div id="error-container" className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Edit Admin Profile</h3>
                </div>
                <div className="dropdown">
                  <a
                    className="dropdown-toggle"
                    href="#"
                    role="button"
                    data-toggle="dropdown"
                    aria-expanded="false"
                  >
                    ...
                  </a>

                  <div className="dropdown-menu dropdown-menu-right">
                    <button className="dropdown-item" type="button">
                      <i className="fas fa-times text-orange-red" />
                      Close
                    </button>
                    <Link className="dropdown-item" href="/v10/profile">
                      <i className="fas fa-eye text-dark-pastel-green" />
                      View
                    </Link>
                  </div>
                </div>
              </div>

              <form
                id="admin-profile-form"
                className="new-added-form"
                onSubmit={handleSubmit}
              >
                <div className="row">
                  <div className="col-xl-6 col-lg-6 col-12 form-group">
                    <label htmlFor="admin-name">Name *</label>
                    <input
                      id="admin-name"
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-xl-6 col-lg-6 col-12 form-group">
                    <label htmlFor="admin-email">Email *</label>
                    <input
                      id="admin-email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="col-xl-6 col-lg-6 col-12 form-group">
                    <label htmlFor="old-password">Old Password</label>
                    <input
                      id="old-password"
                      type="password"
                      className="form-control"
                      placeholder="Leave blank to keep current password"
                      value={oldPassword}
                      onChange={(event) => setOldPassword(event.target.value)}
                    />
                  </div>
                  <div className="col-xl-6 col-lg-6 col-12 form-group">
                    <label htmlFor="password">New Password</label>
                    <input
                      id="password"
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                  </div>
                  <div className="col-xl-6 col-lg-6 col-12 form-group">
                    <label htmlFor="password-confirmation">
                      Confirm New Password
                    </label>
                    <input
                      id="password-confirmation"
                      type="password"
                      className="form-control"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                    />
                  </div>
                  <div className="col-12 form-group mg-t-8">
                    <button
                      type="submit"
                      className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                      disabled={submitting}
                    >
                      {submitting ? "Saving..." : "Save"}
                    </button>
                    <Link
                      href="/v10/profile"
                      className="btn-fill-lg bg-blue-dark btn-hover-yellow"
                    >
                      Cancel
                    </Link>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <footer className="footer-wrap-layout1">
        <div className="copyright">
          © Copyrights <a href="#">Cyfamod Technologies</a> 2026. All rights
          reserved.
        </div>
      </footer>
    </>
  );
}
