"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createSubject } from "@/lib/subjects";

export default function AddSubjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await createSubject({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push("/v16/all-subjects");
    } catch (err) {
      console.error("Unable to create subject", err);
      setError(
        err instanceof Error ? err.message : "Unable to create subject.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Subject Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Add Subject</li>
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
              <h3>Add Subject</h3>
            </div>
          </div>

          <form className="new-added-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-xl-4 col-lg-6 col-12 form-group">
                <label htmlFor="subject-name">Subject Name *</label>
                <input
                  id="subject-name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </div>
              <div className="col-xl-4 col-lg-6 col-12 form-group">
                <label htmlFor="subject-code">Subject Code</label>
                <input
                  id="subject-code"
                  type="text"
                  className="form-control"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
              <div className="col-12 form-group">
                <label htmlFor="subject-description">Description</label>
                <textarea
                  id="subject-description"
                  className="textarea form-control"
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="col-12 form-group d-flex justify-content-between">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save Subject"}
                </button>
                <Link
                  href="/v16/all-subjects"
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
