// Global Application State
const state = {
  currentPage: 1,
  limit: 8,
  search: '',
  department: 'ALL',
  semester: 'ALL',
  feeStatus: 'ALL',
  sortBy: 'createdAt',
  order: 'desc',
  filterDefaulter: false,
  deptChartInstance: null,
  gradeChartInstance: null,
  currentUser: JSON.parse(localStorage.getItem('srms_user') || 'null'),
  token: localStorage.getItem('srms_token') || '',
  selectedUploadFile: null
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initEventListeners();
  initAuthWidget();
  initUploadListeners();
  loadDashboardData();
  loadStudents();
  loadDepartmentsDropdown();
  checkSystemStatus();
});

// System Status Check
async function checkSystemStatus() {
  try {
    const res = await fetch('/api/system-status');
    const data = await res.json();
    const statusText = document.getElementById('db-status-text');
    if (data.database && data.database.readyState === 'Connected') {
      statusText.innerText = `Connected: ${data.database.name}`;
    } else {
      statusText.innerText = 'Disconnected';
      document.querySelector('.pulse-dot').style.backgroundColor = '#ef4444';
    }
  } catch (err) {
    document.getElementById('db-status-text').innerText = 'MongoDB Offline';
    document.querySelector('.pulse-dot').style.backgroundColor = '#ef4444';
  }
}

// Tab Switching
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'dashboard') {
        loadDashboardData();
      } else if (targetId === 'directory') {
        loadStudents();
      }
    });
  });
}

// Event Listeners
function initEventListeners() {
  // Search input debounce
  let debounceTimeout;
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        state.search = e.target.value.trim();
        state.currentPage = 1;
        loadStudents();
      }, 300);
    });
  }

  // Filters
  const deptFilter = document.getElementById('filter-dept');
  if (deptFilter) {
    deptFilter.addEventListener('change', e => {
      state.department = e.target.value;
      state.currentPage = 1;
      loadStudents();
    });
  }

  const semFilter = document.getElementById('filter-sem');
  if (semFilter) {
    semFilter.addEventListener('change', e => {
      state.semester = e.target.value;
      state.currentPage = 1;
      loadStudents();
    });
  }

  const feeFilter = document.getElementById('filter-fee');
  if (feeFilter) {
    feeFilter.addEventListener('change', e => {
      state.feeStatus = e.target.value;
      state.currentPage = 1;
      loadStudents();
    });
  }

  // Student Form Submit
  const studentForm = document.getElementById('student-form');
  if (studentForm) {
    studentForm.addEventListener('submit', handleStudentFormSubmit);
  }

  // Add Dynamic Grade Row
  const addGradeBtn = document.getElementById('add-grade-row-btn');
  if (addGradeBtn) {
    addGradeBtn.addEventListener('click', addGradeRow);
  }
}

// Load Dashboard KPIs & Charts
async function loadDashboardData() {
  try {
    const [statsRes, deptRes, gradeRes, topRes] = await Promise.all([
      fetch('/api/analytics/dashboard-stats'),
      fetch('/api/analytics/department-summary'),
      fetch('/api/analytics/grade-distribution'),
      fetch('/api/analytics/top-performers')
    ]);

    const stats = await statsRes.json();
    const deptData = await deptRes.json();
    const gradeData = await gradeRes.json();
    const topData = await topRes.json();

    if (stats.success) {
      document.getElementById('stat-total-students').innerText = stats.data.totalStudents;
      document.getElementById('stat-avg-cgpa').innerText = stats.data.overallAvgCgpa;
      document.getElementById('stat-avg-attendance').innerText = `${stats.data.overallAvgAttendance}%`;
      document.getElementById('stat-dept-count').innerText = stats.data.deptCount;
    }

    // Render Department Chart
    if (deptData.success) {
      renderDepartmentChart(deptData.data);
    }

    // Render Grade Distribution Donut Chart
    if (gradeData.success) {
      renderGradeChart(gradeData.data);
    }

    // Render Top Performers Leaderboard
    if (topData.success) {
      renderLeaderboard(topData.data);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showToast('Failed to load dashboard analytics', 'error');
  }
}

// Render Department Comparison Chart (Chart.js)
function renderDepartmentChart(departments) {
  const ctx = document.getElementById('deptChart');
  if (!ctx) return;

  const labels = departments.map(d => d.departmentCode);
  const avgCgpaData = departments.map(d => d.avgCgpa);
  const avgAttData = departments.map(d => d.avgAttendance);

  if (state.deptChartInstance) {
    state.deptChartInstance.destroy();
  }

  state.deptChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Average CGPA (Scale 10)',
          data: avgCgpaData,
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Avg Attendance (%)',
          data: avgAttData,
          backgroundColor: '#10b981',
          borderRadius: 6,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            footer: (items) => {
              const dept = departments[items[0].dataIndex];
              return `Dept: ${dept.departmentName}\nStudents: ${dept.totalStudents}\nFees Paid: ${dept.feesPaidPercentage}%`;
            }
          }
        }
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          max: 10,
          min: 0,
          title: { display: true, text: 'CGPA' }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          max: 100,
          min: 0,
          grid: { drawOnChartArea: false },
          title: { display: true, text: 'Attendance %' }
        }
      }
    }
  });
}

