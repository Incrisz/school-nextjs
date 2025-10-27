"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createBankDetail,
  deleteBankDetail,
  listBankDetails,
  setDefaultBankDetail,
  updateBankDetail,
  type BankDetail,
} from "@/lib/bankDetails";

type FeedbackKind = "success" | "info" | "warning" | "danger";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

interface BankFormState {
  id: string | null;
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankCode: string;
  branch: string;
  isDefault: boolean;
  isActive: boolean;
}

const initialForm: BankFormState = {
  id: null,
  bankName: "",
  accountName: "",
  accountNumber: "",
  bankCode: "",
  branch: "",
  isDefault: false,
  isActive: true,
};

export default function BankDetailsPage() {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [form, setForm] = useState<BankFormState>(initialForm);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    refreshBankDetails().catch(() => undefined);
  }, []);

  const refreshBankDetails = async () => {
    setLoading(true);
    try {
      const records = await listBankDetails();
      setBankDetails(records);
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load bank accounts.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDetails = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return bankDetails;
    }
    return bankDetails.filter((detail) => {
      const fields = [
        detail.bank_name,
        detail.account_name,
        detail.account_number,
        detail.branch,
      ];
      return fields.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );
    });
  }, [bankDetails, search]);

  const handleEdit = (detail: BankDetail) => {
    setForm({
      id: String(detail.id),
      bankName: detail.bank_name ?? "",
      accountName: detail.account_name ?? "",
      accountNumber: detail.account_number ?? "",
      bankCode: detail.bank_code ?? "",
      branch: detail.branch ?? "",
      isDefault: Boolean(detail.is_default),
      isActive: Boolean(detail.is_active ?? true),
    });
  };

  const handleDelete = async (detailId: string | number) => {
    if (!window.confirm("Delete this bank account?")) {
      return;
    }
    try {
      await deleteBankDetail(detailId);
      setFeedback({
        type: "success",
        message: "Bank account deleted successfully.",
      });
      await refreshBankDetails();
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete bank account.",
      });
    }
  };

  const handleSetDefault = async (detailId: string | number) => {
    try {
      await setDefaultBankDetail(detailId);
      setFeedback({
        type: "success",
        message: "Default bank account updated.",
      });
      await refreshBankDetails();
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to set default account.",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      setFeedback({
        type: "warning",
        message: "Bank name, account name, and account number are required.",
      });
      return;
    }
    const payload = {
      bank_name: form.bankName.trim(),
      account_name: form.accountName.trim(),
      account_number: form.accountNumber.trim(),
      bank_code: form.bankCode.trim() || null,
      branch: form.branch.trim() || null,
      is_default: form.isDefault,
      is_active: form.isActive,
    };
    setSubmitting(true);
    try {
      if (form.id) {
        await updateBankDetail(form.id, payload);
        setFeedback({
          type: "success",
          message: "Bank account updated successfully.",
        });
      } else {
        await createBankDetail(payload);
        setFeedback({
          type: "success",
          message: "Bank account added successfully.",
        });
      }
      setForm(initialForm);
      await refreshBankDetails();
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save bank account.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Bank Details</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Fee Management</li>
          <li>Bank Details</li>
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
              <h3>{form.id ? "Edit Bank Account" : "Add Bank Account"}</h3>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="col-md-4 form-group">
                <label htmlFor="bank-name">Bank Name *</label>
                <input
                  id="bank-name"
                  type="text"
                  className="form-control"
                  value={form.bankName}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, bankName: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="col-md-4 form-group">
                <label htmlFor="account-name">Account Name *</label>
                <input
                  id="account-name"
                  type="text"
                  className="form-control"
                  value={form.accountName}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      accountName: event.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="col-md-4 form-group">
                <label htmlFor="account-number">Account Number *</label>
                <input
                  id="account-number"
                  type="text"
                  className="form-control"
                  value={form.accountNumber}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      accountNumber: event.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="col-md-3 form-group">
                <label htmlFor="bank-code">Bank Code</label>
                <input
                  id="bank-code"
                  type="text"
                  className="form-control"
                  value={form.bankCode}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      bankCode: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-md-3 form-group">
                <label htmlFor="branch">Branch</label>
                <input
                  id="branch"
                  type="text"
                  className="form-control"
                  value={form.branch}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      branch: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-md-3 form-group">
                <div className="form-check mt-4">
                  <input
                    id="is-default"
                    className="form-check-input"
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isDefault: event.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="is-default">
                    Default Account
                  </label>
                </div>
              </div>
              <div className="col-md-3 form-group">
                <div className="form-check mt-4">
                  <input
                    id="is-active"
                    className="form-check-input"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="is-active">
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="text-right">
              <button
                type="submit"
                className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                disabled={submitting}
              >
                {submitting
                  ? "Saving..."
                  : form.id
                    ? "Update Account"
                    : "Add Account"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  className="btn btn-link ml-2"
                  onClick={() => setForm(initialForm)}
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Bank Accounts</h3>
            </div>
          </div>
          <div className="row mb-3">
            <div className="col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search accounts..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-md-6 text-right">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => refreshBankDetails().catch(() => undefined)}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Bank</th>
                  <th>Account Name</th>
                  <th>Account Number</th>
                  <th>Branch</th>
                  <th>Status</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetails.length ? (
                  filteredDetails.map((detail) => (
                    <tr key={detail.id}>
                      <td>{detail.bank_name}</td>
                      <td>{detail.account_name}</td>
                      <td>
                        <strong>{detail.account_number}</strong>
                      </td>
                      <td>{detail.branch ?? "—"}</td>
                      <td>
                        <span
                          className={`badge badge-${
                            detail.is_active ? "success" : "secondary"
                          }`}
                        >
                          {detail.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        {detail.is_default ? (
                          <span className="badge badge-primary">
                            <i className="fas fa-star mr-1" />
                            Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleSetDefault(detail.id)}
                          >
                            Set Default
                          </button>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary mr-2"
                          onClick={() => handleEdit(detail)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(detail.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center">
                      {loading
                        ? "Loading bank accounts..."
                        : "No bank accounts found."}
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
