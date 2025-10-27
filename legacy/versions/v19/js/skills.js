function getCookie(name) {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length);
    }
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    const token = getCookie('token');
    if (!token) {
        window.location.href = '../v10/login.html';
        return;
    }

    const jsonHeaders = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    const state = {
        categories: [],
        skillTypes: [],
        isEditingCategory: false,
        isEditingSkill: false,
    };

    const categoryForm = document.getElementById('skill-category-form');
    const categoryIdInput = document.getElementById('skill-category-id');
    const categoryNameInput = document.getElementById('skill-category-name');
    const categoryDescriptionInput = document.getElementById('skill-category-description');
    const categorySubmitButton = document.getElementById('skill-category-submit');
    const categoryCancelButton = document.getElementById('skill-category-cancel');
    const categoryFeedback = document.getElementById('skill-category-feedback');
    const categoryTableBody = document.getElementById('skill-category-table-body');
    const categoryRefreshButton = document.getElementById('skill-categories-refresh');

    const skillForm = document.getElementById('skill-type-form');
    const skillIdInput = document.getElementById('skill-type-id');
    const skillCategorySelect = document.getElementById('skill-type-category');
    const skillNameInput = document.getElementById('skill-type-name');
    const skillWeightInput = document.getElementById('skill-type-weight');
    const skillDescriptionInput = document.getElementById('skill-type-description');
    const skillSubmitButton = document.getElementById('skill-type-submit');
    const skillCancelButton = document.getElementById('skill-type-cancel');
    const skillFeedback = document.getElementById('skill-type-feedback');
    const skillTableBody = document.getElementById('skill-type-table-body');
    const skillRefreshButton = document.getElementById('skill-types-refresh');

    if (categoryForm) {
        categoryForm.addEventListener('submit', handleCategorySubmit);
    }
    if (categoryCancelButton) {
        categoryCancelButton.addEventListener('click', resetCategoryForm);
    }
    if (categoryRefreshButton) {
        categoryRefreshButton.addEventListener('click', async () => {
            await loadCategories();
            await loadSkillTypes();
            showCategoryFeedback('Categories refreshed.', 'success');
        });
    }

    if (skillForm) {
        skillForm.addEventListener('submit', handleSkillSubmit);
    }
    if (skillCancelButton) {
        skillCancelButton.addEventListener('click', resetSkillForm);
    }
    if (skillRefreshButton) {
        skillRefreshButton.addEventListener('click', async () => {
            await loadSkillTypes();
            showSkillFeedback('Skills refreshed.', 'success');
        });
    }

    loadInitialData();

    async function loadInitialData() {
        await loadCategories();
        await loadSkillTypes();
    }

    async function loadCategories() {
        toggleCategoryLoading(true);
        resetCategoryFeedback();

        try {
            const response = await fetch(`${backend_url}/api/v1/settings/skill-categories`, { headers: jsonHeaders });

            if (!response.ok) {
                throw await buildError(response, 'Unable to load skill categories.');
            }

            const payload = await response.json();
            state.categories = Array.isArray(payload.data) ? payload.data : [];
            renderCategories();
            populateSkillCategoryOptions();
        } catch (error) {
            console.error('Error loading categories:', error);
            showCategoryFeedback(error.message || 'Unable to load skill categories.', 'danger');
        } finally {
            toggleCategoryLoading(false);
        }
    }

    function renderCategories() {
        if (!categoryTableBody) {
            return;
        }

        if (state.categories.length === 0) {
            categoryTableBody.innerHTML = '<tr><td colspan="3">No categories found.</td></tr>';
            return;
        }

        categoryTableBody.innerHTML = '';

        state.categories.forEach((category) => {
            const row = document.createElement('tr');
            const skillCount = Array.isArray(category.skill_types) ? category.skill_types.length : 0;
            row.innerHTML = `
                <td>${escapeHtml(category.name)}</td>
                <td>${skillCount}</td>
                <td>
                    <button class="btn btn-link p-0 mr-2 category-edit" data-id="${category.id}">Edit</button>
                    <button class="btn btn-link text-danger p-0 category-delete" data-id="${category.id}">Delete</button>
                </td>
            `;
            categoryTableBody.appendChild(row);
        });

        categoryTableBody.querySelectorAll('.category-edit').forEach((button) => {
            button.addEventListener('click', (event) => {
                const id = event.currentTarget.getAttribute('data-id');
                beginCategoryEdit(id);
            });
        });

        categoryTableBody.querySelectorAll('.category-delete').forEach((button) => {
            button.addEventListener('click', async (event) => {
                const id = event.currentTarget.getAttribute('data-id');
                await deleteCategory(id);
            });
        });
    }

    function populateSkillCategoryOptions() {
        if (!skillCategorySelect) {
            return;
        }

        const currentValue = skillCategorySelect.value || '';
        skillCategorySelect.innerHTML = '<option value="">Select category</option>';

        state.categories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            skillCategorySelect.appendChild(option);
        });

        if (currentValue && state.categories.some((category) => category.id === currentValue)) {
            skillCategorySelect.value = currentValue;
        }
    }

    async function handleCategorySubmit(event) {
        event.preventDefault();

        const name = categoryNameInput.value.trim();
        if (!name) {
            showCategoryFeedback('Category name is required.', 'warning');
            return;
        }

        const payload = {
            name,
            description: categoryDescriptionInput.value.trim() || null,
        };

        const categoryId = categoryIdInput.value || null;
        const endpoint = categoryId
            ? `${backend_url}/api/v1/settings/skill-categories/${categoryId}`
            : `${backend_url}/api/v1/settings/skill-categories`;
        const method = categoryId ? 'PUT' : 'POST';

        toggleCategoryLoading(true);
        resetCategoryFeedback();

        try {
            const response = await fetch(endpoint, {
                method,
                headers: jsonHeaders,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw await buildError(response, 'Unable to save category.');
            }

            await response.json().catch(() => ({}));
            showCategoryFeedback(categoryId ? 'Category updated successfully.' : 'Category created successfully.', 'success');
            resetCategoryForm();
            await loadCategories();
            await loadSkillTypes();
        } catch (error) {
            console.error('Error saving category:', error);
            showCategoryFeedback(error.message || 'Unable to save category.', 'danger');
        } finally {
            toggleCategoryLoading(false);
        }
    }

    function beginCategoryEdit(categoryId) {
        const category = state.categories.find((item) => item.id === categoryId);
        if (!category) {
            showCategoryFeedback('Selected category could not be found.', 'danger');
            return;
        }

        categoryIdInput.value = category.id;
        categoryNameInput.value = category.name;
        categoryDescriptionInput.value = category.description || '';
        categorySubmitButton.textContent = 'Update Category';
        categoryCancelButton.classList.remove('d-none');
        state.isEditingCategory = true;
        categoryNameInput.focus();
    }

    async function deleteCategory(categoryId) {
        if (!categoryId) {
            return;
        }

        if (!confirm('Delete this skill category? Skills inside the category will also be removed.')) {
            return;
        }

        resetCategoryFeedback();
        toggleCategoryLoading(true);

        try {
            const response = await fetch(`${backend_url}/api/v1/settings/skill-categories/${categoryId}`, {
                method: 'DELETE',
                headers: jsonHeaders,
            });

            if (!response.ok) {
                throw await buildError(response, 'Unable to delete category.');
            }

            showCategoryFeedback('Category deleted successfully.', 'success');
            if (categoryIdInput.value === categoryId) {
                resetCategoryForm();
            }
            await loadCategories();
            await loadSkillTypes();
        } catch (error) {
            console.error('Error deleting category:', error);
            showCategoryFeedback(error.message || 'Unable to delete category.', 'danger');
        } finally {
            toggleCategoryLoading(false);
        }
    }

    function resetCategoryForm() {
        categoryIdInput.value = '';
        categoryNameInput.value = '';
        categoryDescriptionInput.value = '';
        categorySubmitButton.textContent = 'Save Category';
        categoryCancelButton.classList.add('d-none');
        state.isEditingCategory = false;
    }

    function toggleCategoryLoading(isLoading) {
        categorySubmitButton.disabled = isLoading;
        categoryCancelButton.disabled = isLoading;
        if (categoryRefreshButton) {
            categoryRefreshButton.disabled = isLoading;
        }
    }

    function resetCategoryFeedback() {
        if (!categoryFeedback) {
            return;
        }
        categoryFeedback.style.display = 'none';
        categoryFeedback.textContent = '';
        categoryFeedback.className = 'alert';
    }

    function showCategoryFeedback(message, type = 'success') {
        if (!categoryFeedback) {
            return;
        }
        categoryFeedback.textContent = message;
        categoryFeedback.className = `alert alert-${type}`;
        categoryFeedback.style.display = 'block';
    }

    async function loadSkillTypes() {
        toggleSkillLoading(true);
        resetSkillFeedback();

        try {
            const response = await fetch(`${backend_url}/api/v1/settings/skill-types`, { headers: jsonHeaders });

            if (!response.ok) {
                throw await buildError(response, 'Unable to load skills.');
            }

            const payload = await response.json();
            state.skillTypes = Array.isArray(payload.data) ? payload.data : [];
            renderSkillTypes();
        } catch (error) {
            console.error('Error loading skills:', error);
            showSkillFeedback(error.message || 'Unable to load skills.', 'danger');
        } finally {
            toggleSkillLoading(false);
        }
    }

    function renderSkillTypes() {
        if (!skillTableBody) {
            return;
        }

        if (state.skillTypes.length === 0) {
            skillTableBody.innerHTML = '<tr><td colspan="5">No skills found.</td></tr>';
            return;
        }

        skillTableBody.innerHTML = '';

        state.skillTypes.forEach((skill) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${escapeHtml(skill.name)}</td>
                <td>${escapeHtml(skill.category || '')}</td>
                <td>${skill.weight != null ? Number(skill.weight).toFixed(2) : '—'}</td>
                <td>${escapeHtml(skill.description || '') || '—'}</td>
                <td>
                    <button class="btn btn-link p-0 mr-2 skill-edit" data-id="${skill.id}">Edit</button>
                    <button class="btn btn-link text-danger p-0 skill-delete" data-id="${skill.id}">Delete</button>
                </td>
            `;
            skillTableBody.appendChild(row);
        });

        skillTableBody.querySelectorAll('.skill-edit').forEach((button) => {
            button.addEventListener('click', (event) => {
                const id = event.currentTarget.getAttribute('data-id');
                beginSkillEdit(id);
            });
        });

        skillTableBody.querySelectorAll('.skill-delete').forEach((button) => {
            button.addEventListener('click', async (event) => {
                const id = event.currentTarget.getAttribute('data-id');
                await deleteSkill(id);
            });
        });
    }

    async function handleSkillSubmit(event) {
        event.preventDefault();

        const categoryId = skillCategorySelect.value;
        if (!categoryId) {
            showSkillFeedback('Please select a category for the skill.', 'warning');
            return;
        }

        const name = skillNameInput.value.trim();
        if (!name) {
            showSkillFeedback('Skill name is required.', 'warning');
            return;
        }

        const weightValue = skillWeightInput.value !== '' ? Number(skillWeightInput.value) : null;
        if (weightValue !== null && (Number.isNaN(weightValue) || weightValue < 0 || weightValue > 999.99)) {
            showSkillFeedback('Weight must be between 0 and 999.99.', 'warning');
            return;
        }

        const payload = {
            skill_category_id: categoryId,
            name,
            weight: weightValue,
            description: skillDescriptionInput.value.trim() || null,
        };

        const skillId = skillIdInput.value || null;
        const endpoint = skillId
            ? `${backend_url}/api/v1/settings/skill-types/${skillId}`
            : `${backend_url}/api/v1/settings/skill-types`;
        const method = skillId ? 'PUT' : 'POST';

        toggleSkillLoading(true);
        resetSkillFeedback();

        try {
            const response = await fetch(endpoint, {
                method,
                headers: jsonHeaders,
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw await buildError(response, 'Unable to save skill.');
            }

            await response.json().catch(() => ({}));
            showSkillFeedback(skillId ? 'Skill updated successfully.' : 'Skill created successfully.', 'success');
            resetSkillForm();
            await loadSkillTypes();
            await loadCategories();
        } catch (error) {
            console.error('Error saving skill:', error);
            showSkillFeedback(error.message || 'Unable to save skill.', 'danger');
        } finally {
            toggleSkillLoading(false);
        }
    }

    function beginSkillEdit(skillId) {
        const skill = state.skillTypes.find((item) => item.id === skillId);
        if (!skill) {
            showSkillFeedback('Selected skill could not be found.', 'danger');
            return;
        }

        skillIdInput.value = skill.id;
        skillCategorySelect.value = skill.skill_category_id || '';
        skillNameInput.value = skill.name;
        skillWeightInput.value = skill.weight != null ? Number(skill.weight) : '';
        skillDescriptionInput.value = skill.description || '';
        skillSubmitButton.textContent = 'Update Skill';
        skillCancelButton.classList.remove('d-none');
        state.isEditingSkill = true;
        skillNameInput.focus();
    }

    async function deleteSkill(skillId) {
        if (!skillId) {
            return;
        }

        if (!confirm('Delete this skill?')) {
            return;
        }

        resetSkillFeedback();
        toggleSkillLoading(true);

        try {
            const response = await fetch(`${backend_url}/api/v1/settings/skill-types/${skillId}`, {
                method: 'DELETE',
                headers: jsonHeaders,
            });

            if (!response.ok) {
                throw await buildError(response, 'Unable to delete skill.');
            }

            showSkillFeedback('Skill deleted successfully.', 'success');
            if (skillIdInput.value === skillId) {
                resetSkillForm();
            }
            await loadSkillTypes();
            await loadCategories();
        } catch (error) {
            console.error('Error deleting skill:', error);
            showSkillFeedback(error.message || 'Unable to delete skill.', 'danger');
        } finally {
            toggleSkillLoading(false);
        }
    }

    function resetSkillForm() {
        skillIdInput.value = '';
        skillCategorySelect.value = '';
        skillNameInput.value = '';
        skillWeightInput.value = '';
        skillDescriptionInput.value = '';
        skillSubmitButton.textContent = 'Save Skill';
        skillCancelButton.classList.add('d-none');
        state.isEditingSkill = false;
    }

    function toggleSkillLoading(isLoading) {
        skillSubmitButton.disabled = isLoading;
        skillCancelButton.disabled = isLoading;
        if (skillRefreshButton) {
            skillRefreshButton.disabled = isLoading;
        }
    }

    function resetSkillFeedback() {
        if (!skillFeedback) {
            return;
        }
        skillFeedback.style.display = 'none';
        skillFeedback.textContent = '';
        skillFeedback.className = 'alert';
    }

    function showSkillFeedback(message, type = 'success') {
        if (!skillFeedback) {
            return;
        }
        skillFeedback.textContent = message;
        skillFeedback.className = `alert alert-${type}`;
        skillFeedback.style.display = 'block';
    }

    async function buildError(response, fallbackMessage) {
        let message = fallbackMessage;

        try {
            const data = await response.json();
            if (data?.message) {
                message = data.message;
            } else if (data?.error) {
                message = data.error;
            } else if (data?.errors) {
                const firstError = Object.values(data.errors)[0];
                if (Array.isArray(firstError) && firstError.length > 0) {
                    message = firstError[0];
                }
            }
        } catch (error) {
            // ignore parse errors
        }

        return new Error(message || fallbackMessage);
    }

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
