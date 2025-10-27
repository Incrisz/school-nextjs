"use client";

import { startTransition, useEffect, useState } from "react";
import { listClasses, type SchoolClass } from "@/lib/classes";
import { listClassArms, type ClassArm } from "@/lib/classArms";
import {
  listClassArmSections,
  type ClassArmSection,
} from "@/lib/classArmSections";

export default function TestDropdownDebugPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [arms, setArms] = useState<ClassArm[]>([]);
  const [sections, setSections] = useState<ClassArmSection[]>([]);

  const [classId, setClassId] = useState("");
  const [armId, setArmId] = useState("");
  const [sectionId, setSectionId] = useState("");

  useEffect(() => {
    listClasses()
      .then(setClasses)
      .catch((err) => console.error("Unable to load classes", err));
  }, []);

  useEffect(() => {
    if (!classId) {
      startTransition(() => {
        setArms([]);
        setSections([]);
        setArmId("");
        setSectionId("");
      });
      return;
    }
    listClassArms(classId)
      .then((data) => {
        startTransition(() => {
          setArms(data);
          if (!data.find((arm) => `${arm.id}` === armId)) {
            setArmId("");
            setSections([]);
            setSectionId("");
          }
        });
      })
      .catch((err) => console.error("Unable to load class arms", err));
  }, [classId, armId]);

  useEffect(() => {
    if (!classId || !armId) {
      startTransition(() => {
        setSections([]);
        setSectionId("");
      });
      return;
    }
    listClassArmSections(classId, armId)
      .then((data) => {
        startTransition(() => {
          setSections(data);
          if (!data.find((section) => `${section.id}` === sectionId)) {
            setSectionId("");
          }
        });
      })
      .catch((err) => console.error("Unable to load sections", err));
  }, [classId, armId, sectionId]);

  return (
    <div className="card height-auto">
      <div className="card-body">
        <div className="heading-layout1">
          <div className="item-title">
            <h3>Dependent Dropdown Debug</h3>
          </div>
        </div>
        <div className="row">
          <div className="col-md-4 col-12 form-group">
            <label htmlFor="class-select">Class</label>
            <select
              id="class-select"
              className="form-control"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Select Class</option>
              {classes.map((_class) => (
                <option key={_class.id} value={_class.id}>
                  {_class.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-12 form-group">
            <label htmlFor="arm-select">Class Arm</label>
            <select
              id="arm-select"
              className="form-control"
              value={armId}
              onChange={(event) => setArmId(event.target.value)}
              disabled={!classId}
            >
              <option value="">Select Class Arm</option>
              {arms.map((arm) => (
                <option key={arm.id} value={arm.id}>
                  {arm.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-4 col-12 form-group">
            <label htmlFor="section-select">Class Section</label>
            <select
              id="section-select"
              className="form-control"
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              disabled={!armId}
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="alert alert-info mt-4" role="alert">
          <strong>Selected:</strong>{" "}
          {classId ? `Class ${classId}` : "No class selected"},{" "}
          {armId ? `Arm ${armId}` : "No arm selected"},{" "}
          {sectionId ? `Section ${sectionId}` : "No section selected"}
        </div>
      </div>
    </div>
  );
}
