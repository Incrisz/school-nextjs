"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { getClassArm, updateClassArm } from "@/lib/classArms";

export default function EditClassArmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId");
  const armId = searchParams.get("id");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classIdParam || !armId) {
      router.replace("/v12/all-class-arms");
      return;
    }

    Promise.all([listClasses(), getClassArm(classIdParam, armId)])
      .then(([classResponse, arm]) => {
        setClasses(classResponse);
        if (!arm) {
          throw new Error("Class arm not found.");
        }
        setClassId(`${classIdParam}`);
        setName(arm.name ?? "");
        setError(null);
      })
      .catch((err) => {
        console.error("Unable to load class arm", err);
        setError(
          err instanceof Error ? err.message : "Unable to load class arm.",
        );
      })
      .finally(() => setLoading(false));
  }, [classIdParam, armId, router]);

  const classOptions = useMemo(
    () =>
      classes.map((entry) => ({
        value: `${entry.id}`,
        label: entry.name,
      })),
    [classes],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classId || !armId) {
      return;
    }

    if (!name.trim()) {
      setError("Please enter an arm name.");
      return;
    }

    setSubmitting(true);
    try {
      await updateClassArm(classId, armId, { name: name.trim() });
      router.push("/v12/all-class-arms");
    } catch (err) {
      console.error("Unable to update class arm", err);
      setError(
        err instanceof Error ? err.message : "Unable to update class arm.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!classIdParam || !armId) {
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
        <h3>Class Arm Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v12/all-class-arms">All Class Arms</Link>
          </li>
          <li>Edit Class Arm</li>
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
              <h3>Edit Class Arm</h3>
            </div>
          </div>

          <form className="new-added-form" onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="class-select">Class *</label>
                <select
                  id="class-select"
                  className="form-control"
                  value={classId}
                  onChange={(event) => setClassId(event.target.value)}
                  required
                >
                  <option value="">Select a class</option>
                  {classOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-lg-6 col-12 form-group">
                <label htmlFor="arm-name">Arm Name *</label>
                <input
                  id="arm-name"
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
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
                  href="/v12/all-class-arms"
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
