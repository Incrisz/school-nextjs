"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listSessions, type Session } from "@/lib/sessions";
import {
  getTerm,
  updateTerm,
  type UpdateTermPayload,
} from "@/lib/terms";

const ALLOWED_TERM_NAMES = ["1st", "2nd", "3rd"] as const;

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const toISODate = (value: string) => value || "";

export default function EditTermPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const termId = searchParams.get("id");

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [form, setForm] = useState<UpdateTermPayload>({
    name: "",
    session: "",
    start_date: "",
    end_date: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!termId) {
      router.replace("/v11/all-terms");
      return;
    }

    Promise.all([listSessions(), getTerm(termId)])
      .then(([sessionsResponse, term]) => {
        setSessions(sessionsResponse);
        if (!term) {
          throw new Error("Unable to load term details.");
        }

        const sessionValue =
          `${term.session_id ?? term.session ?? ""}` || "";
        setSessionId(sessionValue);
        setForm({
          name: term.name ?? "",
          session: sessionValue,
          start_date: formatDateInput(term.start_date),
          end_date: formatDateInput(term.end_date),
        });
      })
      .catch((err) => {
        console.error("Unable to load term", err);
        setError(
          err instanceof Error ? err.message : "Unable to load term details.",
        );
      })
      .finally(() => setLoading(false));
  }, [router, termId]);

  const sessionOptions = useMemo(
    () =>
      sessions.map((session) => ({
        label: session.name,
        value: `${session.id}`,
      })),
    [sessions],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!termId) {
      return;
    }

    setError(null);

    if (!sessionId) {
      setError("Please select a session.");
      return;
    }

    if (!ALLOWED_TERM_NAMES.includes(form.name as (typeof ALLOWED_TERM_NAMES)[number])) {
      setError("Term name must be 1st, 2nd, or 3rd.");
      return;
    }

    setSubmitting(true);
    try {
      await updateTerm(termId, {
        name: form.name,
        session: sessionId,
        start_date: toISODate(form.start_date),
        end_date: toISODate(form.end_date),
      });
      router.push("/v11/all-terms");
    } catch (err) {
      console.error("Unable to update term", err);
      setError(
        err instanceof Error ? err.message : "Unable to update term.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!termId) {
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
        <h3>Edit Academic Term</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v11/all-terms">All Terms</Link>
          </li>
          <li>Edit Term</li>
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
              <h3>Update Term Details</h3>
            </div>
          </div>

          <form className="new-added-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="session-select">Session *</label>
                <select
                  id="session-select"
                  className="form-control"
                  value={sessionId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setSessionId(value);
                    setForm((prev) => ({
                      ...prev,
                      session: value,
                    }));
                  }}
                  required
                >
                  <option value="">Select session</option>
                  {sessionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="term-name">Term Name *</label>
                <select
                  id="term-name"
                  className="form-control"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                >
                  <option value="">Select term name</option>
                  {ALLOWED_TERM_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="start-date">Start Date *</label>
                <input
                  id="start-date"
                  type="date"
                  className="form-control"
                  value={form.start_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      start_date: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="end-date">End Date *</label>
                <input
                  id="end-date"
                  type="date"
                  className="form-control"
                  value={form.end_date}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      end_date: event.target.value,
                    }))
                  }
                  required
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
                  href="/v11/all-terms"
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
