"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createSession } from "@/lib/sessions";

function formatDateToISO(value: string) {
  if (!value) {
    return "";
  }
  const [year, month, day] = value.split("-");
  return `${year}-${month}-${day}`;
}

export default function AddSessionPage() {
  const [formState, setFormState] = useState({
    name: "",
    start_date: "",
    end_date: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (key: "name" | "start_date" | "end_date", value: string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!formState.name || !formState.start_date || !formState.end_date) {
      setError("All fields are required.");
      return;
    }

    try {
      setSubmitting(true);
      await createSession({
        name: formState.name,
        start_date: formatDateToISO(formState.start_date),
        end_date: formatDateToISO(formState.end_date),
      });
      window.alert("Session added successfully!");
      window.location.href = "/v11/all-sessions";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to add session.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Add Academic Session</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v11/all-sessions">All Sessions</Link>
          </li>
          <li>Add Session</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Create New Session</h3>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}

          <form id="add-session-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-xl-6 col-lg-6 col-12 form-group">
                <label htmlFor="session-name">Session Name *</label>
                <input
                  id="session-name"
                  type="text"
                  className="form-control"
                  placeholder="2024/2025"
                  required
                  value={formState.name}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              </div>
              <div className="col-xl-3 col-lg-3 col-12 form-group">
                <label htmlFor="start-date">Start Date *</label>
                <input
                  id="start-date"
                  type="date"
                  className="form-control"
                  required
                  value={formState.start_date}
                  onChange={(event) =>
                    updateField("start_date", event.target.value)
                  }
                />
              </div>
              <div className="col-xl-3 col-lg-3 col-12 form-group">
                <label htmlFor="end-date">End Date *</label>
                <input
                  id="end-date"
                  type="date"
                  className="form-control"
                  required
                  value={formState.end_date}
                  onChange={(event) =>
                    updateField("end_date", event.target.value)
                  }
                />
              </div>
              <div className="col-12 form-group mg-t-8">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submitting}
                >
                  {submitting ? "Saving…" : "Save Session"}
                </button>
                <Link
                  href="/v11/all-sessions"
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
