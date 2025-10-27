function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

const locationCache = {
    countries: [],
    statesByCountry: new Map(),
    lgasByState: new Map(),
    bloodGroups: [],
};

function getAuthHeaders() {
    const token = getCookie('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const token = getCookie('token');
    const form = document.getElementById('edit-student-form');
    const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' };

    const urlParams = new URLSearchParams(window.location.search);
    const studentId = urlParams.get('id');

    if (!studentId) {
        alert('No student ID provided!');
        window.location.href = 'all-students.html';
        return;
    }

    function populateDropdown(elementId, items, defaultOption, valueKey = 'id', nameKey = 'name') {
        const select = document.getElementById(elementId);
        if (!select) return;
        select.innerHTML = `<option value="">${defaultOption}</option>`;
        if (items && Array.isArray(items) && items.length > 0) {
            items.forEach(item => {
                const option = document.createElement('option');
                const rawValue = (valueKey && item[valueKey] !== undefined && item[valueKey] !== null)
                    ? item[valueKey]
                    : (item.uuid ?? item.id ?? null);

                if (!rawValue) {
                    return;
                }

                option.value = String(rawValue);

                const label = typeof nameKey === 'function'
                    ? nameKey(item)
                    : (item[nameKey] ?? item.name ?? '');

                option.textContent = label;
                select.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No data found';
            select.appendChild(option);
        }
    }

    async function fetchAndPopulate(url, elementId, defaultOption, valueKey = 'id', nameKey = 'name') {
        const select = document.getElementById(elementId);
        if (select) select.innerHTML = `<option value="">Loading...</option>`;
        try {
            const response = await fetch(url, { headers });
            if (!response.ok) throw new Error(`Failed to fetch data from ${url} (status: ${response.status})`);
            const payload = await response.json();
            let items = [];

            if (Array.isArray(payload)) {
                items = payload;
            } else if (Array.isArray(payload?.data)) {
                items = payload.data;
            } else if (Array.isArray(payload?.items)) {
                items = payload.items;
            } else if (Array.isArray(payload?.arms)) {
                items = payload.arms;
            } else if (Array.isArray(payload?.sections)) {
                items = payload.sections;
            } else if (Array.isArray(payload?.results)) {
                items = payload.results;
            }

            populateDropdown(elementId, items, defaultOption, valueKey, nameKey);
            return items;
        } catch (error) {
            console.error(`Error populating ${elementId}:`, error);
            if (select) select.innerHTML = `<option value="">Failed to load</option>`;
        }
    }

    async function loadCountriesIntoSelect() {
        const select = document.getElementById('country-id');
        if (!select) return;
        select.innerHTML = '<option value="">Loading...</option>';

        try {
            const response = await fetch(`${backend_url}/api/v1/locations/countries`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to load countries.');
            const payload = await response.json();
            const countries = Array.isArray(payload?.data) ? payload.data : [];
            locationCache.countries = countries;

            const options = ['<option value="">Please Select Country *</option>']
                .concat(countries.map((country) => `<option value="${country.id}" data-name="${country.name}">${country.name}</option>`));
            select.innerHTML = options.join('');

            if (countries.length === 1) {
                select.value = countries[0].id;
                select.dispatchEvent(new Event('change'));
            }
        } catch (error) {
            console.error(error);
            select.innerHTML = '<option value="">Failed to load countries</option>';
        }
    }

    async function loadStatesIntoSelect(countryId) {
        const select = document.getElementById('state-of-origin');
        if (!select || !countryId) return;
        select.innerHTML = '<option value="">Loading...</option>';

        if (!locationCache.statesByCountry.has(countryId)) {
            try {
                const response = await fetch(`${backend_url}/api/v1/locations/states?country_id=${countryId}`, {
                    headers: getAuthHeaders(),
                });
                if (!response.ok) throw new Error('Failed to load states.');
                const payload = await response.json();
                const states = Array.isArray(payload?.data) ? payload.data : [];
                locationCache.statesByCountry.set(countryId, states);
            } catch (error) {
                console.error(error);
                select.innerHTML = '<option value="">Failed to load states</option>';
                return;
            }
        }

        const states = locationCache.statesByCountry.get(countryId) || [];
        const options = ['<option value="">Please Select State *</option>']
            .concat(states.map((state) => `<option value="${state.id}" data-name="${state.name}">${state.name}</option>`));
        const html = options.join('');
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && select.classList.contains('select2')) {
            $(select).html(html);
            if (states.length === 1) {
                $(select).val(states[0].id).trigger('change');
            } else {
                $(select).val(null).trigger('change');
            }
        } else {
            select.innerHTML = html;
            if (states.length === 1) {
                select.value = states[0].id;
            } else {
                select.value = '';
            }
        }
    }

    async function loadLgasIntoSelect(stateId) {
        const select = document.getElementById('lga-of-origin');
        if (!select || !stateId) return;
        select.innerHTML = '<option value="">Loading...</option>';

        if (!locationCache.lgasByState.has(stateId)) {
            try {
                const response = await fetch(`${backend_url}/api/v1/locations/states/${stateId}/lgas`, {
                    headers: getAuthHeaders(),
                });
                if (!response.ok) throw new Error('Failed to load LGAs.');
                const payload = await response.json();
                const lgas = Array.isArray(payload?.data) ? payload.data : [];
                locationCache.lgasByState.set(stateId, lgas);
            } catch (error) {
                console.error(error);
                select.innerHTML = '<option value="">Failed to load LGAs</option>';
                return;
            }
        }

        const lgas = locationCache.lgasByState.get(stateId) || [];
        const options = ['<option value="">Please Select LGA *</option>']
            .concat(lgas.map((lga) => `<option value="${lga.name}" data-name="${lga.name}">${lga.name}</option>`));
        const html = options.join('');
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2 && select.classList.contains('select2')) {
            $(select).html(html);
            $(select).val(null).trigger('change');
        } else {
            select.innerHTML = html;
            select.value = '';
        }
    }

    async function loadBloodGroupsIntoSelect() {
        const select = document.getElementById('blood-group');
        if (!select) return;
        select.innerHTML = '<option value="">Loading...</option>';

        try {
            const response = await fetch(`${backend_url}/api/v1/locations/blood-groups`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to load blood groups.');
            const payload = await response.json();
            const groups = Array.isArray(payload?.data) ? payload.data : [];
            locationCache.bloodGroups = groups;

            const options = ['<option value="">Select Blood Group</option>']
                .concat(groups.map((group) => `<option value="${group.id}">${group.name}</option>`));
            select.innerHTML = options.join('');
        } catch (error) {
            console.error(error);
            select.innerHTML = '<option value="">Failed to load blood groups</option>';
        }
    }
    function formatDateForInput(value) {
        if (!value) return '';
        if (value.length >= 10) {
            return value.slice(0, 10);
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
    }

    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (!select) return;
        const normalizedValue = value ? String(value) : '';
        select.value = normalizedValue;

        if (select.classList.contains('select2') && typeof $ !== 'undefined') {
            $(select).val(normalizedValue).trigger('change.select2');
        } else {
            select.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    async function fetchStudentData() {
        try {
            const studentResponse = await fetch(`${backend_url}/api/v1/students/${studentId}`, { headers });
            if (!studentResponse.ok) throw new Error('Failed to fetch student data');
            const studentData = await studentResponse.json();
            const student = studentData.data;

            document.getElementById('first-name').value = student.first_name || '';
            document.getElementById('middle-name').value = student.middle_name || '';
            document.getElementById('last-name').value = student.last_name || '';
            document.getElementById('dob').value = formatDateForInput(student.date_of_birth);
            document.getElementById('admission-date').value = formatDateForInput(student.admission_date);
            document.getElementById('admission-no').value = student.admission_no || '';
            document.getElementById('house').value = student.house || '';
            document.getElementById('club').value = student.club || '';
            document.getElementById('address').value = student.address || '';
            document.getElementById('medical-info').value = student.medical_information || '';
            setSelectValue('gender', student.gender || '');
            setSelectValue('status', student.status || '');

            await loadCountriesIntoSelect();
            await loadBloodGroupsIntoSelect();

            const countrySelect = document.getElementById('country-id');
            const stateSelect = document.getElementById('state-of-origin');
            const lgaSelect = document.getElementById('lga-of-origin');
            const bloodGroupSelect = document.getElementById('blood-group');

            if (bloodGroupSelect) {
                const bloodGroupId = student.blood_group_id || student.blood_group?.id || '';
                setSelectValue('blood-group', bloodGroupId);
            }

            let matchedCountryId = '';
            if (countrySelect && locationCache.countries.length) {
                if (student.nationality) {
                    const lower = student.nationality.toLowerCase();
                    const matchedCountry = locationCache.countries.find((country) => country.name.toLowerCase() === lower);
                    if (matchedCountry) {
                        matchedCountryId = matchedCountry.id;
                    }
                }

                if (!matchedCountryId && locationCache.countries.length === 1) {
                    matchedCountryId = locationCache.countries[0].id;
                }

                if (matchedCountryId) {
                    setSelectValue('country-id', matchedCountryId);
                    await loadStatesIntoSelect(matchedCountryId);
                } else {
                    if (stateSelect) {
                        stateSelect.innerHTML = '<option value="">Please Select State *</option>';
                    }
                    if (lgaSelect) {
                        lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
                    }
                }
            }

            let matchedStateId = '';
            if (student.state_of_origin && matchedCountryId) {
                const states = locationCache.statesByCountry.get(matchedCountryId) || [];
                const lowerState = student.state_of_origin.toLowerCase();
                const matchedState = states.find((state) => state.name.toLowerCase() === lowerState);
                if (matchedState) {
                    matchedStateId = matchedState.id;
                    setSelectValue('state-of-origin', matchedStateId);
                    await loadLgasIntoSelect(matchedStateId);
                }
            }

            if (!matchedStateId && lgaSelect) {
                lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
            }

            if (student.lga_of_origin && lgaSelect) {
                const lowerLga = student.lga_of_origin.toLowerCase();
                const option = Array.from(lgaSelect.options).find((opt) => opt.textContent.toLowerCase() === lowerLga || opt.value.toLowerCase() === lowerLga);
                if (option) {
                    setSelectValue('lga-of-origin', option.value);
                } else {
                    const newOption = document.createElement('option');
                    newOption.value = student.lga_of_origin;
                    newOption.textContent = student.lga_of_origin;
                    newOption.dataset.name = student.lga_of_origin;
                    lgaSelect.appendChild(newOption);
                    setSelectValue('lga-of-origin', student.lga_of_origin);
                }
            }

            await Promise.all([
                fetchAndPopulate(`${backend_url}/api/v1/all-parents`, 'parent-id', 'Please Select Parent *', 'id', item => item.first_name + ' ' + item.last_name),
                fetchAndPopulate(`${backend_url}/api/v1/classes`, 'class-id', 'Please Select Class *'),
                fetchAndPopulate(`${backend_url}/api/v1/sessions`, 'session-id', 'Please Select Session *')
            ]);

            setSelectValue('parent-id', student.parent_id || student.parent?.id || student.parent?.uuid || '');
            setSelectValue('class-id', student.school_class_id || student.class_id || '');
            setSelectValue('session-id', student.current_session_id || student.session?.id || student.session?.uuid || '');

            if (student.current_session_id) {
                await fetchAndPopulate(`${backend_url}/api/v1/sessions/${student.current_session_id}/terms`, 'term-id', 'Select Term *');
                setSelectValue('term-id', student.current_term_id);
            }
            const classIdForArms = student.school_class_id || student.class_id;
            const armSelect = document.getElementById('class-arm-id');
            const sectionSelect = document.getElementById('class-section-id');

            if (classIdForArms) {
                armSelect.disabled = false;
                await fetchAndPopulate(`${backend_url}/api/v1/classes/${classIdForArms}/arms`, 'class-arm-id', 'Select Arm *');
                setSelectValue('class-arm-id', student.class_arm_id);
            } else {
                setSelectValue('class-arm-id', '');
                armSelect.disabled = true;
            }

            if (classIdForArms && student.class_arm_id) {
                sectionSelect.disabled = false;
                await fetchAndPopulate(`${backend_url}/api/v1/classes/${classIdForArms}/arms/${student.class_arm_id}/sections`, 'class-section-id', 'Select Section');
                setSelectValue('class-section-id', student.class_section_id);
            } else {
                setSelectValue('class-section-id', '');
                sectionSelect.disabled = true;
            }

        } catch (error) {
            console.error('Error fetching student data:', error);
            alert('Could not load student data.');
        }
    }

    const sessionSelect = document.getElementById('session-id');
    const termSelect = document.getElementById('term-id');
    const classSelect = document.getElementById('class-id');
    const classArmSelect = document.getElementById('class-arm-id');

    sessionSelect.addEventListener('change', function() {
        const sessionId = this.value;
        termSelect.innerHTML = '<option value="">Please Select Term *</option>';
        if(sessionId) {
            fetchAndPopulate(`${backend_url}/api/v1/sessions/${sessionId}/terms`, 'term-id', 'Select Term *');
        }
    });

    classSelect.addEventListener('change', function() {
        const classId = this.value;
        classArmSelect.innerHTML = '<option value="">Please Select Class Arm *</option>';
        const sectionSelect = document.getElementById('class-section-id');
        sectionSelect.innerHTML = '<option value="">Please Select Section</option>';
        if (classId) {
            classArmSelect.disabled = false;
            fetchAndPopulate(`${backend_url}/api/v1/classes/${classId}/arms`, 'class-arm-id', 'Select Arm *');
        } else {
            classArmSelect.disabled = true;
            sectionSelect.disabled = true;
        }
    });

    classArmSelect.addEventListener('change', function() {
        const classId = classSelect.value;
        const armId = this.value;
        const sectionSelect = document.getElementById('class-section-id');
        sectionSelect.innerHTML = '<option value="">Please Select Section</option>';
        if (classId && armId) {
            sectionSelect.disabled = false;
            fetchAndPopulate(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`, 'class-section-id', 'Select Section');
        } else {
            sectionSelect.disabled = true;
        }
    });

    const countrySelect = document.getElementById('country-id');
    const stateSelect = document.getElementById('state-of-origin');

    if (countrySelect) {
        const handleCountryChange = async function () {
            const countryId = this.value;
            if (stateSelect) {
                stateSelect.innerHTML = '<option value="">Please Select State *</option>';
            }
            const lgaSelect = document.getElementById('lga-of-origin');
            if (lgaSelect) {
                lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
            }
            if (countryId) {
                await loadStatesIntoSelect(countryId);
            }
        };

        countrySelect.addEventListener('change', handleCountryChange);
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(countrySelect).on('select2:select', function () {
                handleCountryChange.call(this);
            });
        }
    }

    if (stateSelect) {
        const handleStateChange = async function () {
            const stateId = this.value;
            const lgaSelect = document.getElementById('lga-of-origin');
            if (lgaSelect) {
                lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
            }
            if (stateId) {
                await loadLgasIntoSelect(stateId);
            }
        };

        stateSelect.addEventListener('change', handleStateChange);
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(stateSelect).on('select2:select', function () {
                handleStateChange.call(this);
            });
        }
    }

    fetchStudentData();

    const normalizeDateInput = (value) => {
        if (!value) return '';
        const trimmed = value.trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            return trimmed;
        }

        const parts = trimmed.split(/[\/\-.]/).map((part) => part.trim()).filter(Boolean);
        if (parts.length === 3) {
            let [first, second, third] = parts;
            let year;
            let month;
            let day;

            if (/^\d{4}$/.test(first)) {
                year = first;
                month = second;
                day = third;
            } else {
                day = first;
                month = second;
                year = third.length === 2 ? `20${third}` : third;
            }

            const pad = (segment, size) => String(segment || '').padStart(size, '0');
            year = pad(year, 4);
            month = pad(month, 2);
            day = pad(day, 2);

            const candidate = `${year}-${month}-${day}`;
            const parsed = new Date(candidate);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString().slice(0, 10);
            }
        }

        return trimmed;
    };

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        const formData = new FormData();
        formData.append('first_name', document.getElementById('first-name').value);
        formData.append('middle_name', document.getElementById('middle-name').value);
        formData.append('last_name', document.getElementById('last-name').value);
        formData.append('gender', document.getElementById('gender').value);
        formData.append('date_of_birth', normalizeDateInput(document.getElementById('dob').value));
        const countrySelect = document.getElementById('country-id');
        const stateSelect = document.getElementById('state-of-origin');
        const lgaSelect = document.getElementById('lga-of-origin');

        const selectedCountry = countrySelect?.selectedOptions[0];
        const selectedState = stateSelect?.selectedOptions[0];
        const selectedLga = lgaSelect?.selectedOptions[0];

        const nationalityValue = selectedCountry ? (selectedCountry.dataset.name || selectedCountry.textContent || '') : '';
        const stateValue = selectedState ? (selectedState.dataset.name || selectedState.textContent || '') : '';
        const lgaValue = selectedLga ? (selectedLga.dataset.name || selectedLga.value || selectedLga.textContent || '') : '';

        formData.append('nationality', nationalityValue);
        formData.append('state_of_origin', stateValue);
        formData.append('lga_of_origin', lgaValue);
        formData.append('admission_date', normalizeDateInput(document.getElementById('admission-date').value));
        formData.append('house', document.getElementById('house').value);
        formData.append('club', document.getElementById('club').value);
        formData.append('current_session_id', document.getElementById('session-id').value);
        formData.append('current_term_id', document.getElementById('term-id').value);
        formData.append('school_class_id', document.getElementById('class-id').value);
        formData.append('class_arm_id', document.getElementById('class-arm-id').value);
        formData.append('class_section_id', document.getElementById('class-section-id').value);
        formData.append('parent_id', document.getElementById('parent-id').value);
        formData.append('status', document.getElementById('status').value);
        formData.append('address', document.getElementById('address').value);
        formData.append('medical_information', document.getElementById('medical-info').value);
        const bloodGroupSelect = document.getElementById('blood-group');
        if (bloodGroupSelect) {
            formData.append('blood_group_id', bloodGroupSelect.value);
        }
        formData.append('_method', 'PUT');

        const photoInput = document.getElementById('photo');
        if (photoInput.files[0]) {
            formData.append('photo', photoInput.files[0]);
        }

        fetch(`${backend_url}/api/v1/students/${studentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    if (response.status === 422 && err.errors) {
                        const errorMessages = Object.values(err.errors).flat().join('\\n');
                        throw new Error(errorMessages);
                    }
                    throw new Error(err.message || 'Failed to update student');
                });
            }
            return response.json();
        })
        .then(data => {
            alert('Student updated successfully!');
            window.location.href = `student-details.html?id=${studentId}`;
        })
        .catch(error => {
            console.error('Error updating student:', error);
            alert(`Error: ${error.message}`);
        });
    });
});
