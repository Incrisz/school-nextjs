"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listClasses, type SchoolClass } from "@/lib/classes";
import {
  listClassArms,
  type ClassArm,
} from "@/lib/classArms";
import { createClassArmSection } from "@/lib/classArmSections";

export default function AddClassArmSectionPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [classId, setClassId] = useState("");
  const [armId, setArmId] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listClasses()
      .then((data) => {
        setClasses(data);
        if (data.length) {
          const initialClass = `${data[0].id}`;
          setClassId(initialClass);
          return listClassArms(initialClass);
        }
        return [];
      })
      .then((data) => {
        if (data.length) {
          setArms(data);
          setArmId(`${data[0].id}`);
        }
      })
      .catch((err) => {
        console.error("Unable to initialize form", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load classes and arms.",
        );
      });
  }, []);

  useEffect(() => {
    if (!classId) {
      setArms([]);
      setArmId("");
      return;
    }
    listClassArms(classId)
      .then((data) => {
        setArms(data);
        if (!data.find((item) => `${item.id}` === armId)) {
          setArmId(data.length ? `${data[0].id}` : "");
        }
      })
      .catch((err) => {
        console.error("Unable to load class arms", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load class arms for the selected class.",
        );
      });
  }, [classId, armId]);

  const classOptions = useMemo(
    () =>
      classes.map((entry) => ({
        value: `${entry.id}`,
        label: entry.name,
      })),
    [classes],
  );

  const armOptions = useMemo(
    () =>
      arms.map((entry) => ({
        value: `${entry.id}`,
        label: entry.name,
      })),
    [arms],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!classId || !armId) {
      setError("Please select both class and class arm.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a section name.");
      return;
    }

    try {
      setSubmitting(true);
      await createClassArmSection(classId, armId, { name: name.trim() });
      router.push("/v12/all-class-arm-sections");
    } catch (err) {
      console.error("Unable to add section", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add section. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Class Section Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Add Class Arm Section</li>
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
              <h3>Add Class Arm Section</h3>
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
                  onChange={(event) => {
                    setClassId(event.target.value);
                    setArmId("");
                  }}
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
                <label htmlFor="arm-select">Class Arm *</label>
                <select
                  id="arm-select"
                  className="form-control"
                  value={armId}
                  onChange={(event) => setArmId(event.target.value)}
                  disabled={!classId || armOptions.length === 0}
                  required
                >
                  <option value="">Select a class arm</option>
                  {armOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 form-group">
                <label htmlFor="section-name">Section Name *</label>
                <input
                  id="section-name"
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
                  href="/v12/all-class-arm-sections"
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
