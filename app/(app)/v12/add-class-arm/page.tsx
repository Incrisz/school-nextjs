"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { createClassArm } from "@/lib/classArms";

export default function AddClassArmPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listClasses()
      .then((data) => {
        setClasses(data);
        if (data.length) {
          setClassId(`${data[0].id}`);
        }
      })
      .catch((err) => {
        console.error("Unable to load classes", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load classes. Please try again.",
        );
      });
  }, []);

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
    setError(null);

    if (!classId) {
      setError("Please select a class.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter an arm name.");
      return;
    }

    try {
      setSubmitting(true);
      await createClassArm(classId, { name: name.trim() });
      router.push("/v12/all-class-arms");
    } catch (err) {
      console.error("Unable to add class arm", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add class arm. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Class Arm Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Add Class Arm</li>
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
              <h3>Add Class Arm</h3>
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
                  {submitting ? "Saving…" : "Save"}
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
