"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  copyFeeStructures,
  createFeeItem,
  createFeeStructure,
  deleteFeeItem,
  deleteFeeStructure,
  listFeeItems,
  listFeeStructuresBySessionTerm,
  updateFeeItem,
  type CopyFeeStructurePayload,
  type FeeItem,
  type FeeStructure,
} from "@/lib/fees";
import { listSessions, type Session } from "@/lib/sessions";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { listTermsBySession, type Term } from "@/lib/terms";

type FeedbackKind = "success" | "info" | "warning" | "danger";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

interface FeeItemFormState {
  id: string | null;
  name: string;
  category: string;
  defaultAmount: string;
  description: string;
  isActive: boolean;
}

interface FeeStructureFormState {
  sessionId: string;
  termId: string;
  classId: string;
  feeItemId: string;
  amount: string;
  isMandatory: boolean;
}

interface FeeStructureFilters {
  sessionId: string;
  termId: string;
  classId: string;
}

interface CopyStructureFormState {
  fromSessionId: string;
  fromTermId: string;
  fromClassId: string;
  toSessionId: string;
  toTermId: string;
  toClassId: string;
}

const initialFeeItemForm: FeeItemFormState = {
  id: null,
  name: "",
  category: "",
  defaultAmount: "",
  description: "",
  isActive: true,
};

const initialStructureForm: FeeStructureFormState = {
  sessionId: "",
  termId: "",
  classId: "",
  feeItemId: "",
  amount: "",
  isMandatory: true,
};

const initialFilters: FeeStructureFilters = {
  sessionId: "",
  termId: "",
  classId: "",
};

const initialCopyForm: CopyStructureFormState = {
  fromSessionId: "",
  fromTermId: "",
  fromClassId: "",
  toSessionId: "",
  toTermId: "",
  toClassId: "",
};

