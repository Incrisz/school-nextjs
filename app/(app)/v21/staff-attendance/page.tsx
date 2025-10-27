"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  buildStaffAttendanceExportUrl,
  deleteStaffAttendance,
  listStaffAttendance,
  saveStaffAttendance,
  type StaffAttendanceRecord,
} from "@/lib/attendance";
import { listStaff, type Staff } from "@/lib/staff";

type FeedbackKind = "success" | "danger" | "warning" | "info";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

type StaffAttendanceStatus = "" | "present" | "absent" | "late" | "on_leave";

interface AttendanceState {
  status: StaffAttendanceStatus;
  recordId?: string;
}

const STATUS_OPTIONS: Array<{ value: StaffAttendanceStatus; label: string }> = [
  { value: "", label: "Select status" },
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "on_leave", label: "On Leave" },
];

interface StaffFilters {
  branchName: string;
  department: string;
  search: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function StaffAttendancePage() {
  const [date, setDate] = useState<string>(todayIso);
  const [filters, setFilters] = useState<StaffFilters>({
    branchName: "",
    department: "",
    search: "",
  });

  const [departments, setDepartments] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, AttendanceState>
  >({});
  const [currentRecords, setCurrentRecords] = useState<
    Record<string, StaffAttendanceRecord>
  >({});
  const [history, setHistory] = useState<StaffAttendanceRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

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

  const loadHistory = useCallback(async () => {
    try {
      const response = await listStaffAttendance({ per_page: 5 });
      setHistory(response.data ?? []);
    } catch (error) {
      console.warn("Unable to load staff attendance history", error);
    }
  }, []);

  useEffect(() => {
    loadHistory().catch((error) => console.error(error));
  }, [loadHistory]);

  const resetFeedback = () => setFeedback(null);

  const loadStaffList = useCallback(async () => {
    resetFeedback();
    if (!date) {
      setFeedback({
        type: "warning",
        message: "Select a date before loading staff attendance.",
      });
      return;
    }

    setLoading(true);
    try {
      const staffResponse = await listStaff({
        per_page: 500,
        role: filters.department || undefined,
        search: filters.search || undefined,
      });
      const staffList = staffResponse.data ?? [];
      setStaffMembers(staffList);

      const attendanceResponse = await listStaffAttendance({
        per_page: 500,
        date,
        branch_name: filters.branchName || undefined,
        department: filters.department || undefined,
        search: filters.search || undefined,
      });

      const recordMap = new Map<string, StaffAttendanceRecord>();
      (attendanceResponse.data ?? []).forEach((record) => {
        const staffId = record.staff?.id ?? record.staff_id;
        if (staffId !== undefined && staffId !== null) {
          recordMap.set(String(staffId), record);
        }
      });

      const recordObject: Record<string, StaffAttendanceRecord> = {};
      recordMap.forEach((value, key) => {
        recordObject[key] = value;
      });
      setCurrentRecords(recordObject);

      const nextMap: Record<string, AttendanceState> = {};
      staffList.forEach((member) => {
        const key = String(member.id);
        const existing = recordMap.get(key);
        nextMap[key] = {
          status: (existing?.status as StaffAttendanceStatus) ?? "",
          recordId: existing?.id ? String(existing.id) : undefined,
        };
      });
      setAttendanceMap(nextMap);
    } catch (error) {
      console.error("Unable to load staff list", error);
      setStaffMembers([]);
      setAttendanceMap({});
      setCurrentRecords({});
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load staff records.",
      });
    } finally {
      setLoading(false);
    }
  }, [date, filters.branchName, filters.department, filters.search]);

  const handleStatusChange = (
    staffId: number | string,
    status: StaffAttendanceStatus,
  ) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [String(staffId)]: {
        ...prev[String(staffId)],
        status,
      },
    }));
  };

  const handleClearStatus = async (staffId: number | string) => {
    const key = String(staffId);
    const state = attendanceMap[key];
    if (!state) {
      return;
    }
    if (state.recordId) {
      try {
        await deleteStaffAttendance(state.recordId);
        setFeedback({
          type: "success",
          message: "Staff attendance record removed.",
        });
        setCurrentRecords((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        await loadStaffList();
        await loadHistory();
        return;
      } catch (error) {
        setFeedback({
          type: "danger",
          message:
            error instanceof Error
              ? error.message
              : "Unable to remove staff attendance record.",
        });
      }
    }
    setAttendanceMap((prev) => ({
      ...prev,
      [key]: {
        status: "",
      },
    }));
    setCurrentRecords((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleBulkUpdate = (status: StaffAttendanceStatus) => {
    setAttendanceMap((prev) => {
      const next: Record<string, AttendanceState> = {};
      Object.entries(prev).forEach(([key, value]) => {
        next[key] = {
          ...value,
          status,
        };
      });
      return next;
    });
  };

  const handleSave = async () => {
    resetFeedback();
    if (!date) {
      setFeedback({
        type: "warning",
        message: "Select a date before saving attendance.",
      });
      return;
    }

    const entries = Object.entries(attendanceMap)
      .filter(([, value]) => Boolean(value.status))
      .map(([staffId, value]) => ({
        staff_id: staffId,
        status: value.status,
        branch_name: filters.branchName || null,
      }));

    if (!entries.length) {
      setFeedback({
        type: "info",
        message: "Set at least one staff status before saving.",
      });
      return;
    }

    setSaving(true);
    try {
      const { message } = await saveStaffAttendance({
        date,
        branch_name: filters.branchName || null,
        department: filters.department || null,
        entries,
      });
      setFeedback({
        type: "success",
        message: message ?? "Staff attendance saved successfully.",
      });
      await loadStaffList();
      await loadHistory();
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save staff attendance.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (type: "csv" | "pdf") => {
    if (typeof window === "undefined") {
      return;
    }
    const url = buildStaffAttendanceExportUrl(type, {
      date,
      branch_name: filters.branchName || null,
      department: filters.department || null,
    });
    window.open(url, "_blank");
  };

  const summaryCounts = useMemo(() => {
    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      on_leave: 0,
    };
    staffMembers.forEach((member) => {
      const state = attendanceMap[String(member.id)];
      if (state && state.status && counts.hasOwnProperty(state.status)) {
        counts[state.status as keyof typeof counts] += 1;
      }
    });
    return counts;
  }, [attendanceMap, staffMembers]);

  const summaryLabel = useMemo(() => {
    if (!staffMembers.length || !date) {
      return "No staff loaded.";
    }
    return `Loaded ${staffMembers.length} staff for ${formatDate(date)}.`;
  }, [staffMembers.length, date]);

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    loadStaffList().catch((error) => console.error(error));
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Staff Attendance</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Staff Attendance</li>
        </ul>
      </div>

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Attendance Filters</h3>
            </div>
            <div>
              <button
                id="staff-attendance-refresh"
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => {
                  loadStaffList().catch((error) => console.error(error));
                  loadHistory().catch((error) => console.error(error));
                }}
                disabled={loading}
              >
                <i className="fas fa-sync-alt mr-1" />
                Refresh
              </button>
            </div>
          </div>

          <div className="row gutters-8">
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="staff-attendance-date">Date</label>
              <input
                id="staff-attendance-date"
                type="date"
                className="form-control"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="staff-attendance-branch">Branch</label>
              <input
                id="staff-attendance-branch"
                type="text"
                className="form-control"
                value={filters.branchName}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    branchName: event.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="staff-attendance-department">Department</label>
              <select
                id="staff-attendance-department"
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
            <div className="col-lg-3 col-md-6 col-12 form-group">
              <label htmlFor="staff-search">Search Staff</label>
              <form onSubmit={handleSearchSubmit}>
                <div className="input-group">
                  <input
                    id="staff-search"
                    type="text"
                    className="form-control"
                    value={filters.search}
                    onChange={(event) =>
                      setFilters((prev) => ({
                        ...prev,
                        search: event.target.value,
                      }))
                    }
                    placeholder="Name or email"
                  />
                  <div className="input-group-append">
                    <button
                      type="submit"
                      className="btn btn-outline-primary"
                      disabled={loading}
                    >
                      Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="d-flex align-items-center flex-wrap">
            <button
              id="staff-load"
              type="button"
              className="btn btn-outline-primary mr-3 mb-2"
              onClick={() => loadStaffList().catch((error) => console.error(error))}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load Staff"}
            </button>
            <div className="btn-group mb-2 mr-3" role="group">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-staff-bulk-status="present"
                onClick={() => handleBulkUpdate("present")}
              >
                All Present
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-staff-bulk-status="absent"
                onClick={() => handleBulkUpdate("absent")}
              >
                All Absent
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                data-staff-bulk-status="on_leave"
                onClick={() => handleBulkUpdate("on_leave")}
              >
                All On Leave
              </button>
            </div>
            <div className="btn-group mb-2">
              <button
                id="staff-attendance-export-csv"
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExport("csv")}
              >
                Export CSV
              </button>
              <button
                id="staff-attendance-export-pdf"
                type="button"
                className="btn btn-sm btn-outline-success"
                onClick={() => handleExport("pdf")}
              >
                Export PDF
              </button>
            </div>
            </div>

          {feedback ? (
            <div
              id="staff-attendance-feedback"
              className={`alert alert-${feedback.type} mt-3`}
            >
              {feedback.message}
            </div>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap mb-3">
            <div>
              <strong id="staff-attendance-summary">{summaryLabel}</strong>
            </div>
            <div className="d-flex flex-wrap">
              <span className="badge badge-success mr-2 mb-2" id="staff-summary-present">
                Present: {summaryCounts.present}
              </span>
              <span className="badge badge-danger mr-2 mb-2" id="staff-summary-absent">
                Absent: {summaryCounts.absent}
              </span>
              <span className="badge badge-warning mr-2 mb-2" id="staff-summary-late">
                Late: {summaryCounts.late}
              </span>
              <span className="badge badge-info mb-2" id="staff-summary-on-leave">
                On Leave: {summaryCounts.on_leave}
              </span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Staff</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="staff-attendance-table-body">
                {staffMembers.length ? (
                  staffMembers.map((member, index) => {
                    const key = String(member.id);
                    const state = attendanceMap[key] ?? { status: "" };
                    const record = currentRecords[key];
                    return (
                      <tr key={key}>
                        <td>{index + 1}</td>
                        <td>
                          <strong>{formatStaffName(member)}</strong>
                        </td>
                        <td>{member.email ?? "—"}</td>
                        <td>{member.role ?? "—"}</td>
                        <td>
                          <select
                            className="form-control staff-attendance-select"
                            value={state.status}
                            onChange={(event) =>
                              handleStatusChange(
                                member.id,
                                event.target.value as StaffAttendanceStatus,
                              )
                            }
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value || "empty"} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{record?.updated_at ? formatDate(record.updated_at) : "—"}</td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleClearStatus(member.id)}
                          >
                            {state.recordId ? "Clear Record" : "Reset"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">
                      {loading
                        ? "Loading staff..."
                        : "No staff records found. Adjust filters and load again."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="text-right mt-3">
            <button
              id="staff-attendance-save"
              type="button"
              className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
              onClick={() => handleSave().catch((error) => console.error(error))}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Recent Staff Attendance</h3>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Staff</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody id="staff-attendance-history">
                {history.length ? (
                  history.map((record) => (
                    <tr key={record.id}>
                      <td>{record.date ? formatDate(record.date) : "—"}</td>
                      <td>{record.staff?.name ?? formatStaffNameFromRecord(record)}</td>
                      <td>{record.status?.toUpperCase() ?? "—"}</td>
                      <td>{record.branch_name ?? "—"}</td>
                      <td>{record.recorded_by?.name ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No recent staff attendance records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function formatStaffName(staff: Staff): string {
  return staff.full_name ?? staff.user?.name ?? "Unnamed Staff";
}

function formatStaffNameFromRecord(record: StaffAttendanceRecord): string {
  return record.staff?.name ?? record.staff?.full_name ?? "Unknown Staff";
}

function formatDate(value: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
