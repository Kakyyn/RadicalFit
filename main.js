// Attach sign out event listener (call after rendering sidebar)
function attachSignOutListener() {
    const btn = document.getElementById('signOutBtn');
    if (btn) {
        btn.onclick = signOut;
    }
}
        // =====================
// Dynamically render sidebar navigation
function setupNavigation(items) {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    navMenu.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        const btn = document.createElement('button');
        btn.className = 'nav-link' + (item.active ? ' active' : '');
        btn.setAttribute('data-tab', item.tab);
        btn.innerHTML = (item.icon ? `<span class='nav-icon'>${item.icon}</span> ` : '') + item.name;
        // Attach click event for tab switching
        btn.addEventListener('click', function() {
            // Remove active from all nav links
            document.querySelectorAll('#navMenu .nav-link').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            // Hide all tab content areas (admin or member)
            // Admin tabs
            const adminTabs = ['miembrosTab', 'comprasTab', 'ajustesTab'];
            const memberTabs = ['qrTab', 'profileTab', 'measurementsTab', 'progressTab'];
            adminTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
            memberTabs.forEach(id => { const el = document.getElementById(id); if (el) el.classList.add('hidden'); });
            // Show the selected tab
            const tab = this.getAttribute('data-tab');
            const tabId = tab + 'Tab';
            const tabEl = document.getElementById(tabId);
            if (tabEl) tabEl.classList.remove('hidden');
            // Special handling for compras tab (admin)
            if (tab === 'compras' && typeof renderComprasList === 'function') {
                renderComprasList();
            }
        });
        li.appendChild(btn);
        navMenu.appendChild(li);
    });
    // After rendering nav, re-attach sign out event
    setTimeout(attachSignOutListener, 0);
}
        // GLOBAL VARIABLES & CONSTANTS
        // =====================
        // PWA Service Worker Registration
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('service-worker.js');
        }

        // Global variables
        let currentUser = null;
        let members = JSON.parse(localStorage.getItem('gymMembers') || '[]');
        let qrScanner = null;
        
        // Admin credentials
        const ADMIN_EMAIL = 'admin@radicalfit.com';
        const ADMIN_PASSWORD = 'admin';

        // =====================
        // DOM ELEMENTS
        // =====================
        // DOM elements
        const landingPage = document.getElementById('landingPage');
        const mainApp = document.getElementById('mainApp');
        const loginForm = document.getElementById('loginForm');
        // Remove duplicate variable declarations for modals and forms
        // Only declare each variable once at the top of the script, and reuse throughout
        // Remove these duplicate lines:
        // const registerModal = document.getElementById('registerModal');
        // const registerForm = document.getElementById('registerForm');
        // const editModal = document.getElementById('editModal');
        // const editForm = document.getElementById('editForm');
        // const scannerModal = document.getElementById('scannerModal');
        // const purchaseModal = document.getElementById('purchaseModal');
        // const closePurchaseModalBtn = document.getElementById('closePurchaseModal');
        // =====================
        // APP INITIALIZATION & EVENT LISTENERS
        // =====================
        // Initialize app
        document.addEventListener('DOMContentLoaded', function() {
            // Member view modal close (X) button
            const closeMemberViewBtn = document.getElementById('closeEditModal');
            if (closeMemberViewBtn) {
                closeMemberViewBtn.addEventListener('click', function() {
                    const editModal = document.getElementById('editModal');
                    if (editModal) editModal.classList.remove('show');
                });
            }
            // Hamburger menu toggle logic
            const menuToggleBtn = document.getElementById('menuToggleBtn');
            const sidebar = document.querySelector('.sidebar');
            function toggleSidebar() {
                sidebar.classList.toggle('open');
            }
            if (menuToggleBtn && sidebar) {
                menuToggleBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleSidebar();
                });
                // Close sidebar when clicking outside (on mobile)
                document.addEventListener('click', function(e) {
                    if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
                        if (!sidebar.contains(e.target) && e.target !== menuToggleBtn) {
                            sidebar.classList.remove('open');
                        }
                    }
                });
                // Optionally close sidebar when clicking a nav link (mobile)
                sidebar.addEventListener('click', function(e) {
                    if (window.innerWidth <= 900 && e.target.classList.contains('nav-link')) {
                        sidebar.classList.remove('open');
                    }
                });
            }
            // Manual ID attendance in QR modal
            document.getElementById('manualIdBtn').addEventListener('click', function() {
                const id = document.getElementById('manualIdInput').value.trim();
                if (!id) {
                    document.getElementById('scanResult').textContent = 'Por favor ingresa un ID.';
                    return;
                }
                const member = members.find(m => m.id === id);
                if (member) {
                    if (!member.attendance) member.attendance = [];
                    member.attendance.push(new Date().toISOString());
                    localStorage.setItem('gymMembers', JSON.stringify(members));
                    renderMembersTable();
                    updateAdminStats();
                    document.getElementById('scanResult').textContent = `✅ Asistencia agregada para ${member.name}`;
                    document.getElementById('manualIdInput').value = '';
                } else {
                    document.getElementById('scanResult').textContent = '❌ Miembro no encontrado';
                }
            });
            // Measurement modal logic
            function openMeasurementModal(memberId) {
                document.getElementById('measurementMemberId').value = memberId;
                measurementForm.reset();
                document.getElementById('measurementError').textContent = '';
                document.getElementById('measurementSuccess').textContent = '';
                measurementModal.classList.add('show');
            }
            window.openMeasurementModal = openMeasurementModal;

            const measurementModal = document.getElementById('measurementModal');
            const measurementForm = document.getElementById('measurementForm');
            document.getElementById('closeMeasurementModal').addEventListener('click', () => {
                measurementModal.classList.remove('show');
            });
            document.getElementById('cancelMeasurement').addEventListener('click', () => {
                measurementModal.classList.remove('show');
            });
            measurementForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const memberId = document.getElementById('measurementMemberId').value;
                const member = members.find(m => m.id === memberId);
                if (!member) {
                    document.getElementById('measurementError').textContent = 'Miembro no encontrado.';
                    return;
                }
                // Prepare new measurement entry
                const entry = {
                    date: new Date().toISOString(),
                    weight: parseFloat(document.getElementById('measurementWeight').value),
                    abdomen: parseFloat(document.getElementById('measurementAbdomen').value),
                    cintura: parseFloat(document.getElementById('measurementCintura').value),
                    cadera: parseFloat(document.getElementById('measurementCadera').value),
                    pierna: parseFloat(document.getElementById('measurementPierna').value),
                    brazo: parseFloat(document.getElementById('measurementBrazo').value),
                    espalda: parseFloat(document.getElementById('measurementEspalda').value)
                };
                // Initialize history if not present
                if (!member.measurementHistory) member.measurementHistory = [];
                member.measurementHistory.push(entry);
                // Reset attendance and highlight after new measurement
                member.attendance = [];
                // Do NOT update member.weight or member.measurements (keep registration values static)
                localStorage.setItem('gymMembers', JSON.stringify(members));
                document.getElementById('measurementSuccess').textContent = 'Medición guardada exitosamente.';
                setTimeout(() => {
                    measurementModal.classList.remove('show');
                    // If the member is viewing their dashboard, refresh it
                    if (currentUser && !currentUser.isAdmin && currentUser.memberId === memberId) {
                        renderMemberData(member);
            // Show weigh-in reminder if 4 or more attendances (in QR tab)
            const reminder = document.getElementById('weighinReminder');
            if (member.attendance && member.attendance.length >= 4) {
                reminder.textContent = '¡Es momento de registrar tu peso y mediciones! Por favor, acude con el administrador.';
                reminder.style.display = 'block';
                reminder.style.padding = '16px';
                reminder.style.background = '#fff3cd';
                reminder.style.color = '#856404';
                reminder.style.borderRadius = '16px';
                reminder.style.textAlign = 'center';
                reminder.style.fontWeight = 'bold';
                reminder.style.fontSize = '1.1em';
            } else {
                reminder.style.display = 'none';
            }
                    }
                    // If admin, refresh table
                    if (currentUser && currentUser.isAdmin) {
                        renderMembersTable();
                    }
                }, 1000);
            });
            // Image preview for edit modal
            const beforeImgInput = document.getElementById('editBeforeImg');
            const afterImgInput = document.getElementById('editAfterImg');
            const beforePreview = document.getElementById('editBeforePreview');
            const afterPreview = document.getElementById('editAfterPreview');

            beforeImgInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        beforePreview.src = e.target.result;
                        beforePreview.style.display = 'block';
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
            afterImgInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        afterPreview.src = e.target.result;
                        afterPreview.style.display = 'block';
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
            // Check if user is already logged in
            const savedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (savedUser) {
                currentUser = savedUser;
                showMainApp();
            } else {
                showLandingPage();
            }

            // Landing page tab switching
            function attachPlanItemListeners() {
                var planItems = document.querySelectorAll('.plan-item');
                if (planItems.length) {
                    planItems.forEach(item => {
                        item.removeEventListener('click', planItemHandler);
                        item.addEventListener('click', planItemHandler);
                    });
                }
                var closePlanModalBtn = document.getElementById('closePlanModal');
                if (closePlanModalBtn) {
                    closePlanModalBtn.removeEventListener('click', closePlanModalHandler);
                    closePlanModalBtn.addEventListener('click', closePlanModalHandler);
                }
            }
            function planItemHandler() {
                const plan = this.dataset.plan;
                showPlanModal(plan);
            }
            function closePlanModalHandler() {
                document.getElementById('planInfoModal').classList.remove('show');
            }
            // Unified tab switching logic
            document.querySelectorAll('.landing-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.landing-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.landing-tab-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    if (tab.dataset.tab === 'info') {
                        document.getElementById('gymInfo').classList.add('active');
                        attachPlanItemListeners();
                    } else if (tab.dataset.tab === 'login') {
                        document.getElementById('loginTab').classList.add('active');
                    } else if (tab.dataset.tab === 'contact') {
                        document.getElementById('contactTab').classList.add('active');
                    }
                });
            });
            // Attach listeners on load if info tab is default
            if(document.getElementById('gymInfo')?.classList.contains('active')) {
                attachPlanItemListeners();
            }

            // Modal event listeners
            document.getElementById('registerBtn').addEventListener('click', () => {
                registerModal.classList.add('show');
            });

            document.getElementById('closeRegisterModal').addEventListener('click', () => {
                registerModal.classList.remove('show');
            });

            document.getElementById('cancelRegister').addEventListener('click', () => {
                registerModal.classList.remove('show');
            });

            // Form submissions
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);
            editForm.addEventListener('submit', handleEditMember);

            // Sign out event is attached by attachSignOutListener after navigation render

            // Admin functions
            document.getElementById('addMemberBtn')?.addEventListener('click', () => {
                registerModal.classList.add('show');
            });

            document.getElementById('scanQRBtn')?.addEventListener('click', function() {
                // Detect if mobile (touch device or small screen)
                const isMobile = window.matchMedia('(max-width: 900px)').matches || 'ontouchstart' in window;
                if (isMobile) {
                    openQRScanner();
                } else {
                    // On desktop, focus the manual ID input for USB QR code reader
                    scannerModal.classList.add('show');
                    setTimeout(() => {
                        const manualInput = document.getElementById('manualIdInput');
                        if (manualInput) manualInput.focus();
                    }, 200);
                }
            });
            // Attach close event for QR scanner modal (X button)
            const closeScannerBtn = document.getElementById('closeScannerModal');
            if (closeScannerBtn) {
                closeScannerBtn.addEventListener('click', function() {
                    const scannerModal = document.getElementById('scannerModal');
                    if (scannerModal) scannerModal.classList.remove('show');
                    closeQRScanner();
                });
            }

            // Edit modal
            // Fix: Ensure closeEditModal exists before adding event listener
            const closeEditModalBtn = document.getElementById('closeEditModal');
            if (closeEditModalBtn) {
                closeEditModalBtn.addEventListener('click', () => {
                    editModal.classList.remove('show');
                });
            }

            document.getElementById('cancelEdit').addEventListener('click', () => {
                editModal.classList.remove('show');
            });

            document.getElementById('deleteMember').addEventListener('click', deleteMember);

            // Member dashboard tabs
            document.querySelectorAll('.member-dashboard-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.member-dashboard-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('#memberDashboard .card').forEach(c => c.classList.add('hidden'));
                    
                    tab.classList.add('active');
                    const tabName = tab.dataset.tab;
                    document.getElementById(tabName + 'Tab').classList.remove('hidden');
                });
            });



        });

        // =====================
        // MODAL LOGIC (Registration, Edit, Measurement, Purchase, QR)
        // =====================
        // Registration Modal
    const registerModal = document.getElementById('registerModal');
    const closeRegisterModalBtn = document.getElementById('closeRegisterModal');
    const registerForm = document.getElementById('registerForm');

    // Edit Member Modal
    const editModal = document.getElementById('editModal');
    const closeEditModalBtn = document.getElementById('closeEditModal');
    const editForm = document.getElementById('editForm');

    // --- SALUD/MOVILIDAD CHECKBOXES: Save per member ---
    // Helper to get all saludMovilidad values from the form
    function getSaludMovilidadFromForm() {
        return {
            trigliceridos: document.getElementById('trigliceridos').checked,
            colesterol: document.getElementById('colesterol').checked,
            diabetes: document.getElementById('diabetes').checked,
            higadoGraso: document.getElementById('higadoGraso').checked,
            piedrasVesicula: document.getElementById('piedrasVesicula').checked,
            prediabetes: document.getElementById('prediabetes').checked,
            reflujo: document.getElementById('reflujo').checked,
            gastritis: document.getElementById('gastritis').checked,
            colitis: document.getElementById('colitis').checked,
            piedrasRinon: document.getElementById('piedrasRinon').checked,
            retencionLiquidos: document.getElementById('retencionLiquidos').checked,
            faltaEnergia2: document.getElementById('faltaEnergia2').checked,
            estrenimiento: document.getElementById('estrenimiento').checked,
            migrañas: document.getElementById('migrañas').checked,
            cansancio: document.getElementById('cansancio').checked,
            meCuestaLevantarme: document.getElementById('meCuestaLevantarme').checked,
            meCuestaAgacharme: document.getElementById('meCuestaAgacharme').checked,
            pocaResistencia: document.getElementById('pocaResistencia').checked,
            meCuestaEstirarme: document.getElementById('meCuestaEstirarme').checked,
            dolorCaminar: document.getElementById('dolorCaminar').checked,
            doloresArticulares: document.getElementById('doloresArticulares').checked,
            meCuestaDormir: document.getElementById('meCuestaDormir').checked,
            meCuestaConducir: document.getElementById('meCuestaConducir').checked,
            noPuedoAgacharme: document.getElementById('noPuedoAgacharme').checked,
            nervioCiatico: document.getElementById('nervioCiatico').checked,
            meDuelenHuesos: document.getElementById('meDuelenHuesos').checked,
            seArrollaRopa: document.getElementById('seArrollaRopa').checked
        };
    }

    // Save saludMovilidad on edit form submit
    editForm.addEventListener('submit', function(e) {
        // ...existing code...
        const memberId = document.getElementById('editMemberId').value;
        const memberIdx = members.findIndex(m => m.id === memberId);
        if (memberIdx !== -1) {
            // Save saludMovilidad for this member
            members[memberIdx].saludMovilidad = getSaludMovilidadFromForm();
            // Save factoresSalud as well if needed (already implemented)
            localStorage.setItem('gymMembers', JSON.stringify(members));
        }
        // ...existing code...
    }, true); // Use capture to ensure this runs before default

    // Measurement Modal
    const measurementModal = document.getElementById('measurementModal');
    const closeMeasurementModalBtn = document.getElementById('closeMeasurementModal');
    const measurementForm = document.getElementById('measurementForm');

    // Purchase Modal
    const purchaseManualIdInput = document.getElementById('purchaseManualIdInput');
    const purchaseManualIdBtn = document.getElementById('purchaseManualIdBtn');
    let purchaseQrScanner = null;

    // QR Scanner Modal
    const scannerModal = document.getElementById('scannerModal');
    const closeScannerModalBtn = document.getElementById('closeScannerModal');

    // Open registration modal
    document.getElementById('registerBtn').addEventListener('click', () => {
        registerModal.classList.add('show');
    });

    // Close registration modal
    closeRegisterModalBtn.addEventListener('click', () => {
        registerModal.classList.remove('show');
    });

    // Open edit member modal
    function openEditMemberModal(memberId) {
        const member = members.find(m => m.id === memberId);
        if (!member) return;

        // Populate edit form
        document.getElementById('editMemberId').value = member.id;
        document.getElementById('editName').value = member.name;
        document.getElementById('editPhone').value = member.phone;
        document.getElementById('editEmail').value = member.email;
        document.getElementById('editDob').value = member.dob;
        document.getElementById('editWeight').value = member.weight;
        document.getElementById('editAbdomen').value = member.measurements.abdomen;
        document.getElementById('editCintura').value = member.measurements.cintura;
        document.getElementById('editCadera').value = member.measurements.cadera;
        document.getElementById('editPierna').value = member.measurements.pierna;
        document.getElementById('editBrazo').value = member.measurements.brazo;
        document.getElementById('editEspalda').value = member.measurements.espalda;
        document.getElementById('editPantalon').value = member.clothing.pantalon;
        document.getElementById('editCamisa').value = member.clothing.camisa;

        // Reset file inputs
        document.getElementById('editBeforeImg').value = '';
        document.getElementById('editAfterImg').value = '';
        // Show previews if images exist
        const beforePreview = document.getElementById('editBeforePreview');
        const afterPreview = document.getElementById('editAfterPreview');
        if (member.images.before) {
            beforePreview.src = member.images.before;
            beforePreview.style.display = 'block';
        } else {
            beforePreview.src = '';
            beforePreview.style.display = 'none';
        }
        if (member.images.after) {
            afterPreview.src = member.images.after;
            afterPreview.style.display = 'block';
        } else {
            afterPreview.src = '';
            afterPreview.style.display = 'none';
        }

        // Set Factores de Salud values if present
        if (member.factoresSalud) {
    document.getElementById('faltaEnergia').checked = !!member.factoresSalud.faltaEnergia;
    document.getElementById('excesoEstres').checked = !!member.factoresSalud.excesoEstres;
    document.getElementById('descontrolHormonal').checked = !!member.factoresSalud.descontrolHormonal;
    document.getElementById('estrias').checked = !!member.factoresSalud.estrias;
    document.getElementById('celulitis').checked = !!member.factoresSalud.celulitis;
    document.getElementById('flacidezNivel').value = member.factoresSalud.flacidezNivel || '';
} else {
    document.getElementById('faltaEnergia').checked = false;
    document.getElementById('excesoEstres').checked = false;
    document.getElementById('descontrolHormonal').checked = false;
    document.getElementById('estrias').checked = false;
    document.getElementById('celulitis').checked = false;
    document.getElementById('flacidezNivel').value = '';
}

            // Set Salud/Movilidad values if present
            if (member.saludMovilidad) {
                document.getElementById('trigliceridos').checked = !!member.saludMovilidad.trigliceridos;
                document.getElementById('colesterol').checked = !!member.saludMovilidad.colesterol;
                document.getElementById('diabetes').checked = !!member.saludMovilidad.diabetes;
                document.getElementById('higadoGraso').checked = !!member.saludMovilidad.higadoGraso;
                document.getElementById('piedrasVesicula').checked = !!member.saludMovilidad.piedrasVesicula;
                document.getElementById('prediabetes').checked = !!member.saludMovilidad.prediabetes;
                document.getElementById('reflujo').checked = !!member.saludMovilidad.reflujo;
                document.getElementById('gastritis').checked = !!member.saludMovilidad.gastritis;
                document.getElementById('colitis').checked = !!member.saludMovilidad.colitis;
                document.getElementById('piedrasRinon').checked = !!member.saludMovilidad.piedrasRinon;
                document.getElementById('retencionLiquidos').checked = !!member.saludMovilidad.retencionLiquidos;
                document.getElementById('faltaEnergia2').checked = !!member.saludMovilidad.faltaEnergia2;
                document.getElementById('estrenimiento').checked = !!member.saludMovilidad.estrenimiento;
                document.getElementById('migrañas').checked = !!member.saludMovilidad.migrañas;
                document.getElementById('cansancio').checked = !!member.saludMovilidad.cansancio;
                document.getElementById('meCuestaLevantarme').checked = !!member.saludMovilidad.meCuestaLevantarme;
                document.getElementById('meCuestaAgacharme').checked = !!member.saludMovilidad.meCuestaAgacharme;
                document.getElementById('pocaResistencia').checked = !!member.saludMovilidad.pocaResistencia;
                document.getElementById('meCuestaEstirarme').checked = !!member.saludMovilidad.meCuestaEstirarme;
                document.getElementById('dolorCaminar').checked = !!member.saludMovilidad.dolorCaminar;
                document.getElementById('doloresArticulares').checked = !!member.saludMovilidad.doloresArticulares;
                document.getElementById('meCuestaDormir').checked = !!member.saludMovilidad.meCuestaDormir;
                document.getElementById('meCuestaConducir').checked = !!member.saludMovilidad.meCuestaConducir;
                document.getElementById('noPuedoAgacharme').checked = !!member.saludMovilidad.noPuedoAgacharme;
                document.getElementById('nervioCiatico').checked = !!member.saludMovilidad.nervioCiatico;
                document.getElementById('meDuelenHuesos').checked = !!member.saludMovilidad.meDuelenHuesos;
                document.getElementById('seArrollaRopa').checked = !!member.saludMovilidad.seArrollaRopa;
            } else {
                document.getElementById('trigliceridos').checked = false;
                document.getElementById('colesterol').checked = false;
                document.getElementById('diabetes').checked = false;
                document.getElementById('higadoGraso').checked = false;
                document.getElementById('piedrasVesicula').checked = false;
                document.getElementById('prediabetes').checked = false;
                document.getElementById('reflujo').checked = false;
                document.getElementById('gastritis').checked = false;
                document.getElementById('colitis').checked = false;
                document.getElementById('piedrasRinon').checked = false;
                document.getElementById('retencionLiquidos').checked = false;
                document.getElementById('faltaEnergia2').checked = false;
                document.getElementById('estrenimiento').checked = false;
                document.getElementById('migrañas').checked = false;
                document.getElementById('cansancio').checked = false;
                document.getElementById('meCuestaLevantarme').checked = false;
                document.getElementById('meCuestaAgacharme').checked = false;
                document.getElementById('pocaResistencia').checked = false;
                document.getElementById('meCuestaEstirarme').checked = false;
                document.getElementById('dolorCaminar').checked = false;
                document.getElementById('doloresArticulares').checked = false;
                document.getElementById('meCuestaDormir').checked = false;
                document.getElementById('meCuestaConducir').checked = false;
                document.getElementById('noPuedoAgacharme').checked = false;
                document.getElementById('nervioCiatico').checked = false;
                document.getElementById('meDuelenHuesos').checked = false;
                document.getElementById('seArrollaRopa').checked = false;
            }

            // Make all fields read-only/disabled
            setEditFormReadOnly(true);
            // Hide save/cancel, show edit
            document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');
            const editBtn = document.getElementById('enableEditBtn');
            if (editBtn) editBtn.style.display = 'inline-block';

            // Show the modal
            editModal.classList.add('show');
        }

        // Helper to set all edit form fields to readonly/disabled or editable
        function setEditFormReadOnly(readonly) {
            const ids = [
                'editName','editPhone','editEmail','editPassword','editDob','editWeight',
                'editAbdomen','editCintura','editCadera','editPierna','editBrazo','editEspalda',
                'editPantalon','editCamisa','editBeforeImg','editAfterImg'
            ];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    if (readonly) {
                        el.setAttribute('readonly', 'readonly');
                        el.setAttribute('disabled', 'disabled');
                    } else {
                        el.removeAttribute('readonly');
                        el.removeAttribute('disabled');
                    }
                }
            });
            // Disable/enable all checkboxes in the form
            document.querySelectorAll('#editForm input[type="checkbox"]').forEach(cb => {
                cb.disabled = !!readonly;
            });
            // Disable/enable dropdown menu (flacidezNivel)
            const flacidezSelect = document.getElementById('flacidezNivel');
            if (flacidezSelect) flacidezSelect.disabled = !!readonly;
            // Also disable/enable the Save button
            const saveBtn = document.querySelector('#editForm button[type="submit"]');
            if (saveBtn) saveBtn.disabled = readonly;
        }

        // Add Edit button logic on modal open and tab switching for member modal
        document.addEventListener('DOMContentLoaded', function() {
            const btnGroup = document.querySelector('#editForm .btn-group');
            if (btnGroup && !document.getElementById('enableEditBtn')) {
                const editBtn = document.createElement('button');
                editBtn.type = 'button';
                editBtn.className = 'btn btn-primary';
                editBtn.id = 'enableEditBtn';
                editBtn.textContent = 'Editar';
                editBtn.style.marginRight = '8px';
                btnGroup.insertBefore(editBtn, btnGroup.querySelector('button[type="submit"]'));
                editBtn.addEventListener('click', function() {
                    setEditFormReadOnly(false);
                    // Show save/cancel, hide edit
                    document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'inline-block');
                    editBtn.style.display = 'none';
                });
            }
            // When cancel is clicked, return to view mode
            const cancelEditBtn = document.getElementById('cancelEdit');
            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', function() {
                    setEditFormReadOnly(true);
                    document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');
                    const editBtn = document.getElementById('enableEditBtn');
                    if (editBtn) editBtn.style.display = 'inline-block';
                });
            }

            // Tab switching logic for member modal
            document.querySelectorAll('.member-tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.member-tab-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    document.querySelectorAll('.tab-content-area').forEach(tab => tab.style.display = 'none');
                    const tabId = this.getAttribute('data-tab');
                    document.getElementById(tabId).style.display = 'block';
                });
            });
        });
        
        // Expose viewMember globally for inline onclick
        window.viewMember = viewMember;
        // Ajustes tab logic
