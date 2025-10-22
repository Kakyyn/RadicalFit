// Attach sign out event listener (call after rendering sidebar)
// --- Resilient global modal fallback wrappers ---
// These provide safe no-op/open/close behavior for callers that may run
// before the full animated helpers are defined (stale caches/service-worker).
try {
    if (typeof window !== 'undefined') {
        // Only set fallbacks if not already present
        if (!window.openModal) {
            window.openModal = function(modal) {
                try { if (modal && modal.classList) modal.classList.add('show'); } catch (e) {}
            };
        }
        if (!window.closeModal) {
            window.closeModal = function(modal) {
                try { if (modal && modal.classList) modal.classList.remove('show'); } catch (e) {}
            };
        }
        if (!window.openModalById) {
            window.openModalById = function(id) { try { const m = document.getElementById(id); if (m) m.classList.add('show'); } catch(e){} };
        }
        if (!window.closeModalById) {
            window.closeModalById = function(id) { try { const m = document.getElementById(id); if (m) m.classList.remove('show'); } catch(e){} };
        }
    }
} catch (e) { /* ignore */ }
// Ensure global identifier names exist (some environments / inline handlers call the identifier directly)
try {
    if (typeof openModal === 'undefined') {
        // prefer window mapping if set, else create a simple fallback
        var openModal = (window && window.openModal) ? window.openModal : function(modal) { try { if (modal && modal.classList) modal.classList.add('show'); } catch (e) {} };
    }
    if (typeof closeModal === 'undefined') {
        var closeModal = (window && window.closeModal) ? window.closeModal : function(modal) { try { if (modal && modal.classList) modal.classList.remove('show'); } catch (e) {} };
    }
    if (typeof openModalById === 'undefined') {
        var openModalById = (window && window.openModalById) ? window.openModalById : function(id) { try { const m = document.getElementById(id); if (m) m.classList.add('show'); } catch(e){} };
    }
    if (typeof closeModalById === 'undefined') {
        var closeModalById = (window && window.closeModalById) ? window.closeModalById : function(id) { try { const m = document.getElementById(id); if (m) m.classList.remove('show'); } catch(e){} };
    }
} catch(e) { /* ignore */ }

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
                // include ejerciciosMemberTab so it gets hidden when switching away
                const memberTabs = ['qrTab', 'profileTab', 'measurementsTab', 'ejerciciosMemberTab', 'progressTab'];
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
            // When member opens Ejercicios tab, re-render member data to populate ejercicios container
            if (tab === 'ejerciciosMember' && currentUser && !currentUser.isAdmin && typeof renderMemberData === 'function') {
                const m = members.find(mm => mm.id === currentUser.memberId);
                if (m) renderMemberData(m);
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
                    if (editModal) closeModal(editModal);
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
                // default date to today
                const dateEl = document.getElementById('measurementDate');
                if (dateEl) {
                    const today = new Date();
                    dateEl.value = today.toISOString().slice(0,10);
                }
                document.getElementById('measurementError').textContent = '';
                document.getElementById('measurementSuccess').textContent = '';
                openModal(measurementModal);
            }
            window.openMeasurementModal = openMeasurementModal;

            const measurementModal = document.getElementById('measurementModal');
            const measurementForm = document.getElementById('measurementForm');
            document.getElementById('closeMeasurementModal').addEventListener('click', () => { closeModal(measurementModal); });
            document.getElementById('cancelMeasurement').addEventListener('click', () => { closeModal(measurementModal); });
            measurementForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const memberId = document.getElementById('measurementMemberId').value;
                const member = members.find(m => m.id === memberId);
                if (!member) {
                    document.getElementById('measurementError').textContent = 'Miembro no encontrado.';
                    return;
                }
                // Prepare new measurement entry
                // Use provided date if present, otherwise use now
                const dateInput = document.getElementById('measurementDate')?.value;
                const dateISO = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
                const entry = {
                    date: dateISO,
                    weight: parseFloat(document.getElementById('measurementWeight').value),
                    abdomen: parseFloat(document.getElementById('measurementAbdomen').value),
                    cintura: parseFloat(document.getElementById('measurementCintura').value),
                    cadera: parseFloat(document.getElementById('measurementCadera').value),
                    pierna: parseFloat(document.getElementById('measurementPierna').value),
                    brazo: parseFloat(document.getElementById('measurementBrazo').value),
                    espalda: parseFloat(document.getElementById('measurementEspalda').value)
                };
                // Initialize history if not present
                if (!Array.isArray(member.measurementHistory)) member.measurementHistory = [];
                member.measurementHistory.push(entry);
                // Save to localStorage
                localStorage.setItem('gymMembers', JSON.stringify(members));
                document.getElementById('measurementSuccess').textContent = 'Medición guardada exitosamente.';
            setTimeout(() => {
                closeModal(measurementModal);
                    // If the member is viewing their dashboard, refresh it
                    if (currentUser && !currentUser.isAdmin && currentUser.memberId === memberId) {
                        renderMemberData(member);
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
                        beforePreview.classList.add('show');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
            // Add exercise form
            const addExerciseForm = document.getElementById('addExerciseForm');
            addExerciseForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const title = document.getElementById('exerciseTitle').value.trim();
                const desc = document.getElementById('exerciseDescription').value.trim();
                const video = document.getElementById('exerciseVideo').value.trim();
                if (!title) {
                    document.getElementById('exerciseError').textContent = 'El título es requerido.';
                    return;
                }
                const ex = { id: 'E' + Date.now().toString(36), title, description: desc, video };
                addExercise(ex);
                document.getElementById('exerciseSuccess').textContent = 'Ejercicio guardado.';
                setTimeout(() => closeModal(document.getElementById('addExerciseModal')), 700);
            });

            // Confirm assign exercise
            document.getElementById('confirmAssignExercise').addEventListener('click', function() {
                const exId = document.getElementById('assignExerciseSelect').value;
                const memberId = document.getElementById('assignMemberSelect').value;
                const sets = parseInt(document.getElementById('assignSetsInput')?.value || '3', 10) || 3;
                const reps = parseInt(document.getElementById('assignRepsInput')?.value || '10', 10) || 10;
                if (!exId || !memberId) {
                    document.getElementById('assignError').textContent = 'Selecciona ejercicio y miembro.';
                    return;
                }
                const ok = assignExerciseToMember(exId, memberId, sets, reps);
                if (ok) {
                    document.getElementById('assignSuccess').textContent = 'Ejercicio asignado.';
                    setTimeout(() => closeModal(document.getElementById('assignExerciseModal')), 700);
                } else {
                    document.getElementById('assignError').textContent = 'Error al asignar.';
                }
            });
            afterImgInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        afterPreview.src = e.target.result;
                        afterPreview.classList.add('show');
                    };
                    reader.readAsDataURL(this.files[0]);
                }
            });
            // Check if user is already logged in
            const savedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (savedUser) {
                currentUser = savedUser;
                try {
                    // If member user, apply their theme immediately
                    if (!currentUser.isAdmin) {
                        const member = members.find(m => m.id === currentUser.memberId);
                        applyPlanTheme(member ? member.planType : null);
                    } else {
                        applyPlanTheme(null);
                    }
                } catch (e) { /* ignore */ }
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
                const pm = document.getElementById('planInfoModal'); if (pm) closeModal(pm);
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
            document.getElementById('registerBtn').addEventListener('click', () => { openModal(registerModal); });
            document.getElementById('closeRegisterModal').addEventListener('click', () => { closeModal(registerModal); });
            document.getElementById('cancelRegister').addEventListener('click', () => { closeModal(registerModal); });

            // Form submissions
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);
            editForm.addEventListener('submit', handleEditMember);

            // Sign out event is attached by attachSignOutListener after navigation render

            // Admin functions
            document.getElementById('addMemberBtn')?.addEventListener('click', () => {
                openModal(registerModal);
            });

            document.getElementById('scanQRBtn')?.addEventListener('click', function() {
                // Detect if mobile (touch device or small screen)
                const isMobile = window.matchMedia('(max-width: 900px)').matches || 'ontouchstart' in window;
                if (isMobile) {
                    openQRScanner();
                } else {
                    // On desktop, focus the manual ID input for USB QR code reader
                    openModal(scannerModal);
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
                    if (scannerModal) closeModal(scannerModal);
                    closeQRScanner();
                });
            }

            // Edit modal
            // Fix: Ensure closeEditModal exists before adding event listener
            const closeEditModalBtn = document.getElementById('closeEditModal');
            if (closeEditModalBtn) {
                closeEditModalBtn.addEventListener('click', () => { closeModal(editModal); });
            }

            document.getElementById('cancelEdit').addEventListener('click', () => { closeModal(editModal); });

            document.getElementById('deleteMember').addEventListener('click', deleteMember);

            // Exercise modal buttons (admin)
            const addExerciseBtn = document.getElementById('addExerciseBtn');
            if (addExerciseBtn) addExerciseBtn.addEventListener('click', function() {
                document.getElementById('addExerciseForm').reset();
                document.getElementById('exerciseError').textContent = '';
                document.getElementById('exerciseSuccess').textContent = '';
                openModal(document.getElementById('addExerciseModal'));
            });
            const closeAddExerciseModal = document.getElementById('closeAddExerciseModal');
            if (closeAddExerciseModal) closeAddExerciseModal.addEventListener('click', () => closeModal(document.getElementById('addExerciseModal')));
            document.getElementById('cancelAddExercise').addEventListener('click', () => closeModal(document.getElementById('addExerciseModal')));

            const assignExerciseBtnEl = document.getElementById('assignExerciseBtn');
            if (assignExerciseBtnEl) assignExerciseBtnEl.addEventListener('click', function() {
                // populate selects
                const selEx = document.getElementById('assignExerciseSelect');
                const selMem = document.getElementById('assignMemberSelect');
                selEx.innerHTML = '';
                selMem.innerHTML = '';
                exercises.forEach(ex => selEx.innerHTML += `<option value="${ex.id}">${ex.title}</option>`);
                members.forEach(m => selMem.innerHTML += `<option value="${m.id}">${m.name} (${m.id})</option>`);
                // default sets/reps
                const setsEl = document.getElementById('assignSetsInput');
                const repsEl = document.getElementById('assignRepsInput');
                if (setsEl) setsEl.value = 3;
                if (repsEl) repsEl.value = 10;
                document.getElementById('assignError').textContent = '';
                document.getElementById('assignSuccess').textContent = '';

                // Prefill sets/reps when selecting a member or exercise if assignment exists
                function prefillAssignSetsReps() {
                    try {
                        const exId = document.getElementById('assignExerciseSelect').value;
                        const memberId = document.getElementById('assignMemberSelect').value;
                        if (!exId || !memberId) return;
                        const member = members.find(m => m.id === memberId);
                        if (!member || !Array.isArray(member.assignedExercises)) return;
                        const assigned = member.assignedExercises.find(a => (typeof a === 'string' ? a === exId : a.id === exId));
                        if (assigned && typeof assigned === 'object') {
                            if (setsEl && assigned.sets) setsEl.value = assigned.sets;
                            if (repsEl && assigned.reps) repsEl.value = assigned.reps;
                        } else {
                            if (setsEl) setsEl.value = 3;
                            if (repsEl) repsEl.value = 10;
                        }
                    } catch (err) { console.error('prefillAssignSetsReps error', err); }
                }

                document.getElementById('assignExerciseSelect').addEventListener('change', prefillAssignSetsReps);
                document.getElementById('assignMemberSelect').addEventListener('change', prefillAssignSetsReps);

                openModal(document.getElementById('assignExerciseModal'));
            });
            const closeAssignExerciseModal = document.getElementById('closeAssignExerciseModal');
            if (closeAssignExerciseModal) closeAssignExerciseModal.addEventListener('click', () => closeModal(document.getElementById('assignExerciseModal')));
            document.getElementById('cancelAssignExercise').addEventListener('click', () => closeModal(document.getElementById('assignExerciseModal')));


            // Member dashboard tabs
            document.querySelectorAll('.member-dashboard-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.member-dashboard-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('#memberDashboard .card').forEach(c => c.classList.add('hidden'));
                    tab.classList.add('active');
                    const tabName = tab.dataset.tab;
                    document.getElementById(tabName + 'Tab').classList.remove('hidden');
                    // Always re-render member data with correct memberId (not just email)
                    if (typeof renderMemberData === 'function' && currentUser && currentUser.memberId) {
                        const member = members.find(m => m.id === currentUser.memberId);
                        if (member) renderMemberData(member);
                    }
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
    document.getElementById('registerBtn').addEventListener('click', () => { openModal(registerModal); });

    // Close registration modal
    closeRegisterModalBtn.addEventListener('click', () => { closeModal(registerModal); });

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
    // Plan type
    const planTypeEl = document.getElementById('editPlanType');
    if (planTypeEl) planTypeEl.value = member.planType || 'in_person';
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
        beforePreview.classList.add('show');
    } else {
        beforePreview.src = '';
        beforePreview.classList.remove('show');
    }
    if (member.images.after) {
        afterPreview.src = member.images.after;
        afterPreview.classList.add('show');
    } else {
        afterPreview.src = '';
        afterPreview.classList.remove('show');
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
            document.querySelectorAll('.edit-only').forEach(el => el.classList.add('hidden'));
            const editBtn = document.getElementById('enableEditBtn');
            if (editBtn) editBtn.classList.remove('hidden');

            // Show the modal
            openModal(editModal);
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
                editBtn.classList.add('mr-8');
                btnGroup.insertBefore(editBtn, btnGroup.querySelector('button[type="submit"]'));
                editBtn.addEventListener('click', function() {
                    setEditFormReadOnly(false);
                    // Show save/cancel, hide edit
                    document.querySelectorAll('.edit-only').forEach(el => el.classList.remove('hidden'));
                    editBtn.classList.add('hidden');
                });
            }
            // When cancel is clicked, return to view mode
            const cancelEditBtn = document.getElementById('cancelEdit');
            if (cancelEditBtn) {
                cancelEditBtn.addEventListener('click', function() {
                    setEditFormReadOnly(true);
                    document.querySelectorAll('.edit-only').forEach(el => el.classList.add('hidden'));
                    const editBtn = document.getElementById('enableEditBtn');
                    if (editBtn) editBtn.classList.remove('hidden');
                });
            }

            // Tab switching logic for member modal
            document.querySelectorAll('.member-tab-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.member-tab-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    document.querySelectorAll('.tab-content-area').forEach(tab => tab.classList.add('hidden'));
                    const tabId = this.getAttribute('data-tab');
                    const tEl = document.getElementById(tabId);
                    if (tEl) tEl.classList.remove('hidden');
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
            confirmPrompt('¿Estás seguro de que deseas eliminar TODOS los datos? Esta acción no se puede deshacer.', function(ok) {
                if (ok) { localStorage.clear(); location.reload(); }
            });
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
                a.classList.add('hidden');
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
                    msg.classList.add('success-message');
                    setTimeout(() => { msg.textContent = ''; msg.classList.remove('success-message'); }, 4000);
                }
            } catch (err) {
                if (msg) {
                    msg.textContent = 'Error al exportar: ' + err.message;
                    msg.classList.add('error-message');
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
        // Exercises storage
        let exercises = JSON.parse(localStorage.getItem('exercises') || '[]');

        function saveExercises() {
            localStorage.setItem('exercises', JSON.stringify(exercises));
        }

        function renderComprasList() {
            const ul = document.getElementById('comprasList');
            ul.innerHTML = '';
                if (comprasList.length === 0) {
                    ul.innerHTML = '<li class="muted">Sin compras registradas</li>';
                renderComprasWinner();
                return;
            }
            comprasList.forEach(item => {
                    let dots = '';
                    for (let i = 0; i < item.count; i++) {
                        dots += '<span class="compra-dot"></span>';
                    }
                    ul.innerHTML += `<li class="compra-item">
                        <div class="compra-dots">${dots}</div>
                        <div class="compra-name">${item.name}</div>
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
            openModal(purchaseModal);
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
                    closeModal(purchaseModal);
                };
            }
        }

        // Show admin dashboard
        function showAdminDashboard() {
                    // Preserve inline elements (like plan label) when changing title
                    const pageTitleEl = document.getElementById('pageTitle');
                    if (pageTitleEl) pageTitleEl.innerHTML = 'Admin Dashboard <span id="memberPlanLabel" class="plan-label hidden"></span>';
            document.getElementById('memberDashboard').classList.add('hidden');
            document.getElementById('adminDashboard').classList.remove('hidden');
            setupNavigation([
                        { name: 'Dashboard', icon: '📊', tab: 'miembros', active: true },
                        { name: 'Compras', icon: '�️', tab: 'compras' },
                        { name: 'Ejercicios', icon: '🏋️', tab: 'ejercicios' },
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
                    document.getElementById('ejerciciosTab')?.classList.add('hidden');
                    document.getElementById('ajustesTab').classList.add('hidden');
                    // Show the selected tab
                    const tab = this.getAttribute('data-tab');
                    if (tab === 'compras') {
                        document.getElementById('comprasTab').classList.remove('hidden');
                        renderComprasList();
                    } else if (tab === 'ejercicios') {
                        document.getElementById('ejerciciosTab').classList.remove('hidden');
                        renderExercisesList();
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
    const member = members.find(m => m.id === currentUser.memberId);
    if (!member) return;

    // Preserve inline elements (like plan label) when changing title
    const pageTitleEl = document.getElementById('pageTitle');
    if (pageTitleEl) pageTitleEl.innerHTML = 'Mi Tablero <span id="memberPlanLabel" class="plan-label hidden"></span>';
    document.getElementById('adminDashboard').classList.add('hidden');
    document.getElementById('memberDashboard').classList.remove('hidden');

    // Show QR tab by default
    document.querySelectorAll('#memberDashboard .card').forEach(c => c.classList.add('hidden'));
    document.getElementById('qrTab').classList.remove('hidden');

    setupNavigation([
        { name: 'QR', icon: '�', tab: 'qr', active: true },
        { name: 'Perfil', icon: '👤', tab: 'profile' },
        { name: 'Mediciones', icon: '�', tab: 'measurements' },
        { name: 'Ejercicios', icon: '🏋️', tab: 'ejerciciosMember' },
        { name: 'Progreso', icon: '📈', tab: 'progress' }
    ]);
    // Ensure sign out button works after navigation render
    setTimeout(attachSignOutListener, 0);
    // Always render member data with correct memberId
    renderMemberData(member);
    // Update top page title plan label
    try {
        const planLabel = document.getElementById('memberPlanLabel');
        if (planLabel) {
            planLabel.classList.remove('hidden');
            const dotClass = planTypeToDotClass(member.planType);
            const badge = `<span class="plan-badge plan-legend-dot ${dotClass}"></span>`;
            const pretty = (member.planType || 'in_person').toLowerCase() === 'virtual' ? 'Virtual' : (member.planType || 'in_person').toLowerCase() === 'gladiadores' ? 'Gladiadores' : 'Presencial';
            planLabel.innerHTML = badge + ' ' + pretty;
        }
    } catch (e) { console.error(e); }
        }

        // =====================
        // UTILITY & HELPER FUNCTIONS
        // =====================

        // Render member dashboard data (profile, QR, measurements, etc)
        function renderMemberData(member) {
            try { applyPlanTheme(member ? member.planType : null); } catch (e) { /* ignore */ }

    // Member ID
    const memberIdEl = document.getElementById('memberId');
        if (memberIdEl) memberIdEl.textContent = member.id || 'N/A';
    // Plan-type color badge in member profile header
    try {
        const profileHeader = document.getElementById('memberProfile');
        if (profileHeader) {
            // remove existing badge if present
            const existing = document.getElementById('memberPlanBadge');
            if (existing) existing.remove();
            const badge = document.createElement('div');
            badge.id = 'memberPlanBadge';
            badge.className = 'member-plan-dot';
            badge.title = member.planType || 'plan';
            // map planType to dot class
            const dotClass = planTypeToDotClass(member.planType);
            if (dotClass) badge.classList.add(dotClass);
            // append badge next to the name element if present
            const nameEl = document.getElementById('memberProfileName');
            if (nameEl && nameEl.parentNode) {
                nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
            } else {
                profileHeader.appendChild(badge);
            }
        }
    } catch (e) { console.error(e); }
    // Profile Info
    document.getElementById('memberProfileName').textContent = member.name;
    document.getElementById('memberProfileEmail').textContent = member.email;
    document.getElementById('memberProfilePhone').textContent = member.phone;
    document.getElementById('memberProfileDob').textContent = member.dob;
    // Helper to show value or dash
    function showVal(val, unit) {
        if (typeof val === 'number' && !isNaN(val)) return val + ' ' + unit;
        if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) return Number(val) + ' ' + unit;
        if (val === 0) return '0 ' + unit;
        return '-';
    }

    // Defensive: measurements may be undefined/null, fallback to 0 if missing
    const ms = member.measurements || {};
    function safeNum(val) {
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (typeof val === 'string' && val !== '' && !isNaN(Number(val))) return Number(val);
        return 0;
    }

    const elProfileWeight = document.getElementById('memberProfileWeight');
    if (elProfileWeight) elProfileWeight.textContent = showVal(safeNum(member.weight), 'kg');
    const elProfileAbdomen = document.getElementById('memberProfileAbdomen');
    if (elProfileAbdomen) elProfileAbdomen.textContent = showVal(safeNum(ms.abdomen), 'cm');
    const elProfileCintura = document.getElementById('memberProfileCintura');
    if (elProfileCintura) elProfileCintura.textContent = showVal(safeNum(ms.cintura), 'cm');
    const elProfileCadera = document.getElementById('memberProfileCadera');
    if (elProfileCadera) elProfileCadera.textContent = showVal(safeNum(ms.cadera), 'cm');
    const elProfilePierna = document.getElementById('memberProfilePierna');
    if (elProfilePierna) elProfilePierna.textContent = showVal(safeNum(ms.pierna), 'cm');
    const elProfileBrazo = document.getElementById('memberProfileBrazo');
    if (elProfileBrazo) elProfileBrazo.textContent = showVal(safeNum(ms.brazo), 'cm');
    const elProfileEspalda = document.getElementById('memberProfileEspalda');
    if (elProfileEspalda) elProfileEspalda.textContent = showVal(safeNum(ms.espalda), 'cm');

    // --- Mediciones Tab: Original Data ---
    const orig = member.measurements || {};
    // Registration date
    const regDateEl = document.getElementById('memberRegistrationDate');
    if (regDateEl) {
        let regDate = member.registrationDate ? new Date(member.registrationDate) : null;
        regDateEl.textContent = (regDate && !isNaN(regDate)) ? regDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
    }
    const elOrigWeight = document.getElementById('memberOriginalWeight');
    if (elOrigWeight) elOrigWeight.textContent = showVal(safeNum(member.weight), 'kg');
    const elOrigAbdomen = document.getElementById('memberOriginalAbdomen');
    if (elOrigAbdomen) elOrigAbdomen.textContent = showVal(safeNum(orig.abdomen), 'cm');
    const elOrigCintura = document.getElementById('memberOriginalCintura');
    if (elOrigCintura) elOrigCintura.textContent = showVal(safeNum(orig.cintura), 'cm');
    const elOrigCadera = document.getElementById('memberOriginalCadera');
    if (elOrigCadera) elOrigCadera.textContent = showVal(safeNum(orig.cadera), 'cm');
    const elOrigPierna = document.getElementById('memberOriginalPierna');
    if (elOrigPierna) elOrigPierna.textContent = showVal(safeNum(orig.pierna), 'cm');
    const elOrigBrazo = document.getElementById('memberOriginalBrazo');
    if (elOrigBrazo) elOrigBrazo.textContent = showVal(safeNum(orig.brazo), 'cm');
    const elOrigEspalda = document.getElementById('memberOriginalEspalda');
    if (elOrigEspalda) elOrigEspalda.textContent = showVal(safeNum(orig.espalda), 'cm');

    // --- Mediciones Tab: Measurement History ---
    const histDiv = document.getElementById('measurementHistory');
    let history = Array.isArray(member.measurementHistory) ? member.measurementHistory : [];
    if (histDiv) {
        if (!history.length) {
        histDiv.innerHTML = '<p class="muted muted-centered">No hay mediciones adicionales registradas</p>';
        } else {
            // Group history by year-month
            const groups = {};
            history.forEach(entry => {
                const d = new Date(entry.date);
                if (isNaN(d)) return;
                const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
                if (!groups[key]) groups[key] = [];
                groups[key].push(entry);
            });
            // Sort month keys descending (latest first)
            const sortedKeys = Object.keys(groups).sort((a,b) => b.localeCompare(a));
            const parts = [];
            sortedKeys.forEach(key => {
                const [year,month] = key.split('-');
                const monthName = new Date(year, parseInt(month,10)-1).toLocaleString('es-MX', { month: 'long', year: 'numeric' });
                parts.push(`<div class="measurement-month-header">${monthName}</div>`);
                groups[key].sort((a,b) => new Date(a.date) - new Date(b.date));
                groups[key].forEach(entry => {
                    const d = new Date(entry.date);
                    const dateStr = d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
                    function showVal(val, unit) { return (typeof val === 'number' && !isNaN(val)) ? val + ' ' + unit : '-'; }
                    parts.push(`<div class="measurement-entry">
                        <div class="measurement-date">${dateStr}</div>
                        <div><strong>Peso:</strong> ${showVal(entry.weight, 'kg')}</div>
                        <div><strong>Abdomen:</strong> ${showVal(entry.abdomen, 'cm')}</div>
                        <div><strong>Cintura:</strong> ${showVal(entry.cintura, 'cm')}</div>
                        <div><strong>Cadera:</strong> ${showVal(entry.cadera, 'cm')}</div>
                        <div><strong>Pierna:</strong> ${showVal(entry.pierna, 'cm')}</div>
                        <div><strong>Brazo:</strong> ${showVal(entry.brazo, 'cm')}</div>
                        <div><strong>Espalda:</strong> ${showVal(entry.espalda, 'cm')}</div>
                    </div>`);
                });
            });
            histDiv.innerHTML = parts.join('');
        }
    }
    // exercises are shown only in the Ejercicios tab
    // Render member ejercicios tab contents (separate container) only when the tab is visible
    const memberEjTab = document.getElementById('ejerciciosMemberTab');
    const memberEjList = document.getElementById('memberEjerciciosList');
    if (memberEjList && memberEjTab && !memberEjTab.classList.contains('hidden')) {
        memberEjList.innerHTML = '';
        const assigned = Array.isArray(member.assignedExercises) ? member.assignedExercises : [];
        if (!assigned.length) {
            memberEjList.innerHTML = '<div class="muted-sm">No tienes ejercicios asignados</div>';
        } else {
            assigned.forEach(item => {
                // item can be string id (legacy) or object {id, sets, reps}
                const entry = (typeof item === 'string') ? { id: item, sets: null, reps: null } : item;
                const ex = exercises.find(e => e.id === entry.id);
                if (!ex) return;
                const wrapper = document.createElement('div');
                wrapper.className = 'member-exercise';
                const titleRow = document.createElement('div');
                titleRow.className = 'member-exercise-title-row';
                const title = document.createElement('div');
                title.className = 'member-exercise-title';
                title.textContent = ex.title;
                titleRow.appendChild(title);
                if (entry.sets || entry.reps) {
                    const meta = document.createElement('div');
                    meta.className = 'member-exercise-meta';
                    meta.textContent = `${entry.sets || '-'} sets × ${entry.reps || '-'} reps`;
                    titleRow.appendChild(meta);
                }
                wrapper.appendChild(titleRow);
                const desc = document.createElement('div');
                desc.className = 'member-exercise-desc';
                desc.textContent = ex.description || '';
                wrapper.appendChild(desc);
                if (ex.video) {
                    // If YouTube link, embed iframe
                    const ytMatch = ex.video.match(/(?:youtube.com\/watch\?v=|youtu.be\/)([A-Za-z0-9_-]+)/);
                    if (ytMatch && ytMatch[1]) {
                        const iframe = document.createElement('iframe');
                        iframe.className = 'exercise-video';
                        iframe.src = `https://www.youtube.com/embed/${ytMatch[1]}`;
                        iframe.frameBorder = '0';
                        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                        iframe.allowFullscreen = true;
                        wrapper.appendChild(iframe);
                    } else {
                        // Otherwise try HTML5 video
                        const videoEl = document.createElement('video');
                        videoEl.className = 'exercise-video';
                        videoEl.controls = true;
                        const src = document.createElement('source');
                        src.src = ex.video;
                        videoEl.appendChild(src);
                        wrapper.appendChild(videoEl);
                    }
                }
                // 'Marcar como completado' removed (was causing runtime errors in some environments)
                memberEjList.appendChild(wrapper);
            });
        }
    }
    // Show latest measurement in stat card (if any)
    const memberMeasurementMessage = document.getElementById('memberMeasurementMessage');
    if (memberMeasurementMessage) {
        if (history.length) {
            const latest = history[history.length - 1];
            const d = new Date(latest.date);
            memberMeasurementMessage.textContent = `Última: ${d.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })} - ${latest.weight || '-'} kg`;
        } else {
            memberMeasurementMessage.textContent = 'Sin mediciones nuevas';
        }
    }
            // QR Code
            const qrDiv = document.getElementById('memberProfileQR');
            if (qrDiv) qrDiv.innerHTML = '';
            if (window.QRCode && qrDiv) {
                // Remove previous QR code
                qrDiv.innerHTML = '';
                // Create a canvas for the QR code
                const canvas = document.createElement('canvas');
                qrDiv.appendChild(canvas);
                window.QRCode.toCanvas(canvas, member.id, { width: 128, height: 128 }, function (error) {
                    if (error) {
                        qrDiv.innerHTML = '<span class="error-message">Error generando QR</span>';
                        console.error(error);
                    }
                });
            } else if (!window.QRCode) {
                if (qrDiv) qrDiv.innerHTML = '<span class="error-message">Error: QRCode library not loaded</span>';
                console.error('QRCode library is not loaded.');
            }
            // Attendance count
            const attendanceCountEl = document.getElementById('attendanceCount');
            if (attendanceCountEl) attendanceCountEl.textContent = Array.isArray(member.attendance) ? member.attendance.length : 0;
        }

        // Show plan info modal
        function showPlanModal(plan) {
            const modal = document.getElementById('planInfoModal');
            const title = document.getElementById('planModalTitle');
            const body = document.getElementById('planModalBody');
            // Add or get subtitle element, always place directly after title
            let subtitle = document.getElementById('planModalSubtitle');
            if (!subtitle) {
                subtitle = document.createElement('div');
                subtitle.id = 'planModalSubtitle';
                subtitle.className = 'modal-subtitle';
            }
            // Always move subtitle right after title
            if (title.nextSibling !== subtitle) {
                title.parentNode.insertBefore(subtitle, title.nextSibling);
            }
            let planTitle = '';
            let planDesc = '';
            let planSubtitle = '';
            switch(plan) {
                case 'nitro':
                    planTitle = 'Nitro';
                    planSubtitle = '';
                    planDesc = `
                    <p><b>NITRO</b> Es totalmente natural y se usan diferentes líneas de suplementos de micro y macro nutrientes en cada programa, todos regulados por el ministerio de salud.</p>
                    <p>El propósito de nitro es optimizar el funcionamiento de los órganos viscerales descuidados con el tiempo por mala alimentación, comida chatarra, azúcar o simplemente dejar de comer.<br><i>Nitro promueve su funcionamiento y formen parte de la absorción de nutrientes de la comida regular para acelerar la pérdida de tallas y grasa sin flacidez.</i></p>
                    <ul>
                    <li><b>NO</b> es purgante, <b>NO</b> es un <b>DETOX</b>, ni tampoco un té quemador de grasa. El MÉTODO no usa productos de esa índole.</li>
                    <li>👉 No contiene leche ni gluten.</li>
                    </ul>
                    <p>Es posible que al promover su funcionamiento en los órganos viscerales, experimentes lo siguiente:</p>
                    <ul>
                    <li>👉 Orinar más de lo normal.</li>
                    <li>👉 Mejores deposiciones del cuerpo, incluso podría promover la corrección de estreñimiento (no crónico).</li>
                    <li>👉 Más energía.</li>
                    <li>👉 Podría promover la corrección de gastritis.</li>
                    </ul>
                    <p>👉 También podría pasar que sientas retorcijones, agruras, sensación de estreñimiento, lo cual sería normal cuando hacemos un cambio significativo en nuestra alimentación y más cuando los órganos viscerales entran en funcionamiento luego de una mala alimentación.</p>
                    <p>En caso contrario me avisas para hacer algún ajuste.</p>
                    <p>Si tienes que ir a cita de chequeo me avisas para enviarte toda la posología (lista de micro y macros que se usan en el programa) para que tu médico lo vea.</p>
                    `;
                    break;
                case 'zero':
                            planTitle = 'TONIFIQUE BODY CLEAN';
                            planSubtitle = '';
                            planDesc = `
                            <p><b> Es un complemento de su programa regular.</b><br>
                            Body clean refuerza su sistema muscular para provocar oxidación de grasa sub cutánea.</p>
                            <p>(Promueve la eliminación de grasa en abdomen, piernas y reduce celulitis y varices)<br>
                            Además promueve las deposiciones normales del cuerpo.</p>
                            <h4>¿Cómo usarlo?</h4>
                            <p>Siempre hay una comida que nos saltamos, ya sea por tiempo, falta de apetito o incluso una donde comemos muy mal.<br>
                            Ahí en lugar de saltarse esa comida la sustituye por body clean. La puede preparar en forma sólida o líquida con frutas o una bebida sencilla como un fresco.</p>
                            <p><b>Notará resultados desde las primeras semanas.</b></p>
                            `;
                break;
                case 'tnt':
                            planTitle = 'After Party';
                            planSubtitle = '';
                            planDesc = `
                            <p><b> Si en algún momento siente que se excedió en comida o alcohol</b>, tranquis, nos pasa a todos, es un proceso.<br></p>
                            <p>Puede tomar<b> After Party</b>, es una Bebida del MÉTODO que nos ayuda a eliminar los residuos de azúcar, químicos de la comida chatarra, exceso de todo para que no se transforme en grasa en nuestro cuerpo.</p>
                            <p>Si toma alcohol (cerveza, trago, cócteles, vino, etc) nuestro cuerpo trata de eliminarlo en forma de energía, dejando la comida saludable o no para transformarla en grasa de reserva pues no la puede usar. 
                            <b> After Party</b> capta los residuos de alcohol de la sangre, venas, arterias, hígado etc, optimizando su funcionamiento para que su cuerpo se estabilice.</p>
                            <p><b>Cambiar hábitos no es fácil, por ello after nos ayuda en el proceso, si se porta mal, no deje nada dentro.</b></p>
                            `;                    
                            break;
                case 'gainer':
                    planTitle = 'Gainer';
                    planSubtitle = '';
                    planDesc = `<p>Enfoque especial en aumento de masa muscular, incluye asesoría nutricional y rutinas especializadas. Ideal para transformación física.</p>`;
                    break;
                default:
                    planTitle = 'Información del Plan';
                    planSubtitle = '';
                    planDesc = '';
            }
            title.textContent = planTitle;
            subtitle.textContent = planSubtitle;
            if (planSubtitle) subtitle.classList.remove('hidden'); else subtitle.classList.add('hidden');
            body.innerHTML = planDesc;
            openModal(modal);
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
                    // Admins keep default theme
                    applyPlanTheme(null);
            } else {
                    showMemberDashboard();
                    // Apply the logged-in member's plan theme
                    const member = members.find(m => m.id === currentUser.memberId);
                    applyPlanTheme(member ? member.planType : null);
            }
        }

    // Apply a theme class to <body> based on planType
    function applyPlanTheme(planType) {
        try {
            const b = document.body;
            b.classList.remove('theme-yellow','theme-blue','theme-orange');
            if (!planType) return;
            const t = (planType || '').toLowerCase();
            if (t === 'virtual') b.classList.add('theme-blue');
            else if (t === 'gladiadores') b.classList.add('theme-orange');
            else b.classList.add('theme-yellow');
        } catch (e) { console.error(e); }
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

// =====================
// Utility: Generate unique member ID
function generateId() {
    // Use current timestamp and a random number for uniqueness
    return 'M' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
}

// Generic confirm modal helper
function showConfirm(message, callback) {
    const modal = document.getElementById('confirmModal');
    if (!modal) {
        // fallback to window.confirm
        const ok = window.confirm(message);
        try { callback(!!ok); } catch(e) { console.error(e); }
        return;
    }
    const body = document.getElementById('confirmModalBody');
    const title = document.getElementById('confirmModalTitle');
    const okBtn = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('cancelConfirm');
    const closeBtn = document.getElementById('closeConfirmModal');
    if (body) body.textContent = message;
    if (title) title.textContent = 'Confirmar';
    if (okBtn) okBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    openModal(modal);

    // debugging log
    try { console.log('showConfirm opened:', message); } catch (e) {}

    // single-use handlers (also assign to onclick to be robust against event listener replacement)
    const onceOk = function() {
        try { console.log('showConfirm: OK clicked'); } catch (e) {}
        try { callback(true); } catch (err) { console.error(err); }
        cleanup();
    };
    const onceCancel = function() {
        try { console.log('showConfirm: Cancel clicked'); } catch (e) {}
        try { callback(false); } catch (err) { console.error(err); }
        cleanup();
    };
    function cleanup() {
        try {
            if (okBtn) { okBtn.removeEventListener('click', onceOk); okBtn.onclick = null; }
            if (cancelBtn) { cancelBtn.removeEventListener('click', onceCancel); cancelBtn.onclick = null; }
            if (closeBtn) { closeBtn.removeEventListener('click', onceCancel); closeBtn.onclick = null; }
        } catch (e) { console.error(e); }
        // animate close
        closeModal(modal);
    }
    if (okBtn) { okBtn.addEventListener('click', onceOk, { once: true }); okBtn.onclick = onceOk; }
    if (cancelBtn) { cancelBtn.addEventListener('click', onceCancel, { once: true }); cancelBtn.onclick = onceCancel; }
    if (closeBtn) { closeBtn.addEventListener('click', onceCancel, { once: true }); closeBtn.onclick = onceCancel; }
}
// Expose helper globally so inline onclick handlers and other scopes can access it
try { window.showConfirm = showConfirm; } catch (e) { /* non-browser envs ignore */ }

// Safe wrapper to avoid ReferenceError when showConfirm isn't available yet.
function confirmPrompt(message, callback) {
    try {
        if (typeof window !== 'undefined' && typeof window.showConfirm === 'function') {
            window.showConfirm(message, callback);
            return;
        }
    } catch (e) {
        // ignore
    }
    // fallback to native confirm
    const ok = window.confirm(message);
    try { callback(!!ok); } catch(e) { console.error(e); }
}
// Also expose wrapper globally as a safety net
try { window.confirmPrompt = confirmPrompt; } catch (e) { }

// Toast helper
function showToast(message, opts = {}) {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log(message); return; }
    const div = document.createElement('div');
    div.className = 'toast';
    // Prefer semantic type (success/error/info) mapped to CSS classes
    if (opts && opts.type) {
        if (opts.type === 'success') div.classList.add('toast-success');
        else if (opts.type === 'error') div.classList.add('toast-error');
        else if (opts.type === 'info') div.classList.add('toast-info');
    }
    // Fallback: allow raw colors if caller provides them (keeps compatibility)
    if (opts && opts.background) div.style.background = opts.background;
    if (opts && opts.color) div.style.color = opts.color;
    div.textContent = message;
    container.appendChild(div);
    // trigger show class for animation
    setTimeout(() => { try { div.classList.add('show'); } catch(e){} }, 20);
    const remove = () => { try { div.classList.remove('show'); } catch(e){}; if (div.parentNode) div.parentNode.removeChild(div); };
    setTimeout(() => { try { div.classList.remove('show'); } catch(e){} }, (opts.duration || 3000) - 150);
    setTimeout(remove, opts.duration || 3000);
}
// Modal helpers: open/close with animation (uses CSS .show and .fade-out)
function openModal(modal) {
    if (!modal) return;
    try {
        modal.classList.remove('fade-out');
        // small reflow to ensure animation restarts
        void modal.offsetWidth;
        modal.classList.add('show');
    } catch (e) { console.error('openModal error', e); }
}

