"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getParent,
  updateParent as updateParentRequest,
  type SaveParentPayload,
} from "@/lib/parents";

export default function EditParentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parentId = searchParams.get("id");

  const [form, setForm] = useState<SaveParentPayload>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    occupation: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!parentId) {
      router.replace("/v13/all-parents");
      return;
    }

    getParent(parentId)
      .then((parent) => {
        if (!parent) {
          throw new Error("Parent not found.");
        }
        setForm({
          first_name: parent.first_name ?? "",
          last_name: parent.last_name ?? "",
          phone: parent.phone ?? "",
          email: parent.user?.email ?? parent.email ?? "",
          occupation: parent.occupation ?? "",
          address: parent.address ?? "",
        });
        setError(null);
      })
      .catch((err) => {
        console.error("Unable to load parent", err);
        setError(
          err instanceof Error ? err.message : "Unable to load parent.",
        );
      })
      .finally(() => setLoading(false));
  }, [parentId, router]);

  const handleChange = (key: keyof SaveParentPayload, value: string) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!parentId) {
      return;
    }
    setError(null);

    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      await updateParentRequest(parentId, {
        ...form,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        occupation: form.occupation?.trim() || undefined,
        address: form.address?.trim() || undefined,
      });
      router.push("/v13/all-parents");
    } catch (err) {
      console.error("Unable to update parent", err);
      setError(
        err instanceof Error ? err.message : "Unable to update parent.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!parentId) {
    return null;
  }

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Parent Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v13/all-parents">All Parents</Link>
          </li>
          <li>Edit Parent</li>
        </ul>
      </div>

      {error ? (
        <div id="error-message" className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Edit Parent</h3>
            </div>
          </div>

          <form id="edit-parent-form" className="new-added-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="first_name">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  className="form-control"
                  value={form.first_name}
                  onChange={(event) =>
                    handleChange("first_name", event.target.value)
                  }
                  required
                />
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="last_name">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  className="form-control"
                  value={form.last_name}
                  onChange={(event) =>
                    handleChange("last_name", event.target.value)
                  }
                  required
                />
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="phone">Phone *</label>
                <input
                  id="phone"
                  type="tel"
                  className="form-control"
                  value={form.phone}
                  onChange={(event) =>
                    handleChange("phone", event.target.value)
                  }
                  required
                />
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  value={form.email ?? ""}
                  onChange={(event) =>
                    handleChange("email", event.target.value)
                  }
                />
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="occupation">Occupation</label>
                <input
                  id="occupation"
                  type="text"
                  className="form-control"
                  value={form.occupation ?? ""}
                  onChange={(event) =>
                    handleChange("occupation", event.target.value)
                  }
                />
              </div>
              <div className="col-lg-12 col-12 form-group">
                <label htmlFor="address">Address</label>
                <textarea
                  id="address"
                  className="textarea form-control"
                  rows={3}
                  value={form.address ?? ""}
                  onChange={(event) =>
                    handleChange("address", event.target.value)
                  }
                />
              </div>
              <div className="col-12 form-group mg-t-8">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save Changes"}
                </button>
                <Link
                  href="/v13/all-parents"
                  className="btn-fill-lg bg-blue-dark btn-hover-yellow"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