// Render Grade Distribution Chart
function renderGradeChart(grades) {
  const ctx = document.getElementById('gradeChart');
  if (!ctx) return;

  const labels = grades.map(g => `Grade ${g.grade}`);
  const data = grades.map(g => g.count);

  if (state.gradeChartInstance) {
    state.gradeChartInstance.destroy();
  }

  const colors = ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

  state.gradeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, data.length),
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Render Top Performers
function renderLeaderboard(students) {
  const container = document.getElementById('leaderboard-list');
  if (!container) return;

  if (students.length === 0) {
    container.innerHTML = '<p class="text-muted">No student records available.</p>';
    return;
  }

  container.innerHTML = students.map((s, idx) => {
    const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-default';
    return `
      <div class="leaderboard-item">
        <div style="display: flex; align-items: center;">
          <div class="rank-badge ${rankClass}">#${idx + 1}</div>
          <div>
            <div style="font-weight: 600; color: var(--dark);">${s.fullName}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${s.regNo} &bull; ${s.department} (Sem ${s.semester})</div>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; color: #2563eb; font-size: 1.05rem;">${s.cgpa} <span style="font-size: 0.75rem; color: var(--text-muted);">CGPA</span></div>
          <div style="font-size: 0.75rem; color: #10b981;">${s.attendance}% Attn</div>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle Attendance Defaulter Filter
function toggleDefaulterFilter() {
  state.filterDefaulter = !state.filterDefaulter;
  state.currentPage = 1;
  const btn = document.getElementById('btn-defaulter-toggle');
  if (btn) {
    if (state.filterDefaulter) {
      btn.classList.add('btn-filter-active');
      btn.innerText = '⚠️ Defaulters Only (ON)';
      showToast('Filtering students with attendance < 75%', 'warning');
    } else {
      btn.classList.remove('btn-filter-active');
      btn.innerText = '⚠️ Defaulters (<75%)';
      showToast('Showing all students', 'info');
    }
  }
  loadStudents();
}

// Load Students in Directory Table
async function loadStudents() {
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px;">Loading student records from MongoDB...</td></tr>`;

  try {
    const queryObj = {
      page: state.currentPage,
      limit: state.limit,
      q: state.search,
      department: state.department,
      semester: state.semester,
      feeStatus: state.feeStatus,
      sortBy: state.sortBy,
      order: state.order
    };

    if (state.filterDefaulter) {
      queryObj.defaulter = 'true';
    }

    const queryParams = new URLSearchParams(queryObj);
    const res = await fetch(`/api/students?${queryParams.toString()}`);
    const result = await res.json();

    if (!result.success || result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">No student records found matching the criteria.</td></tr>`;
      renderPagination({ total: 0, page: 1, totalPages: 1 });
      return;
    }

    const isStudent = state.currentUser && state.currentUser.role === 'Student';

    tbody.innerHTML = result.data.map(s => {
      const feeBadgeClass = s.feeStatus === 'Paid' ? 'badge-paid' : s.feeStatus === 'Pending' ? 'badge-pending' : 'badge-partial';
      const city = s.address && s.address.city ? s.address.city : 'N/A';
      const isDefaulter = s.attendance < 75;

      return `
        <tr>
          <td><strong style="color: #2563eb;">${s.regNo}</strong></td>
          <td>
            <div style="font-weight: 600;">${s.firstName} ${s.lastName}</div>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${s.email}</div>
          </td>
          <td><span class="badge badge-dept">${s.department}</span></td>
          <td>Sem ${s.semester}</td>
          <td>
            <strong style="color: ${s.cgpa >= 8.5 ? '#10b981' : s.cgpa >= 6.5 ? '#2563eb' : '#f59e0b'};">
              ${s.cgpa.toFixed(2)}
            </strong>
          </td>
          <td>
            ${isDefaulter 
              ? `<span class="badge badge-defaulter" title="Attendance shortage (<75%) - Ineligible for exams!">⚠️ ${s.attendance}%</span>` 
              : `<span>${s.attendance}%</span>`}
          </td>
          <td><span class="badge ${feeBadgeClass}">${s.feeStatus}</span></td>
          <td>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="viewStudentModal('${s._id}')" title="View Profile">👁️</button>
              <button class="btn btn-secondary btn-sm" onclick="openMarksheetModal('${s._id}')" title="Official Marksheet">📄</button>
              <button class="btn btn-secondary btn-sm" onclick="openIdCardModal('${s._id}')" title="Student ID Card">🪪</button>
              <button class="btn btn-secondary btn-sm" onclick="openReceiptModal('${s._id}')" title="Fee Receipt">🧾</button>
              ${isStudent ? '' : `<button class="btn btn-secondary btn-sm" onclick="editStudentModal('${s._id}')" title="Edit Record">✏️</button>`}
              ${isStudent ? '' : `<button class="btn btn-danger btn-sm" onclick="deleteStudentRecord('${s._id}', '${s.regNo}')" title="Delete Record">🗑️</button>`}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    renderPagination(result.pagination);
  } catch (error) {
    console.error('Error loading students:', error);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: #ef4444; padding: 30px;">Error loading data from MongoDB server.</td></tr>`;
  }
}

// Render Pagination Controls
function renderPagination(pagination) {
  const info = document.getElementById('pagination-info');
  const controls = document.getElementById('pagination-controls');
  if (!info || !controls) return;

  info.innerText = `Showing page ${pagination.page} of ${pagination.totalPages} (Total: ${pagination.total} records)`;

  let html = '';
  if (pagination.page > 1) {
    html += `<button class="btn btn-secondary btn-sm" onclick="changePage(${pagination.page - 1})">&laquo; Prev</button>`;
  }

  for (let i = 1; i <= pagination.totalPages; i++) {
    if (i === pagination.page) {
      html += `<button class="btn btn-primary btn-sm">${i}</button>`;
    } else if (i === 1 || i === pagination.totalPages || Math.abs(i - pagination.page) <= 1) {
      html += `<button class="btn btn-secondary btn-sm" onclick="changePage(${i})">${i}</button>`;
    }
  }

  if (pagination.page < pagination.totalPages) {
    html += `<button class="btn btn-secondary btn-sm" onclick="changePage(${pagination.page + 1})">Next &raquo;</button>`;
  }

  controls.innerHTML = html;
}

function changePage(page) {
  state.currentPage = page;
  loadStudents();
}

// Load Departments into Dropdown Selects
async function loadDepartmentsDropdown() {
  try {
    const res = await fetch('/api/academic/departments');
    const data = await res.json();
    if (data.success) {
      const filterSelect = document.getElementById('filter-dept');
      const formSelect = document.getElementById('form-department');

      data.data.forEach(d => {
        if (filterSelect) {
          const opt = document.createElement('option');
          opt.value = d.code;
          opt.innerText = `${d.code} - ${d.name}`;
          filterSelect.appendChild(opt);
        }
        if (formSelect) {
          const opt = document.createElement('option');
          opt.value = d.code;
          opt.innerText = `${d.code} - ${d.name}`;
          formSelect.appendChild(opt);
        }
      });
    }
  } catch (err) {
    console.error('Failed to load departments dropdown:', err);
  }
}

// Add Dynamic Grade Row
function addGradeRow(grade = {}) {
  const container = document.getElementById('grades-container');
  if (!container) return;

  const row = document.createElement('tr');
  row.className = 'grade-row';
  row.innerHTML = `
    <td><input type="text" class="g-code" placeholder="e.g. CS101" value="${grade.courseCode || ''}" required style="width: 100%; text-transform: uppercase;"></td>
    <td><input type="text" class="g-title" placeholder="Course Title" value="${grade.courseTitle || ''}" required style="width: 100%;"></td>
    <td><input type="number" class="g-credits" min="1" max="6" value="${grade.credits || 4}" required style="width: 60px;"></td>
    <td><input type="number" class="g-marks" min="0" max="100" value="${grade.marks !== undefined ? grade.marks : 85}" required style="width: 60px;"></td>
    <td>
      <select class="g-grade" style="width: 70px;">
        <option value="O" ${grade.grade === 'O' ? 'selected' : ''}>O</option>
        <option value="A+" ${grade.grade === 'A+' ? 'selected' : ''}>A+</option>
        <option value="A" ${grade.grade === 'A' || !grade.grade ? 'selected' : ''}>A</option>
        <option value="B+" ${grade.grade === 'B+' ? 'selected' : ''}>B+</option>
        <option value="B" ${grade.grade === 'B' ? 'selected' : ''}>B</option>
        <option value="C" ${grade.grade === 'C' ? 'selected' : ''}>C</option>
        <option value="F" ${grade.grade === 'F' ? 'selected' : ''}>F</option>
      </select>
    </td>
    <td><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()">✕</button></td>
  `;
  container.appendChild(row);
}

// View Student Modal
async function viewStudentModal(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const result = await res.json();
    if (!result.success) return showToast('Student not found', 'error');

    const s = result.data;
    const body = document.getElementById('view-modal-body');

    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 16px; margin-bottom: 16px;">
        <div>
          <h2 style="color: var(--dark);">${s.firstName} ${s.lastName}</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem;">Reg No: <strong style="color: #2563eb;">${s.regNo}</strong> &bull; Department: <strong>${s.department}</strong> (Semester ${s.semester})</p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.6rem; font-weight: 700; color: #2563eb;">${s.cgpa} <span style="font-size: 0.8rem; color: var(--text-muted);">CGPA</span></div>
          <span class="badge ${s.feeStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}">${s.feeStatus} Fees</span>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-bottom: 20px;">
        <div><strong>Email:</strong> ${s.email}</div>
        <div><strong>Phone:</strong> ${s.phone || 'N/A'}</div>
        <div><strong>Gender:</strong> ${s.gender}</div>
        <div><strong>Attendance:</strong> ${s.attendance}%</div>
        <div><strong>Status:</strong> <span class="badge badge-active">${s.status}</span></div>
        <div><strong>Academic Year:</strong> ${s.academicYear}</div>
      </div>

      <div style="border-top: 1px solid var(--border); padding-top: 14px; margin-bottom: 14px;">
        <h4 style="margin-bottom: 8px; color: var(--dark);">📍 Embedded Address Information</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          ${s.address?.street ? s.address.street + ', ' : ''}${s.address?.city || ''}, ${s.address?.state || ''} - ${s.address?.pincode || ''}
        </p>
      </div>

      <div style="border-top: 1px solid var(--border); padding-top: 14px; margin-bottom: 14px;">
        <h4 style="margin-bottom: 8px; color: var(--dark);">👨‍👩‍👦 Embedded Guardian Details</h4>
        <p style="color: var(--text-muted); font-size: 0.88rem;">
          ${s.guardian?.name || 'N/A'} (${s.guardian?.relationship || 'Guardian'}) &bull; Contact: ${s.guardian?.phone || 'N/A'}
        </p>
      </div>

      <div style="border-top: 1px solid var(--border); padding-top: 14px;">
        <h4 style="margin-bottom: 10px; color: var(--dark);">📚 Embedded Academic Grades (${s.grades?.length || 0} subjects)</h4>
        <div class="table-responsive">
          <table class="grades-subtable">
            <thead>
              <tr>
                <th>Code</th>
                <th>Course Title</th>
                <th>Credits</th>
                <th>Marks</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${(s.grades || []).map(g => `
                <tr>
                  <td><strong>${g.courseCode}</strong></td>
                  <td>${g.courseTitle}</td>
                  <td>${g.credits}</td>
                  <td>${g.marks}/100</td>
                  <td><span class="badge badge-dept">${g.grade}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    openModal('view-modal');
  } catch (err) {
    showToast('Failed to retrieve student details', 'error');
  }
}

// Edit Student Modal
async function editStudentModal(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const result = await res.json();
    if (!result.success) return showToast('Student not found', 'error');

    const s = result.data;
    document.getElementById('student-id').value = s._id;
    document.getElementById('form-regNo').value = s.regNo;
    document.getElementById('form-firstName').value = s.firstName;
    document.getElementById('form-lastName').value = s.lastName;
    document.getElementById('form-email').value = s.email;
    document.getElementById('form-phone').value = s.phone || '';
    document.getElementById('form-gender').value = s.gender || 'Male';
    document.getElementById('form-department').value = s.department;
    document.getElementById('form-semester').value = s.semester;
    document.getElementById('form-attendance').value = s.attendance;
    document.getElementById('form-feeStatus').value = s.feeStatus;
    document.getElementById('form-status').value = s.status;

    // Address
    document.getElementById('form-street').value = s.address?.street || '';
    document.getElementById('form-city').value = s.address?.city || '';
    document.getElementById('form-state').value = s.address?.state || '';
    document.getElementById('form-pincode').value = s.address?.pincode || '';

    // Guardian
    document.getElementById('form-g-name').value = s.guardian?.name || '';
    document.getElementById('form-g-rel').value = s.guardian?.relationship || 'Parent';
    document.getElementById('form-g-phone').value = s.guardian?.phone || '';

    // Populate Grades
    const container = document.getElementById('grades-container');
    container.innerHTML = '';
    if (s.grades && s.grades.length > 0) {
      s.grades.forEach(g => addGradeRow(g));
    } else {
      addGradeRow();
    }

    document.getElementById('form-modal-title').innerText = 'Edit Student Record';
    openModal('form-modal');
  } catch (err) {
    showToast('Failed to load edit form', 'error');
  }
}

// Open Form to Add New Student
function openAddStudentModal() {
  document.getElementById('student-id').value = '';
  document.getElementById('student-form').reset();
  document.getElementById('grades-container').innerHTML = '';
  addGradeRow(); // start with 1 blank row
  document.getElementById('form-modal-title').innerText = 'Add New Student Record';
  openModal('form-modal');
}

// Handle Student Create or Update Form Submit
async function handleStudentFormSubmit(e) {
  e.preventDefault();

  const studentId = document.getElementById('student-id').value;

  // Extract Grades from Dynamic Rows
  const grades = [];
  const rows = document.querySelectorAll('.grade-row');
  rows.forEach(r => {
    const code = r.querySelector('.g-code').value.trim();
    const title = r.querySelector('.g-title').value.trim();
    const credits = parseFloat(r.querySelector('.g-credits').value);
    const marks = parseFloat(r.querySelector('.g-marks').value);
    const grade = r.querySelector('.g-grade').value;

    if (code && title) {
      grades.push({ courseCode: code, courseTitle: title, credits, marks, grade });
    }
  });

  const payload = {
    regNo: document.getElementById('form-regNo').value.trim().toUpperCase(),
    firstName: document.getElementById('form-firstName').value.trim(),
    lastName: document.getElementById('form-lastName').value.trim(),
    email: document.getElementById('form-email').value.trim().toLowerCase(),
    phone: document.getElementById('form-phone').value.trim(),
    gender: document.getElementById('form-gender').value,
    department: document.getElementById('form-department').value,
    semester: parseInt(document.getElementById('form-semester').value, 10),
    attendance: parseFloat(document.getElementById('form-attendance').value),
    feeStatus: document.getElementById('form-feeStatus').value,
    status: document.getElementById('form-status').value,
    address: {
      street: document.getElementById('form-street').value.trim(),
      city: document.getElementById('form-city').value.trim(),
      state: document.getElementById('form-state').value.trim(),
      pincode: document.getElementById('form-pincode').value.trim()
    },
    guardian: {
      name: document.getElementById('form-g-name').value.trim(),
      relationship: document.getElementById('form-g-rel').value.trim(),
      phone: document.getElementById('form-g-phone').value.trim()
    },
    grades
  };

  try {
    const url = studentId ? `/api/students/${studentId}` : '/api/students';
    const method = studentId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) {
      return showToast(result.message || 'Operation failed', 'error');
    }

    closeModal('form-modal');
    showToast(studentId ? 'Student record updated successfully!' : 'New student created successfully!', 'success');
    loadStudents();
    loadDashboardData();
  } catch (err) {
    showToast('Failed to save student record', 'error');
  }
}

// Delete Student Record
async function deleteStudentRecord(id, regNo) {
  if (!confirm(`Are you sure you want to permanently delete record [${regNo}] from MongoDB?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      loadStudents();
      loadDashboardData();
    } else {
      showToast(result.message || 'Failed to delete record', 'error');
    }
  } catch (err) {
    showToast('Network error deleting record', 'error');
  }
}

// Export Records to CSV / JSON / BSON
function exportData(type) {
  if (type === 'json') {
    window.location.href = '/api/students/export/json';
  } else if (type === 'bson') {
    window.location.href = '/api/upload/export/bson';
  } else if (type === 'csv') {
    // Client-side quick CSV generation
    fetch('/api/students?limit=1000')
      .then(res => res.json())
      .then(result => {
        if (!result.data || result.data.length === 0) return showToast('No records to export', 'error');
        const headers = ['RegNo', 'Name', 'Email', 'Department', 'Semester', 'CGPA', 'Attendance', 'FeeStatus', 'Status'];
        const csvRows = [headers.join(',')];
        result.data.forEach(s => {
          csvRows.push([
            `"${s.regNo}"`,
            `"${s.firstName} ${s.lastName}"`,
            `"${s.email}"`,
            `"${s.department}"`,
            s.semester,
            s.cgpa,
            s.attendance,
            `"${s.feeStatus}"`,
            `"${s.status}"`
          ].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `students_export_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        showToast('CSV export downloaded', 'success');
      });
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & USER PROFILE
// -------------------------------------------------------------
function initAuthWidget() {
  const container = document.getElementById('user-auth-widget');
  if (!container) return;

  if (state.currentUser && state.token) {
    const roleClass = state.currentUser.role === 'Admin' ? 'role-admin' : state.currentUser.role === 'Faculty' ? 'role-faculty' : 'role-student';
    const initial = state.currentUser.name.charAt(0).toUpperCase();

    container.innerHTML = `
      <div class="user-profile-badge">
        <div class="user-avatar">${initial}</div>
        <div class="user-meta">
          <span class="user-meta-name">${state.currentUser.name.split(' ')[0]}</span>
          <span class="user-meta-role ${roleClass}">${state.currentUser.role}</span>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="signOut()" style="padding: 2px 8px; margin-left: 4px;" title="Sign Out">✕</button>
      </div>
    `;

    if (state.currentUser && state.currentUser.role === 'Student') {
      // Role-Based UI Adaptation: Student mode
      const headerAddBtn = document.getElementById('btn-add-student-header');
      if (headerAddBtn) headerAddBtn.style.display = 'none';
      const dirActions = document.querySelector('.panel-actions');
      if (dirActions) {
        const addBtn = dirActions.querySelector('button[onclick="openAddStudentModal()"]');
        const uploadBtn = dirActions.querySelector('button[onclick="openUploadModal()"]');
        if (addBtn) addBtn.style.display = 'none';
        if (uploadBtn) uploadBtn.style.display = 'none';
      }
    } else {
      const headerAddBtn = document.getElementById('btn-add-student-header');
      if (headerAddBtn) headerAddBtn.style.display = 'inline-flex';
      const dirActions = document.querySelector('.panel-actions');
      if (dirActions) {
        const addBtn = dirActions.querySelector('button[onclick="openAddStudentModal()"]');
        const uploadBtn = dirActions.querySelector('button[onclick="openUploadModal()"]');
        if (addBtn) addBtn.style.display = 'inline-flex';
        if (uploadBtn) uploadBtn.style.display = 'inline-flex';
      }
    }
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openLoginModal()" id="btn-login-trigger">🔐 Sign In</button>
    `;
  }

  // Setup login form submit listener
  const loginForm = document.getElementById('login-form');
  if (loginForm && !loginForm.hasAttribute('data-bound')) {
    loginForm.setAttribute('data-bound', 'true');
    loginForm.addEventListener('submit', handleLoginFormSubmit);
  }
}

function openLoginModal() {
  openModal('login-modal');
}

function quickFillLogin(email, password) {
  document.getElementById('login-email').value = email;
  document.getElementById('login-password').value = password;
}

async function handleLoginFormSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!data.success) {
      return showToast(data.message || 'Login failed', 'error');
    }

    state.token = data.token;
    state.currentUser = data.user;
    localStorage.setItem('srms_token', data.token);
    localStorage.setItem('srms_user', JSON.stringify(data.user));

    closeModal('login-modal');
    initAuthWidget();
    showToast(`Signed in as ${data.user.name} (${data.user.role})`, 'success');
  } catch (err) {
    showToast('Network error during sign in', 'error');
  }
}

function signOut() {
  state.token = '';
  state.currentUser = null;
  localStorage.removeItem('srms_token');
  localStorage.removeItem('srms_user');
  initAuthWidget();
  showToast('Signed out successfully', 'info');
}

// -------------------------------------------------------------
// BATCH DATA IMPORT (CSV, JSON, BSON)
// -------------------------------------------------------------
function openUploadModal() {
  state.selectedUploadFile = null;
  document.getElementById('upload-form').reset();
  document.getElementById('dropzone-text').innerText = 'Click to choose or Drag & Drop file here';
  document.getElementById('file-details').innerText = 'Supported formats: .csv, .json, .bson (Max 15MB)';
  document.getElementById('upload-result-container').style.display = 'none';
  document.getElementById('upload-result-container').innerHTML = '';
  openModal('upload-modal');
}

function initUploadListeners() {
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const uploadForm = document.getElementById('upload-form');

  if (!dropzone || !fileInput || !uploadForm) return;

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, e => {
      e.preventDefault();
      e.stopPropagation();
    }, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', e => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', e => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });

  uploadForm.addEventListener('submit', handleUploadFormSubmit);
}

function handleSelectedFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'json', 'bson'].includes(ext)) {
    return showToast('Invalid file format. Please select .csv, .json, or .bson file', 'error');
  }

  state.selectedUploadFile = file;
  const sizeKb = (file.size / 1024).toFixed(1);
  document.getElementById('dropzone-text').innerText = `Selected: ${file.name}`;
  document.getElementById('file-details').innerText = `Format: .${ext.toUpperCase()} &bull; Size: ${sizeKb} KB`;
  showToast(`File selected: ${file.name}`, 'info');
}

async function handleUploadFormSubmit(e) {
  e.preventDefault();

  if (!state.selectedUploadFile) {
    return showToast('Please select a CSV, JSON, or BSON file to upload', 'error');
  }

  const btnSubmit = document.getElementById('btn-submit-upload');
  btnSubmit.disabled = true;
  btnSubmit.innerText = 'Processing file with MongoDB...';

  const formData = new FormData();
  formData.append('file', state.selectedUploadFile);
  formData.append('duplicateStrategy', document.getElementById('duplicate-strategy').value);

  try {
    const res = await fetch('/api/upload/batch', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Upload & Import to MongoDB';

    if (!result.success) {
      return showToast(result.message || 'Batch upload failed', 'error');
    }

    renderUploadResults(result);
    showToast(result.message, 'success');

    // Reload students and dashboard charts
    loadStudents();
    loadDashboardData();
  } catch (err) {
    btnSubmit.disabled = false;
    btnSubmit.innerText = 'Upload & Import to MongoDB';
    showToast('Network error during file upload: ' + err.message, 'error');
  }
}

function renderUploadResults(result) {
  const container = document.getElementById('upload-result-container');
  if (!container) return;

  const s = result.summary;
  container.style.display = 'block';

  let previewHtml = '';
  if (result.processedPreview && result.processedPreview.length > 0) {
    previewHtml = `
      <div style="margin-top: 12px; max-height: 160px; overflow-y: auto;">
        <table class="grades-subtable" style="font-size: 0.78rem;">
          <thead>
            <tr>
              <th>Reg No</th>
              <th>Student Name</th>
              <th>MongoDB Action</th>
            </tr>
          </thead>
          <tbody>
            ${result.processedPreview.map(p => `
              <tr>
                <td><strong>${p.regNo}</strong></td>
                <td>${p.name}</td>
                <td><span class="badge ${p.action === 'INSERTED' ? 'badge-paid' : p.action === 'UPDATED' ? 'badge-partial' : 'badge-dept'}">${p.action}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  let errorsHtml = '';
  if (result.errors && result.errors.length > 0) {
    errorsHtml = `
      <div style="margin-top: 10px; background: #fee2e2; padding: 8px 12px; border-radius: 6px; font-size: 0.78rem; color: #b91c1c;">
        <strong>Validation Warnings (${result.errors.length}):</strong>
        <ul style="margin: 4px 0 0 16px;">
          ${result.errors.slice(0, 3).map(e => `<li>${e}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="upload-summary-box">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <strong style="color: var(--dark);">📊 Ingestion Report (${result.fileType})</strong>
        <span class="badge badge-active">${result.totalRecordsInFile} Total Records</span>
      </div>

      <div class="summary-stats-grid">
        <div class="summary-stat-cell">
          <div class="summary-stat-number" style="color: #10b981;">${s.inserted}</div>
          <div class="summary-stat-label">Inserted</div>
        </div>
        <div class="summary-stat-cell">
          <div class="summary-stat-number" style="color: #2563eb;">${s.updated}</div>
          <div class="summary-stat-label">Updated</div>
        </div>
        <div class="summary-stat-cell">
          <div class="summary-stat-number" style="color: #f59e0b;">${s.skipped}</div>
          <div class="summary-stat-label">Skipped</div>
        </div>
        <div class="summary-stat-cell">
          <div class="summary-stat-number" style="color: #ef4444;">${s.errorCount}</div>
          <div class="summary-stat-label">Errors</div>
        </div>
      </div>

      ${previewHtml}
      ${errorsHtml}
    </div>
  `;
}

// -------------------------------------------------------------
// THEME (DARK / LIGHT MODE)
// -------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem('srms_theme') || 'light';
  const btn = document.getElementById('btn-theme-toggle');
  if (saved === 'dark') {
    document.body.classList.add('dark-theme');
    if (btn) btn.innerText = '☀️ Light';
  } else {
    document.body.classList.remove('dark-theme');
    if (btn) btn.innerText = '🌙 Dark';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('srms_theme', isDark ? 'dark' : 'light');
  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.innerText = isDark ? '☀️ Light' : '🌙 Dark';
  showToast(`Switched to ${isDark ? 'Dark' : 'Light'} theme`, 'info');
}

// -------------------------------------------------------------
// OFFICIAL MARKSHEET / STATEMENT OF GRADES
// -------------------------------------------------------------
async function openMarksheetModal(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const result = await res.json();
    if (!result.success) return showToast('Failed to load marksheet data', 'error');

    const s = result.data;
    const body = document.getElementById('marksheet-modal-body');

    let totalCredits = 0;
    let totalPoints = 0;
    const gradePointMap = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'F': 0 };

    const gradesRows = (s.grades || []).map((g, idx) => {
      const pts = gradePointMap[g.grade] !== undefined ? gradePointMap[g.grade] : 8;
      const creditPts = pts * g.credits;
      totalCredits += g.credits;
      totalPoints += creditPts;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${g.courseCode}</strong></td>
          <td style="text-align: left;">${g.courseTitle}</td>
          <td>${g.credits}</td>
          <td>${g.marks}/100</td>
          <td><span class="badge ${g.grade === 'O' || g.grade === 'A+' ? 'badge-paid' : 'badge-dept'}">${g.grade}</span></td>
          <td>${pts}</td>
          <td>${creditPts}</td>
        </tr>
      `;
    }).join('');

    const sgpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : s.cgpa.toFixed(2);
    const resultStatus = parseFloat(sgpa) >= 8.5 ? 'PASSED WITH DISTINCTION ⭐' : parseFloat(sgpa) >= 5.0 ? 'PASSED' : 'REAPPEAR';

    body.innerHTML = `
      <div class="marksheet-paper">
        <div class="marksheet-header">
          <div style="font-size: 26px; margin-bottom: 4px;">🎓</div>
          <div class="marksheet-university">State University of Technology &amp; Applied Sciences</div>
          <div class="marksheet-title">Official Semester Grade Report &bull; Academic Transcript</div>
        </div>

        <div class="marksheet-meta-grid">
          <div><strong>Student Name:</strong> ${s.firstName} ${s.lastName}</div>
          <div><strong>Registration No:</strong> <span style="font-family: monospace; font-size: 1.05rem;">${s.regNo}</span></div>
          <div><strong>Department:</strong> ${s.department} Engineering</div>
          <div><strong>Semester:</strong> Semester ${s.semester} (${s.academicYear || '2025-2026'})</div>
          <div><strong>Institutional Email:</strong> ${s.email}</div>
          <div><strong>Attendance Standing:</strong> ${s.attendance}% ${s.attendance < 75 ? '<span style="color:#b91c1c; font-weight:bold;">(Defaulter)</span>' : ''}</div>
        </div>

        <table class="marksheet-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Course Code</th>
              <th style="text-align: left;">Course Title</th>
              <th>Credits</th>
              <th>Marks</th>
              <th>Grade</th>
              <th>Grade Point</th>
              <th>Credit Points</th>
            </tr>
          </thead>
          <tbody>
            ${gradesRows || '<tr><td colspan="8">No course grades recorded.</td></tr>'}
          </tbody>
          <tfoot>
            <tr style="background: #f8fafc; font-weight: 700;">
              <td colspan="3" style="text-align: right;">Total Credits &amp; Credit Points:</td>
              <td>${totalCredits}</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>${totalPoints}</td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: center; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 18px; border-radius: 6px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 0.8rem; color: #1e3a8a; font-weight: 700; text-transform: uppercase;">Final Academic Standing:</div>
            <div style="font-size: 1.1rem; font-weight: 800; color: #1e40af;">${resultStatus}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8rem; color: #1e3a8a; font-weight: 700; text-transform: uppercase;">Cumulative GPA (CGPA):</div>
            <div style="font-size: 1.6rem; font-weight: 800; color: #2563eb;">${sgpa} <span style="font-size: 0.85rem; color: #64748b;">/ 10.0</span></div>
          </div>
        </div>

        <div class="marksheet-footer">
          <div>
            <div style="font-size: 0.78rem; color: #64748b;">Issue Date: <strong>${new Date().toLocaleDateString('en-GB')}</strong></div>
            <div style="font-size: 0.72rem; color: #94a3b8; margin-top: 2px;">Verification Hash: SHA256-${s._id.slice(0, 12)}</div>
          </div>
          <div class="marksheet-stamp">
            SEAL OF THE UNIVERSITY<br>
            <span style="font-weight: 700; color: #1e3a8a;">OFFICIAL TRANSCRIPT</span>
          </div>
          <div style="text-align: center;">
            <div style="font-family: 'Brush Script MT', cursive; font-size: 1.4rem; color: #1e3a8a;">Dr. A. K. Sharma</div>
            <div style="font-size: 0.75rem; border-top: 1px solid #334155; padding-top: 2px;">Controller of Examinations</div>
          </div>
        </div>
      </div>
    `;

    openModal('marksheet-modal');
  } catch (err) {
    showToast('Failed to load marksheet', 'error');
  }
}

// -------------------------------------------------------------
// DIGITAL STUDENT ID CARD
// -------------------------------------------------------------
async function openIdCardModal(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const result = await res.json();
    if (!result.success) return showToast('Failed to load student card', 'error');

    const s = result.data;
    const body = document.getElementById('idcard-modal-body');

    body.innerHTML = `
      <div class="id-card-wrapper">
        <div class="student-id-card">
          <div class="id-card-header">
            <h4>STATE TECH UNIVERSITY</h4>
            <p>Official Student Identification Card</p>
          </div>
          <div class="id-card-body">
            <div class="id-avatar">🎓</div>
            <div class="id-student-name">${s.firstName} ${s.lastName}</div>
            <div class="id-student-reg">${s.regNo}</div>

            <div class="id-details-list">
              <div><span style="color:#64748b;">Department:</span> <strong>${s.department}</strong></div>
              <div><span style="color:#64748b;">Semester:</span> <strong>Sem ${s.semester}</strong></div>
              <div><span style="color:#64748b;">Gender / Blood:</span> <strong>${s.gender} / B+</strong></div>
              <div><span style="color:#64748b;">Emergency Contact:</span> <strong>${s.guardian?.phone || s.phone || '9840123456'}</strong></div>
              <div><span style="color:#64748b;">Valid Until:</span> <strong>June 2028</strong></div>
            </div>

            <div class="id-barcode">||| | |||| | ||||| |||| ||</div>
            <div style="font-size: 0.72rem; color: #64748b; margin-top: 4px;">BARCODE ID: ${s.regNo}</div>
          </div>
        </div>
      </div>
    `;

    openModal('idcard-modal');
  } catch (err) {
    showToast('Failed to load student ID card', 'error');
  }
}

