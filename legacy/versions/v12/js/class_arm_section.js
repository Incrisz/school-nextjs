document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('add-class-arm-section.html')) {
        loadClassesIntoSelect('class-select');

        $('#class-select').on('select2:select', function (e) {
            const classId = e.params.data.id;
            if (classId) {
                loadClassArmsIntoSelect(classId, 'class-arm-select');
            } else {
                $('#class-arm-select').html('<option value="">Select a Class Arm</option>').trigger('change');
            }
        });

        $('#add-class-arm-section-form').on('submit', addClassArmSection);
    }

    if (path.includes('edit-class-arm-section.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get('classId');
        const armId = urlParams.get('armId');
        const sectionId = urlParams.get('id');

        if (classId && armId && sectionId) {
            // Populate the dropdowns and form fields
            loadClassesIntoSelect('class-select').then(() => {
                $('#class-select').val(classId).trigger('change');
                loadClassArmsIntoSelect(classId, 'class-arm-select').then(() => {
                    $('#class-arm-select').val(armId).trigger('change');
                });
            });

            // Fetch the section name and populate it
            fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`, { headers: getHeaders() })
                .then(response => response.json())
                .then(section => {
                    $('#section-name').val(section.name);
                });

            // Handle form submission
            $('#edit-class-arm-section-form').on('submit', function(event) {
                event.preventDefault();
                updateClassArmSection(classId, armId, sectionId);
            });
        }
    }
});

async function updateClassArmSection(classId, armId, sectionId) {
    const sectionName = $('#section-name').val().trim();
    if (!sectionName) {
        alert('Please enter a section name.');
        return;
    }

    const sectionData = { name: sectionName };

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(sectionData)
        });

        if (response.ok) {
            alert('Class arm section updated successfully!');
            window.location.href = 'all-class-arm-sections.html';
        } else {
            const errorData = await response.json();
            alert(`Failed to update class arm section: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function loadClassesIntoSelect(selectId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const classes = await response.json();
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select a Class</option>';
                classes.forEach(_class => {
                    const option = new Option(_class.name, _class.id);
                    select.add(option);
                });
                $('#' + selectId).trigger('change');
            }
        } else {
            console.error('Failed to load classes:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadClassArmsIntoSelect(classId, selectId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const arms = await response.json();
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select a Class Arm</option>';
                arms.forEach(arm => {
                    const option = new Option(arm.name, arm.id);
                    select.add(option);
                });
                $('#' + selectId).trigger('change');
            }
        } else {
            console.error('Failed to load class arms:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function addClassArmSection(event) {
    event.preventDefault();

    const classId = $('#class-select').val();
    const armId = $('#class-arm-select').val();
    const sectionName = $('#section-name').val().trim();

    if (!classId || !armId || !sectionName) {
        alert('Please select a class, a class arm, and enter a section name.');
        return;
    }

    const sectionData = { name: sectionName };

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sectionData)
        });

        if (response.ok) {
            alert('Class arm section added successfully!');
            window.location.href = `all-class-arm-sections.html`;
        } else {
            const errorData = await response.json();
            alert(`Failed to add class arm section: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}
