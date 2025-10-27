document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;

    if (path.includes('all-class-arms.html')) {
        loadClassesIntoSelect('class-select-filter');
        document.getElementById('class-select-filter').addEventListener('change', (event) => {
            const classId = event.target.value;
            if (classId) {
                loadClassArms(classId);
            } else {
                document.getElementById('class-arm-table-body').innerHTML = '';
            }
        });
    }

    if (path.includes('add-class-arm.html')) {
        loadClassesIntoSelect('class-select');
        const form = document.getElementById('add-class-arm-form');
        if (form) {
            form.addEventListener('submit', addClassArm);
        }
    }

    if (path.includes('edit-class-arm.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const armId = urlParams.get('id');
        const classId = urlParams.get('classId');
        if (armId && classId) {
            loadClassArmForEdit(classId, armId);
            const form = document.getElementById('edit-class-arm-form');
            if(form) {
                form.addEventListener('submit', (event) => updateClassArm(event, classId, armId));
            }
        } else {
            window.location.href = 'all-class-arms.html';
        }
    }
});

async function loadClassesIntoSelect(selectId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const classes = await response.json();
            const select = document.getElementById(selectId);
            if (select) {
                classes.forEach(_class => {
                    const option = new Option(_class.name, _class.id);
                    select.add(option);
                });
            }
        } else {
            console.error('Failed to load classes:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadClassArms(classId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const arms = await response.json();
            const tableBody = document.getElementById('class-arm-table-body');
            const classSelect = document.getElementById('class-select-filter');
            const selectedClassName = classSelect.options[classSelect.selectedIndex].text;
            if (tableBody) {
                tableBody.innerHTML = '';
                arms.forEach((arm, index) => {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${arm.name}</td>
                            <td>${selectedClassName}</td>
                            <td>
                                <div class="dropdown">
                                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                        <span class="flaticon-more-button-of-three-dots"></span>
                                    </a>
                                    <div class="dropdown-menu dropdown-menu-right">
                                        <a class="dropdown-item" href="edit-class-arm.html?classId=${classId}&id=${arm.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                        <a class="dropdown-item" href="#" onclick="deleteClassArm('${classId}', '${arm.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            console.error('Failed to load class arms:', await response.text());
            document.getElementById('class-arm-table-body').innerHTML = '<tr><td colspan="4">Failed to load class arms.</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('class-arm-table-body').innerHTML = '<tr><td colspan="4">An error occurred.</td></tr>';
    }
}

async function addClassArm(event) {
    event.preventDefault();
    const classId = document.getElementById('class-select').value;
    const armName = document.getElementById('arm-name').value.trim();

    if (!classId || !armName) {
        alert('Please select a class and enter an arm name.');
        return;
    }

    const armData = { name: armName };

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(armData)
        });
        if (response.ok) {
            alert('Class arm added successfully!');
            window.location.href = `all-class-arms.html?classId=${classId}`;
        } else {
            const errorData = await response.json();
            alert(`Failed to add class arm: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function loadClassArmForEdit(classId, armId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const arm = await response.json();
            document.getElementById('arm-id').value = arm.id;
            document.getElementById('arm-name').value = arm.name;
             // You might need to load classes and set the selected one if you have a class dropdown on the edit page.
        } else {
            alert('Failed to load class arm data.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}


async function updateClassArm(event, classId, armId) {
    event.preventDefault();
    const armName = document.getElementById('arm-name').value.trim();
    if (!armName) {
        alert('Please enter an arm name.');
        return;
    }

    const armData = { name: armName };

    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(armData)
        });
        if (response.ok) {
            alert('Class arm updated successfully!');
            window.location.href = `all-class-arms.html?classId=${classId}`;
        } else {
            const errorData = await response.json();
            alert(`Failed to update class arm: ${JSON.stringify(errorData)}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function deleteClassArm(classId, armId) {
    if (confirm('Are you sure you want to delete this class arm?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (response.ok) {
                alert('Class arm deleted successfully!');
                loadClassArms(classId);
            } else {
                const errorData = await response.json();
                alert(`Failed to delete class arm: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
