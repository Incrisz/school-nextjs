"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  deleteSubject,
  listSubjects,
  type Subject,
  type SubjectListResponse,
} from "@/lib/subjects";

interface FilterState {
  search: string;
}

const initialFilters: FilterState = {
  search: "",
};

export default function AllSubjectsPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [data, setData] = useState<SubjectListResponse | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listSubjects({
        page,
        per_page: perPage,
        sortBy,
        sortDirection,
        search: filters.search || undefined,
      });
      setData(response);
      setSubjects(response.data ?? []);
      setError(null);
    } catch (err) {
      console.error("Unable to load subjects", err);
      setError(
        err instanceof Error ? err.message : "Unable to load subjects.",
      );
      setData(null);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [filters.search, page, perPage, sortBy, sortDirection]);

  useEffect(() => {
    fetchSubjects().catch((err) => console.error(err));
  }, [fetchSubjects]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    fetchSubjects().catch((err) => console.error(err));
  };

  const toggleSort = (column: string) => {
    setPage(1);
    if (sortBy === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (subject: Subject) => {
    if (
      !window.confirm(
        `Delete subject "${subject.name ?? "Untitled"}"? This action cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await deleteSubject(subject.id);
      await fetchSubjects();
    } catch (err) {
      console.error("Unable to delete subject", err);
      alert(err instanceof Error ? err.message : "Unable to delete subject.");
    }
  };

  const summary =
    data && data.total
      ? `Showing ${data.from ?? 0}-${data.to ?? 0} of ${data.total} subjects`
      : "";

  const totalPages = data?.last_page ?? 1;

  const renderSortIndicator = (column: string) => {
    if (sortBy !== column) {
      return null;
    }
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  const perPageOptions = [10, 25, 50, 100];

  const hasSubjects = subjects.length > 0;

  const rows = (() => {
    if (loading) {
      return (
        <tr>
          <td colSpan={5} className="text-center">
            Loading subjects…
          </td>
        </tr>
      );
    }

    if (!hasSubjects) {
      return (
        <tr>
          <td colSpan={5} className="text-center">
            No subjects found.
          </td>
        </tr>
      );
    }

    return subjects.map((subject) => (
      <tr key={subject.id}>
        <td>{subject.name ?? "N/A"}</td>
        <td>{subject.code ?? "—"}</td>
        <td>{subject.description ?? "—"}</td>
        <td>
          {subject.created_at
            ? new Date(subject.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "—"}
        </td>
        <td>
          <div className="d-flex gap-2">
            <Link
              className="btn btn-sm btn-outline-primary mr-2"
              href={`/v16/edit-subject?id=${subject.id}`}
            >
              Edit
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDelete(subject)}
            >
              Delete
            </button>
          </div>
        </td>
      </tr>
    ));
  })();

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Subject Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>All Subjects</li>
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
              <h3>All Subjects</h3>
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
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => fetchSubjects().catch(() => undefined)}
                >
                  <i className="fas fa-redo-alt text-orange-peel" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <form className="row align-items-end gutters-8 mb-3" onSubmit={handleSearch}>
            <div className="col-lg-4 col-md-6 col-12 form-group">
              <label className="text-dark-medium" htmlFor="subject-search">
                Search
              </label>
              <input
                id="subject-search"
                type="text"
                className="form-control"
                placeholder="Name or code"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-lg-2 col-md-6 col-12 form-group">
              <label className="text-dark-medium" htmlFor="subject-per-page">
                Rows per page
              </label>
              <select
                id="subject-per-page"
                className="form-control"
                value={perPage}
                onChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(1);
                }}
              >
                {perPageOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-2 col-md-6 col-12 form-group">
              <button
                id="subject-search-btn"
                type="submit"
                className="fw-btn-fill btn-gradient-yellow w-100"
              >
                Search
              </button>
            </div>
            <div className="col-lg-4 col-md-6 col-12 form-group text-right">
              <button
                id="subject-reset-btn"
                type="button"
                className="fw-btn-fill btn-outline-secondary mr-2"
                onClick={() => {
                  setFilters(initialFilters);
                  setSortBy("name");
                  setSortDirection("asc");
                  setPerPage(10);
                  setPage(1);
                  fetchSubjects().catch(() => undefined);
                }}
              >
                Reset
              </button>
              <Link
                href="/v16/add-subject"
                className="fw-btn-fill btn-gradient-yellow"
              >
                Add Subject
              </Link>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table display text-nowrap">
              <thead>
                <tr>
                  <th onClick={() => toggleSort("name")} className="sortable">
                    Name{renderSortIndicator("name")}
                  </th>
                  <th onClick={() => toggleSort("code")} className="sortable">
                    Code{renderSortIndicator("code")}
                  </th>
                  <th>Description</th>
                  <th onClick={() => toggleSort("created_at")} className="sortable">
                    Created At{renderSortIndicator("created_at")}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>{rows}</tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap">
            <div className="text-muted mb-2">{summary}</div>
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
    </>
  );
}
