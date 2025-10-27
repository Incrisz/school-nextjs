"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listClasses, type SchoolClass } from "@/lib/classes";
import {
  deleteClassArm,
  listClassArms,
  type ClassArm,
} from "@/lib/classArms";

export default function AllClassArmsPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listClasses()
      .then((data) => {
        setClasses(data);
        if (data.length) {
          setSelectedClassId(`${data[0].id}`);
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

  const loadArms = useCallback(async (classId: string) => {
    setLoading(true);
    try {
      const data = await listClassArms(classId);
      setArms(data);
      setError(null);
    } catch (err) {
      console.error("Unable to load class arms", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load class arms for this class.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setArms([]);
      return;
    }
    loadArms(selectedClassId).catch((err) =>
      console.error("Unable to fetch class arms", err),
    );
  }, [selectedClassId, loadArms]);

  const selectedClassName = useMemo(() => {
    return (
      classes.find((entry) => `${entry.id}` === selectedClassId)?.name ?? ""
    );
  }, [classes, selectedClassId]);

  const handleDelete = async (arm: ClassArm) => {
    if (
      !window.confirm(
        `Delete class arm "${arm.name}" from class "${selectedClassName}"?`,
      )
    ) {
      return;
    }
    try {
      await deleteClassArm(selectedClassId, arm.id);
      await loadArms(selectedClassId);
    } catch (err) {
      console.error("Unable to delete class arm", err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to delete class arm. Please try again.",
      );
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
          <li>All Class Arms</li>
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
              <h3>Class Arms</h3>
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
                    if (selectedClassId) {
                      loadArms(selectedClassId).catch((err) => {
                        console.error("Unable to refresh class arms", err);
                        alert(
                          err instanceof Error
                            ? err.message
                            : "Unable to refresh class arms.",
                        );
                      });
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
            <div className="col-lg-6 col-12 form-group">
              <label htmlFor="class-select-filter">Select Class</label>
              <select
                id="class-select-filter"
                className="form-control"
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
              >
                <option value="">Choose class</option>
                {classes.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-lg-6 col-12 d-flex align-items-end justify-content-end">
              <Link
                href="/v12/add-class-arm"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
              >
                Add Class Arm
              </Link>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table display data-table text-nowrap">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Arm Name</th>
                  <th>Class</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {!selectedClassId ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      Select a class to view its arms.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      Loading class arms…
                    </td>
                  </tr>
                ) : arms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center">
                      No class arms found for this class.
                    </td>
                  </tr>
                ) : (
                  arms.map((arm, index) => (
                    <tr key={arm.id}>
                      <td>{index + 1}</td>
                      <td>{arm.name}</td>
                      <td>{selectedClassName || "—"}</td>
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
                              href={`/v12/edit-class-arm?classId=${selectedClassId}&id=${arm.id}`}
                            >
                              <i className="fas fa-cogs text-dark-pastel-green" />
                              Edit
                            </Link>
                            <button
                              className="dropdown-item"
                              type="button"
                              onClick={() => handleDelete(arm)}
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