document.addEventListener('DOMContentLoaded', function() {
    // Reset all data
    const resetBtn = document.getElementById('resetAllBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (confirm('¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
                localStorage.clear();
                location.reload();
            }
        });
    }
    // Export data
    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', function() {
            const msg = document.getElementById('settingsMessage');
            try {
                const data = {};
                Object.keys(localStorage).forEach(key => {
                    data[key] = localStorage.getItem(key);
                });
                const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'radicalfit-backup-' + new Date().toISOString().slice(0,10) + '.json';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 200);
                if (msg) {
                    msg.textContent = 'Exportación iniciada. Revisa tu carpeta de descargas.';
                    msg.style.color = '#10b981';
                    setTimeout(() => { msg.textContent = ''; msg.style.color = '' }, 4000);
                }
            } catch (err) {
                if (msg) {
                    msg.textContent = 'Error al exportar: ' + err.message;
                    msg.style.color = '#ef4444';
                }
            }
        });
    }
    // Import data
    const importInput = document.getElementById('importDataInput');
    if (importInput) {
        importInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const imported = JSON.parse(evt.target.result);
                    if (typeof imported !== 'object' || Array.isArray(imported)) throw new Error('Formato inválido');
                    for (const key in imported) {
                        localStorage.setItem(key, imported[key]);
                    }
                    document.getElementById('settingsMessage').textContent = 'Datos importados correctamente. Recargando...';
                    setTimeout(() => location.reload(), 1200);
                } catch (err) {
                    document.getElementById('settingsMessage').textContent = 'Error al importar: ' + err.message;
                }
            };
            reader.readAsText(file);
        });
    }
});

        let comprasList = JSON.parse(localStorage.getItem('comprasList')) || [];

        function renderComprasList() {
            const ul = document.getElementById('comprasList');
            ul.innerHTML = '';
            if (comprasList.length === 0) {
                ul.innerHTML = '<li style="color:#aaa;text-align:center;">Sin compras registradas</li>';
                renderComprasWinner();
                return;
            }
            comprasList.forEach(item => {
                let dots = '';
                for (let i = 0; i < item.count; i++) {
                    dots += '<span style="display:inline-block;width:14px;height:14px;background:#FFD600;border-radius:50%;margin-right:4px;"></span>';
                }
                ul.innerHTML += `<li style="display:flex;align-items:center;gap:10px;padding:8px 0 8px 0;border-bottom:1px solid #222;">
                    ${dots}
                    <span>${item.name}</span>
                </li>`;
            });
            renderComprasWinner();
        }

        function addCompraForMember(member) {
            let found = comprasList.find(c => c.id === member.id);
            if (found) {
                found.count = (found.count || 1) + 1;
            } else {
                comprasList.push({ id: member.id, name: member.name, count: 1 });
            }
            localStorage.setItem('comprasList', JSON.stringify(comprasList));
            renderComprasList();
        }

        function handleRegistrarCompra() {
            // Open the purchase modal
            const purchaseModal = document.getElementById('purchaseModal');
            const purchaseInput = document.getElementById('purchaseManualIdInput');
            const purchaseBtn = document.getElementById('purchaseManualIdBtn');
            const purchaseResult = document.getElementById('purchaseResult');
            if (!purchaseModal || !purchaseInput || !purchaseBtn) return;
            purchaseInput.value = '';
            purchaseResult.textContent = '';
            purchaseModal.classList.add('show');
            purchaseInput.focus();
            // Remove previous event listeners
            const newBtn = purchaseBtn.cloneNode(true);
            purchaseBtn.parentNode.replaceChild(newBtn, purchaseBtn);
            newBtn.addEventListener('click', function() {
                const input = purchaseInput.value.trim();
                if (!input) {
                    purchaseResult.textContent = 'Por favor ingresa un ID o nombre.';
                    return;
                }
                let member = members.find(m => m.id === input || m.name.toLowerCase() === input.toLowerCase());
                if (!member) {
                    // Try to find by partial name
                    member = members.find(m => m.name.toLowerCase().includes(input.toLowerCase()));
                }
                if (!member) {
                    purchaseResult.textContent = '❌ Miembro no encontrado.';
                    return;
                }
                addCompraForMember(member);
                purchaseResult.textContent = `✅ Compra registrada para ${member.name}`;
                purchaseInput.value = '';
            });
            // Close modal on X
            const closeBtn = document.getElementById('closePurchaseModal');
            if (closeBtn) {
                closeBtn.onclick = function() {
                    purchaseModal.classList.remove('show');
                };
            }
        }

        // Show admin dashboard
        function showAdminDashboard() {
            document.getElementById('pageTitle').textContent = 'Admin Dashboard';
            document.getElementById('memberDashboard').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            setupNavigation([
                { name: 'Dashboard', icon: '📊', tab: 'miembros', active: true },
                { name: 'Compras', icon: '👥', tab: 'compras' },
                { name: 'Ajustes', icon: '⚙️', tab: 'ajustes' }
            ]);
            // Show only the members tab by default
            document.getElementById('miembrosTab').classList.remove('hidden');
            document.getElementById('comprasTab').classList.add('hidden');
            document.getElementById('ajustesTab').classList.add('hidden');
            // Add event listeners for admin tabs
            document.querySelectorAll('#navMenu .nav-link').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#navMenu .nav-link').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    // Hide all admin cards
                    document.getElementById('miembrosTab').classList.add('hidden');
                    document.getElementById('comprasTab').classList.add('hidden');
                    document.getElementById('ajustesTab').classList.add('hidden');
                    // Show the selected tab
                    const tab = this.getAttribute('data-tab');
                    if (tab === 'compras') {
                        document.getElementById('comprasTab').classList.remove('hidden');
                        renderComprasList();
                    } else if (tab === 'ajustes') {
                        document.getElementById('ajustesTab').classList.remove('hidden');
                    } else {
                        document.getElementById('miembrosTab').classList.remove('hidden');
                    }
                });
            });
            renderMembersTable();
            updateAdminStats();
            // Setup compras button
            setTimeout(() => {
                const btn = document.getElementById('registrarCompraBtn');
                if (btn) btn.onclick = handleRegistrarCompra;
                renderComprasList();
                // Optionally, you can call renderComprasWinner() if you implement it
                const ganadorBtn = document.getElementById('elegirGanadorBtn');
                if (ganadorBtn) ganadorBtn.onclick = elegirGanador;
            }, 0);
        }

        // Show member dashboard
        function showMemberDashboard() {
            const member = members.find(m => m.email === currentUser.email);
            if (!member) return;

            document.getElementById('pageTitle').textContent = 'Mi Tablero';
            document.getElementById('adminDashboard').classList.add('hidden');
            document.getElementById('memberDashboard').classList.remove('hidden');
            
            setupNavigation([
                { name: 'QR', icon: '�', tab: 'qr', active: true },
                { name: 'Perfil', icon: '👤', tab: 'profile' },
                { name: 'Mediciones', icon: '�', tab: 'measurements' },
                { name: 'Progreso', icon: '📈', tab: 'progress' }
            ]);
            // Ensure sign out button works after navigation render
            setTimeout(attachSignOutListener, 0);
            renderMemberData(member);
        }

        // =====================
        // UTILITY & HELPER FUNCTIONS
        // =====================
        // Show plan info modal
        function showPlanModal(plan) {
            const modal = document.getElementById('planInfoModal');
            const title = document.getElementById('planModalTitle');
            const body = document.getElementById('planModalBody');
            let planTitle = '';
            let planDesc = '';
            switch(plan) {
                case 'nitro':
                    planTitle = 'Nitro';
                    planDesc = `<p>Acceso completo al gimnasio en horario regular. Ideal para quienes buscan un entrenamiento eficiente y constante.</p>`;
                    break;
                case 'zero':
                    planTitle = 'Zero';
                    planDesc = `<p>Incluye todos los beneficios de Nitro, más acceso a clases grupales y zonas exclusivas. Perfecto para quienes buscan variedad y motivación extra.</p>`;
                    break;
                case 'tnt':
                    planTitle = 'TNT';
                    planDesc = `<p>Plan intensivo con rutinas avanzadas, asesoría personalizada y seguimiento de progreso. Para quienes quieren llevar su entrenamiento al siguiente nivel.</p>`;
                    break;
                case 'gainer':
                    planTitle = 'Gainer';
                    planDesc = `<p>Enfoque especial en aumento de masa muscular, incluye asesoría nutricional y rutinas especializadas. Ideal para transformación física.</p>`;
                    break;
                default:
                    planTitle = 'Información del Plan';
                    planDesc = '';
            }
            title.textContent = planTitle;
            body.innerHTML = planDesc;
            modal.classList.add('show');
        }

        // Show landing page
        function showLandingPage() {
            landingPage.classList.remove('hidden');
            mainApp.classList.add('hidden');
        }

        // Show main app
        function showMainApp() {
            landingPage.classList.add('hidden');
            mainApp.classList.remove('hidden');
            
            document.getElementById('userEmail').textContent = currentUser.email;
            
            // Patch existing members to ensure saludMovilidad is initialized
            let patched = false;
            members.forEach(m => {
                if (!m.saludMovilidad || typeof m.saludMovilidad !== 'object') {
                    m.saludMovilidad = {
                        trigliceridos: false,
                        colesterol: false,
                        diabetes: false,
                        higadoGraso: false,
                        piedrasVesicula: false,
                        prediabetes: false,
                        reflujo: false,
                        gastritis: false,
                        colitis: false,
                        piedrasRinon: false,
                        retencionLiquidos: false,
                        faltaEnergia2: false,
                        estrenimiento: false,
                        migrañas: false,
                        cansancio: false,
                        meCuestaLevantarme: false,
                        meCuestaAgacharme: false,
                        pocaResistencia: false,
                        meCuestaEstirarme: false,
                        dolorCaminar: false,
                        doloresArticulares: false,
                        meCuestaDormir: false,
                        meCuestaConducir: false,
                        noPuedoAgacharme: false,
                        nervioCiatico: false,
                        meDuelenHuesos: false,
                        seArrollaRopa: false
                    };
                    patched = true;
                }
            });
            if (patched) {
                localStorage.setItem('gymMembers', JSON.stringify(members));
            }
            if (currentUser.isAdmin) {
                showAdminDashboard();
            } else {
                showMemberDashboard();
            }
        }

        // Handle login
        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorElement = document.getElementById('loginError');

            // Check admin login
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                currentUser = { email, isAdmin: true };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showMainApp();
                return;
            }

            // Check member login
            const member = members.find(m => m.email === email && m.password === password);
            if (member) {
                currentUser = { email, isAdmin: false, memberId: member.id };
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                showMainApp();
            } else {
                errorElement.textContent = 'Correo o contraseña inválidos';
            }
        }

        // Handle registration
        function handleRegister(e) {
            e.preventDefault();
            const errorElement = document.getElementById('registerError');
            
            // Check if email already exists
            const email = document.getElementById('regEmail').value;
            if (members.find(m => m.email === email)) {
                errorElement.textContent = 'El correo ya está registrado';
                return;
            }

            // Create new member
            const newId = generateId();
            const member = {
                id: newId,
                name: document.getElementById('regName').value,
                phone: document.getElementById('regPhone').value,
                email: email,
                password: document.getElementById('regPassword').value,
                dob: document.getElementById('regDob').value,
                weight: parseFloat(document.getElementById('regWeight').value),
                measurements: {
                    abdomen: parseFloat(document.getElementById('regAbdomen').value),
                    cintura: parseFloat(document.getElementById('regCintura').value),
                    cadera: parseFloat(document.getElementById('regCadera').value),
                    pierna: parseFloat(document.getElementById('regPierna').value),
                    brazo: parseFloat(document.getElementById('regBrazo').value),
                    espalda: parseFloat(document.getElementById('regEspalda').value)
                },
                clothing: {
                    pantalon: document.getElementById('regPantalon').value,
                    camisa: document.getElementById('regCamisa').value
                },
                images: {
                    before: '',
                    after: ''
                },
                attendance: [],
                registrationDate: new Date().toISOString(),
                qrCode: newId,
                // Initialize saludMovilidad with all fields false
                saludMovilidad: {
                    trigliceridos: false,
                    colesterol: false,
                    diabetes: false,
                    higadoGraso: false,
                    piedrasVesicula: false,
                    prediabetes: false,
                    reflujo: false,
                    gastritis: false,
                    colitis: false,
                    piedrasRinon: false,
                    retencionLiquidos: false,
                    faltaEnergia2: false,
                    estrenimiento: false,
                    migrañas: false,
                    cansancio: false,
                    meCuestaLevantarme: false,
                    meCuestaAgacharme: false,
                    pocaResistencia: false,
                    meCuestaEstirarme: false,
                    dolorCaminar: false,
                    doloresArticulares: false,
                    meCuestaDormir: false,
                    meCuestaConducir: false,
                    noPuedoAgacharme: false,
                    nervioCiatico: false,
                    meDuelenHuesos: false,
                    seArrollaRopa: false
                }
            };

            members.push(member);
            localStorage.setItem('gymMembers', JSON.stringify(members));
            
            registerModal.classList.remove('show');
            registerForm.reset();
            
            // If admin is registering, refresh the admin dashboard
            if (currentUser?.isAdmin) {
                renderMembersTable();
                updateAdminStats();
            }
            
            // Success message (you can implement a toast notification here)
            alert('¡Miembro registrado exitosamente!');
        }

        // =====================
        // SECTION: END OF SCRIPT
        // =====================

