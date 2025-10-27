"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listSessions, type Session } from "@/lib/sessions";
import { listTermsBySession, type Term } from "@/lib/terms";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { listPromotionHistory, promotionHistoryExportUrl, type PromotionHistoryRow } from "@/lib/promotions";

interface Filters {
  session_id: string;
  term_id: string;
  school_class_id: string;
}

const initialFilters: Filters = {
  session_id: "",
  term_id: "",
  school_class_id: "",
};

export default function PromotionReportsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [termsCache, setTermsCache] = useState<Record<string, Term[]>>({});
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [rows, setRows] = useState<PromotionHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listPromotionHistory({
        session_id: filters.session_id || undefined,
        term_id: filters.term_id || undefined,
        school_class_id: filters.school_class_id || undefined,
      });
      setRows(response.data ?? []);
      setError(null);
    } catch (err) {
      console.error("Unable to load promotion history", err);
      setError(
        err instanceof Error ? err.message : "Unable to load promotion history.",
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch((err) => console.error("Unable to load sessions", err));
    listClasses()
      .then(setClasses)
      .catch((err) => console.error("Unable to load classes", err));
  }, []);

  useEffect(() => {
    if (filters.session_id && !termsCache[filters.session_id]) {
      listTermsBySession(filters.session_id)
        .then((data) =>
          setTermsCache((prev) => ({
            ...prev,
            [filters.session_id]: data,
          })),
        )
        .catch((err) => console.error("Unable to load terms", err));
    }
  }, [filters.session_id, termsCache]);

  const terms = useMemo(() => {
    if (!filters.session_id) {
      return [];
    }
    return termsCache[filters.session_id] ?? [];
  }, [filters.session_id, termsCache]);

  const exportReports = (format: "csv" | "pdf") => {
    if (rows.length === 0) {
      setError("Load report data before exporting.");
      return;
    }
    const url = promotionHistoryExportUrl(
      {
        session_id: filters.session_id || undefined,
        term_id: filters.term_id || undefined,
        school_class_id: filters.school_class_id || undefined,
      },
      format,
    );
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Promotion Reports</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Promotion Reports</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Filter Promotion History</h3>
            </div>
          </div>

          <div className="row gutters-8 align-items-end mb-3">
            <div className="col-md-4 col-12 form-group">
              <label htmlFor="promotion-session">Session</label>
              <select
                id="promotion-session"
                className="form-control"
                value={filters.session_id}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    session_id: event.target.value,
                    term_id: "",
                  }))
                }
              >
                <option value="">All sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 col-12 form-group">
              <label htmlFor="promotion-term">Term</label>
              <select
                id="promotion-term"
                className="form-control"
                value={filters.term_id}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    term_id: event.target.value,
                  }))
                }
                disabled={!filters.session_id}
              >
                <option value="">All terms</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 col-12 form-group">
              <label htmlFor="promotion-class">Class</label>
              <select
                id="promotion-class"
                className="form-control"
                value={filters.school_class_id}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    school_class_id: event.target.value,
                  }))
                }
              >
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 d-flex justify-content-end mt-2">
              <button
                className="btn btn-outline-secondary mr-2"
                type="button"
                onClick={() => {
                  setFilters(initialFilters);
                  setRows([]);
                  setError(null);
                }}
              >
                Reset
              </button>
              <button
                className="btn btn-gradient-yellow"
                type="button"
                onClick={() => fetchReports().catch(() => undefined)}
              >
                Load Report
              </button>
            </div>
          </div>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <button
                className="btn btn-outline-primary mr-2"
                type="button"
                onClick={() => exportReports("csv")}
                disabled={rows.length === 0}
              >
                Export CSV
              </button>
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => exportReports("pdf")}
                disabled={rows.length === 0}
              >
                Export PDF
              </button>
            </div>
            <div className="text-muted">
              {rows.length ? `${rows.length} record(s)` : ""}
            </div>
          </div>

          <div className="table-responsive">
            <table className="table display text-nowrap">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Performed By</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      Loading promotion history…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No promotion records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, index) => {
                    const timestamp = row.promoted_at ?? row.created_at ?? null;
                    return (
                      <tr key={`report-${row.id ?? index}`}>
                        <td>
                          {timestamp
                            ? new Date(timestamp).toLocaleString()
                            : "—"}
                        </td>
                        <td>{row.student_name ?? ""}</td>
                        <td>{row.from_class ?? ""}</td>
                        <td>{row.to_class ?? ""}</td>
                        <td>{row.performed_by ?? ""}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
