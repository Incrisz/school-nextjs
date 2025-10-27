"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  listGradeScales,
  updateGradeScaleRanges,
  type GradeRange,
  type GradeScale,
  type GradeRangePayload,
} from "@/lib/gradeScales";

interface EditableRange {
  key: string;
  id: number | string | null;
  grade_label: string;
  min_score: string;
  max_score: string;
  description: string;
  grade_point: string;
  locked?: boolean;
}

function generateTempKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tmp-${Math.random().toString(36).slice(2, 11)}`;
}

function toEditable(range: GradeRange, index: number): EditableRange {
  return {
    key: `existing-${range.id ?? index}`,
    id: range.id ?? null,
    grade_label: range.grade_label ?? "",
    min_score:
      range.min_score === null || range.min_score === undefined
        ? ""
        : `${range.min_score}`,
    max_score:
      range.max_score === null || range.max_score === undefined
        ? ""
        : `${range.max_score}`,
    description: range.description ?? "",
    grade_point:
      range.grade_point === null || range.grade_point === undefined
        ? ""
        : `${range.grade_point}`,
    locked: range.locked,
  };
}

function createEmptyRange(): EditableRange {
  return {
    key: `new-${generateTempKey()}`,
    id: null,
    grade_label: "",
    min_score: "",
    max_score: "",
    description: "",
    grade_point: "",
  };
}

interface ValidationResult {
  payload: GradeRangePayload[];
  error: string | null;
  invalidKeys: Set<string>;
}

function validateRanges(ranges: EditableRange[]): ValidationResult {
  const invalidKeys = new Set<string>();
  const payload: GradeRangePayload[] = [];

  ranges.forEach((range, index) => {
    const label = range.grade_label.trim();
    const minRaw = range.min_score.trim();
    const maxRaw = range.max_score.trim();
    const gradePointRaw = range.grade_point.trim();
    const description = range.description.trim();

    const min = Number(minRaw);
    const max = Number(maxRaw);
    const gradePoint =
      gradePointRaw === "" ? null : Number.parseFloat(gradePointRaw);

    const isInvalid =
      !label ||
      minRaw === "" ||
      maxRaw === "" ||
      Number.isNaN(min) ||
      Number.isNaN(max) ||
      min < 0 ||
      max < 0 ||
      min > 100 ||
      max > 100 ||
      min > max ||
      (gradePointRaw !== "" &&
        (Number.isNaN(gradePoint) || gradePoint < 0 || gradePoint > 10));

    if (isInvalid) {
      invalidKeys.add(range.key);
      return;
    }

    payload.push({
      id: range.id,
      grade_label: label,
      min_score: min,
      max_score: max,
      description: description || null,
      grade_point: gradePoint,
      order_index: index,
    });
  });

  if (!ranges.length) {
    return {
      payload: [],
      invalidKeys,
      error: "Define at least one grade range before saving.",
    };
  }

  if (invalidKeys.size > 0) {
    return {
      payload: [],
      invalidKeys,
      error: "Fix the highlighted rows before saving.",
    };
  }

  return {
    payload,
    invalidKeys,
    error: null,
  };
}

export default function GradeScalesPage() {
  const [loading, setLoading] = useState(true);
  const [scales, setScales] = useState<GradeScale[]>([]);
  const [selectedScaleId, setSelectedScaleId] = useState<string>("");
  const [ranges, setRanges] = useState<EditableRange[]>([]);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [invalidKeys, setInvalidKeys] = useState<Set<string>>(new Set());
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    listGradeScales()
      .then((data) => {
        if (!active) return;
        setScales(data);
        if (data.length) {
          setSelectedScaleId((current) =>
            current ? current : String(data[0].id),
          );
        }
      })
      .catch((error) => {
        console.error("Unable to load grading scales", error);
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load grading scales.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedScale = useMemo(() => {
    if (!selectedScaleId) {
      return null;
    }
    return (
      scales.find((scale) => String(scale.id) === selectedScaleId) ?? null
    );
  }, [selectedScaleId, scales]);

  useEffect(() => {
    if (!selectedScale) {
      setRanges([]);
      setDeletedIds(new Set());
      setInvalidKeys(new Set());
      return;
    }

    const sorted = [...(selectedScale.grade_ranges ?? [])].sort(
      (a, b) => (a.min_score ?? 0) - (b.min_score ?? 0),
    );
    setRanges(sorted.map(toEditable));
    setDeletedIds(new Set());
    setInvalidKeys(new Set());
    setInfoMessage(null);
    setErrorMessage(null);
  }, [selectedScale]);

  const handleAddRange = () => {
    setRanges((prev) => [...prev, createEmptyRange()]);
  };

  const handleRangeChange = (
    index: number,
    field: keyof EditableRange,
    value: string,
  ) => {
    const targetKey = ranges[index]?.key;
    setRanges((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
    setInvalidKeys((prev) => {
      if (!prev.size) {
        return prev;
      }
      if (!targetKey || !prev.has(targetKey)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(targetKey);
      return next;
    });
  };

  const handleDeleteRange = (index: number) => {
    const target = ranges[index];
    if (!target) {
      return;
    }

    if (target.id) {
      setDeletedIds((existing) => {
        const next = new Set(existing);
        next.add(String(target.id));
        return next;
      });
    }

    setRanges((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

    setInvalidKeys((prev) => {
      if (!prev.size || !target.key || !prev.has(target.key)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(target.key);
      return next;
    });
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedScaleId(event.target.value);
  };

  const handleSave = async () => {
    if (!selectedScaleId) {
      setErrorMessage("Select a grading scale before saving.");
      return;
    }
    setInfoMessage(null);
    setErrorMessage(null);

    const validation = validateRanges(ranges);
    setInvalidKeys(validation.invalidKeys);

    if (validation.error) {
      setErrorMessage(validation.error);
      return;
    }

    try {
      setSaving(true);
      const { scale, message } = await updateGradeScaleRanges(
        selectedScaleId,
        {
          ranges: validation.payload,
          deleted_ids: Array.from(deletedIds),
        },
      );
      setScales((prev) =>
        prev.map((item) => (String(item.id) === String(scale.id) ? scale : item)),
      );
      setInfoMessage(message ?? "Grading scale updated successfully.");
      setDeletedIds(new Set());
    } catch (error) {
      console.error("Unable to save grading scale", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to save grading scale.",
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTableBody = () => {
    if (!selectedScaleId) {
      return (
        <tr>
          <td colSpan={6} className="text-center text-muted">
            Select a grading scale to view ranges.
          </td>
        </tr>
      );
    }

    if (!ranges.length) {
      return (
        <tr>
          <td colSpan={6} className="text-center text-muted">
            No grade ranges defined.
          </td>
        </tr>
      );
    }

    return ranges.map((range, index) => {
      const rowInvalid = invalidKeys.has(range.key);
      return (
        <tr key={range.key} className={rowInvalid ? "table-danger" : undefined}>
          <td>
            <input
              type="text"
              className="form-control"
              value={range.grade_label}
              maxLength={50}
              onChange={(event) =>
                handleRangeChange(index, "grade_label", event.target.value)
              }
              required
            />
          </td>
          <td>
            <input
              type="number"
              className="form-control"
              min={0}
              max={100}
              step={1}
              value={range.min_score}
              onChange={(event) =>
                handleRangeChange(index, "min_score", event.target.value)
              }
              required
            />
          </td>
          <td>
            <input
              type="number"
              className="form-control"
              min={0}
              max={100}
              step={1}
              value={range.max_score}
              onChange={(event) =>
                handleRangeChange(index, "max_score", event.target.value)
              }
              required
            />
          </td>
          <td>
            <textarea
              className="form-control"
              value={range.description}
              maxLength={255}
              onChange={(event) =>
                handleRangeChange(index, "description", event.target.value)
              }
            />
          </td>
          <td>
            <input
              type="number"
              className="form-control"
              min={0}
              max={10}
              step={0.01}
              value={range.grade_point}
              onChange={(event) =>
                handleRangeChange(index, "grade_point", event.target.value)
              }
            />
          </td>
          <td className="text-center">
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDeleteRange(index)}
              disabled={range.locked}
            >
              <i className="fas fa-trash" />
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Grading Scales</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Grading Scales</li>
        </ul>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Active Scale</h3>
            </div>
            <div className="item-title">
              <select
                id="grade-scale-select"
                className="form-control"
                value={selectedScaleId}
                onChange={handleScaleChange}
                disabled={loading || !scales.length}
              >
                {loading ? (
                  <option value="">Loading...</option>
                ) : scales.length ? (
                  scales.map((scale) => (
                    <option key={scale.id} value={String(scale.id)}>
                      {scale.name}
                    </option>
                  ))
                ) : (
                  <option value="">No grading scale available</option>
                )}
              </select>
            </div>
          </div>
          <p className="text-muted mb-0">
            Adjust the ranges below to update the grading system used when
            calculating results.
          </p>
        </div>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Grade Ranges</h3>
            </div>
            <div className="d-flex align-items-center">
              <button
                type="button"
                id="add-grade-row"
                className="btn btn-sm btn-outline-primary mr-2"
                onClick={handleAddRange}
                disabled={!selectedScaleId || saving}
              >
                <i className="fas fa-plus" /> Add Grade
              </button>
              <button
                type="button"
                id="save-grade-scale"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                onClick={handleSave}
                disabled={saving || !selectedScaleId}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          {infoMessage ? (
            <div className="alert alert-info" id="grade-scale-info">
              {infoMessage}
            </div>
          ) : null}
          {errorMessage ? (
            <div className="alert alert-danger" id="grade-scale-error">
              {errorMessage}
            </div>
          ) : null}

          <div className="table-responsive">
            <table className="table table-bordered table-striped grade-scale-table">
              <thead>
                <tr>
                  <th>Grade Label</th>
                  <th>Minimum Score</th>
                  <th>Maximum Score</th>
                  <th>Description</th>
                  <th>Grade Point</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody id="grade-range-table">{renderTableBody()}</tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
