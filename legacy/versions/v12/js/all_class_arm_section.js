document.addEventListener('DOMContentLoaded', function () {
    loadClassesIntoSelect('class-select-filter');

    document.getElementById('class-select-filter').addEventListener('change', function () {
        const classId = this.value;
        if (classId) {
            loadClassArmsIntoSelect(classId, 'class-arm-select-filter');
        } else {
            document.getElementById('class-arm-select-filter').innerHTML = '<option value="">Select a Class Arm</option>';
            document.getElementById('class-arm-section-table-body').innerHTML = '';
        }
    });

    document.getElementById('class-arm-select-filter').addEventListener('change', function () {
        const armId = this.value;
        const classId = document.getElementById('class-select-filter').value;
        if (armId && classId) {
            loadClassArmSections(classId, armId);
        } else {
            document.getElementById('class-arm-section-table-body').innerHTML = '';
        }
    });
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
                select.innerHTML = '<option value="">Select a Class</option>';
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
            }
        } else {
            console.error('Failed to load class arms:', await response.text());
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadClassArmSections(classId, armId) {
    try {
        const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections`, {
            headers: getHeaders()
        });
        if (response.ok) {
            const sections = await response.json();
            const tableBody = document.getElementById('class-arm-section-table-body');
            const classSelect = document.getElementById('class-select-filter');
            const selectedClassName = classSelect.options[classSelect.selectedIndex].text;
            const armSelect = document.getElementById('class-arm-select-filter');
            const selectedArmName = armSelect.options[armSelect.selectedIndex].text;

            if (tableBody) {
                tableBody.innerHTML = '';
                sections.forEach((section, index) => {
                    const row = `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${section.name}</td>
                            <td>${selectedArmName}</td>
                            <td>${selectedClassName}</td>
                            <td>
                                <div class="dropdown">
                                    <a href="#" class="dropdown-toggle" data-toggle="dropdown" aria-expanded="false">
                                        <span class="flaticon-more-button-of-three-dots"></span>
                                    </a>
                                    <div class="dropdown-menu dropdown-menu-right">
                                        <a class="dropdown-item" href="edit-class-arm-section.html?classId=${classId}&armId=${armId}&id=${section.id}"><i class="fas fa-cogs text-dark-pastel-green"></i> Edit</a>
                                        <a class="dropdown-item" href="#" onclick="deleteClassArmSection('${classId}', '${armId}', '${section.id}')"><i class="fas fa-times text-orange-red"></i> Delete</a>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                    tableBody.innerHTML += row;
                });
            }
        } else {
            console.error('Failed to load class arm sections:', await response.text());
            document.getElementById('class-arm-section-table-body').innerHTML = '<tr><td colspan="5">Failed to load sections.</td></tr>';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('class-arm-section-table-body').innerHTML = '<tr><td colspan="5">An error occurred.</td></tr>';
    }
}

async function deleteClassArmSection(classId, armId, sectionId) {
    if (confirm('Are you sure you want to delete this section?')) {
        try {
            const response = await fetch(`${backend_url}/api/v1/classes/${classId}/arms/${armId}/sections/${sectionId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (response.ok) {
                alert('Section deleted successfully!');
                loadClassArmSections(classId, armId);
            } else {
                const errorData = await response.json();
                alert(`Failed to delete section: ${JSON.stringify(errorData)}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        }
    }
}
