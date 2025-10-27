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
  createSkillCategory,
  createSkillType,
  deleteSkillCategory,
  deleteSkillType,
  listSkillCategories,
  listSkillTypes,
  updateSkillCategory,
  updateSkillType,
  type SkillCategory,
  type SkillType,
} from "@/lib/skills";

type FeedbackKind = "success" | "danger" | "warning" | "info";

interface FeedbackState {
  type: FeedbackKind;
  message: string;
}

interface CategoryFormState {
  id: string;
  name: string;
  description: string;
}

interface SkillFormState {
  id: string;
  skill_category_id: string;
  name: string;
  weight: string;
  description: string;
}

const emptyCategoryForm: CategoryFormState = {
  id: "",
  name: "",
  description: "",
};

const emptySkillForm: SkillFormState = {
  id: "",
  skill_category_id: "",
  name: "",
  weight: "",
  description: "",
};

export default function SkillsPage() {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skillTypes, setSkillTypes] = useState<SkillType[]>([]);

  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(emptyCategoryForm);
  const [skillForm, setSkillForm] =
    useState<SkillFormState>(emptySkillForm);

  const [categoryFeedback, setCategoryFeedback] =
    useState<FeedbackState | null>(null);
  const [skillFeedback, setSkillFeedback] =
    useState<FeedbackState | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);
  const [skillSubmitting, setSkillSubmitting] = useState(false);

  const refreshCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await listSkillCategories();
      setCategories(data);
    } catch (error) {
      console.error("Unable to load categories", error);
      setCategoryFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load skill categories.",
      });
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const refreshSkillTypes = useCallback(async () => {
    setLoadingSkills(true);
    try {
      const data = await listSkillTypes();
      setSkillTypes(data);
    } catch (error) {
      console.error("Unable to load skill types", error);
      setSkillFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load skills.",
      });
    } finally {
      setLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([refreshCategories(), refreshSkillTypes()]);
    })().catch((error) =>
      console.error("Unable to load skill settings", error),
    );
  }, [refreshCategories, refreshSkillTypes]);

  const categoryCountById = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((category) => {
      map.set(
        String(category.id),
        Array.isArray(category.skill_types)
          ? category.skill_types.length
          : 0,
      );
    });
    return map;
  }, [categories]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => {
      map.set(String(category.id), category.name);
    });
    return map;
  }, [categories]);

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCategoryFeedback(null);

    const name = categoryForm.name.trim();
    if (!name) {
      setCategoryFeedback({
        type: "warning",
        message: "Category name is required.",
      });
      return;
    }

    const payload = {
      name,
      description: categoryForm.description.trim() || null,
    };

    try {
      setCategorySubmitting(true);
      if (categoryForm.id) {
        await updateSkillCategory(categoryForm.id, payload);
        setCategoryFeedback({
          type: "success",
          message: "Category updated successfully.",
        });
      } else {
        await createSkillCategory(payload);
        setCategoryFeedback({
          type: "success",
          message: "Category created successfully.",
        });
      }
      setCategoryForm(emptyCategoryForm);
      await refreshCategories();
      await refreshSkillTypes();
    } catch (error) {
      console.error("Unable to save category", error);
      setCategoryFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to save category.",
      });
    } finally {
      setCategorySubmitting(false);
    }
  };

  const beginCategoryEdit = (category: SkillCategory) => {
    setCategoryForm({
      id: String(category.id),
      name: category.name ?? "",
      description: category.description ?? "",
    });
    setCategoryFeedback(null);
  };

  const cancelCategoryEdit = () => {
    setCategoryForm(emptyCategoryForm);
    setCategoryFeedback(null);
  };

  const handleDeleteCategory = async (category: SkillCategory) => {
    if (
      !window.confirm(
        "Delete this skill category? Skills inside the category will also be removed.",
      )
    ) {
      return;
    }
    try {
      await deleteSkillCategory(category.id);
      setCategoryFeedback({
        type: "success",
        message: "Category deleted successfully.",
      });
      if (categoryForm.id === String(category.id)) {
        setCategoryForm(emptyCategoryForm);
      }
      await refreshCategories();
      await refreshSkillTypes();
    } catch (error) {
      console.error("Unable to delete category", error);
      setCategoryFeedback({
        type: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Unable to delete category.",
      });
    }
  };

  const handleSkillSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSkillFeedback(null);

    if (!skillForm.skill_category_id) {
      setSkillFeedback({
        type: "warning",
        message: "Select a category for the skill.",
      });
      return;
    }

    const name = skillForm.name.trim();
    if (!name) {
      setSkillFeedback({
        type: "warning",
        message: "Skill name is required.",
      });
      return;
    }

    const weightRaw = skillForm.weight.trim();
    let weightValue: number | null = null;
    if (weightRaw !== "") {
      const parsed = Number.parseFloat(weightRaw);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 999.99) {
        setSkillFeedback({
          type: "warning",
          message: "Weight must be between 0 and 999.99.",
        });
        return;
      }
      weightValue = parsed;
    }

    const payload = {
      skill_category_id: skillForm.skill_category_id,
      name,
      weight: weightValue,
      description: skillForm.description.trim() || null,
    };

    try {
      setSkillSubmitting(true);
      if (skillForm.id) {
        await updateSkillType(skillForm.id, payload);
        setSkillFeedback({
          type: "success",
          message: "Skill updated successfully.",
        });
      } else {
        await createSkillType(payload);
        setSkillFeedback({
          type: "success",
          message: "Skill created successfully.",
        });
      }
      setSkillForm(emptySkillForm);
      await refreshSkillTypes();
      await refreshCategories();
    } catch (error) {
      console.error("Unable to save skill", error);
      setSkillFeedback({
        type: "danger",
        message:
          error instanceof Error ? error.message : "Unable to save skill.",
      });
    } finally {
      setSkillSubmitting(false);
    }
  };

  const beginSkillEdit = (skill: SkillType) => {
    setSkillForm({
      id: String(skill.id),
      skill_category_id: String(skill.skill_category_id ?? ""),
      name: skill.name ?? "",
      weight:
        skill.weight === null || skill.weight === undefined
          ? ""
          : `${Number(skill.weight).toFixed(2)}`,
      description: skill.description ?? "",
    });
    setSkillFeedback(null);
  };

  const cancelSkillEdit = () => {
    setSkillForm(emptySkillForm);
    setSkillFeedback(null);
  };

  const handleDeleteSkill = async (skill: SkillType) => {
    if (!window.confirm("Delete this skill?")) {
      return;
    }
    try {
      await deleteSkillType(skill.id);
      setSkillFeedback({
        type: "success",
        message: "Skill deleted successfully.",
      });
      if (skillForm.id === String(skill.id)) {
        setSkillForm(emptySkillForm);
      }
      await refreshSkillTypes();
      await refreshCategories();
    } catch (error) {
      console.error("Unable to delete skill", error);
      setSkillFeedback({
        type: "danger",
        message:
          error instanceof Error ? error.message : "Unable to delete skill.",
      });
    }
  };

  const renderCategoryTable = () => {
    if (loadingCategories) {
      return (
        <tr>
          <td colSpan={3}>Loading categories...</td>
        </tr>
      );
    }

    if (!categories.length) {
      return (
        <tr>
          <td colSpan={3}>No categories found.</td>
        </tr>
      );
    }

    return categories.map((category) => {
      const count = categoryCountById.get(String(category.id)) ?? 0;
      return (
        <tr key={category.id}>
          <td>{category.name}</td>
          <td>{count}</td>
          <td>
            <button
              type="button"
              className="btn btn-link p-0 mr-3"
              onClick={() => beginCategoryEdit(category)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-link text-danger p-0"
              onClick={() => handleDeleteCategory(category)}
            >
              Delete
            </button>
          </td>
        </tr>
      );
    });
  };

  const renderSkillTable = () => {
    if (loadingSkills) {
      return (
        <tr>
          <td colSpan={5}>Loading skills...</td>
        </tr>
      );
    }

    if (!skillTypes.length) {
      return (
        <tr>
          <td colSpan={5}>No skills found.</td>
        </tr>
      );
    }

    return skillTypes.map((skill) => {
      const categoryName =
        skill.category ??
        categoryNameById.get(String(skill.skill_category_id)) ??
        "—";
      const weightText =
        skill.weight === null || skill.weight === undefined
          ? "—"
          : Number(skill.weight).toFixed(2);
      return (
        <tr key={skill.id}>
          <td>{skill.name}</td>
          <td>{categoryName}</td>
          <td>{weightText}</td>
          <td>{skill.description || "—"}</td>
          <td>
            <button
              type="button"
              className="btn btn-link p-0 mr-3"
              onClick={() => beginSkillEdit(skill)}
            >
              Edit
            </button>
            <button
              type="button"
              className="btn btn-link text-danger p-0"
              onClick={() => handleDeleteSkill(skill)}
            >
              Delete
            </button>
          </td>
        </tr>
      );
    });
  };

  return (
    <>
      <div className="breadcrumbs-area">
        <h3>Skills &amp; Behaviour</h3>
        <ul>
          <li>
            <Link href="/v10/dashboard">Home</Link>
          </li>
          <li>Skills</li>
        </ul>
      </div>

      <div className="row">
        <div className="col-lg-5">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-3">
                <div className="item-title">
                  <h3>Skill Categories</h3>
                </div>
                <div className="dropdown">
                  <button
                    className="dropdown-toggle"
                    type="button"
                    data-toggle="dropdown"
                  >
                    ...
                  </button>
                  <div className="dropdown-menu dropdown-menu-right">
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={refreshCategories}
                    >
                      <i className="fas fa-redo-alt text-orange-peel" /> Refresh
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCategorySubmit} className="mb-3">
                <input type="hidden" value={categoryForm.id} />
                <div className="form-group">
                  <label className="text-dark-medium">Category Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={categoryForm.name}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    maxLength={100}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="text-dark-medium">Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    maxLength={255}
                  />
                </div>
                <div className="d-flex align-items-center">
                  <button
                    type="submit"
                    className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                    disabled={categorySubmitting}
                  >
                    {categoryForm.id ? "Update Category" : "Save Category"}
                  </button>
                  <button
                    type="button"
                    className={`btn-fill-lg btn-light ml-3 ${
                      categoryForm.id ? "" : "d-none"
                    }`}
                    onClick={cancelCategoryEdit}
                    disabled={categorySubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {categoryFeedback ? (
                <div
                  className={`alert alert-${categoryFeedback.type}`}
                  role="alert"
                >
                  {categoryFeedback.message}
                </div>
              ) : null}

              <div className="table-responsive">
                <table className="table display text-nowrap">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Skills</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{renderCategoryTable()}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="card height-auto mb-4">
            <div className="card-body">
              <div className="heading-layout1 mb-3">
                <div className="item-title">
                  <h3>Skills</h3>
                </div>
                <div className="dropdown">
                  <button
                    className="dropdown-toggle"
                    type="button"
                    data-toggle="dropdown"
                  >
                    ...
                  </button>
                  <div className="dropdown-menu dropdown-menu-right">
                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={refreshSkillTypes}
                    >
                      <i className="fas fa-redo-alt text-orange-peel" /> Refresh
                    </button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSkillSubmit} className="mb-3">
                <input type="hidden" value={skillForm.id} />
                <div className="form-row">
                  <div className="form-group col-md-6">
                    <label className="text-dark-medium">Category</label>
                    <select
                      className="form-control"
                      required
                      value={skillForm.skill_category_id}
                      onChange={(event) =>
                        setSkillForm((prev) => ({
                          ...prev,
                          skill_category_id: event.target.value,
                        }))
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={String(category.id)}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-md-6">
                    <label className="text-dark-medium">Skill Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={skillForm.name}
                      onChange={(event) =>
                        setSkillForm((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="e.g. Punctuality"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group col-md-4">
                    <label className="text-dark-medium">Weight</label>
                    <input
                      type="number"
                      className="form-control"
                      step={0.01}
                      min={0}
                      max={999.99}
                      value={skillForm.weight}
                      onChange={(event) =>
                        setSkillForm((prev) => ({
                          ...prev,
                          weight: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="form-group col-md-8">
                    <label className="text-dark-medium">Description</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={skillForm.description}
                      onChange={(event) =>
                        setSkillForm((prev) => ({
                          ...prev,
                          description: event.target.value,
                        }))
                      }
                      maxLength={500}
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="d-flex align-items-center">
                  <button
                    type="submit"
                    className="btn-fill-lg btn-gradient-yellow btn-hover-bluedark"
                    disabled={skillSubmitting}
                  >
                    {skillForm.id ? "Update Skill" : "Save Skill"}
                  </button>
                  <button
                    type="button"
                    className={`btn-fill-lg btn-light ml-3 ${
                      skillForm.id ? "" : "d-none"
                    }`}
                    onClick={cancelSkillEdit}
                    disabled={skillSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {skillFeedback ? (
                <div
                  className={`alert alert-${skillFeedback.type}`}
                  role="alert"
                >
                  {skillFeedback.message}
                </div>
              ) : null}

              <div className="table-responsive">
                <table className="table display text-nowrap">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Category</th>
                      <th>Weight</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>{renderSkillTable()}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