// -------------------------------------------------------------
// FEE PAYMENT RECEIPT & VOUCHER
// -------------------------------------------------------------
async function openReceiptModal(id) {
  try {
    const res = await fetch(`/api/students/${id}`);
    const result = await res.json();
    if (!result.success) return showToast('Failed to load receipt details', 'error');

    const s = result.data;
    const body = document.getElementById('receipt-modal-body');
    const isPaid = s.feeStatus === 'Paid';
    const receiptNo = `REC-2026-${s.regNo.slice(-5)}`;

    body.innerHTML = `
      <div class="receipt-paper">
        <div class="receipt-header">
          <div>
            <h3 style="color: #065f46; font-size: 1.25rem;">State University of Technology</h3>
            <p style="color: var(--text-muted); font-size: 0.8rem;">Finance &amp; Accounts Division &bull; Academic Fee Voucher</p>
          </div>
          <div class="receipt-status-stamp" style="${isPaid ? '' : 'background:#fee2e2; color:#991b1b; border-color:#dc2626;'}">
            ${s.feeStatus}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 0.85rem; margin-bottom: 16px; background: #f8fafc; padding: 12px; border-radius: 6px;">
          <div><strong>Receipt No:</strong> <span style="font-family: monospace;">${receiptNo}</span></div>
          <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</div>
          <div><strong>Student Name:</strong> ${s.firstName} ${s.lastName}</div>
          <div><strong>Reg Number:</strong> ${s.regNo}</div>
          <div><strong>Department:</strong> ${s.department} (Sem ${s.semester})</div>
          <div><strong>Payment Mode:</strong> Online NEFT / UPI</div>
        </div>

        <table class="grades-subtable" style="margin-bottom: 16px;">
          <thead>
            <tr>
              <th>Fee Component</th>
              <th>Academic Session</th>
              <th style="text-align: right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Semester Tuition Fee</td>
              <td>2025 - 2026</td>
              <td style="text-align: right;">₹ 45,000</td>
            </tr>
            <tr>
              <td>Laboratory &amp; Computing Infrastructure</td>
              <td>2025 - 2026</td>
              <td style="text-align: right;">₹ 12,500</td>
            </tr>
            <tr>
              <td>University Examination &amp; Library Fee</td>
              <td>2025 - 2026</td>
              <td style="text-align: right;">₹ 5,500</td>
            </tr>
            <tr style="font-weight: 700; background: #f1f5f9;">
              <td colspan="2" style="text-align: right;">Total Fee Payable:</td>
              <td style="text-align: right;">₹ 63,000</td>
            </tr>
            <tr style="font-weight: 800; background: #ecfdf5; color: #065f46;">
              <td colspan="2" style="text-align: right;">Amount Paid / Credited:</td>
              <td style="text-align: right;">${isPaid ? '₹ 63,000' : s.feeStatus === 'Partial' ? '₹ 30,000' : '₹ 0'}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px; font-size: 0.78rem; color: #64748b;">
          <div>
            * Computer generated voucher. No manual signature required.<br>
            Transaction Ref: TXN-MONGO-${s._id.slice(0, 8).toUpperCase()}
          </div>
          <div style="text-align: center;">
            <div style="font-family: 'Brush Script MT', cursive; font-size: 1.3rem; color: #065f46;">Accounts Officer</div>
            <div>Authorized Bursar</div>
          </div>
        </div>
      </div>
    `;

    openModal('receipt-modal');
  } catch (err) {
    showToast('Failed to load fee receipt', 'error');
  }
}

