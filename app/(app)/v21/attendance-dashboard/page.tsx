"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildStaffAttendanceExportUrl,
  buildStudentAttendanceExportUrl,
  fetchStaffAttendanceReport,
  fetchStudentAttendanceReport,
  type StaffAttendanceReport,
  type StudentAttendanceReport,
} from "@/lib/attendance";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { listStaff } from "@/lib/staff";

type FeedbackKind = "success" | "danger" | "warning" | "info";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

interface DashboardFilters {
  from: string;
  to: string;
  classId: string;
  department: string;
}

const defaultFromDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 14);
  return date.toISOString().slice(0, 10);
};

const defaultToDate = () => new Date().toISOString().slice(0, 10);

export default function AttendanceDashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({
    from: defaultFromDate(),
    to: defaultToDate(),
    classId: "",
    department: "",
  });

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [studentReport, setStudentReport] =
    useState<StudentAttendanceReport | null>(null);
  const [staffReport, setStaffReport] =
    useState<StaffAttendanceReport | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listClasses()
      .then(setClasses)
      .catch((error) =>
        console.error("Unable to load classes", error),
      );
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await listStaff({ per_page: 500 });
        const roles = new Set<string>();
        (response.data ?? []).forEach((member) => {
          if (member.role) {
            roles.add(member.role);
          }
        });
        setDepartments(Array.from(roles).sort());
      } catch (error) {
        console.warn("Unable to load departments", error);
      }
    };
    loadDepartments().catch((error) => console.error(error));
  }, []);

  const runReport = useCallback(async () => {
    setFeedback(null);
    setLoading(true);
    try {
      const [student, staff] = await Promise.all([
        fetchStudentAttendanceReport({
          from: filters.from,
          to: filters.to,
          school_class_id: filters.classId || undefined,
        }),
        fetchStaffAttendanceReport({
          from: filters.from,
          to: filters.to,
          department: filters.department || undefined,
        }),
      ]);
      setStudentReport(student);
      setStaffReport(staff);
    } catch (error) {
      console.error("Unable to load attendance reports", error);
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load attendance reports.",
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    runReport().catch((error) => console.error(error));
  }, [runReport]);

  const studentStatusItems = useMemo(() => {
    const breakdown = studentReport?.status_breakdown ?? {};
    return [
      { key: "present", label: "Present", value: breakdown.present ?? 0, className: "badge-success" },
      { key: "absent", label: "Absent", value: breakdown.absent ?? 0, className: "badge-danger" },
      { key: "late", label: "Late", value: breakdown.late ?? 0, className: "badge-warning" },
      { key: "excused", label: "Excused", value: breakdown.excused ?? 0, className: "badge-info" },
    ];
  }, [studentReport]);

  const staffStatusItems = useMemo(() => {
    const breakdown = staffReport?.status_breakdown ?? {};
    return [
      { key: "present", label: "Present", value: breakdown.present ?? 0, className: "badge-success" },
      { key: "absent", label: "Absent", value: breakdown.absent ?? 0, className: "badge-danger" },
      { key: "late", label: "Late", value: breakdown.late ?? 0, className: "badge-warning" },
      { key: "on_leave", label: "On Leave", value: breakdown.on_leave ?? 0, className: "badge-info" },
    ];
  }, [staffReport]);

  const studentAtRisk = useMemo(
    () => studentReport?.students_at_risk ?? [],
    [studentReport?.students_at_risk],
  );

  const staffDepartmentBreakdown = useMemo(() => {
    const breakdown = staffReport?.department_breakdown ?? {};
    return Object.entries(breakdown);
  }, [staffReport?.department_breakdown]);

  const handleExportStudents = (format: "csv" | "pdf") => {
    if (typeof window === "undefined") {
      return;
    }
    const url = buildStudentAttendanceExportUrl(format, {
      from: filters.from,
      to: filters.to,
      school_class_id: filters.classId || null,
    });
    window.open(url, "_blank");
  };

  const handleExportStaff = (format: "csv" | "pdf") => {
    if (typeof window === "undefined") {
      return;
    }
    const url = buildStaffAttendanceExportUrl(format, {
      from: filters.from,
      to: filters.to,
      department: filters.department || null,
    });
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Attendance Dashboard</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Attendance Dashboard</li>
        </ul>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Report Filters</h3>
            </div>
          </div>

          <div className="row gutters-8">
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="report-from">From</label>
              <input
                id="report-from"
                type="date"
                className="form-control"
                value={filters.from}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, from: event.target.value }))
                }
              />
            </div>
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="report-to">To</label>
              <input
                id="report-to"
                type="date"
                className="form-control"
                value={filters.to}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, to: event.target.value }))
                }
              />
            </div>
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="report-class">Class</label>
              <select
                id="report-class"
                className="form-control"
                value={filters.classId}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    classId: event.target.value,
                  }))
                }
              >
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={String(schoolClass.id)}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="report-department">Department</label>
              <select
                id="report-department"
                className="form-control"
                value={filters.department}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    department: event.target.value,
                  }))
                }
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="d-flex flex-wrap align-items-center">
            <button
              id="attendance-report-run"
              type="button"
              className="btn btn-outline-primary mr-3 mb-2"
              onClick={() => runReport().catch((error) => console.error(error))}
              disabled={loading}
            >
              {loading ? "Loading..." : "Run Report"}
            </button>
            <div className="btn-group mb-2 mr-3">
              <button
                id="attendance-report-export-csv"
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExportStudents("csv")}
              >
                Export Students CSV
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExportStudents("pdf")}
              >
                Export Students PDF
              </button>
            </div>
            <div className="btn-group mb-2">
              <button
                id="attendance-report-export-pdf"
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExportStaff("csv")}
              >
                Export Staff CSV
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExportStaff("pdf")}
              >
                Export Staff PDF
              </button>
            </div>
          </div>

          {feedback ? (
            <div
              id="attendance-dashboard-feedback"
              className={`alert alert-${feedback.type} mt-3`}
            >
              {feedback.message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="row">
        <div className="col-xl-6">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-3">
                <div className="item-title">
                  <h3>Student Attendance Summary</h3>
                </div>
              </div>
              <div className="d-flex justify-content-between flex-wrap mb-3">
                <div>
                  <p className="mb-1">
                    <strong>Total Records:</strong>{" "}
                    {studentReport?.summary?.total_records ?? 0}
                  </p>
                  <p className="mb-0">
                    <strong>Unique Students:</strong>{" "}
                    {studentReport?.summary?.unique_students ?? 0}
                  </p>
                </div>
              </div>
              <ul className="list-group mb-4" id="student-status-breakdown">
                {studentStatusItems.map((item) => (
                  <li key={item.key} className="list-group-item d-flex justify-content-between align-items-center" data-status={item.key}>
                    {item.label}
                    <span className={`badge ${item.className}`}>{item.value}</span>
                  </li>
                ))}
              </ul>
              <h4 className="mb-3">Students At Risk</h4>
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Admission No</th>
                      <th>Absent Days</th>
                      <th>Late Days</th>
                    </tr>
                  </thead>
                  <tbody id="students-at-risk-body">
                    {studentAtRisk.length ? (
                      studentAtRisk.map((entry, index) => (
                        <tr key={`${entry.student_id ?? index}`}>
                          <td>{entry.student_name ?? "Unknown"}</td>
                          <td>{entry.admission_no ?? "—"}</td>
                          <td>{entry.absent_days ?? 0}</td>
                          <td>{entry.late_days ?? 0}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center">
                          No students flagged.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-6">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-3">
                <div className="item-title">
                  <h3>Staff Attendance Summary</h3>
                </div>
              </div>
              <div className="d-flex justify-content-between flex-wrap mb-3">
                <div>
                  <p className="mb-1">
                    <strong>Total Records:</strong>{" "}
                    {staffReport?.summary?.total_records ?? 0}
                  </p>
                  <p className="mb-0">
                    <strong>Unique Staff:</strong>{" "}
                    {staffReport?.summary?.unique_staff ?? 0}
                  </p>
                </div>
              </div>
              <ul className="list-group mb-4" id="staff-status-breakdown">
                {staffStatusItems.map((item) => (
                  <li key={item.key} className="list-group-item d-flex justify-content-between align-items-center" data-status={item.key}>
                    {item.label}
                    <span className={`badge ${item.className}`}>{item.value}</span>
                  </li>
                ))}
              </ul>
              <h4 className="mb-3">Department Breakdown</h4>
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Department</th>
                      <th>Total Records</th>
                    </tr>
                  </thead>
                  <tbody id="staff-department-body">
                    {staffDepartmentBreakdown.length ? (
                      staffDepartmentBreakdown.map(([department, total]) => (
                        <tr key={department}>
                          <td>{department}</td>
                          <td>{total}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="text-center">
                          No department data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
