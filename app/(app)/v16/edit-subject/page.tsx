"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSubject, updateSubject } from "@/lib/subjects";

export default function EditSubjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subjectId = searchParams.get("id");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!subjectId) {
      router.replace("/v16/all-subjects");
      return;
    }
    getSubject(subjectId)
      .then((subject) => {
        if (!subject) {
          throw new Error("Subject not found.");
        }
        setName(subject.name ?? "");
        setCode(subject.code ?? "");
        setDescription(subject.description ?? "");
        setError(null);
      })
      .catch((err) => {
        console.error("Unable to load subject", err);
        setError(
          err instanceof Error ? err.message : "Unable to load subject.",
        );
      })
      .finally(() => setLoading(false));
  }, [subjectId, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!subjectId) return;
    setError(null);

    if (!name.trim()) {
      setError("Subject name is required.");
      return;
    }

    setSubmitting(true);
    try {
      await updateSubject(subjectId, {
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
      });
      router.push("/v16/all-subjects");
    } catch (err) {
      console.error("Unable to update subject", err);
      setError(
        err instanceof Error ? err.message : "Unable to update subject.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!subjectId) {
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
        <h3>Subject Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v16/all-subjects">All Subjects</Link>
          </li>
          <li>Edit Subject</li>
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
              <h3>Edit Subject</h3>
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
                />
              </div>
              <div className="col-12 form-group d-flex justify-content-between">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save Changes"}
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