export default function FeeStructurePage() {
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [feeItemForm, setFeeItemForm] =
    useState<FeeItemFormState>(initialFeeItemForm);
  const [feeItemSearch, setFeeItemSearch] = useState("");
  const [feeItemCategoryFilter, setFeeItemCategoryFilter] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [termsCache, setTermsCache] = useState<Record<string, Term[]>>({});
  const [structureForm, setStructureForm] =
    useState<FeeStructureFormState>(initialStructureForm);
  const [filters, setFilters] =
    useState<FeeStructureFilters>(initialFilters);
  const [copyForm, setCopyForm] =
    useState<CopyStructureFormState>(initialCopyForm);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [fetchingStructures, setFetchingStructures] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submittingFeeItem, setSubmittingFeeItem] = useState(false);
  const [submittingStructure, setSubmittingStructure] = useState(false);
  const [copyingStructure, setCopyingStructure] = useState(false);

  useEffect(() => {
    listFeeItems()
      .then(setFeeItems)
      .catch((error) =>
        setFeedback({
          type: "danger",
          message:
            error instanceof Error ? error.message : "Unable to load fee items.",
        }),
      );
    listSessions()
      .then(setSessions)
      .catch((error) =>
        setFeedback({
          type: "danger",
          message:
            error instanceof Error ? error.message : "Unable to load sessions.",
        }),
      );
    listClasses()
      .then(setClasses)
      .catch((error) =>
        setFeedback({
          type: "danger",
          message:
            error instanceof Error ? error.message : "Unable to load classes.",
        }),
      );
  }, []);

  const ensureTerms = useCallback(async (sessionId: string) => {
    if (!sessionId || termsCache[sessionId]) {
      return;
    }
    try {
      const fetched = await listTermsBySession(sessionId);
      setTermsCache((prev) => ({ ...prev, [sessionId]: fetched }));
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error ? error.message : "Unable to load terms.",
      });
    }
  }, [termsCache]);

  useEffect(() => {
    if (structureForm.sessionId) {
      ensureTerms(structureForm.sessionId).catch(() => undefined);
    }
  }, [structureForm.sessionId, ensureTerms]);

  useEffect(() => {
    if (filters.sessionId) {
      ensureTerms(filters.sessionId).catch(() => undefined);
    }
  }, [filters.sessionId, ensureTerms]);

  useEffect(() => {
    if (copyForm.fromSessionId) {
      ensureTerms(copyForm.fromSessionId).catch(() => undefined);
    }
    if (copyForm.toSessionId) {
      ensureTerms(copyForm.toSessionId).catch(() => undefined);
    }
  }, [copyForm.fromSessionId, copyForm.toSessionId, ensureTerms]);

  const termsForSession = useCallback(
    (sessionId: string) => termsCache[sessionId] ?? [],
    [termsCache],
  );

  const feeItemCategories = useMemo(() => {
    const categories = new Set<string>();
    feeItems.forEach((item) => {
      if (item.category) {
        categories.add(String(item.category));
      }
    });
    return Array.from(categories).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [feeItems]);

  const filteredFeeItems = useMemo(() => {
    const search = feeItemSearch.trim().toLowerCase();
    const categoryFilter = feeItemCategoryFilter.trim().toLowerCase();
    return feeItems.filter((item) => {
      const matchesCategory =
        !categoryFilter ||
        (item.category ?? "").toLowerCase() === categoryFilter;
      const matchesSearch =
        !search ||
        (item.name ?? "").toLowerCase().includes(search) ||
        (item.description ?? "").toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [feeItems, feeItemSearch, feeItemCategoryFilter]);

  const loadStructures = useCallback(
    async (targetFilters: FeeStructureFilters) => {
      if (!targetFilters.sessionId || !targetFilters.termId) {
        setFeedback({
          type: "warning",
          message: "Select session and term to load fee structures.",
        });
        return;
      }
      setFetchingStructures(true);
      try {
        const list = await listFeeStructuresBySessionTerm({
          session_id: targetFilters.sessionId,
          term_id: targetFilters.termId,
        });
        const filtered = targetFilters.classId
          ? list.filter(
              (structure) =>
                String(structure.class?.id ?? "") === targetFilters.classId,
            )
          : list;
        setStructures(filtered);
      } catch (error) {
        setFeedback({
          type: "danger",
          message:
            error instanceof Error
              ? error.message
              : "Unable to load fee structures.",
        });
        setStructures([]);
      } finally {
        setFetchingStructures(false);
      }
    },
    [],
  );

  const handleFeeItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!feeItemForm.name.trim()) {
      setFeedback({
        type: "warning",
        message: "Fee item name is required.",
      });
      return;
    }
    const amountValue = Number(feeItemForm.defaultAmount);
    if (!Number.isFinite(amountValue)) {
      setFeedback({
        type: "warning",
        message: "Enter a valid default amount.",
      });
      return;
    }
    const payload = {
      name: feeItemForm.name.trim(),
      category: feeItemForm.category.trim() || null,
      default_amount: amountValue,
      description: feeItemForm.description.trim() || null,
      is_active: feeItemForm.isActive,
    };
    setSubmittingFeeItem(true);
    try {
      if (feeItemForm.id) {
        await updateFeeItem(feeItemForm.id, payload);
        setFeedback({
          type: "success",
          message: "Fee item updated successfully.",
        });
      } else {
        await createFeeItem(payload);
        setFeedback({
          type: "success",
          message: "Fee item created successfully.",
        });
      }
      const items = await listFeeItems();
      setFeeItems(items);
      setFeeItemForm(initialFeeItemForm);
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error ? error.message : "Unable to save fee item.",
      });
    } finally {
      setSubmittingFeeItem(false);
    }
  };

  const handleEditFeeItem = (item: FeeItem) => {
    setFeeItemForm({
      id: String(item.id),
      name: item.name ?? "",
      category: item.category ?? "",
      defaultAmount: String(item.default_amount ?? ""),
      description: item.description ?? "",
      isActive: Boolean(item.is_active ?? true),
    });
  };

  const handleDeleteFeeItem = async (itemId: string | number) => {
    if (!window.confirm("Delete this fee item?")) {
      return;
    }
    try {
      await deleteFeeItem(itemId);
      setFeedback({
        type: "success",
        message: "Fee item deleted.",
      });
      const items = await listFeeItems();
      setFeeItems(items);
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete fee item.",
      });
    }
  };

  const handleStructureSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !structureForm.sessionId ||
      !structureForm.termId ||
      !structureForm.classId ||
      !structureForm.feeItemId
    ) {
      setFeedback({
        type: "warning",
        message: "Complete all required fields.",
      });
      return;
    }
    const amountValue = Number(structureForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFeedback({
        type: "warning",
        message: "Enter a valid amount for the fee structure.",
      });
      return;
    }
    setSubmittingStructure(true);
    try {
      await createFeeStructure({
        session_id: structureForm.sessionId,
        term_id: structureForm.termId,
        class_id: structureForm.classId,
        fee_item_id: structureForm.feeItemId,
        amount: amountValue,
        is_mandatory: structureForm.isMandatory,
      });
      setFeedback({
        type: "success",
        message: "Fee structure entry created.",
      });
      setStructureForm((prev) => ({
        ...prev,
        feeItemId: "",
        amount: "",
        isMandatory: true,
      }));
      if (
        filters.sessionId === structureForm.sessionId &&
        filters.termId === structureForm.termId &&
        (!filters.classId || filters.classId === structureForm.classId)
      ) {
        await loadStructures(filters);
      }
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to create fee structure.",
      });
    } finally {
      setSubmittingStructure(false);
    }
  };

  const handleDeleteStructure = async (structureId: string | number) => {
    if (!window.confirm("Delete this fee structure entry?")) {
      return;
    }
    try {
      await deleteFeeStructure(structureId);
      setFeedback({
        type: "success",
        message: "Fee structure entry deleted.",
      });
      await loadStructures(filters);
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete fee structure entry.",
      });
    }
  };

  const handleLoadStructures = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await loadStructures(filters);
  };

  const handleCopyStructures = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (
      !copyForm.fromClassId ||
      !copyForm.fromSessionId ||
      !copyForm.fromTermId ||
      !copyForm.toClassId ||
      !copyForm.toSessionId ||
      !copyForm.toTermId
    ) {
      setFeedback({
        type: "warning",
        message: "Complete all fields before copying structures.",
      });
      return;
    }
    const payload: CopyFeeStructurePayload = {
      from_class_id: copyForm.fromClassId,
      from_session_id: copyForm.fromSessionId,
      from_term_id: copyForm.fromTermId,
      to_class_id: copyForm.toClassId,
      to_session_id: copyForm.toSessionId,
      to_term_id: copyForm.toTermId,
    };
    setCopyingStructure(true);
    try {
      const result = await copyFeeStructures(payload);
      const created = result.data?.created_count ?? 0;
      const skipped = result.data?.skipped_count ?? 0;
      setFeedback({
        type: "success",
        message: `Successfully copied ${created} structure(s). ${skipped} skipped.`,
      });
      if (
        filters.sessionId === payload.to_session_id &&
        filters.termId === payload.to_term_id &&
        (!filters.classId || filters.classId === payload.to_class_id)
      ) {
        await loadStructures(filters);
      }
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to copy fee structures.",
      });
    } finally {
      setCopyingStructure(false);
    }
  };

  const formatCurrency = useCallback((value: number | string | undefined) => {
    const amount = Number(value ?? 0);
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 2,
    }).format(amount);
  }, []);

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Fee Structure</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Fee Management</li>
          <li>Fee Structure</li>
        </ul>
      </div>

      {feedback ? (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      ) : null}

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Fee Items</h3>
            </div>
          </div>

          <form onSubmit={handleFeeItemSubmit} className="mb-3">
            <div className="form-row">
              <div className="col-md-4 form-group">
                <label htmlFor="fee-item-name">Name *</label>
                <input
                  id="fee-item-name"
                  type="text"
                  className="form-control"
                  value={feeItemForm.name}
                  onChange={(event) =>
                    setFeeItemForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="fee-item-category">Category</label>
                <input
                  id="fee-item-category"
                  type="text"
                  className="form-control"
                  value={feeItemForm.category}
                  onChange={(event) =>
                    setFeeItemForm((prev) => ({
                      ...prev,
                      category: event.target.value,
                    }))
                  }
                  list="fee-category-suggestions"
                />
                <datalist id="fee-category-suggestions">
                  {feeItemCategories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div className="col-md-2 form-group">
                <label htmlFor="fee-item-amount">Default Amount *</label>
                <input
                  id="fee-item-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={feeItemForm.defaultAmount}
                  onChange={(event) =>
                    setFeeItemForm((prev) => ({
                      ...prev,
                      defaultAmount: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="fee-item-description">Description</label>
                <input
                  id="fee-item-description"
                  type="text"
                  className="form-control"
                  value={feeItemForm.description}
                  onChange={(event) =>
                    setFeeItemForm((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-row align-items-center">
              <div className="col-md-3 form-group">
                <div className="form-check mt-4">
                  <input
                    id="fee-item-active"
                    className="form-check-input"
                    type="checkbox"
                    checked={feeItemForm.isActive}
                    onChange={(event) =>
                      setFeeItemForm((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="fee-item-active">
                    Active
                  </label>
                </div>
              </div>
              <div className="col-md-9 text-right">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submittingFeeItem}
                >
                  {submittingFeeItem ? "Saving..." : feeItemForm.id ? "Update" : "Add"}
                </button>
                {feeItemForm.id ? (
                  <button
                    type="button"
                    className="btn btn-link ml-2"
                    onClick={() => setFeeItemForm(initialFeeItemForm)}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>
          </form>

          <div className="table-responsive">
            <div className="row mb-2">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search fee items..."
                  value={feeItemSearch}
                  onChange={(event) => setFeeItemSearch(event.target.value)}
                />
              </div>
              <div className="col-md-4">
                <select
                  className="form-control"
                  value={feeItemCategoryFilter}
                  onChange={(event) =>
                    setFeeItemCategoryFilter(event.target.value)
                  }
                >
                  <option value="">All categories</option>
                  {feeItemCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2 text-right">
                {(feeItemSearch || feeItemCategoryFilter) && (
                  <button
                    type="button"
                    className="btn btn-link"
                    onClick={() => {
                      setFeeItemSearch("");
                      setFeeItemCategoryFilter("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Default Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeItems.length ? (
                  filteredFeeItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.category ?? "—"}</td>
                      <td>{formatCurrency(item.default_amount ?? 0)}</td>
                      <td>
                        <span
                          className={`badge badge-${
                            item.is_active ? "success" : "secondary"
                          }`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mr-2"
                          onClick={() => handleEditFeeItem(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteFeeItem(item.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center">
                      No fee items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Create Fee Structure Entry</h3>
            </div>
          </div>
          <form onSubmit={handleStructureSubmit}>
            <div className="form-row">
              <div className="col-md-3 form-group">
                <label htmlFor="structure-session">Session *</label>
                <select
                  id="structure-session"
                  className="form-control"
                  value={structureForm.sessionId}
                  onChange={(event) =>
                    setStructureForm((prev) => ({
                      ...prev,
                      sessionId: event.target.value,
                      termId: "",
                    }))
                  }
                  required
                >
                  <option value="">Select Session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={String(session.id)}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="structure-term">Term *</label>
                <select
                  id="structure-term"
                  className="form-control"
                  value={structureForm.termId}
                  onChange={(event) =>
                    setStructureForm((prev) => ({
                      ...prev,
                      termId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select Term</option>
                  {termsForSession(structureForm.sessionId).map((term) => (
                    <option key={term.id} value={String(term.id)}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="structure-class">Class *</label>
                <select
                  id="structure-class"
                  className="form-control"
                  value={structureForm.classId}
                  onChange={(event) =>
                    setStructureForm((prev) => ({
                      ...prev,
                      classId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={String(schoolClass.id)}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="structure-fee-item">Fee Item *</label>
                <select
                  id="structure-fee-item"
                  className="form-control"
                  value={structureForm.feeItemId}
                  onChange={(event) =>
                    setStructureForm((prev) => ({
                      ...prev,
                      feeItemId: event.target.value,
                      amount:
                        feeItems.find(
                          (item) => String(item.id) === event.target.value,
                        )?.default_amount?.toString() ?? prev.amount,
                    }))
                  }
                  required
                >
                  <option value="">Select Fee Item</option>
                  {feeItems
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="form-row align-items-end">
              <div className="col-md-3 form-group">
                <label htmlFor="structure-amount">Amount *</label>
                <input
                  id="structure-amount"
                  type="number"
                  className="form-control"
                  min="0"
                  step="0.01"
                  value={structureForm.amount}
                  onChange={(event) =>
                    setStructureForm((prev) => ({
                      ...prev,
                      amount: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-md-3 form-group">
                <div className="form-check mt-4">
                  <input
                    id="structure-mandatory"
                    className="form-check-input"
                    type="checkbox"
                    checked={structureForm.isMandatory}
                    onChange={(event) =>
                      setStructureForm((prev) => ({
                        ...prev,
                        isMandatory: event.target.checked,
                      }))
                    }
                  />
                  <label
                    className="form-check-label"
                    htmlFor="structure-mandatory"
                  >
                    Mandatory
                  </label>
                </div>
              </div>
              <div className="col-md-6 text-right">
                <button
                  type="submit"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  disabled={submittingStructure}
                >
                  {submittingStructure ? "Saving..." : "Add Entry"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Fee Structure Overview</h3>
            </div>
          </div>
          <form onSubmit={handleLoadStructures}>
            <div className="form-row">
              <div className="col-md-3 form-group">
                <label htmlFor="filter-session">Session *</label>
                <select
                  id="filter-session"
                  className="form-control"
                  value={filters.sessionId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      sessionId: event.target.value,
                      termId: "",
                    }))
                  }
                  required
                >
                  <option value="">Select Session</option>
                  {sessions.map((session) => (
                    <option key={session.id} value={String(session.id)}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="filter-term">Term *</label>
                <select
                  id="filter-term"
                  className="form-control"
                  value={filters.termId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      termId: event.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select Term</option>
                  {termsForSession(filters.sessionId).map((term) => (
                    <option key={term.id} value={String(term.id)}>
                      {term.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="filter-class">Class</label>
                <select
                  id="filter-class"
                  className="form-control"
                  value={filters.classId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      classId: event.target.value,
                    }))
                  }
                >
                  <option value="">All Classes</option>
                  {classes.map((schoolClass) => (
                    <option key={schoolClass.id} value={String(schoolClass.id)}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3 form-group d-flex align-items-end">
                <button
                  type="submit"
                  className="btn btn-outline-primary"
                  disabled={fetchingStructures}
                >
                  {fetchingStructures ? "Loading..." : "Load Structures"}
                </button>
              </div>
            </div>
          </form>

          <div id="feeStructuresContainer" className="mt-3">
            {fetchingStructures ? (
              <p className="text-center">Loading structures...</p>
            ) : structures.length ? (
              structures.map((structure) => (
                <div className="card mb-3" key={structure.id}>
                  <div className="card-header bg-primary text-white">
                    <h6 className="mb-0">
                      {structure.class?.name ?? "Class"} &mdash; Total:{" "}
                      {formatCurrency(structure.total_amount ?? 0)}
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Fee Item</th>
                            <th>Amount</th>
                            <th>Type</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(structure.fee_items ?? []).length ? (
                            (structure.fee_items ?? []).map((item) => (
                              <tr key={item.id}>
                                <td>{item.fee_item?.name ?? "—"}</td>
                                <td>{formatCurrency(item.amount ?? 0)}</td>
                                <td>
                                  <span
                                    className={`badge badge-${
                                      item.is_mandatory ? "primary" : "secondary"
                                    }`}
                                  >
                                    {item.is_mandatory ? "Mandatory" : "Optional"}
                                  </span>
                                </td>
                                <td>
                                  {item.id ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteStructure(item.id)}
                                    >
                                      Delete
                                    </button>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="text-center">
                                No entries found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted">
                No fee structures found for the selected filters.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card height-auto mb-4">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Copy Fee Structures</h3>
            </div>
          </div>
          <form onSubmit={handleCopyStructures}>
            <div className="row">
              <div className="col-lg-6">
                <h5>Copy From</h5>
                <div className="form-group">
                  <label htmlFor="copy-from-session">Session *</label>
                  <select
                    id="copy-from-session"
                    className="form-control"
                    value={copyForm.fromSessionId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        fromSessionId: event.target.value,
                        fromTermId: "",
                      }))
                    }
                    required
                  >
                    <option value="">Select Session</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={String(session.id)}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="copy-from-term">Term *</label>
                  <select
                    id="copy-from-term"
                    className="form-control"
                    value={copyForm.fromTermId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        fromTermId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select Term</option>
                    {termsForSession(copyForm.fromSessionId).map((term) => (
                      <option key={term.id} value={String(term.id)}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="copy-from-class">Class *</label>
                  <select
                    id="copy-from-class"
                    className="form-control"
                    value={copyForm.fromClassId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        fromClassId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={String(schoolClass.id)}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-lg-6">
                <h5>Copy To</h5>
                <div className="form-group">
                  <label htmlFor="copy-to-session">Session *</label>
                  <select
                    id="copy-to-session"
                    className="form-control"
                    value={copyForm.toSessionId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        toSessionId: event.target.value,
                        toTermId: "",
                      }))
                    }
                    required
                  >
                    <option value="">Select Session</option>
                    {sessions.map((session) => (
                      <option key={session.id} value={String(session.id)}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="copy-to-term">Term *</label>
                  <select
                    id="copy-to-term"
                    className="form-control"
                    value={copyForm.toTermId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        toTermId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select Term</option>
                    {termsForSession(copyForm.toSessionId).map((term) => (
                      <option key={term.id} value={String(term.id)}>
                        {term.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="copy-to-class">Class *</label>
                  <select
                    id="copy-to-class"
                    className="form-control"
                    value={copyForm.toClassId}
                    onChange={(event) =>
                      setCopyForm((prev) => ({
                        ...prev,
                        toClassId: event.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map((schoolClass) => (
                      <option key={schoolClass.id} value={String(schoolClass.id)}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                disabled={copyingStructure}
              >
                {copyingStructure ? "Copying..." : "Copy Structures"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
