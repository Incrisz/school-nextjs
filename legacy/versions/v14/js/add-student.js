// Cookie function remains the same
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

// Helper function to get headers
function getHeaders() {
    const token = getCookie('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
    };
}

function renderSelectOptions(select, optionsHtml, selectedValue = '', triggerChange = false) {
    if (!select) return;
    const value = selectedValue === undefined || selectedValue === null ? '' : String(selectedValue);
    const hasSelect2 = typeof $ !== 'undefined' && $.fn && $.fn.select2 && select.classList && select.classList.contains('select2');

    if (hasSelect2) {
        const $select = $(select);
        $select.html(optionsHtml);
        $select.val(value === '' ? null : value);
        $select.trigger(triggerChange ? 'change' : 'change.select2');
        return;
    }

    select.innerHTML = optionsHtml;
    select.value = value;

    if (triggerChange) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

const locationCache = {
    countries: [],
    statesByCountry: new Map(),
    lgasByState: new Map(),
    bloodGroups: [],
};

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('add-student-form');

    // Load initial independent dropdowns
    loadParentsIntoSelect('parent-id');
    loadClassesIntoSelect('class-id');
    loadSessionsIntoSelect('session-id');
    loadCountriesIntoSelect();
    loadBloodGroupsIntoSelect();

    // Handle dependent dropdowns
    const sessionSelect = document.getElementById('session-id');

    const handleSessionChange = function() {
        const sessionId = this.value;
        if (sessionId) {
            loadSessionTermsIntoSelect(sessionId, 'term-id');
        } else {
            clearSelect('term-id', 'Please Select Term *');
        }
    };

    if (sessionSelect) {
        // Standard change event
        sessionSelect.addEventListener('change', handleSessionChange);

        // Ensure Select2 plugin triggers also load terms
        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(sessionSelect).on('select2:select', function () {
                handleSessionChange.call(this);
            });
        }
    }

    const classSelect = document.getElementById('class-id');
    const classArmSelect = document.getElementById('class-arm-id');
    const classSectionSelect = document.getElementById('class-section-id');

    const handleClassChange = function() {
        const classId = this.value;

        if (classId) {
            // Clear dependent dropdowns first
            clearSelect('class-arm-id', 'Please Select Class Arm *');
            clearSelect('class-section-id', 'Please Select Section');

            // Then load class arms
            loadClassArmsIntoSelect(classId, 'class-arm-id');
        } else {
            clearSelect('class-arm-id', 'Please Select Class Arm *');
            clearSelect('class-section-id', 'Please Select Section');
        }
    };

    if (classSelect) {
        classSelect.addEventListener('change', handleClassChange);

        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(classSelect).on('select2:select', function () {
                handleClassChange.call(this);
            });
        }
    }

    const handleClassArmChange = function() {
        const classId = document.getElementById('class-id').value;
        const armId = this.value;

        if (armId && classId) {
            clearSelect('class-section-id', 'Please Select Section');
            loadClassArmSectionsIntoSelect(classId, armId, 'class-section-id');
        } else {
            clearSelect('class-section-id', 'Please Select Section');
        }
    };

    if (classArmSelect) {
        classArmSelect.addEventListener('change', handleClassArmChange);

        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(classArmSelect).on('select2:select', function () {
                handleClassArmChange.call(this);
            });
        }
    }

    const handleClassSectionChange = function() {
        const sectionId = this.value;
    };

    if (classSectionSelect) {
        classSectionSelect.addEventListener('change', handleClassSectionChange);

        if (typeof $ !== 'undefined' && $.fn && $.fn.select2) {
            $(classSectionSelect).on('select2:select', function () {
                handleClassSectionChange.call(this);
            });
        }
    }

    // Form submission handler (keeping original)
    const countrySelect = document.getElementById('country-id');
    const stateSelect = document.getElementById('state-of-origin');
    const lgaSelect = document.getElementById('lga-of-origin');

    if (countrySelect) {
        const handleCountryChange = async function () {
            const countryId = this.value;
            const select2Active = typeof $ !== 'undefined' && $.fn && $.fn.select2;
            
            // Clear state dropdown
            if (stateSelect) {
                if (select2Active && stateSelect.classList.contains('select2')) {
                    $(stateSelect).html('<option value="">Please Select State *</option>').trigger('change.select2');
                } else {
                    stateSelect.innerHTML = '<option value="">Please Select State *</option>';
                }
            }
            // Clear LGA dropdown
            if (lgaSelect) {
                if (select2Active && lgaSelect.classList.contains('select2')) {
                    $(lgaSelect).html('<option value="">Please Select LGA *</option>').trigger('change.select2');
                } else {
                    lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
                }
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
            const select2Active = typeof $ !== 'undefined' && $.fn && $.fn.select2;
            
            // Clear LGA dropdown
            if (lgaSelect) {
                if (select2Active && lgaSelect.classList.contains('select2')) {
                    $(lgaSelect).html('<option value="">Please Select LGA *</option>').trigger('change.select2');
                } else {
                    lgaSelect.innerHTML = '<option value="">Please Select LGA *</option>';
                }
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

    if (form) {
        form.addEventListener('submit', function (event) {
            event.preventDefault();

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

            const formData = new FormData();
            formData.append('first_name', document.getElementById('first-name').value);
            formData.append('middle_name', document.getElementById('middle-name').value);
            formData.append('last_name', document.getElementById('last-name').value);
            formData.append('gender', document.getElementById('gender').value);
            formData.append('date_of_birth', normalizeDateInput(document.getElementById('dob').value));
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

            const photoInput = document.getElementById('photo');
            if (photoInput.files[0]) {
                formData.append('photo', photoInput.files[0]);
            }

            fetch(`${backend_url}/api/v1/students`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getCookie('token')}`, 'Accept': 'application/json' },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => {
                        if (response.status === 422 && err.errors) {
                            const errorMessages = Object.values(err.errors).flat().join('\n');
                            throw new Error(errorMessages);
                        }
                        throw new Error(err.message || 'Failed to register student');
                    });
                }
                return response.json();
            })
            .then(data => {
                alert('Student registered successfully!');
                window.location.href = 'all-students.html';
            })
            .catch(error => {
                alert(`Error: ${error.message}`);
            });
        });
    }
});

// Helper function to clear and reset select elements
function clearSelect(selectId, defaultText) {
    const select = document.getElementById(selectId);
    if (select) {
        const defaultOptionHtml = `<option value="">${defaultText}</option>`;
        renderSelectOptions(select, defaultOptionHtml, '', false);
    }
}

async function loadCountriesIntoSelect() {
    const select = document.getElementById('country-id');
    if (!select) return;
    renderSelectOptions(select, '<option value="">Loading...</option>', '', false);

    try {
        const response = await fetch(`${backend_url}/api/v1/locations/countries`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to load countries.');
        const payload = await response.json();
        const countries = Array.isArray(payload?.data) ? payload.data : [];
        locationCache.countries = countries;

        const options = ['<option value="">Please Select Country *</option>']
            .concat(countries.map((country) => `<option value="${country.id}" data-name="${country.name}">${country.name}</option>`));
        const optionsHtml = options.join('');
        renderSelectOptions(select, optionsHtml, '', false);
    } catch (error) {
        console.error(error);
        renderSelectOptions(select, '<option value="">Failed to load countries</option>', '', false);
    }
}

async function loadStatesIntoSelect(countryId) {
    console.log('=== loadStatesIntoSelect called ===');
    console.log('Country ID:', countryId);
    
    const select = document.getElementById('state-of-origin');
    console.log('State select element found:', !!select);
    
    if (!select || !countryId) {
        console.log('Exiting: select or countryId missing');
        return;
    }
    
    const select2Active = typeof $ !== 'undefined' && $.fn && $.fn.select2 && select.classList.contains('select2');
    console.log('Select2 active:', select2Active);

    if (select2Active) {
        $(select).html('<option value="">Loading...</option>').trigger('change.select2');
    } else {
        select.innerHTML = '<option value="">Loading...</option>';
        select.value = '';
    }

    if (!locationCache.statesByCountry.has(countryId)) {
        console.log('Fetching states from API...');
        try {
            const url = `${backend_url}/api/v1/locations/states?country_id=${countryId}`;
            console.log('Fetch URL:', url);
            
            const response = await fetch(url, {
                headers: getHeaders(),
            });
            console.log('Response status:', response.status);
            
            if (!response.ok) throw new Error('Failed to load states.');
            const payload = await response.json();
            console.log('Payload received:', payload);
            
            const states = Array.isArray(payload?.data) ? payload.data : [];
            console.log('States extracted:', states.length, 'items');
            
            locationCache.statesByCountry.set(countryId, states);
        } catch (error) {
            console.error('Error fetching states:', error);
            renderSelectOptions(select, '<option value="">Failed to load states</option>', '', false);
            return;
        }
    } else {
        console.log('Using cached states');
    }

    const states = locationCache.statesByCountry.get(countryId) || [];
    console.log('Total states to display:', states.length);
    
    const options = ['<option value="">Please Select State *</option>']
        .concat(states.map((state) => `<option value="${state.id}" data-name="${state.name}">${state.name}</option>`));
    const html = options.join('');
    const singleStateId = states.length === 1 ? (states[0]?.id ?? states[0]?.uuid ?? '') : '';

    if (select2Active) {
        console.log('Updating Select2 dropdown');
        $(select).html(html);
        if (singleStateId) {
            $(select).val(singleStateId).trigger('change');
        } else {
            $(select).val(null).trigger('change.select2');
        }
    } else {
        console.log('Updating regular dropdown');
        select.innerHTML = html;
        if (singleStateId) {
            select.value = singleStateId;
            select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
            select.value = '';
        }
    }
    
    console.log('State dropdown updated. Options count:', select.options.length);
}

async function loadLgasIntoSelect(stateId) {
    const select = document.getElementById('lga-of-origin');
    if (!select || !stateId) return;
    const select2Active = typeof $ !== 'undefined' && $.fn && $.fn.select2 && select.classList.contains('select2');

    if (select2Active) {
        $(select).html('<option value="">Loading...</option>').trigger('change.select2');
    } else {
        select.innerHTML = '<option value="">Loading...</option>';
        select.value = '';
    }

    if (!locationCache.lgasByState.has(stateId)) {
        try {
            const response = await fetch(`${backend_url}/api/v1/locations/states/${stateId}/lgas`, {
                headers: getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to load LGAs.');
            const payload = await response.json();
            const lgas = Array.isArray(payload?.data) ? payload.data : [];
            locationCache.lgasByState.set(stateId, lgas);
        } catch (error) {
            console.error(error);
            renderSelectOptions(select, '<option value="">Failed to load LGAs</option>', '', false);
            return;
        }
    }

    const lgas = locationCache.lgasByState.get(stateId) || [];
    const options = ['<option value="">Please Select LGA *</option>']
        .concat(lgas.map((lga) => `<option value="${lga.name}" data-name="${lga.name}">${lga.name}</option>`));
    const html = options.join('');

    if (select2Active) {
        $(select).html(html).val(null).trigger('change.select2');
    } else {
        select.innerHTML = html;
        select.value = '';
    }
}

async function loadBloodGroupsIntoSelect() {
    const select = document.getElementById('blood-group');
    if (!select) return;
    renderSelectOptions(select, '<option value="">Loading...</option>', '', false);

    try {
        const response = await fetch(`${backend_url}/api/v1/locations/blood-groups`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to load blood groups.');
        const payload = await response.json();
        const groups = Array.isArray(payload?.data) ? payload.data : [];
        locationCache.bloodGroups = groups;

        const options = ['<option value="">Select Blood Group</option>']
            .concat(groups.map((group) => `<option value="${group.id}">${group.name}</option>`));
        renderSelectOptions(select, options.join(''), '', false);
    } catch (error) {
        console.error(error);
        renderSelectOptions(select, '<option value="">Failed to load blood groups</option>', '', false);
    }
}

// Load parents into select
async function loadParentsIntoSelect(selectId) {
    try {
        const url = `${backend_url}/api/v1/all-parents`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        
        if (response.ok) {
            const parents = await response.json();

            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Please Select Parent *</option>';
                parents.forEach(parent => {
                    const parentId = parent.uuid || parent.id;
                    if (!parentId) {
                        return;
                    }

                    const option = new Option(`${parent.first_name} ${parent.last_name}`, String(parentId));
                    select.add(option);
                });
            }
        }
    } catch (error) {
    }
}

// Load classes into select
async function loadClassesIntoSelect(selectId) {
    try {
        const url = `${backend_url}/api/v1/classes`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        
        if (response.ok) {
            const classes = await response.json();

            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Please Select Class *</option>';
                classes.forEach(_class => {
                    const classId = _class.uuid || _class.id;
                    if (!classId) {
                        return;
                    }

                    const option = new Option(_class.name, String(classId));
                    select.add(option);
                });
            }
        }
    } catch (error) {
    }
}

// Load sessions into select
async function loadSessionsIntoSelect(selectId) {
    try {
        const url = `${backend_url}/api/v1/sessions`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        
        if (response.ok) {
            const sessions = await response.json();

            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Please Select Session *</option>';
                sessions.forEach(session => {
                    const option = new Option(session.name, session.id);
                    select.add(option);
                });
            }
        }
    } catch (error) {
    }
}

// Load session terms into select
async function loadSessionTermsIntoSelect(sessionId, selectId) {

    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = '<option value="">Loading terms...</option>';
    }

    try {
        const url = `${backend_url}/api/v1/sessions/${sessionId}/terms`;

        const response = await fetch(url, {
            headers: getHeaders()
        });


        if (!select) return;

        if (response.ok) {
            const data = await response.json();

            let terms = [];
            if (Array.isArray(data)) {
                terms = data;
            } else if (Array.isArray(data.data)) {
                terms = data.data;
            } else if (Array.isArray(data.terms)) {
                terms = data.terms;
            } else if (Array.isArray(data.data?.terms)) {
                terms = data.data.terms;
            }
            select.innerHTML = '<option value="">Please Select Term *</option>';
            if (terms.length > 0) {
                terms.forEach((term, idx) => {
                    const termId = term.uuid || term.id;
                    if (!termId) {
                        return;
                    }

                    const option = new Option(term.name, String(termId));
                    select.add(option);
                });
            } else {
                const option = new Option('No terms available', '');
                select.add(option);
            }
        } else {
            select.innerHTML = '<option value="">No terms available</option>';
        }
    } catch (error) {
        if (select) {
            select.innerHTML = '<option value="">Failed to load terms</option>';
        }
    }
}

// Load class arms into select
async function loadClassArmsIntoSelect(classId, selectId) {
    
    // Show loading state
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = '<option value="">Loading arms...</option>';
    }
    
    try {
        const url = `${backend_url}/api/v1/classes/${classId}/arms`;
        
        const headers = getHeaders();
        
        const response = await fetch(url, { headers });
        
        
        if (response.ok) {
            const data = await response.json();

            let arms = [];
            if (Array.isArray(data)) {
                arms = data;
            } else if (Array.isArray(data.data)) {
                arms = data.data;
            } else if (Array.isArray(data.arms)) {
                arms = data.arms;
            } else if (Array.isArray(data.data?.arms)) {
                arms = data.data.arms;
            }

            if (select) {
                select.innerHTML = '<option value="">Please Select Class Arm *</option>';

                if (arms.length > 0) {
                    arms.forEach((arm) => {
                        const armId = arm.uuid || arm.id;
                        if (!armId) {
                            return;
                        }

                        const option = new Option(arm.name, String(armId));
                        select.add(option);
                    });
                } else {
                    const noDataOption = new Option('No arms available', '');
                    select.add(noDataOption);
                }
            }
        } else {
            
            if (select) {
                select.innerHTML = '<option value="">Failed to load arms</option>';
            }
        }
    } catch (error) {
        
        if (select) {
            select.innerHTML = '<option value="">Error loading arms</option>';
        }
    }
}

// Load class arm sections into select
async function loadClassArmSectionsIntoSelect(classId, armId, selectId) {
    
    // Show loading state
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = '<option value="">Loading sections...</option>';
    }
    
    try {
        const url = `${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`;
        
        const response = await fetch(url, {
            headers: getHeaders()
        });
        
        
        if (response.ok) {
            const data = await response.json();

            let sections = [];
            if (Array.isArray(data)) {
                sections = data;
            } else if (Array.isArray(data.data)) {
                sections = data.data;
            } else if (Array.isArray(data.sections)) {
                sections = data.sections;
            } else if (Array.isArray(data.data?.sections)) {
                sections = data.data.sections;
            }

            if (select) {
                select.innerHTML = '<option value="">Please Select Section</option>';

                if (sections.length > 0) {
                    sections.forEach(section => {
                        const sectionId = section.uuid || section.id;
                        if (!sectionId) {
                            return;
                        }

                        const option = new Option(section.name, String(sectionId));
                        select.add(option);
                    });
                } else {
                    const noDataOption = new Option('No sections available', '');
                    select.add(noDataOption);
                }
            }
        } else {
            
            if (select) {
                select.innerHTML = '<option value="">Failed to load sections</option>';
            }
        }
    } catch (error) {
        
        if (select) {
            select.innerHTML = '<option value="">Error loading sections</option>';
        }
    }
}
