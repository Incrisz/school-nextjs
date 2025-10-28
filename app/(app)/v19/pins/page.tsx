"use client";

import Link from "next/link";

export default function PinsPage() {
  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Result PIN Management</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Result PINs</li>
        </ul>
      </div>

      <div className="card height-auto">
        <div className="card-body">
          <div className="heading-layout1">
            <div className="item-title">
              <h3>Result PINs</h3>
            </div>
          </div>
          <p className="text-muted">
            Result PINs are now managed directly from the student details page.
            Open any student record and use the “Result PIN” panel to generate,
            regenerate, or invalidate codes for the selected session and term.
          </p>
          <Link href="/v14/all-students" className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark">
            Go to Students
          </Link>
        </div>
      </div>
    </>
  );
}

