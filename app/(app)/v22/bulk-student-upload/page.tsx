"use client";

import Link from "next/link";
import {
  DragEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BulkPreviewFailure,
  BulkPreviewRow,
  BulkPreviewSummary,
  previewStudentBulkUpload,
  downloadStudentTemplate,
  commitStudentBulkUpload,
} from "@/lib/studentBulkUpload";

type FeedbackKind = "success" | "info" | "warning" | "danger";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

interface PreviewState {
  batchId: string;
  rows: BulkPreviewRow[];
  summary: BulkPreviewSummary | null;
  expiresAt: string | null;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const INITIAL_FEEDBACK: FeedbackState = {
  type: "info",
  message:
    "Download the template to get started. When your CSV is ready, upload it to validate.",
};

export default function BulkStudentUploadPage() {
  const [feedback, setFeedback] =
    useState<FeedbackState | null>(INITIAL_FEEDBACK);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [validationFailure, setValidationFailure] =
    useState<BulkPreviewFailure | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const summaryItems = useMemo(() => {
    if (!preview?.summary) {
      return [];
    }
    return [
      {
        label: "Total Rows",
        value: preview.summary.total_rows ?? 0,
      },
      {
        label: "Unique Sessions",
        value: preview.summary.sessions ?? 0,
      },
      {
        label: "Unique Classes",
        value: preview.summary.classes ?? 0,
      },
    ];
  }, [preview?.summary]);

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setPreview(null);
    setValidationFailure(null);
    setFeedback(INITIAL_FEEDBACK);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleDownloadTemplate = useCallback(async () => {
    setFeedback(null);
    try {
      setDownloadingTemplate(true);
      const blob = await downloadStudentTemplate();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `student-bulk-template-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setFeedback({
        type: "success",
        message: "Template downloaded. Fill it in and upload to continue.",
      });
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to download template.",
      });
    } finally {
      setDownloadingTemplate(false);
    }
  }, []);

  const handleFileChosen = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFeedback({
        type: "warning",
        message: "Only CSV files are supported. Please choose a .csv file.",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFeedback({
        type: "warning",
        message: "File is larger than 5MB. Split it and try again.",
      });
      return;
    }
    setSelectedFile(file);
    setFeedback({
      type: "info",
      message: 'File selected. Click "Upload & Preview" to validate.',
    });
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileChosen(file);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      handleFileChosen(file);
    }
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleUploadPreview = async () => {
    if (!selectedFile) {
      setFeedback({
        type: "warning",
        message: "Please choose a CSV file before uploading.",
      });
      return;
    }

    setUploading(true);
    setFeedback({
      type: "info",
      message: "Validating file. Please wait...",
    });
    setValidationFailure(null);
    setPreview(null);

    try {
      const result = await previewStudentBulkUpload(selectedFile);
      if (!result.ok) {
        setValidationFailure(result.error);
        setFeedback({
          type: "danger",
          message: result.error.message,
        });
        return;
      }
      setPreview({
        batchId: result.data.batchId,
        rows: result.data.previewRows,
        summary: result.data.summary,
        expiresAt: result.data.expiresAt,
      });
      setValidationFailure(null);
      setFeedback({
        type: "success",
        message:
          "Validation successful. Review the preview and confirm to import all students.",
      });
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate file.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!preview?.batchId) {
      setFeedback({
        type: "warning",
        message: "Upload a file and preview the data before confirming.",
      });
      return;
    }
    setConfirming(true);
    setFeedback({
      type: "info",
      message: "Creating students. This may take a moment...",
    });

    try {
      const result = await commitStudentBulkUpload(preview.batchId);
      setFeedback({
        type: "success",
        message:
          result.message ??
          `Upload complete! ${result.summary?.total_processed ?? 0} students were created.`,
      });
      resetState();
    } catch (error) {
      setFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Bulk upload failed. Please retry.",
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleDownloadErrorLog = () => {
    const errorCsv = validationFailure?.errorCsv;
    if (!errorCsv) {
      setFeedback({
        type: "info",
        message: "No error log available. Upload a file to generate one.",
      });
      return;
    }
    try {
      const byteCharacters = atob(errorCsv);
      const byteNumbers = new Array(byteCharacters.length);
      for (let index = 0; index < byteCharacters.length; index += 1) {
        byteNumbers[index] = byteCharacters.charCodeAt(index);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `bulk-upload-errors-${new Date()
        .toISOString()
        .slice(0, 19)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      setFeedback({
        type: "danger",
        message: "Unable to download the error log. Please try again.",
      });
    }
  };

  const previewRows = useMemo(() => preview?.rows ?? [], [preview?.rows]);
  const validationErrors = validationFailure?.errors ?? [];

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Bulk Student Upload</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Students</li>
          <li>Bulk Upload</li>
        </ul>
      </div>

      <div className="row">
        <div className="col-lg-4">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1">
                <div className="item-title">
                  <h3>Quick Guide</h3>
                </div>
              </div>
              <ol className="bulk-upload-steps">
                <li>Download the CSV template tailored to your school.</li>
                <li>
                  Fill in student &amp; guardian details (use the examples
                  provided).
                </li>
                <li>Upload the completed file to preview the parsed data.</li>
                <li>Confirm the upload to create all student records.</li>
              </ol>
              <p className="text-muted small mb-0">
                Tip: keep a copy of the template for reference. If you change
                your class or session setup, download a fresh template so the
                column hints stay accurate.
              </p>
            </div>
          </div>
        </div>
        <div className="col-lg-8">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 align-items-center">
                <div className="item-title">
                  <h3>Template &amp; Upload</h3>
                </div>
                <button
                  id="download-template"
                  type="button"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  onClick={() => handleDownloadTemplate().catch(() => undefined)}
                  disabled={downloadingTemplate}
                >
                  {downloadingTemplate ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm mr-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-download mr-2" />
                      Download Template
                    </>
                  )}
                </button>
              </div>

              {feedback ? (
                <div
                  id="bulk-upload-feedback"
                  className={`alert alert-${feedback.type}`}
                  role="alert"
                >
                  {feedback.message}
                </div>
              ) : (
                <div
                  id="bulk-upload-feedback"
                  className="alert d-none"
                  role="alert"
                />
              )}

              <div
                id="upload-dropzone"
                className={`bulk-upload-dropzone mb-4${
                  isDragOver ? " dragover" : ""
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="icon">
                  <i className="fas fa-cloud-upload-alt" />
                </div>
                <p className="lead mb-1">
                  Drag &amp; drop your completed CSV here
                </p>
                <p className="text-muted small mb-2">
                  Only .csv files are supported. Maximum size 5MB.
                </p>
                <button
                  id="choose-file"
                  type="button"
                  className="btn-fill-lg btn-outline-primary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </button>
                <input
                  id="file-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="d-none"
                  onChange={handleFileInputChange}
                />
                <div id="selected-file" className="text-muted small mt-2">
                  {selectedFile
                    ? `Selected file: ${selectedFile.name} (${formatBytes(
                        selectedFile.size,
                      )})`
                    : ""}
                </div>
              </div>

              <div className="d-flex align-items-center">
                <button
                  id="upload-button"
                  type="button"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark mr-3"
                  onClick={() => handleUploadPreview().catch(() => undefined)}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm mr-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play mr-2" />
                      Upload &amp; Preview
                    </>
                  )}
                </button>
                <button
                  id="reset-button"
                  type="button"
                  className="btn-fill-lg btn-light text-dark"
                  onClick={resetState}
                >
                  <i className="fas fa-redo mr-2" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {preview ? (
        <div className="card height-auto mb-4" id="bulk-preview-card">
          <div className="card-body">
            <div className="heading-layout1 align-items-center">
              <div className="item-title">
                <h3>Preview &amp; Summary</h3>
              </div>
              <div className="d-flex align-items-center">
                <span className="text-muted small mr-3" id="batch-expiry">
                  {preview.expiresAt
                    ? `Batch expires: ${formatDateTime(preview.expiresAt)}`
                    : ""}
                </span>
                <button
                  id="confirm-upload"
                  type="button"
                  className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                  onClick={() => handleConfirmUpload().catch(() => undefined)}
                  disabled={confirming}
                >
                  {confirming ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm mr-2"
                        role="status"
                        aria-hidden="true"
                      />
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check mr-2" />
                      Confirm Upload
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="row">
              <div className="col-lg-4">
                <div className="card dashboard-card-one bg-light">
                  <div className="card-body">
                    <h5 className="mb-3">Upload Summary</h5>
                    <ul className="upload-summary-list" id="upload-summary">
                      {summaryItems.length ? (
                        summaryItems.map((item) => (
                          <li key={item.label}>
                            <span>{item.label}</span>
                            <span>{item.value}</span>
                          </li>
                        ))
                      ) : (
                        <li>No summary available.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="col-lg-8">
                <div className="table-responsive">
                  <table className="table display text-nowrap">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Admission No</th>
                        <th>Session</th>
                        <th>Class</th>
                        <th>Parent Email</th>
                      </tr>
                    </thead>
                    <tbody id="preview-table-body">
                      {previewRows.length ? (
                        previewRows.map((row, index) => (
                          <tr key={`preview-${index}`}>
                            <td>{index + 1}</td>
                            <td>{row.name ?? ""}</td>
                            <td>{row.admission_no ?? ""}</td>
                            <td>{row.session ?? ""}</td>
                            <td>
                              {[row.class, row.class_arm, row.class_section]
                                .filter(Boolean)
                                .join(" / ")}
                            </td>
                            <td>{row.parent_email ?? ""}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6}>
                            All rows validated successfully. No preview rows to
                            display.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {validationFailure ? (
        <div className="card height-auto mb-4" id="bulk-error-card">
          <div className="card-body">
            <div className="heading-layout1 align-items-center">
              <div className="item-title">
                <h3>Validation Issues</h3>
                <p className="text-muted mb-0">
                  Fix the rows listed below and re-upload. Download the error log
                  to share with your team.
                </p>
              </div>
              <button
                id="download-error-log"
                type="button"
                className="btn-fill-lg btn-outline-danger"
                onClick={handleDownloadErrorLog}
              >
                <i className="fas fa-file-csv mr-2" />
                Download Error Log
              </button>
            </div>
            <div className="table-responsive mt-3">
              <table className="table display text-nowrap">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Column</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody id="error-table-body">
                  {validationErrors.length ? (
                    validationErrors.map((error, index) => (
                      <tr key={`error-${index}`}>
                        <td>{error.row ?? "-"}</td>
                        <td>{error.column ?? "-"}</td>
                        <td>{error.message ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>
                        No specific errors were provided by the server.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) {
    return "0 Bytes";
  }
  const units = ["Bytes", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(2)} ${units[exponent]}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