// -------------------------------------------------------------
// PRINT CONTENT HELPER
// -------------------------------------------------------------
function printModalContent(elementId) {
  const content = document.getElementById(elementId).innerHTML;
  const printWindow = window.open('', '', 'width=900,height=700');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print Document</title>
        <link rel="stylesheet" href="css/style.css">
        <style>
          body { padding: 30px; background: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
          .marksheet-paper { box-shadow: none; max-width: 100%; border: 2px double #1e3a8a; }
          .student-id-card { box-shadow: none; margin: 0 auto; }
          .receipt-paper { box-shadow: none; max-width: 100%; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// -------------------------------------------------------------
// DATABASE AUDIT / ACTIVITY LOGS
// -------------------------------------------------------------
async function openLogsModal() {
  openModal('logs-modal');
  await loadActivityLogs();
}

async function loadActivityLogs() {
  const tbody = document.getElementById('logs-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px;">Fetching logs from MongoDB...</td></tr>`;

  try {
    const res = await fetch('/api/logs');
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No activity logged yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = result.data.map(l => {
      const actionBadge = l.action.startsWith('CREATE') ? 'badge-paid' : l.action.startsWith('DELETE') ? 'badge-pending' : 'badge-dept';
      const timeStr = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + new Date(l.timestamp).toLocaleDateString() + ')';

      return `
        <tr>
          <td><span class="badge ${actionBadge}">${l.action}</span></td>
          <td><strong>${l.performedBy}</strong> <span style="font-size: 0.72rem; color: var(--text-muted);">(${l.role})</span></td>
          <td><strong style="color: #2563eb;">${l.targetRegNo}</strong></td>
          <td style="font-size: 0.82rem;">${l.details}</td>
          <td style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap;">${timeStr}</td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ef4444; padding: 20px;">Failed to load logs.</td></tr>`;
  }
}

// Modal Helpers
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}
