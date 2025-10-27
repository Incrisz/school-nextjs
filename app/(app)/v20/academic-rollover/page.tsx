"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { listSessions, type Session } from "@/lib/sessions";
import { listTermsBySession } from "@/lib/terms";
import { processAcademicRollover } from "@/lib/promotions";

interface FormState {
  source_session_id: string;
  new_session_name: string;
  new_session_start: string;
  new_session_end: string;
  notes: string;
}

const initialState: FormState = {
  source_session_id: "",
  new_session_name: "",
  new_session_start: "",
  new_session_end: "",
  notes: "",
};

interface PreviewTerm {
  name: string;
  proposed_start: string;
  proposed_end: string;
}

export default function AcademicRolloverPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [form, setForm] = useState<FormState>(initialState);
  const [preview, setPreview] = useState<PreviewTerm[] | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "info" | "warning" | "danger"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch((err) => console.error("Unable to load sessions", err));
  }, []);

  const handlePreview = async () => {
    setFeedback(null);
    setPreview(null);

    if (!form.source_session_id) {
      setFeedback({ type: "warning", message: "Select the source session." });
      return;
    }
    if (!form.new_session_name.trim()) {
      setFeedback({ type: "warning", message: "Enter the new session name." });
      return;
    }

    try {
      const terms = await listTermsBySession(form.source_session_id);
      if (!terms.length) {
        setPreview([]);
        setFeedback({ type: "info", message: "Source session has no terms to preview." });
        return;
      }

      const startDate = form.new_session_start ? new Date(form.new_session_start) : null;
      const endDate = form.new_session_end ? new Date(form.new_session_end) : null;

      const generated = terms.map((term, index) => {
        if (!startDate || !endDate) {
          return {
            name: term.name,
            proposed_start: "—",
            proposed_end: "—",
          };
        }
        const duration = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / terms.length));
        const termStart = new Date(startDate.getTime() + duration * index);
        const termEnd = new Date(startDate.getTime() + duration * (index + 1));
        return {
          name: term.name,
          proposed_start: termStart.toISOString().slice(0, 10),
          proposed_end: termEnd.toISOString().slice(0, 10),
        };
      });

      setPreview(generated);
      setFeedback({ type: "info", message: "Preview generated. Review before confirming rollover." });
    } catch (err) {
      console.error("Preview error", err);
      setFeedback({
        type: "danger",
        message: err instanceof Error ? err.message : "Unable to generate preview.",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);

    if (!form.source_session_id) {
      setFeedback({ type: "warning", message: "Select the source session." });
      return;
    }
    if (!form.new_session_name.trim()) {
      setFeedback({ type: "warning", message: "Enter the new session name." });
      return;
    }
    if (!form.new_session_start || !form.new_session_end) {
      setFeedback({ type: "warning", message: "Provide start and end dates for the new session." });
      return;
    }
    if (new Date(form.new_session_start) >= new Date(form.new_session_end)) {
      setFeedback({ type: "warning", message: "End date must be after the start date." });
      return;
    }

    if (!window.confirm("This will create a new academic session. Continue?")) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await processAcademicRollover({
        source_session_id: form.source_session_id,
        new_session_name: form.new_session_name.trim(),
        new_session_start: form.new_session_start,
        new_session_end: form.new_session_end,
        notes: form.notes.trim() || null,
      });
      setFeedback({
        type: "success",
        message: response.message ?? "Academic year rollover completed successfully.",
      });
      setPreview(null);
      setForm(initialState);
    } catch (err) {
      console.error("Rollover error", err);
      setFeedback({
        type: "danger",
        message: err instanceof Error ? err.message : "Rollover failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const previewRows = useMemo(() => {
    if (!preview) {
      return null;
    }
    if (preview.length === 0) {
      return (
        <tr>
          <td colSpan={3} className="text-center">
            Source session has no terms to clone.
          </td>
        </tr>
      );
    }
    return preview.map((row, index) => (
      <tr key={`preview-${index}`}>
        <td>{row.name}</td>
        <td>{row.proposed_start}</td>
        <td>{row.proposed_end}</td>
      </tr>
    ));
  }, [preview]);

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Academic Year Rollover</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Academic Rollover</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Create New Academic Session</h3>
            </div>
          </div>

          {feedback ? (
            <div className={`alert alert-${feedback.type}`} role="alert">
              {feedback.message}
            </div>
          ) : null}

          <form id="rollover-form" onSubmit={handleSubmit}>
            <div className="row gutters-8">
              <div className="col-lg-4 col-12 form-group">
                <label htmlFor="rollover-source-session">Source Session *</label>
                <select
                  id="rollover-source-session"
                  className="form-control"
                  value={form.source_session_id}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      source_session_id: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-4 col-12 form-group">
                <label htmlFor="rollover-new-session-name">New Session Name *</label>
                <input
                  id="rollover-new-session-name"
                  type="text"
                  className="form-control"
                  value={form.new_session_name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      new_session_name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-lg-4 col-12 form-group">
                <label htmlFor="rollover-notes">Notes</label>
                <input
                  id="rollover-notes"
                  type="text"
                  className="form-control"
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="col-lg-4 col-12 form-group">
                <label htmlFor="rollover-new-session-start">Start Date *</label>
                <input
                  id="rollover-new-session-start"
                  type="date"
                  className="form-control"
                  value={form.new_session_start}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      new_session_start: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-lg-4 col-12 form-group">
                <label htmlFor="rollover-new-session-end">End Date *</label>
                <input
                  id="rollover-new-session-end"
                  type="date"
                  className="form-control"
                  value={form.new_session_end}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      new_session_end: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="d-flex justify-content-between mt-3">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handlePreview}
              >
                Preview Term Dates
              </button>
              <button
                type="submit"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                disabled={submitting}
              >
                {submitting ? "Processing…" : "Run Rollover"}
              </button>
            </div>
          </form>

          {preview ? (
            <div className="card mt-4">
              <div className="card-body">
                <h5 className="card-title">Term Preview</h5>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th>Proposed Start</th>
                        <th>Proposed End</th>
                      </tr>
                    </thead>
                    <tbody>{previewRows}</tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