function closeModal(modal) {
    if (!modal) return;
    try {
        // If already fading out or hidden, remove immediately
        if (!modal.classList.contains('show')) return;
        modal.classList.add('fade-out');
        const cleanup = () => {
            try { modal.classList.remove('show'); modal.classList.remove('fade-out'); } catch(e){}
            modal.removeEventListener('animationend', cleanup);
        };
        modal.addEventListener('animationend', cleanup);
        // Fallback: if animationend doesn't fire, force hide after 400ms
        setTimeout(cleanup, 420);
    } catch (e) { console.error('closeModal error', e); modal.classList.remove('show'); modal.classList.remove('fade-out'); }
}

function openModalById(id) { const m = document.getElementById(id); if (m) openModal(m); }
function closeModalById(id) { const m = document.getElementById(id); if (m) closeModal(m); }
// Expose helpers globally for inline handlers / older cached code
try { window.openModal = openModal; window.closeModal = closeModal; window.openModalById = openModalById; window.closeModalById = closeModalById; } catch (e) {}

            const member = {
                id: newId,
                name: document.getElementById('regName').value,
                phone: document.getElementById('regPhone').value,
                email: email,
                password: document.getElementById('regPassword').value,
                dob: document.getElementById('regDob').value,
                weight: parseFloat(document.getElementById('regWeight').value),
                planType: document.getElementById('regPlanType') ? document.getElementById('regPlanType').value : 'in_person',
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
            
            closeModal(registerModal);
            registerForm.reset();
            
            // If admin is registering, refresh the admin dashboard
            if (currentUser?.isAdmin) {
                renderMembersTable();
                updateAdminStats();
            }
            
            // Success message
            showToast('¡Miembro registrado exitosamente!', { background: '#10b981' });
        }

        // =====================
        // SECTION: END OF SCRIPT
        // =====================

