"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listClasses, type SchoolClass } from "@/lib/classes";
import {
  listClassArms,
  type ClassArm,
} from "@/lib/classArms";
import {
  deleteClassArmSection,
  listClassArmSections,
  type ClassArmSection,
} from "@/lib/classArmSections";

export default function AllClassArmSectionsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classArms, setClassArms] = useState<ClassArm[]>([]);
  const [sections, setSections] = useState<ClassArmSection[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedArmId, setSelectedArmId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClasses()
      .then((data) => setClasses(data))
      .catch((err) => {
        console.error("Unable to load classes", err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load classes. Please try again.",
        );
      });
  }, []);

  const loadArms = useCallback(async (classId: string) => {
    if (!classId) {
      setClassArms([]);
      return;
    }

    try {
      const arms = await listClassArms(classId);
      setClassArms(arms);
      if (!arms.find((arm) => `${arm.id}` === selectedArmId)) {
        setSelectedArmId(arms.length ? `${arms[0].id}` : "");
      }
    } catch (err) {
      console.error("Unable to load class arms", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load class arms for this class.",
      );
    }
  }, [selectedArmId]);

  useEffect(() => {
    if (!selectedClassId) {
      setClassArms([]);
      setSelectedArmId("");
      setSections([]);
      return;
    }
    loadArms(selectedClassId).catch((err) =>
      console.error("Unable to fetch class arms", err),
    );
  }, [selectedClassId, loadArms]);

  const loadSections = useCallback(async (classId: string, armId: string) => {
    if (!classId || !armId) {
      setSections([]);
      return;
    }

    setLoading(true);
    try {
      const data = await listClassArmSections(classId, armId);
      setSections(data);
      setError(null);
    } catch (err) {
      console.error("Unable to load sections", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load sections for this class arm.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId || !selectedArmId) {
      setSections([]);
      return;
    }
    loadSections(selectedClassId, selectedArmId).catch((err) =>
      console.error("Unable to fetch sections", err),
    );
  }, [selectedClassId, selectedArmId, loadSections]);

  const className = useMemo(
    () =>
      classes.find((entry) => `${entry.id}` === selectedClassId)?.name ?? "",
    [classes, selectedClassId],
  );

  const armName = useMemo(
    () => classArms.find((entry) => `${entry.id}` === selectedArmId)?.name ?? "",
    [classArms, selectedArmId],
  );

  const handleDelete = async (section: ClassArmSection) => {
    if (
      !selectedClassId ||
      !selectedArmId ||
      !window.confirm(
        `Delete section "${section.name}" from ${className} - ${armName}?`,
      )
    ) {
      return;
    }

    try {
      await deleteClassArmSection(selectedClassId, selectedArmId, section.id);
      await loadSections(selectedClassId, selectedArmId);
    } catch (err) {
      console.error("Unable to delete class arm section", err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to delete section. Please try again.",
      );
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Class Sections</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>All Class Sections</li>
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
              <h3>Class Arm Sections</h3>
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
                <button className="dropdown-item" type="button">
                  <i className="fas fa-times text-orange-red" />
                  Close
                </button>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    if (selectedClassId && selectedArmId) {
                      loadSections(selectedClassId, selectedArmId).catch(
                        (err) => {
                          console.error("Unable to refresh sections", err);
                          alert(
                            err instanceof Error
                              ? err.message
                              : "Unable to refresh sections.",
                          );
                        },
                      );
                    }
                  }}
                >
                  <i className="fas fa-redo-alt text-orange-peel" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-lg-4 col-12 form-group">
              <label htmlFor="class-select-filter">Select Class</label>
              <select
                id="class-select-filter"
                className="form-control"
                value={selectedClassId}
                onChange={(event) => {
                  setSelectedClassId(event.target.value);
                  setSelectedArmId("");
                }}
              >
                <option value="">Choose class</option>
                {classes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-4 col-12 form-group">
              <label htmlFor="arm-select-filter">Select Class Arm</label>
              <select
                id="arm-select-filter"
                className="form-control"
                value={selectedArmId}
                onChange={(event) => setSelectedArmId(event.target.value)}
                disabled={!selectedClassId || classArms.length === 0}
              >
                <option value="">Choose class arm</option>
                {classArms.map((arm) => (
                  <option key={arm.id} value={arm.id}>
                    {arm.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-4 col-12 d-flex align-items-end justify-content-end">
              <Link
                href="/v12/add-class-arm-section"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
              >
                Add Section
              </Link>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table display data-table text-nowrap">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Section</th>
                  <th>Class Arm</th>
                  <th>Class</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!selectedClassId || !selectedArmId ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      Select a class and arm to view sections.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      Loading sections…
                    </td>
                  </tr>
                ) : sections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No sections found.
                    </td>
                  </tr>
                ) : (
                  sections.map((section, index) => (
                    <tr key={section.id}>
                      <td>{index + 1}</td>
                      <td>{section.name}</td>
                      <td>{armName || "—"}</td>
                      <td>{className || "—"}</td>
                      <td>
                        <div className="dropdown">
                          <a
                            href="#"
                            className="dropdown-toggle"
                            data-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <span className="flaticon-more-button-of-three-dots" />
                          </a>
                          <div className="dropdown-menu dropdown-menu-right">
                            <Link
                              className="dropdown-item"
                              href={`/v12/edit-class-arm-section?classId=${selectedClassId}&armId=${selectedArmId}&id=${section.id}`}
                            >
                              <i className="fas fa-cogs text-dark-pastel-green" />
                              Edit
                            </Link>
                            <button
                              className="dropdown-item"
                              type="button"
                              onClick={() => handleDelete(section)}
                            >
                              <i className="fas fa-times text-orange-red" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <footer className="footer-wrap-layout1">
        <div className="copyright">
          © Copyrights <a href="#">Cyfamod Technologies</a> 2026. All rights
          reserved.
        </div>
      </footer>
    </>
  );
}