// ===== MISSING FUNCTION STUBS (add real logic as needed) =====
// View member details in modal (view-only mode)
function viewMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    // Populate edit form with member data (reuse openEditMemberModal logic)
    document.getElementById('editMemberId').value = member.id;
    document.getElementById('editName').value = member.name;
    document.getElementById('editPhone').value = member.phone;
    document.getElementById('editEmail').value = member.email;
    document.getElementById('editDob').value = member.dob;
    document.getElementById('editWeight').value = member.weight;
    document.getElementById('editAbdomen').value = member.measurements.abdomen;
    document.getElementById('editCintura').value = member.measurements.cintura;
    document.getElementById('editCadera').value = member.measurements.cadera;
    document.getElementById('editPierna').value = member.measurements.pierna;
    document.getElementById('editBrazo').value = member.measurements.brazo;
    document.getElementById('editEspalda').value = member.measurements.espalda;
    document.getElementById('editPantalon').value = member.clothing.pantalon;
    document.getElementById('editCamisa').value = member.clothing.camisa;
    // Reset file inputs and previews
    document.getElementById('editBeforeImg').value = '';
    document.getElementById('editAfterImg').value = '';
    const beforePreview = document.getElementById('editBeforePreview');
    const afterPreview = document.getElementById('editAfterPreview');
    if (member.images.before) {
        beforePreview.src = member.images.before;
        beforePreview.style.display = 'block';
    } else {
        beforePreview.src = '';
        beforePreview.style.display = 'none';
    }
    if (member.images.after) {
        afterPreview.src = member.images.after;
        afterPreview.style.display = 'block';
    } else {
        afterPreview.src = '';
        afterPreview.style.display = 'none';
    }
    // Set Factores de Salud values if present
    if (member.factoresSalud) {
        document.getElementById('faltaEnergia').checked = !!member.factoresSalud.faltaEnergia;
        document.getElementById('excesoEstres').checked = !!member.factoresSalud.excesoEstres;
        document.getElementById('descontrolHormonal').checked = !!member.factoresSalud.descontrolHormonal;
        document.getElementById('estrias').checked = !!member.factoresSalud.estrias;
        document.getElementById('celulitis').checked = !!member.factoresSalud.celulitis;
        document.getElementById('flacidezNivel').value = member.factoresSalud.flacidezNivel || '';
    } else {
        document.getElementById('faltaEnergia').checked = false;
        document.getElementById('excesoEstres').checked = false;
        document.getElementById('descontrolHormonal').checked = false;
        document.getElementById('estrias').checked = false;
        document.getElementById('celulitis').checked = false;
        document.getElementById('flacidezNivel').value = '';
    }
    // Set Salud/Movilidad values if present
    if (member.saludMovilidad) {
        document.getElementById('trigliceridos').checked = !!member.saludMovilidad.trigliceridos;
        document.getElementById('colesterol').checked = !!member.saludMovilidad.colesterol;
        document.getElementById('diabetes').checked = !!member.saludMovilidad.diabetes;
        document.getElementById('higadoGraso').checked = !!member.saludMovilidad.higadoGraso;
        document.getElementById('piedrasVesicula').checked = !!member.saludMovilidad.piedrasVesicula;
        document.getElementById('prediabetes').checked = !!member.saludMovilidad.prediabetes;
        document.getElementById('reflujo').checked = !!member.saludMovilidad.reflujo;
        document.getElementById('gastritis').checked = !!member.saludMovilidad.gastritis;
        document.getElementById('colitis').checked = !!member.saludMovilidad.colitis;
        document.getElementById('piedrasRinon').checked = !!member.saludMovilidad.piedrasRinon;
        document.getElementById('retencionLiquidos').checked = !!member.saludMovilidad.retencionLiquidos;
        document.getElementById('faltaEnergia2').checked = !!member.saludMovilidad.faltaEnergia2;
        document.getElementById('estrenimiento').checked = !!member.saludMovilidad.estrenimiento;
        document.getElementById('migrañas').checked = !!member.saludMovilidad.migrañas;
        document.getElementById('cansancio').checked = !!member.saludMovilidad.cansancio;
        document.getElementById('meCuestaLevantarme').checked = !!member.saludMovilidad.meCuestaLevantarme;
        document.getElementById('meCuestaAgacharme').checked = !!member.saludMovilidad.meCuestaAgacharme;
        document.getElementById('pocaResistencia').checked = !!member.saludMovilidad.pocaResistencia;
        document.getElementById('meCuestaEstirarme').checked = !!member.saludMovilidad.meCuestaEstirarme;
        document.getElementById('dolorCaminar').checked = !!member.saludMovilidad.dolorCaminar;
        document.getElementById('doloresArticulares').checked = !!member.saludMovilidad.doloresArticulares;
        document.getElementById('meCuestaDormir').checked = !!member.saludMovilidad.meCuestaDormir;
        document.getElementById('meCuestaConducir').checked = !!member.saludMovilidad.meCuestaConducir;
        document.getElementById('noPuedoAgacharme').checked = !!member.saludMovilidad.noPuedoAgacharme;
        document.getElementById('nervioCiatico').checked = !!member.saludMovilidad.nervioCiatico;
        document.getElementById('meDuelenHuesos').checked = !!member.saludMovilidad.meDuelenHuesos;
        document.getElementById('seArrollaRopa').checked = !!member.saludMovilidad.seArrollaRopa;
    } else {
        document.getElementById('trigliceridos').checked = false;
        document.getElementById('colesterol').checked = false;
        document.getElementById('diabetes').checked = false;
        document.getElementById('higadoGraso').checked = false;
        document.getElementById('piedrasVesicula').checked = false;
        document.getElementById('prediabetes').checked = false;
        document.getElementById('reflujo').checked = false;
        document.getElementById('gastritis').checked = false;
        document.getElementById('colitis').checked = false;
        document.getElementById('piedrasRinon').checked = false;
        document.getElementById('retencionLiquidos').checked = false;
        document.getElementById('faltaEnergia2').checked = false;
        document.getElementById('estrenimiento').checked = false;
        document.getElementById('migrañas').checked = false;
        document.getElementById('cansancio').checked = false;
        document.getElementById('meCuestaLevantarme').checked = false;
        document.getElementById('meCuestaAgacharme').checked = false;
        document.getElementById('pocaResistencia').checked = false;
        document.getElementById('meCuestaEstirarme').checked = false;
        document.getElementById('dolorCaminar').checked = false;
        document.getElementById('doloresArticulares').checked = false;
        document.getElementById('meCuestaDormir').checked = false;
        document.getElementById('meCuestaConducir').checked = false;
        document.getElementById('noPuedoAgacharme').checked = false;
        document.getElementById('nervioCiatico').checked = false;
        document.getElementById('meDuelenHuesos').checked = false;
        document.getElementById('seArrollaRopa').checked = false;
    }
    // Always set view mode: read-only, hide edit/cancel/save
    setEditFormReadOnly(true);
    document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');
    const editBtn = document.getElementById('enableEditBtn');
    // Show Edit button only for admin
    if (editBtn) {
        if (currentUser && currentUser.isAdmin) {
            editBtn.style.display = 'inline-block';
            // Attach click handler to switch to edit mode
            editBtn.onclick = function() {
                setEditFormReadOnly(false);
                document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'inline-block');
                editBtn.style.display = 'none';
            };
        } else {
            editBtn.style.display = 'none';
        }
    }
    // Show the modal
    document.getElementById('editModal').classList.add('show');
}
function renderMembersTable() {
    // Render the members table in the admin dashboard
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!members || members.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#aaa;">Sin miembros registrados</td></tr>';
        return;
    }
    members.forEach(member => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${member.id}</td>
            <td>${member.name}</td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td style="text-align:center;">${member.attendance ? member.attendance.length : 0}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="viewMember('${member.id}')">Ver</button>
                    <button class="btn btn-sm btn-primary" onclick="openMeasurementModal('${member.id}')">Mediciones</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAdminStats() {
    // TODO: Update admin dashboard stats (total members, check-ins, etc)
}

function openPurchaseModal() {
    // TODO: Open the purchase modal for registering a purchase
}

function renderComprasWinner() {
    const winnerDiv = document.getElementById('comprasWinner');
    const winnerData = JSON.parse(localStorage.getItem('comprasWinner'));
    if (winnerDiv) {
        if (winnerData && winnerData.name) {
            winnerDiv.innerHTML = `<div style=\"background:#d1fae5;color:#065f46;padding:12px 18px;border-radius:12px;text-align:center;font-size:1.1em;font-weight:bold;\">🎉 Ganador: ${winnerData.name} (ID: ${winnerData.id})</div>`;
        } else {
            winnerDiv.innerHTML = '';
        }
    }
}

function elegirGanador() {
    let comprasList = JSON.parse(localStorage.getItem('comprasList')) || [];
    if (!comprasList.length) {
        alert('No hay compras registradas para elegir un ganador.');
        return;
    }
    let pool = [];
    comprasList.forEach(item => {
        for (let i = 0; i < (item.count || 1); i++) {
            pool.push(item);
        }
    });
    if (!pool.length) {
        alert('No hay suficientes compras para elegir un ganador.');
        return;
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem('comprasWinner', JSON.stringify(winner));
    renderComprasWinner();
    alert(`¡Felicidades a ${winner.name} (ID: ${winner.id}) por ganar el sorteo de compras!`);
}

function handleEditMember(e) {
    e.preventDefault();
    const memberId = document.getElementById('editMemberId').value;
    const memberIdx = members.findIndex(m => m.id === memberId);
    if (memberIdx === -1) return;
    // Update member fields
    members[memberIdx].name = document.getElementById('editName').value;
    members[memberIdx].phone = document.getElementById('editPhone').value;
    members[memberIdx].email = document.getElementById('editEmail').value;
    // Only update password if a new one is entered
    const newPassword = document.getElementById('editPassword').value;
    if (newPassword) members[memberIdx].password = newPassword;
    members[memberIdx].dob = document.getElementById('editDob').value;
    members[memberIdx].weight = parseFloat(document.getElementById('editWeight').value);
    members[memberIdx].measurements = {
        abdomen: parseFloat(document.getElementById('editAbdomen').value),
        cintura: parseFloat(document.getElementById('editCintura').value),
        cadera: parseFloat(document.getElementById('editCadera').value),
        pierna: parseFloat(document.getElementById('editPierna').value),
        brazo: parseFloat(document.getElementById('editBrazo').value),
        espalda: parseFloat(document.getElementById('editEspalda').value)
    };
    members[memberIdx].clothing = {
        pantalon: document.getElementById('editPantalon').value,
        camisa: document.getElementById('editCamisa').value
    };
    // Factores de Salud
    members[memberIdx].factoresSalud = {
        faltaEnergia: document.getElementById('faltaEnergia').checked,
        excesoEstres: document.getElementById('excesoEstres').checked,
        descontrolHormonal: document.getElementById('descontrolHormonal').checked,
        estrias: document.getElementById('estrias').checked,
        celulitis: document.getElementById('celulitis').checked,
        flacidezNivel: document.getElementById('flacidezNivel').value
    };
    // Salud/Movilidad
    members[memberIdx].saludMovilidad = getSaludMovilidadFromForm();
    // Save to localStorage
    localStorage.setItem('gymMembers', JSON.stringify(members));
    // Return to view mode
    setEditFormReadOnly(true);
    document.querySelectorAll('.edit-only').forEach(el => el.style.display = 'none');
    const editBtn = document.getElementById('enableEditBtn');
    if (editBtn) editBtn.style.display = 'inline-block';
    // Show success message
    const successMsg = document.getElementById('editSuccess');
    if (successMsg) {
        successMsg.textContent = 'Cambios guardados correctamente.';
        setTimeout(() => { successMsg.textContent = ''; }, 2500);
    }
    // Optionally update the table if admin
    if (currentUser && currentUser.isAdmin) {
        renderMembersTable();
    }
}

function signOut() {
    // TODO: Sign out the current user and return to landing page
    localStorage.removeItem('currentUser');
    location.reload();
}

function openQRScanner() {
    // TODO: Open the QR scanner modal and start scanning
}

function closeQRScanner() {
    // TODO: Close the QR scanner modal and stop scanning
}