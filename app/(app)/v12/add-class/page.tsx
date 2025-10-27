"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { createClass } from "@/lib/classes";

export default function AddClassPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter a class name.");
      return;
    }

    const schoolId = user?.school?.id;
    if (!schoolId) {
      setError("Unable to determine the current school.");
      return;
    }

    try {
      setSubmitting(true);
      await createClass({
        name: name.trim(),
        school_id: schoolId,
      });
      router.push("/v12/all-classes");
    } catch (err) {
      console.error("Unable to add class", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add class. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Class Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Add New Class</li>
        </ul>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Add New Class</h3>
            </div>
          </div>

          <form className="new-added-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-12 form-group">
                <label htmlFor="class-name">Class Name *</label>
                <input
                  id="class-name"
                  type="text"
                  className="form-control"
                  placeholder="e.g. JSS1"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="col-12 form-group mg-t-8">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save"}
                </button>
                <Link
                  href="/v12/all-classes"
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
