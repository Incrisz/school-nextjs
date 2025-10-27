"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { listClasses, type SchoolClass } from "@/lib/classes";
import {
  listClassArms,
  type ClassArm,
} from "@/lib/classArms";
import {
  getClassArmSection,
  updateClassArmSection,
} from "@/lib/classArmSections";

export default function EditClassArmSectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classIdParam = searchParams.get("classId");
  const armIdParam = searchParams.get("armId");
  const sectionId = searchParams.get("id");

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [classId, setClassId] = useState("");
  const [armId, setArmId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classIdParam || !armIdParam || !sectionId) {
      router.replace("/v12/all-class-arm-sections");
      return;
    }

    async function hydrate() {
      try {
        const [classList, armList, section] = await Promise.all([
          listClasses(),
          listClassArms(classIdParam),
          getClassArmSection(classIdParam, armIdParam, sectionId),
        ]);

        if (!section) {
          throw new Error("Section not found.");
        }

        setClasses(classList);
        setClassId(`${classIdParam}`);
        setArms(armList);
        setArmId(`${armIdParam}`);
        setName(section.name ?? "");
        setError(null);
      } catch (err) {
        console.error("Unable to load section", err);
        setError(
          err instanceof Error ? err.message : "Unable to load section.",
        );
      } finally {
        setLoading(false);
      }
    }

    hydrate().catch((err) => console.error(err));
  }, [classIdParam, armIdParam, sectionId, router]);

  useEffect(() => {
    if (!classId) {
      setArms([]);
      setArmId("");
      return;
    }

    listClassArms(classId)
      .then((data) => {
        setArms(data);
        if (!data.find((entry) => `${entry.id}` === armId)) {
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
    if (!classId || !armId || !sectionId) {
      return;
    }

    if (!name.trim()) {
      setError("Please enter a section name.");
      return;
    }

    setSubmitting(true);
    try {
      await updateClassArmSection(classId, armId, sectionId, {
        name: name.trim(),
      });
      router.push("/v12/all-class-arm-sections");
    } catch (err) {
      console.error("Unable to update section", err);
      setError(
        err instanceof Error ? err.message : "Unable to update section.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!classIdParam || !armIdParam || !sectionId) {
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
        <h3>Class Section Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>
            <Link href="/v12/all-class-arm-sections">
              All Class Arm Sections
            </Link>
          </li>
          <li>Edit Section</li>
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
              <h3>Edit Class Arm Section</h3>
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
                  {submitting ? "Saving…" : "Save Changes"}
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
