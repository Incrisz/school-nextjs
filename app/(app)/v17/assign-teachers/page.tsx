"use client";

import Link from "next/link";
import { FormEvent, startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { listAllSubjects, type Subject } from "@/lib/subjects";
import { listStaffForDropdown, type Staff } from "@/lib/staff";
import { listSessions, type Session } from "@/lib/sessions";
import { listTermsBySession, type Term } from "@/lib/terms";
import {
  createSubjectTeacherAssignment,
  deleteSubjectTeacherAssignment,
  listSubjectTeacherAssignments,
  updateSubjectTeacherAssignment,
  type SubjectTeacherAssignment,
  type SubjectTeacherAssignmentListResponse,
} from "@/lib/subjectTeacherAssignments";

interface AssignmentForm {
  subject_id: string;
  staff_id: string;
  session_id: string;
  term_id: string;
}

const initialForm: AssignmentForm = {
  subject_id: "",
  staff_id: "",
  session_id: "",
  term_id: "",
};

interface AssignmentFilters {
  search: string;
  subject_id: string;
  staff_id: string;
  session_id: string;
  term_id: string;
}

const initialFilters: AssignmentFilters = {
  search: "",
  subject_id: "",
  staff_id: "",
  session_id: "",
  term_id: "",
};

type TermsCache = Record<string, Term[]>;

export default function AssignTeachersPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Staff[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [termsCache, setTermsCache] = useState<TermsCache>({});

  const [form, setForm] = useState<AssignmentForm>(initialForm);
  const [filters, setFilters] = useState<AssignmentFilters>(initialFilters);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 10;

  const [data, setData] =
    useState<SubjectTeacherAssignmentListResponse | null>(null);
  const [assignments, setAssignments] = useState<SubjectTeacherAssignment[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ensureTerms = useCallback(
    async (sessionId: string) => {
      if (!sessionId || termsCache[sessionId]) {
        return;
      }
      try {
        const data = await listTermsBySession(sessionId);
        setTermsCache((prev) => ({
          ...prev,
          [sessionId]: data,
        }));
      } catch (error) {
        console.error("Unable to load terms", error);
      }
    },
    [termsCache],
  );

  const termsForForm = useMemo(() => {
    if (!form.session_id) {
      return [];
    }
    return termsCache[form.session_id] ?? [];
  }, [termsCache, form.session_id]);

  const termsForFilter = useMemo(() => {
    if (!filters.session_id) {
      return [];
    }
    return termsCache[filters.session_id] ?? [];
  }, [termsCache, filters.session_id]);

  useEffect(() => {
    listAllSubjects()
      .then(setSubjects)
      .catch((err) => console.error("Unable to load subjects", err));
    listStaffForDropdown()
      .then(setTeachers)
      .catch((err) => console.error("Unable to load staff", err));
    listSessions()
      .then(setSessions)
      .catch((err) => console.error("Unable to load sessions", err));
  }, []);

  useEffect(() => {
    if (form.session_id) {
      ensureTerms(form.session_id).catch((err) => console.error(err));
    }
  }, [form.session_id, ensureTerms]);

  useEffect(() => {
    if (filters.session_id) {
      ensureTerms(filters.session_id).catch((err) => console.error(err));
    }
  }, [filters.session_id, ensureTerms]);

  const fetchAssignments = useCallback(async () => {
    setLoadingList(true);
    try {
      const response = await listSubjectTeacherAssignments({
        page,
        per_page: perPage,
        search: filters.search || undefined,
        subject_id: filters.subject_id || undefined,
        staff_id: filters.staff_id || undefined,
        session_id: filters.session_id || undefined,
        term_id: filters.term_id || undefined,
      });
      setData(response);
      setAssignments(response.data ?? []);
      setListError(null);
    } catch (err) {
      console.error("Unable to load subject/teacher assignments", err);
      setListError(
        err instanceof Error ? err.message : "Unable to load assignments.",
      );
      setData(null);
      setAssignments([]);
    } finally {
      setLoadingList(false);
    }
  }, [filters, page, perPage]);

  useEffect(() => {
    fetchAssignments().catch((err) => console.error(err));
  }, [fetchAssignments]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.subject_id || !form.staff_id || !form.session_id || !form.term_id) {
      setFormError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateSubjectTeacherAssignment(editingId, {
          subject_id: form.subject_id,
          staff_id: form.staff_id,
          session_id: form.session_id,
          term_id: form.term_id,
        });
      } else {
        await createSubjectTeacherAssignment({
          subject_id: form.subject_id,
          staff_id: form.staff_id,
          session_id: form.session_id,
          term_id: form.term_id,
        });
      }
      setEditingId(null);
      setForm(initialForm);
      setPage(1);
      await fetchAssignments();
    } catch (err) {
      console.error("Unable to save assignment", err);
      setFormError(
        err instanceof Error ? err.message : "Unable to save assignment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (assignment: SubjectTeacherAssignment) => {
    setEditingId(assignment.id);
    setFormError(null);

    const sessionId = `${assignment.session_id}`;
    await ensureTerms(sessionId);

    startTransition(() => {
      setForm({
        subject_id: `${assignment.subject_id}`,
        staff_id: `${assignment.staff_id}`,
        session_id: sessionId,
        term_id: `${assignment.term_id}`,
      });
    });
  };

  const handleDelete = async (assignment: SubjectTeacherAssignment) => {
    if (
      !window.confirm(
        `Remove teacher assignment for "${assignment.subject?.name ?? "Subject"}"?`,
      )
    ) {
      return;
    }
    try {
      await deleteSubjectTeacherAssignment(assignment.id);
      if (assignments.length === 1 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
      await fetchAssignments();
    } catch (err) {
      console.error("Unable to delete assignment", err);
      alert(
        err instanceof Error ? err.message : "Unable to delete assignment.",
      );
    }
  };

  const totalPages = data?.last_page ?? 1;

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Teacher Assignments</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Assign Teachers to Subjects</li>
        </ul>
      </div>

  <div className="row">
        <div className="col-lg-5">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>{editingId ? "Edit Assignment" : "Assign Teacher"}</h3>
                </div>
              </div>

              {formError ? (
                <div className="alert alert-danger" role="alert">
                  {formError}
                </div>
              ) : null}

              <form onSubmit={handleSubmit}>
                <div className="row">
                  <div className="col-12 form-group">
                    <label htmlFor="teacher-subject">Subject *</label>
                    <select
                      id="teacher-subject"
                      className="form-control"
                      value={form.subject_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          subject_id: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.code
                            ? `${subject.name} (${subject.code})`
                            : subject.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 form-group">
                    <label htmlFor="teacher-staff">Teacher *</label>
                    <select
                      id="teacher-staff"
                      className="form-control"
                      value={form.staff_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          staff_id: event.target.value,
                        }))
                      }
                      required
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.full_name ??
                            teacher.user?.name ??
                            teacher.email ??
                            `Staff #${teacher.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 form-group">
                    <label htmlFor="teacher-session">Session *</label>
                    <select
                      id="teacher-session"
                      className="form-control"
                      value={form.session_id}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          session_id: value,
                          term_id: "",
                        }));
                      }}
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
                  <div className="col-12 form-group">
                    <label htmlFor="teacher-term">Term *</label>
                    <select
                      id="teacher-term"
                      className="form-control"
                      value={form.term_id}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          term_id: event.target.value,
                        }))
                      }
                      disabled={!form.session_id}
                      required
                    >
                      <option value="">Select term</option>
                      {termsForForm.map((term) => (
                        <option key={term.id} value={term.id}>
                          {term.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 form-group d-flex justify-content-between">
                    <button
                      type="submit"
                      className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                      disabled={submitting}
                    >
                      {submitting
                        ? "Saving…"
                        : editingId
                        ? "Update Assignment"
                        : "Assign Teacher"}
                    </button>
                    <button
                      type="button"
                      className="btn-fill-lg bg-blue-dark btn-hover-yellow"
                      onClick={() => {
                        setEditingId(null);
                        setForm(initialForm);
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card height-auto">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Assignments</h3>
                </div>
              </div>

              <div className="row gutters-8 align-items-end mb-3">
                <div className="col-md-4 col-12 form-group">
                  <label htmlFor="teacher-filter-search">Search</label>
                  <input
                    id="teacher-filter-search"
                    type="text"
                    className="form-control"
                    placeholder="Subject or teacher"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        setPage(1);
                        fetchAssignments().catch(() => undefined);
                      }
                    }}
                  />
                </div>
                <div className="col-md-4 col-12 form-group">
                  <label htmlFor="teacher-filter-subject">Subject</label>
                  <select
                    id="teacher-filter-subject"
                    className="form-control"
                    value={filters.subject_id}
                    onChange={(event) => {
                      setFilters((prev) => ({
                        ...prev,
                        subject_id: event.target.value,
                      }));
                      setPage(1);
                    }}
                  >
                    <option value="">All subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code
                          ? `${subject.name} (${subject.code})`
                          : subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 col-12 form-group">
                  <label htmlFor="teacher-filter-staff">Teacher</label>
                  <select
                    id="teacher-filter-staff"
                    className="form-control"
                    value={filters.staff_id}
                    onChange={(event) => {
                      setFilters((prev) => ({
                        ...prev,
                        staff_id: event.target.value,
                      }));
                      setPage(1);
                    }}
                  >
                    <option value="">All teachers</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name ??
                          teacher.user?.name ??
                          teacher.email ??
                          `Staff #${teacher.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4 col-12 form-group">
                  <label htmlFor="teacher-filter-session">Session</label>
                  <select
                    id="teacher-filter-session"
                    className="form-control"
                    value={filters.session_id}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFilters((prev) => ({
                        ...prev,
                        session_id: value,
                        term_id: "",
                      }));
                      if (value) {
                        ensureTerms(value).catch((err) => console.error(err));
                      }
                      setPage(1);
                    }}
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
                  <label htmlFor="teacher-filter-term">Term</label>
                  <select
                    id="teacher-filter-term"
                    className="form-control"
                    value={filters.term_id}
                    onChange={(event) => {
                      setFilters((prev) => ({
                        ...prev,
                        term_id: event.target.value,
                      }));
                      setPage(1);
                    }}
                    disabled={!filters.session_id || termsForFilter.length === 0}
                  >
                    <option value="">All terms</option>
                    {termsForFilter.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name}
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
                      setPage(1);
                      fetchAssignments().catch(() => undefined);
                    }}
                  >
                    Reset Filters
                  </button>
                  <button
                    className="btn btn-gradient-yellow"
                    type="button"
                    onClick={() => {
                      setPage(1);
                      fetchAssignments().catch(() => undefined);
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>

              {listError ? (
                <div className="alert alert-danger" role="alert">
                  {listError}
                </div>
              ) : null}

              <div className="table-responsive">
                <table className="table display text-nowrap">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Teacher</th>
                      <th>Session</th>
                      <th>Term</th>
                      <th>Updated</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {loadingList ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          Loading assignments…
                        </td>
                      </tr>
                    ) : assignments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center">
                          No assignments found.
                        </td>
                      </tr>
                    ) : (
                      assignments.map((assignment) => (
                        <tr key={assignment.id}>
                          <td>
                            {assignment.subject?.name ?? "N/A"}
                            {assignment.subject?.code
                              ? ` (${assignment.subject.code})`
                              : ""}
                          </td>
                          <td>
                            {assignment.staff?.full_name ??
                              assignment.staff?.user?.name ??
                              "N/A"}
                          </td>
                          <td>{assignment.session?.name ?? "N/A"}</td>
                          <td>{assignment.term?.name ?? "N/A"}</td>
                          <td>
                            {assignment.updated_at
                              ? new Date(
                                  assignment.updated_at,
                                ).toLocaleString()
                              : "—"}
                          </td>
                          <td>
                            <div className="d-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary mr-2"
                                onClick={() => handleEdit(assignment)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(assignment)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
                <div className="text-muted mb-2">
                  {data && data.total
                    ? `Showing ${data.from ?? 0}-${data.to ?? 0} of ${data.total} assignments`
                    : ""}
                </div>
                <nav className="mb-2">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page <= 1}
                      >
                        «
                      </button>
                    </li>
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const pageNumber = index + 1;
                      return (
                        <li
                          key={pageNumber}
                          className={`page-item ${pageNumber === page ? "active" : ""}`}
                        >
                          <button
                            type="button"
                            className="page-link"
                            onClick={() => setPage(pageNumber)}
                          >
                            {pageNumber}
                          </button>
                        </li>
                      );
                    })}
                    <li
                      className={`page-item ${page >= totalPages ? "disabled" : ""}`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() =>
                          setPage((prev) => Math.min(totalPages, prev + 1))
                        }
                        disabled={page >= totalPages}
                      >
                        »
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
