"use client";

import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteStudent,
  getStudent,
  type StudentDetail,
} from "@/lib/students";
import { resolveBackendUrl } from "@/lib/config";
import { listSessions, type Session } from "@/lib/sessions";
import { listTermsBySession, type Term } from "@/lib/terms";
import {
  listStudentSkillRatings,
  listStudentSkillTypes,
  createStudentSkillRating,
  updateStudentSkillRating,
  deleteStudentSkillRating,
  type StudentSkillRating,
  type StudentSkillType,
} from "@/lib/studentSkillRatings";
import {
  getStudentTermSummary,
  updateStudentTermSummary,
  type StudentTermSummary,
} from "@/lib/studentTermSummaries";
import {
  listStudentResultPins,
  generateResultPinForStudent,
  invalidateResultPin,
  type ResultPin,
} from "@/lib/resultPins";

const passthroughLoader: ImageLoader = ({ src }) => src;

export default function StudentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [termsCache, setTermsCache] = useState<Record<string, Term[]>>({});
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");

  const [skillTypes, setSkillTypes] = useState<StudentSkillType[]>([]);
  const [skillRatings, setSkillRatings] = useState<StudentSkillRating[]>([]);
  const [skillLoading, setSkillLoading] = useState(false);
  const [skillFeedback, setSkillFeedback] = useState<string | null>(null);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSubmitting, setSkillSubmitting] = useState(false);
  const [skillForm, setSkillForm] = useState<{
    id: string | null;
    skill_type_id: string;
    rating_value: string;
  }>({
    id: null,
    skill_type_id: "",
    rating_value: "3",
  });

  const [termSummary, setTermSummary] = useState<StudentTermSummary>({
    class_teacher_comment: "",
    principal_comment: "",
  });
  const [termSummaryFeedback, setTermSummaryFeedback] = useState<string | null>(null);
  const [termSummarySaving, setTermSummarySaving] = useState(false);

  const [pins, setPins] = useState<ResultPin[]>([]);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinExpiresAt, setPinExpiresAt] = useState("");
  const [pinProcessing, setPinProcessing] = useState(false);

  const ratingOptions = ["1", "2", "3", "4", "5"];

  useEffect(() => {
    if (!studentId) {
      router.replace("/v14/all-students");
      return;
    }
    getStudent(studentId)
      .then((detail) => {
        if (!detail) {
          throw new Error("Student not found.");
        }
        setStudent(detail);
        setError(null);
      })
      .catch((err) => {
        console.error("Unable to load student details", err);
        setError(
          err instanceof Error ? err.message : "Unable to load student.",
        );
      })
      .finally(() => setLoading(false));
  }, [studentId, router]);

  useEffect(() => {
    if (!student?.id) {
      return;
    }
    listStudentSkillTypes(student.id)
      .then(setSkillTypes)
      .catch((err) => console.error("Unable to load skill types", err));
  }, [student?.id]);

  useEffect(() => {
    if (!student) {
      return;
    }
    setSelectedSession((prev) => {
      if (prev) {
        return prev;
      }
      if (student.current_session_id) {
        return String(student.current_session_id);
      }
      return "";
    });
    setSelectedTerm((prev) => {
      if (prev) {
        return prev;
      }
      if (student.current_term_id) {
        return String(student.current_term_id);
      }
      return "";
    });
  }, [student]);

  useEffect(() => {
    listSessions()
      .then(setSessions)
      .catch((err) => console.error("Unable to load sessions", err));
  }, []);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }
    if (termsCache[selectedSession]) {
      return;
    }
    listTermsBySession(selectedSession)
      .then((terms) => {
        setTermsCache((prev) => ({
          ...prev,
          [selectedSession]: terms,
        }));
      })
      .catch((err) => console.error("Unable to load terms", err));
  }, [selectedSession, termsCache]);

  useEffect(() => {
    if (!selectedSession) {
      return;
    }
    const terms = termsCache[selectedSession];
    if (!terms || terms.length === 0) {
      setSelectedTerm("");
      return;
    }
    if (!selectedTerm || !terms.find((term) => String(term.id) === selectedTerm)) {
      setSelectedTerm(String(terms[0].id));
    }
  }, [selectedSession, selectedTerm, termsCache]);

  useEffect(() => {
    if (!student?.id || !selectedSession || !selectedTerm) {
      setSkillRatings([]);
      return;
    }
    setSkillLoading(true);
    setSkillError(null);
    listStudentSkillRatings(student.id, {
      session_id: selectedSession,
      term_id: selectedTerm,
    })
      .then((ratings) => {
        setSkillRatings(ratings);
        setSkillFeedback(null);
      })
      .catch((err) => {
        console.error("Unable to load skill ratings", err);
        setSkillError(
          err instanceof Error
            ? err.message
            : "Unable to load skill ratings.",
        );
        setSkillRatings([]);
      })
      .finally(() => setSkillLoading(false));
  }, [student?.id, selectedSession, selectedTerm]);

  useEffect(() => {
    if (!student?.id || !selectedSession || !selectedTerm) {
      setTermSummary({
        class_teacher_comment: "",
        principal_comment: "",
      });
      return;
    }
    getStudentTermSummary(student.id, {
      session_id: selectedSession,
      term_id: selectedTerm,
    })
      .then((summary: StudentTermSummary) => {
        setTermSummary({
          class_teacher_comment: summary.class_teacher_comment ?? "",
          principal_comment: summary.principal_comment ?? "",
        });
      })
      .catch((err: unknown) => {
        console.error("Unable to load term comments", err);
        setTermSummary({
          class_teacher_comment: "",
          principal_comment: "",
        });
      });
  }, [student?.id, selectedSession, selectedTerm]);

  useEffect(() => {
    if (!student?.id || !selectedSession || !selectedTerm) {
      setPins([]);
      return;
    }
    setPinLoading(true);
    setPinError(null);
    listStudentResultPins(student.id, {
      session_id: selectedSession,
      term_id: selectedTerm,
    })
      .then((result) => {
        setPins(result);
        setPinFeedback(null);
      })
      .catch((err: unknown) => {
        console.error("Unable to load result PINs", err);
        setPinError(
          err instanceof Error
            ? err.message
            : "Unable to load result PINs for the selected term.",
        );
        setPins([]);
      })
      .finally(() => setPinLoading(false));
  }, [student?.id, selectedSession, selectedTerm]);

  const fullName = useMemo(() => {
    if (!student) return "";
    return [student.first_name, student.middle_name, student.last_name]
      .filter(Boolean)
      .join(" ");
  }, [student]);

  const photoUrl = useMemo(() => {
    if (!student?.photo_url) {
      return "/assets/img/figure/student.png";
    }
    return resolveBackendUrl(student.photo_url);
  }, [student?.photo_url]);

  const handleDelete = async () => {
    if (!studentId || removing) {
      return;
    }
    if (
      !window.confirm(
        "Are you sure you want to delete this student? This action cannot be undone.",
      )
    ) {
      return;
    }
    setRemoving(true);
    try {
      await deleteStudent(studentId);
      router.push("/v14/all-students");
    } catch (err) {
      console.error("Unable to delete student", err);
      alert(
        err instanceof Error ? err.message : "Unable to delete student.",
      );
    } finally {
      setRemoving(false);
    }
  };

  const printResultUrl = useMemo(() => {
    if (!studentId) return "#";
    const params = new URLSearchParams();
    params.set("student_id", studentId);
    if (student?.current_session_id) {
      params.set("session_id", `${student.current_session_id}`);
    }
    if (student?.current_term_id) {
      params.set("term_id", `${student.current_term_id}`);
    }
    return `${resolveBackendUrl(`/api/v1/students/${studentId}/results/print`)}?${params.toString()}`;
  }, [studentId, student?.current_session_id, student?.current_term_id]);

  if (!studentId) {
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

  if (error || !student) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? "Student not found."}
      </div>
    );
  }

  const houseLabel = student.house && `${student.house}`.trim().length > 0
    ? `${student.house}`
    : "N/A";
  const clubLabel = student.club && `${student.club}`.trim().length > 0
    ? `${student.club}`
    : "N/A";

  const className = student.school_class?.name ?? "N/A";
  const armName =
    student.class_arm?.name ?? student.school_class?.class_arm?.name ?? "";
  const sectionName = student.class_section?.name ?? "N/A";
  const parentName = student.parent
    ? `${student.parent.first_name ?? ""} ${student.parent.last_name ?? ""}`.trim() ||
      student.parent.phone ||
      "N/A"
    : "N/A";

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Student Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v14/all-students">All Students</Link>
          </li>
          <li>Student Details</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div className="d-flex align-items-center">
              <Image
                src={photoUrl}
                alt={fullName || "Student photo"}
                width={96}
                height={96}
                loader={passthroughLoader}
                unoptimized
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginRight: "1rem",
                }}
              />
              <div>
                <h3 className="mb-1">{fullName || "Unnamed Student"}</h3>
                <p className="mb-0 text-muted">
                  Admission No: {student.admission_no ?? "N/A"}
                </p>
                <p className="mb-0 text-muted text-capitalize">
                  Status: {student.status ?? "active"}
                </p>
              </div>
            </div>
            <div className="btn-group">
              <Link
                href={`/v14/edit-student?id=${studentId}`}
                className="btn btn-outline-primary"
              >
                Edit
              </Link>
              <a
                href={printResultUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-secondary"
              >
                Print Result
              </a>
              <button
                type="button"
                className="btn btn-outline-danger"
                onClick={handleDelete}
                disabled={removing}
              >
                {removing ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-6 col-12">
              <div className="mb-4">
                <h5 className="mb-3">Personal Information</h5>
                <ul className="list-unstyled">
                  <li>
                    <strong>Gender:</strong> {student.gender ?? "N/A"}
                  </li>
                  <li>
                    <strong>Date of Birth:</strong>{" "}
                    {student.date_of_birth ?? "N/A"}
                  </li>
                  <li>
                    <strong>Nationality:</strong>{" "}
                    {student.nationality ?? "N/A"}
                  </li>
                  <li>
                    <strong>State of Origin:</strong>{" "}
                    {student.state_of_origin ?? "N/A"}
                  </li>
                  <li>
                    <strong>LGA of Origin:</strong>{" "}
                    {student.lga_of_origin ?? "N/A"}
                  </li>
                  <li>
                    <strong>Blood Group:</strong>{" "}
                    {student.blood_group?.name ?? "N/A"}
                  </li>
                </ul>
              </div>

              <div className="mb-4">
                <h5 className="mb-3">Contact</h5>
                <ul className="list-unstyled">
                  <li>
                    <strong>Parent:</strong> {parentName}
                  </li>
                  <li>
                    <strong>Parent Phone:</strong>{" "}
                    {student.parent?.phone ?? "N/A"}
                  </li>
                  <li>
                    <strong>Address:</strong> {student.address ?? "N/A"}
                  </li>
                  <li>
                    <strong>Medical Info:</strong>{" "}
                    {student.medical_information ?? "N/A"}
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-lg-6 col-12">
              <div className="mb-4">
                <h5 className="mb-3">Academic Information</h5>
                <ul className="list-unstyled">
                  <li>
                    <strong>Admission Date:</strong>{" "}
                    {student.admission_date ?? "N/A"}
                  </li>
                  <li>
                    <strong>Current Session:</strong>{" "}
                    {student.session?.name ??
                      student.current_session_id ??
                      "N/A"}
                  </li>
                  <li>
                    <strong>Current Term:</strong>{" "}
                    {student.term?.name ?? student.current_term_id ?? "N/A"}
                  </li>
                  <li>
                    <strong>Class:</strong> {className}
                    {armName ? ` - ${armName}` : ""}
                  </li>
                  <li>
                    <strong>Section:</strong> {sectionName}
                  </li>
                  <li>
                    <strong>House:</strong> {houseLabel}
                  </li>
                  <li>
                    <strong>Club:</strong> {clubLabel}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