// ===== MISSING FUNCTION STUBS (add real logic as needed) =====
// Delete member function (admin only)
function deleteMember() {
    const memberId = document.getElementById('editMemberId').value;
    if (!memberId) return;
    confirmPrompt('¿Estás seguro de que deseas eliminar este miembro? Esta acción no se puede deshacer.', function(ok) {
        if (!ok) return;
        const idx = members.findIndex(m => m.id === memberId);
        if (idx === -1) return;
        members.splice(idx, 1);
        localStorage.setItem('gymMembers', JSON.stringify(members));
    // Close the edit modal
    const editModal = document.getElementById('editModal');
    if (editModal) closeModal(editModal);
        // Refresh admin table and stats
        if (typeof renderMembersTable === 'function') renderMembersTable();
        if (typeof updateAdminStats === 'function') updateAdminStats();
    // Optionally show a success message
    showToast('Miembro eliminado exitosamente.', { background: '#10b981' });
    });
}
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
    const planTypeEl2 = document.getElementById('editPlanType');
    if (planTypeEl2) planTypeEl2.value = member.planType || 'in_person';
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
        beforePreview.classList.add('show');
    } else {
        beforePreview.src = '';
        beforePreview.classList.remove('show');
    }
    if (member.images.after) {
        afterPreview.src = member.images.after;
        afterPreview.classList.add('show');
    } else {
        afterPreview.src = '';
        afterPreview.classList.remove('show');
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
                    document.querySelectorAll('.edit-only').forEach(el => el.classList.add('hidden'));
                    const editBtn = document.getElementById('enableEditBtn');
                    // Show Edit button only for admin
                    if (editBtn) {
                        if (currentUser && currentUser.isAdmin) {
                            editBtn.classList.remove('hidden');
                            // Attach click handler to switch to edit mode
                            editBtn.onclick = function() {
                                setEditFormReadOnly(false);
                                document.querySelectorAll('.edit-only').forEach(el => el.classList.remove('hidden'));
                                editBtn.classList.add('hidden');
                            };
                        } else {
                            editBtn.classList.add('hidden');
                        }
                    }
    // Show the modal
    openModal(document.getElementById('editModal'));
}
function renderMembersTable() {
    // Render the members table in the admin dashboard
    const tbody = document.getElementById('membersTableBody');
    if (!tbody) return;
    // Add a legend explaining plan colors (create if not exists)
    try {
        const legendId = 'planColorLegend';
        let legend = document.getElementById(legendId);
        const container = document.getElementById('miembrosTab');
        if (container && !legend) {
            legend = document.createElement('div');
            legend.id = legendId;
            legend.className = 'plan-legend';
            legend.innerHTML = `
                <span class="plan-legend-row">
                    <span class="plan-legend-item"><span class="plan-legend-dot plan-dot-presencial"></span> Presencial</span>
                    <span class="plan-legend-item"><span class="plan-legend-dot plan-dot-virtual"></span> Virtual</span>
                    <span class="plan-legend-item"><span class="plan-legend-dot plan-dot-gladiadores"></span> Gladiadores</span>
                </span>`;
            container.insertBefore(legend, container.firstChild);
        }
    } catch (e) { /* ignore */ }
    tbody.innerHTML = '';
    if (!members || members.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center muted">Sin miembros registrados</td></tr>';
        return;
    }
    members.forEach(member => {
        const tr = document.createElement('tr');
        // Insert a small colored badge for plan type next to the name
        const dotClass = planTypeToDotClass(member.planType);
        // avatar: if image present use img tag, otherwise initials
        const avatarHtml = (member.images && member.images.before) ? `<span class="member-avatar"><img src="${member.images.before}" alt="${member.name}"/></span>` : `<span class="member-avatar">${getInitials(member.name)}</span>`;
        tr.innerHTML = `
            <td>${member.id}</td>
            <td>${avatarHtml}<span class="member-name"><span class="plan-legend-dot ${dotClass} mr-8"></span>${member.name}</span></td>
            <td>${member.email}</td>
            <td>${member.phone}</td>
            <td class="text-center">${member.attendance ? member.attendance.length : 0}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" data-action="view" data-member-id="${member.id}">Ver</button>
                    <button class="btn btn-sm btn-primary" data-action="measure" data-member-id="${member.id}">Mediciones</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach a delegated click handler to tbody for member actions (single listener)
    try {
        // remove existing handler if any by replacing the node listener
        const existing = tbody._delegatedClickAttached;
        if (!existing) {
            tbody.addEventListener('click', function(e) {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                const memberId = btn.getAttribute('data-member-id');
                if (action === 'view') {
                    try { viewMember(memberId); } catch (err) { console.error(err); }
                } else if (action === 'measure') {
                    try { openMeasurementModal(memberId); } catch (err) { console.error(err); }
                }
            });
            tbody._delegatedClickAttached = true;
        }
    } catch (e) { console.error(e); }
}

// Helper: return color for plan type
function getPlanColor(planType) {
    switch ((planType || '').toLowerCase()) {
        case 'virtual': return '#3b82f6'; // blue
        case 'gladiadores': return '#fb923c'; // orange
        case 'in_person':
        case 'presencial':
        default:
            return '#facc15'; // yellow
    }
}

// Map planType to CSS class for dot styling
function planTypeToDotClass(planType) {
    const t = (planType || '').toLowerCase();
    if (t === 'virtual') return 'plan-dot-virtual';
    if (t === 'gladiadores') return 'plan-dot-gladiadores';
    return 'plan-dot-presencial';
}

// Helper: get initials from full name
function getInitials(name) {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0,1).toUpperCase();
    return (parts[0].substring(0,1) + parts[parts.length-1].substring(0,1)).toUpperCase();
}

function updateAdminStats() {
    // Update admin dashboard stats (total members, check-ins, etc)
    const totalMembersEl = document.getElementById('totalMembers');
    const todayCheckinsEl = document.getElementById('todayCheckins');
    const monthlyCheckinsEl = document.getElementById('monthlyCheckins');
    if (!totalMembersEl || !todayCheckinsEl || !monthlyCheckinsEl) return;

    // Total members
    totalMembersEl.textContent = members.length;

    // Today's check-ins
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let todayCount = 0;
    let monthCount = 0;
    members.forEach(m => {
        if (Array.isArray(m.attendance)) {
            todayCount += m.attendance.filter(a => a.slice(0, 10) === todayStr).length;
            monthCount += m.attendance.filter(a => a.slice(0, 7) === todayStr.slice(0, 7)).length;
        }
    });
    todayCheckinsEl.textContent = todayCount;
    monthlyCheckinsEl.textContent = monthCount;
}

function openPurchaseModal() {
    // TODO: Open the purchase modal for registering a purchase
}

function renderComprasWinner() {
    const winnerDiv = document.getElementById('comprasWinner');
    const winnerData = JSON.parse(localStorage.getItem('comprasWinner'));
    if (winnerDiv) {
        if (winnerData && winnerData.name) {
            winnerDiv.innerHTML = `<div class="compra-winner">🎉 Ganador: ${winnerData.name} (ID: ${winnerData.id})</div>`;
        } else {
            winnerDiv.innerHTML = '';
        }
    }
}

function elegirGanador() {
    let comprasList = JSON.parse(localStorage.getItem('comprasList')) || [];
    if (!comprasList.length) {
        showToast('No hay compras registradas para elegir un ganador.', { background: '#ef4444' });
        return;
    }
    let pool = [];
    comprasList.forEach(item => {
        for (let i = 0; i < (item.count || 1); i++) {
            pool.push(item);
        }
    });
    if (!pool.length) {
        showToast('No hay suficientes compras para elegir un ganador.', { background: '#ef4444' });
        return;
    }
    const winner = pool[Math.floor(Math.random() * pool.length)];
    localStorage.setItem('comprasWinner', JSON.stringify(winner));
    renderComprasWinner();
    showToast(`¡Felicidades a ${winner.name} (ID: ${winner.id}) por ganar el sorteo de compras!`, { background: '#10b981', duration: 5000 });
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
    // Plan type (virtual or in_person)
    const editPlanTypeEl = document.getElementById('editPlanType');
    if (editPlanTypeEl) {
        members[memberIdx].planType = editPlanTypeEl.value || 'in_person';
    } else {
        members[memberIdx].planType = members[memberIdx].planType || 'in_person';
    }
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
    // If the edited member is currently logged in, re-render
    if (currentUser && !currentUser.isAdmin && currentUser.memberId === members[memberIdx].id) {
        renderMemberData(members[memberIdx]);
    }
    // Return to view mode
    setEditFormReadOnly(true);
    document.querySelectorAll('.edit-only').forEach(el => el.classList.add('hidden'));
    const editBtn = document.getElementById('enableEditBtn');
    if (editBtn) editBtn.classList.remove('hidden');
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
    try {
        const planLabel = document.getElementById('memberPlanLabel');
        if (planLabel) {
            planLabel.classList.add('hidden');
            planLabel.innerHTML = '';
        }
    } catch (e) {}
    localStorage.removeItem('currentUser');
    location.reload();
}


// QR Scanner logic for mobile
let qrScannerInstance = null;
function openQRScanner() {
    const scannerModal = document.getElementById('scannerModal');
    if (scannerModal) openModal(scannerModal);
    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) return;
    // Clean up previous instance if any
    if (qrScannerInstance) {
        qrScannerInstance.clear().catch(() => {});
        qrScannerInstance = null;
        qrReader.innerHTML = '';
    }
    // Use html5-qrcode for mobile scanning
    qrScannerInstance = new Html5Qrcode('qr-reader');
    qrScannerInstance.start(
        { facingMode: 'environment' },
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        (decodedText, decodedResult) => {
            // On successful scan
            handleQRScan(decodedText);
            closeQRScanner();
        },
        (errorMessage) => {
            // Optionally handle scan errors
        }
    ).catch(err => {
        document.getElementById('scanResult').textContent = 'No se pudo iniciar la cámara: ' + err;
    });
}

function closeQRScanner() {
    const qrReader = document.getElementById('qr-reader');
    if (qrScannerInstance) {
        qrScannerInstance.stop().then(() => {
            qrScannerInstance.clear();
            qrScannerInstance = null;
            if (qrReader) qrReader.innerHTML = '';
        }).catch(() => {});
    } else if (qrReader) {
        qrReader.innerHTML = '';
    }
    const scannerModal = document.getElementById('scannerModal');
    if (scannerModal) closeModal(scannerModal);
}

// Handle QR scan result
function handleQRScan(decodedText) {
    // Try to find member by scanned ID
    const member = members.find(m => m.id === decodedText);
    const scanResult = document.getElementById('scanResult');
    if (member) {
        // Add attendance
        if (!member.attendance) member.attendance = [];
        member.attendance.push(new Date().toISOString());
        localStorage.setItem('gymMembers', JSON.stringify(members));
        if (scanResult) scanResult.textContent = `✅ Asistencia agregada para ${member.name}`;
        // If the current user is the scanned member, update their dashboard
        if (currentUser && currentUser.email === member.email && typeof renderMemberData === 'function') {
            renderMemberData(member);
            // Also force QR code re-render in case QR tab is visible
            const qrTab = document.getElementById('qrTab');
            if (qrTab && !qrTab.classList.contains('hidden')) {
                setTimeout(() => renderMemberData(member), 100);
            }
        }
    } else {
        if (scanResult) scanResult.textContent = '❌ Miembro no encontrado';
    }
}

// Render exercises list for admin
function renderExercisesList() {
    const container = document.getElementById('exercisesList');
    if (!container) return;
    if (!exercises.length) {
    container.innerHTML = '<div class="muted-sm text-center">No hay ejercicios registrados</div>';
        return;
    }
    container.innerHTML = '';
    exercises.forEach(ex => {
        const div = document.createElement('div');
        div.className = 'exercise-item';
    const left = document.createElement('div');
    const assignedCount = countAssignedToExercise(ex.id);
    const badgeHtml = assignedCount ? `<span class="assigned-badge">Asignados: ${assignedCount}</span>` : '';
    left.innerHTML = `<strong>${ex.title}</strong>${badgeHtml}<div class="muted-sm">${ex.description || ''}</div>`;
    const actions = document.createElement('div');
    actions.className = 'exercise-actions';
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn btn-sm btn-secondary';
        viewBtn.textContent = 'Ver';
        viewBtn.setAttribute('data-action', 'view');
        viewBtn.setAttribute('data-ex-id', ex.id);
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-sm btn-primary';
        editBtn.textContent = 'Editar';
        editBtn.setAttribute('data-action', 'edit');
        editBtn.setAttribute('data-ex-id', ex.id);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-sm btn-danger';
        delBtn.textContent = 'Eliminar';
        delBtn.setAttribute('data-action', 'delete');
        delBtn.setAttribute('data-ex-id', ex.id);
        const unassignBtn = document.createElement('button');
        unassignBtn.className = 'btn btn-sm btn-secondary';
        unassignBtn.textContent = 'Desasignar';
        unassignBtn.setAttribute('data-action', 'unassign');
        unassignBtn.setAttribute('data-ex-id', ex.id);
    const editAssignBtn = document.createElement('button');
    editAssignBtn.className = 'btn btn-sm btn-primary';
    editAssignBtn.textContent = 'Editar Asign.';
    editAssignBtn.setAttribute('data-action', 'edit-assign');
    editAssignBtn.setAttribute('data-ex-id', ex.id);
        actions.appendChild(viewBtn);
        actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    actions.appendChild(unassignBtn);
    actions.appendChild(editAssignBtn);
    const row = document.createElement('div');
    row.className = 'exercise-row';
        row.appendChild(left);
        row.appendChild(actions);
        div.appendChild(row);
        container.appendChild(div);
    });

    // Delegated handler for exercise actions
    try {
        const list = container;
        if (list && !list._delegatedExerciseHandler) {
            list.addEventListener('click', function(e) {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                const exId = btn.getAttribute('data-ex-id');
                if (action === 'view') {
                    try { openExercisePreview(exId); } catch (err) { console.error(err); }
                } else if (action === 'edit') {
                    try { editExercise(exId); } catch (err) { console.error(err); }
                } else if (action === 'delete') {
                    try {
                        confirmPrompt('Eliminar ejercicio? Esta acción eliminará la asignación a miembros.', function(ok) {
                            if (ok) deleteExercise(exId);
                        });
                    } catch (err) { console.error(err); }
                } else if (action === 'unassign') {
                    try { openUnassignModal(exId); } catch (err) { console.error(err); }
                } else if (action === 'edit-assign') {
                    try { openEditAssignmentModal(exId); } catch (err) { console.error(err); }
                }
            });
            list._delegatedExerciseHandler = true;
        }
    } catch (e) { console.error(e); }
}

// Edit exercise (simple prompt-based editor)
// Open edit exercise modal
function editExercise(id) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    // populate modal fields
    document.getElementById('editExerciseId').value = ex.id;
    document.getElementById('editExerciseTitle').value = ex.title || '';
    document.getElementById('editExerciseDescription').value = ex.description || '';
    document.getElementById('editExerciseVideo').value = ex.video || '';
    // clear messages
    document.getElementById('editExerciseError').textContent = '';
    document.getElementById('editExerciseSuccess').textContent = '';
    // ensure save button visible (not preview mode)
    const saveBtn = document.getElementById('editExerciseSaveBtn');
    if (saveBtn) saveBtn.classList.remove('hidden');
    // populate preview
    updateEditExercisePreview(ex.video);
    // show modal
    const modal = document.getElementById('editExerciseModal');
    if (modal) openModal(modal);
}

// Save handler for edit exercise form
document.getElementById('editExerciseForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('editExerciseId').value;
    const title = document.getElementById('editExerciseTitle').value.trim();
    const desc = document.getElementById('editExerciseDescription').value.trim();
    const video = document.getElementById('editExerciseVideo').value.trim();
    if (!title) {
        document.getElementById('editExerciseError').textContent = 'El título es requerido.';
        return;
    }
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    ex.title = title;
    ex.description = desc;
    ex.video = video;
    saveExercises();
    renderExercisesList();
    document.getElementById('editExerciseSuccess').textContent = 'Cambios guardados.';
    setTimeout(() => {
        const modal = document.getElementById('editExerciseModal');
        if (modal) closeModal(modal);
    }, 600);
});

// Cancel/close handlers for edit exercise modal
document.getElementById('cancelEditExercise').addEventListener('click', function() {
    const modal = document.getElementById('editExerciseModal'); if (modal) closeModal(modal);
});
document.getElementById('closeEditExerciseModal').addEventListener('click', function() { const modal = document.getElementById('editExerciseModal'); if (modal) closeModal(modal); });

// Update preview in edit exercise modal
function updateEditExercisePreview(videoUrl) {
    const preview = document.getElementById('editExercisePreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (!videoUrl) {
        preview.textContent = '';
        return;
    }
    const ytMatch = videoUrl.match(/(?:youtube.com\/watch\?v=|youtu.be\/)([A-Za-z0-9_-]+)/);
    if (ytMatch && ytMatch[1]) {
        const iframe = document.createElement('iframe');
        iframe.className = 'exercise-video';
        iframe.src = `https://www.youtube.com/embed/${ytMatch[1]}`;
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        preview.appendChild(iframe);
    } else {
        const videoEl = document.createElement('video');
        videoEl.className = 'exercise-video';
        videoEl.controls = true;
        const src = document.createElement('source');
        src.src = videoUrl;
        videoEl.appendChild(src);
        preview.appendChild(videoEl);
    }
}

// Live update preview when video input changes
const editExerciseVideoInput = document.getElementById('editExerciseVideo');
if (editExerciseVideoInput) {
    editExerciseVideoInput.addEventListener('input', function() {
        updateEditExercisePreview(this.value.trim());
    });
}

function deleteExercise(id) {
    console.log('deleteExercise called with id:', id);
    exercises = exercises.filter(e => e.id !== id);
    // remove from members
    members.forEach(m => {
        if (Array.isArray(m.assignedExercises)) {
            m.assignedExercises = m.assignedExercises.filter(a => (typeof a === 'string' ? a !== id : a.id !== id));
        }
    });
    localStorage.setItem('gymMembers', JSON.stringify(members));
    saveExercises();
    renderExercisesList();
}

// Open unassign modal (simple) - choose members to unassign
function openUnassignModal(exId) {
    // use modal to unassign exercise from members
    const assignedMembers = members.filter(m => Array.isArray(m.assignedExercises) && m.assignedExercises.some(a => (typeof a === 'string' ? a === exId : a.id === exId)));
    if (!assignedMembers.length) { showToast('No hay miembros asignados a este ejercicio.', { background: '#ef4444' }); return; }
    // populate modal info
    document.getElementById('unassignExerciseId').value = exId;
    const ex = exercises.find(e => e.id === exId);
    document.getElementById('unassignExerciseInfo').textContent = ex ? `${ex.title}` : 'Ejercicio';
    const sel = document.getElementById('unassignMemberSelect');
    sel.innerHTML = '<option value="">-- Desasignar a todos --</option>';
    assignedMembers.forEach(m => {
        // try to find the assigned entry to show sets/reps
        const assignedEntry = m.assignedExercises.find(a => (typeof a === 'string' ? a === exId : a.id === exId));
        let extra = '';
        if (assignedEntry && typeof assignedEntry === 'object') {
            extra = ` - ${assignedEntry.sets || '-'}x${assignedEntry.reps || '-'}`;
        }
        sel.innerHTML += `<option value="${m.id}">${m.name} (${m.id})${extra}</option>`;
    });
    document.getElementById('unassignExerciseError').textContent = '';
    document.getElementById('unassignExerciseSuccess').textContent = '';
    const modal = document.getElementById('unassignExerciseModal'); if (modal) openModal(modal);
}

// Open Edit Assignment modal for a specific exercise
function openEditAssignmentModal(exId) {
    document.getElementById('editAssignExerciseId').value = exId;
    const sel = document.getElementById('editAssignMemberSelect');
    sel.innerHTML = '';
    // find members who have this exercise assigned
    const assignedMembers = members.filter(m => Array.isArray(m.assignedExercises) && m.assignedExercises.some(a => (typeof a === 'string' ? a === exId : a.id === exId)));
    if (!assignedMembers.length) {
        showToast('No hay miembros asignados a este ejercicio.', { background: '#ef4444' });
        return;
    }
    assignedMembers.forEach(m => {
        const assignedEntry = m.assignedExercises.find(a => (typeof a === 'string' ? a === exId : a.id === exId));
        const extra = (assignedEntry && typeof assignedEntry === 'object') ? ` - ${assignedEntry.sets || '-'}x${assignedEntry.reps || '-'}` : '';
        sel.innerHTML += `<option value="${m.id}">${m.name} (${m.id})${extra}</option>`;
    });
    // default sets/reps based on first member
    const first = assignedMembers[0];
    const firstEntry = first.assignedExercises.find(a => (typeof a === 'string' ? a === exId : a.id === exId));
    const setsEl = document.getElementById('editAssignSets');
    const repsEl = document.getElementById('editAssignReps');
    if (firstEntry && typeof firstEntry === 'object') {
        if (setsEl) setsEl.value = firstEntry.sets || 3;
        if (repsEl) repsEl.value = firstEntry.reps || 10;
    } else {
        if (setsEl) setsEl.value = 3;
        if (repsEl) repsEl.value = 10;
    }
    document.getElementById('editAssignError').textContent = '';
    document.getElementById('editAssignSuccess').textContent = '';
    const modal = document.getElementById('editAssignmentModal'); if (modal) openModal(modal);
}

// Save edited assignment (sets/reps) for selected member
document.getElementById('saveEditAssignment').addEventListener('click', function() {
    const exId = document.getElementById('editAssignExerciseId').value;
    const memberId = document.getElementById('editAssignMemberSelect').value;
    const sets = parseInt(document.getElementById('editAssignSets')?.value || '3', 10) || 3;
    const reps = parseInt(document.getElementById('editAssignReps')?.value || '10', 10) || 10;
    if (!exId || !memberId) {
        document.getElementById('editAssignError').textContent = 'Selecciona un miembro.';
        return;
    }
    // update the specific assigned entry
    const mIdx = members.findIndex(m => m.id === memberId);
    if (mIdx === -1) { document.getElementById('editAssignError').textContent = 'Miembro no encontrado.'; return; }
    if (!Array.isArray(members[mIdx].assignedExercises)) { document.getElementById('editAssignError').textContent = 'No hay asignaciones para este miembro.'; return; }
    const aIdx = members[mIdx].assignedExercises.findIndex(a => (typeof a === 'string' ? a === exId : a.id === exId));
    if (aIdx === -1) { document.getElementById('editAssignError').textContent = 'Asignación no encontrada.'; return; }
    // Replace legacy string with object if needed
    if (typeof members[mIdx].assignedExercises[aIdx] === 'string') {
        members[mIdx].assignedExercises[aIdx] = { id: exId, sets, reps };
    } else {
        members[mIdx].assignedExercises[aIdx].sets = sets;
        members[mIdx].assignedExercises[aIdx].reps = reps;
    }
    localStorage.setItem('gymMembers', JSON.stringify(members));
    document.getElementById('editAssignSuccess').textContent = 'Asignación actualizada.';
    setTimeout(() => {
        const modal = document.getElementById('editAssignmentModal'); if (modal) closeModal(modal);
        try { renderExercisesList(); } catch (e) {}
    }, 700);
});

document.getElementById('cancelEditAssignment').addEventListener('click', function() { const modal = document.getElementById('editAssignmentModal'); if (modal) closeModal(modal); });
document.getElementById('closeEditAssignmentModal').addEventListener('click', function() { const modal = document.getElementById('editAssignmentModal'); if (modal) closeModal(modal); });

// Confirm unassign (modal)
document.getElementById('confirmUnassignExercise').addEventListener('click', function() {
    const exId = document.getElementById('unassignExerciseId').value;
    const memberId = document.getElementById('unassignMemberSelect').value;
    if (!exId) return;
    if (!memberId) {
        // unassign from all
        members.forEach(m => {
            if (Array.isArray(m.assignedExercises)) m.assignedExercises = m.assignedExercises.filter(a => (typeof a === 'string' ? a !== exId : a.id !== exId));
        });
        localStorage.setItem('gymMembers', JSON.stringify(members));
        document.getElementById('unassignExerciseSuccess').textContent = 'Desasignado de todos los miembros.';
    setTimeout(() => { const modal = document.getElementById('unassignExerciseModal'); if (modal) closeModal(modal); renderExercisesList(); }, 800);
        return;
    }
    const ok = unassignExerciseFromMember(exId, memberId);
    if (ok) {
        document.getElementById('unassignExerciseSuccess').textContent = 'Desasignado.';
    setTimeout(() => { const modal = document.getElementById('unassignExerciseModal'); if (modal) closeModal(modal); renderExercisesList(); }, 600);
    } else {
        document.getElementById('unassignExerciseError').textContent = 'Error al desasignar.';
    }
});

document.getElementById('cancelUnassignExercise').addEventListener('click', function() { const modal = document.getElementById('unassignExerciseModal'); if (modal) closeModal(modal); });
document.getElementById('closeUnassignExerciseModal').addEventListener('click', function() { const modal = document.getElementById('unassignExerciseModal'); if (modal) closeModal(modal); });

function unassignExerciseFromMember(exId, memberId) {
    const mIdx = members.findIndex(m => m.id === memberId);
    if (mIdx === -1) return false;
    if (!Array.isArray(members[mIdx].assignedExercises)) return false;
    members[mIdx].assignedExercises = members[mIdx].assignedExercises.filter(a => (typeof a === 'string' ? a !== exId : a.id !== exId));
    localStorage.setItem('gymMembers', JSON.stringify(members));
    return true;
}

// Add exercise
function addExercise(ex) {
    exercises.push(ex);
    saveExercises();
    renderExercisesList();
}

// Assign exercise to member
function assignExerciseToMember(exId, memberId, setsArg, repsArg) {
    const mIdx = members.findIndex(m => m.id === memberId);
    if (mIdx === -1) return false;
    if (!Array.isArray(members[mIdx].assignedExercises)) members[mIdx].assignedExercises = [];
    // determine sets/reps to use
    const sets = (typeof setsArg === 'number' && setsArg > 0) ? setsArg : (parseInt(document.getElementById('assignSetsInput')?.value || '3', 10) || 3);
    const reps = (typeof repsArg === 'number' && repsArg > 0) ? repsArg : (parseInt(document.getElementById('assignRepsInput')?.value || '10', 10) || 10);
    // avoid duplicate assignment for same exercise id
    const alreadyIdx = members[mIdx].assignedExercises.findIndex(a => (typeof a === 'string' ? a === exId : a.id === exId));
    if (alreadyIdx === -1) {
        members[mIdx].assignedExercises.push({ id: exId, sets, reps });
    } else {
        // update reps/sets if already assigned
        const already = members[mIdx].assignedExercises[alreadyIdx];
        if (typeof already === 'string') {
            // replace legacy string with object
            members[mIdx].assignedExercises[alreadyIdx] = { id: exId, sets, reps };
        } else {
            already.sets = sets;
            already.reps = reps;
        }
    }
    localStorage.setItem('gymMembers', JSON.stringify(members));
    // If the assigned member is currently logged in, re-render their dashboard
    if (currentUser && !currentUser.isAdmin && currentUser.memberId === memberId && typeof renderMemberData === 'function') {
        const member = members.find(m => m.id === memberId);
        if (member) renderMemberData(member);
    }
    // refresh admin exercises list so assigned counts update
    try { renderExercisesList(); } catch (e) {}
    return true;
}

// Helper: count how many members have this exercise assigned
function countAssignedToExercise(exId) {
    let cnt = 0;
    members.forEach(m => {
        if (!Array.isArray(m.assignedExercises)) return;
        const found = m.assignedExercises.some(a => (typeof a === 'string' ? a === exId : a.id === exId));
        if (found) cnt++;
    });
    return cnt;
}

// Open exercise preview (simple) - global for inline onclick
function openExercisePreview(id) {
    const ex = exercises.find(e => e.id === id);
    if (!ex) return;
    // Populate edit modal fields for preview
    document.getElementById('editExerciseId').value = ex.id;
    document.getElementById('editExerciseTitle').value = ex.title || '';
    document.getElementById('editExerciseDescription').value = ex.description || '';
    document.getElementById('editExerciseVideo').value = ex.video || '';
    // Populate preview area
    const preview = document.getElementById('editExercisePreview');
    if (preview) {
        preview.innerHTML = '';
        if (ex.video) {
            const ytMatch = ex.video.match(/(?:youtube.com\/watch\?v=|youtu.be\/)([A-Za-z0-9_-]+)/);
            if (ytMatch && ytMatch[1]) {
                const iframe = document.createElement('iframe');
                iframe.className = 'exercise-video';
                iframe.src = `https://www.youtube.com/embed/${ytMatch[1]}`;
                iframe.frameBorder = '0';
                iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                iframe.allowFullscreen = true;
                preview.appendChild(iframe);
            } else {
                const videoEl = document.createElement('video');
                videoEl.className = 'exercise-video';
                videoEl.controls = true;
                const src = document.createElement('source');
                src.src = ex.video;
                videoEl.appendChild(src);
                preview.appendChild(videoEl);
            }
        } else {
            preview.textContent = 'No hay video disponible para este ejercicio';
        }
    }
    // Show modal in preview mode (disable save)
    const saveBtn = document.getElementById('editExerciseSaveBtn');
    if (saveBtn) {
        saveBtn.classList.add('hidden');
    }
    document.getElementById('editExerciseError').textContent = '';
    document.getElementById('editExerciseSuccess').textContent = '';
    const modal = document.getElementById('editExerciseModal');
    if (modal) openModal(modal);
}
window.openExercisePreview = openExercisePreview;
