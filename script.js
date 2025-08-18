import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    onSnapshot, 
    serverTimestamp, 
    deleteField 
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded. Initializing app...");

    // --- Firebase Configuration ---
    // WICHTIG: Ersetzen Sie dies durch Ihre tatsächliche Firebase-Projektkonfiguration
    const firebaseConfig = {
        apiKey: "AIzaSyDNY51Jui8EOiCGQMdpLsn2kW4yTPYkk2w",
        authDomain: "taskflow-841c1.firebaseapp.com",
        projectId: "taskflow-841c1",
        storageBucket: "taskflow-841c1.firebaseapp.com",
        messagingSenderId: "109204779254",
        appId: "1:109204779254:web:ed340a07677a37fa827cd7"
    };

    // Use environment variables if available (for Canvas)
    const currentFirebaseConfig = typeof __firebase_config !== 'undefined'
        ? JSON.parse(__firebase_config)
        : firebaseConfig;

    // --- Firebase initialisieren ---
    console.log("Initializing Firebase app with config:", currentFirebaseConfig.projectId);
    const app = initializeApp(currentFirebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    console.log("Firebase initialized. DB and Auth instances created.");

    // --- DOM-Elemente ---
    const body = document.body;
    const dashboardViewBtn = document.getElementById('dashboardViewBtn');
    const kanbanViewBtn = document.getElementById('kanbanViewBtn');
    const pageTitle = document.getElementById('pageTitle');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    // Modale
    const openModalBtn = document.getElementById('openModalBtn');
    // Schaltfläche initial deaktivieren
    openModalBtn.disabled = true;
    const taskModal = document.getElementById('taskModal');
    const boardModal = document.getElementById('boardModal');
    const shareModal = document.getElementById('shareModal');
    const modalTitle = document.getElementById('modalTitle');
    const saveTaskBtn = document.getElementById('saveTaskBtn');

    // Task-Formular-Eingaben
    const taskNameInput = document.getElementById('taskName');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const priorityDropdownContainer = document.querySelector('.priority-dropdown-container');
    const taskPriorityDisplay = document.getElementById('priorityDropdownDisplay');
    const taskPriorityMenu = document.getElementById('priorityDropdownMenu');
    const selectedPriorityText = document.getElementById('selectedPriorityText');
    const taskDueDateInput = document.getElementById('taskDueDate');
    let taskPriorityValue = 'low';

    // Dashboard-Elemente
    const totalCountElement = document.getElementById('totalCount');
    const todoCountElement = document.getElementById('todoCount');
    const inProgressCountElement = document.getElementById('inProgressCount');
    const doneCountElement = document.getElementById('doneCount');
    const highPriorityCountElement = document.getElementById('highPriorityCount');
    const overdueCountElement = document.getElementById('overdueCount');
    const completionBar = document.getElementById('completionBar');
    const completionText = document.getElementById('completionText');
    const highPriorityBar = document.getElementById('highPriorityBar');
    const mediumPriorityBar = document.getElementById('mediumPriorityBar');
    const lowPriorityBar = document.getElementById('lowPriorityBar');

    // Kanban-Spalten
    const kanbanColumns = {
        todo: document.getElementById('column-todo').querySelector('.task-list-kanban'),
        inprogress: document.getElementById('column-inprogress').querySelector('.task-list-kanban'),
        done: document.getElementById('column-done').querySelector('.task-list-kanban')
    };

    // Board-Management-Elemente
    const createBoardBtn = document.getElementById('createBoardBtn');
    const joinBoardBtn = document.getElementById('joinBoardBtn');
    const joinBoardIdInput = document.getElementById('joinBoardId');
    const shareBoardBtn = document.getElementById('shareBoardBtn');
    const closeShareModalBtn = document.getElementById('closeShareModal');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareableLinkInput = document.getElementById('shareableLink');
    const shareableBoardIdInput = document.getElementById('shareableBoardId');

    // Benutzerinfo-Anzeige
    const userIdText = document.getElementById('userIdText');
    const boardIdText = document.getElementById('boardIdText');

    // --- App-Zustand ---
    let tasks = [];
    let currentTaskToEditId = null;
    let userId = null;
    let boardId = null;
    let unsubscribe = null; // Zum Trennen des Firestore-Listeners

    // --- Benutzerdefiniertes Modal für Benachrichtigungen und Bestätigungen ---
    const customModalHtml = `
        <div id="customAlertConfirmModal" class="modal">
            <div class="modal-content">
                <span class="close-btn" id="customModalCloseBtn">&times;</span>
                <h2 id="customModalTitle"></h2>
                <p id="customModalMessage"></p>
                <div class="modal-actions" id="customModalActions">
                    <button id="customModalConfirmBtn" class="primary-btn" style="display:none;">Confirm</button>
                    <button id="customModalCancelBtn" class="secondary-btn" style="display:none;">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', customModalHtml);

    const customModal = document.getElementById('customAlertConfirmModal');
    const customModalTitle = document.getElementById('customModalTitle');
    const customModalMessage = document.getElementById('customModalMessage');
    const customModalActions = document.getElementById('customModalActions');
    const customModalConfirmBtn = document.getElementById('customModalConfirmBtn');
    const customModalCancelBtn = document.getElementById('customModalCancelBtn');
    const customModalCloseBtn = document.getElementById('customModalCloseBtn');

    function showCustomModal(message, title = "Note", type = 'alert', onConfirm = null) {
        customModalTitle.textContent = title;
        customModalMessage.textContent = message;
        customModal.style.display = 'flex';
        body.classList.add('no-scroll');

        customModalConfirmBtn.style.display = 'none';
        customModalCancelBtn.style.display = 'none';

        if (type === 'confirm') {
            customModalConfirmBtn.style.display = 'inline-block';
            customModalCancelBtn.style.display = 'inline-block';
            
            customModalConfirmBtn.onclick = () => {
                customModal.style.display = 'none';
                body.classList.remove('no-scroll');
                if (onConfirm) onConfirm(true);
            };
            customModalCancelBtn.onclick = () => {
                customModal.style.display = 'none';
                body.classList.remove('no-scroll');
                if (onConfirm) onConfirm(false);
            };
        } else { // 'alert' type
            customModalConfirmBtn.style.display = 'inline-block'; // Show 'Ok' button
            customModalConfirmBtn.textContent = 'OK';
            customModalConfirmBtn.onclick = () => {
                customModal.style.display = 'none';
                body.classList.remove('no-scroll');
            };
        }
        customModalCloseBtn.onclick = () => {
            customModal.style.display = 'none';
            body.classList.remove('no-scroll');
            if (type === 'confirm' && onConfirm) onConfirm(false); // If closed without choice for confirm
        };
    }

    // A new function to update UI based on board status
    function updateUIForBoardState(isBoardActive) {
        console.log("Updating UI for board state. Is active:", isBoardActive);
        if (isBoardActive) {
            openModalBtn.disabled = false;
            boardModal.style.display = 'none';
        } else {
            openModalBtn.disabled = true;
            boardModal.style.display = 'flex'; // This ensures the modal is shown when no board is active
        }
    }


    // --- Authentifizierung ---
    console.log("Setting up onAuthStateChanged listener.");
    onAuthStateChanged(auth, (user) => {
        console.log("onAuthStateChanged triggered. User object:", user); // Debugging
        if (user) {
            userId = user.uid;
            userIdText.textContent = userId;
            console.log("User ID set:", userId); // Debugging
            initApp();
        } else {
            console.log("No user signed in. Attempting anonymous sign-in..."); // Debugging
            signInAnonymously(auth).then(() => {
                console.log("Anonymous sign-in successful (first time). onAuthStateChanged should trigger again soon."); // Debugging
            }).catch(error => {
                console.error("Fehler bei der anonymen Anmeldung:", error);
                showCustomModal("There was an error during login. Please try again later.", "Login Error", 'alert');
            });
        }
    });

    // --- App-Initialisierung ---
    function initApp() {
        console.log("initApp called. User ID:", userId); // Debugging
        const urlParams = new URLSearchParams(window.location.search);
        const urlBoardId = urlParams.get('board');

        if (urlBoardId) {
            boardId = urlBoardId;
            boardIdText.textContent = boardId;
            console.log("Board ID from URL:", boardId); // Debugging
            updateUIForBoardState(true);
            listenForTasks();
        } else {
            boardId = null; // Ensure boardId is null if not in URL
            boardIdText.textContent = 'N/A';
            console.log("No Board ID in URL. Showing board creation modal."); // Debugging
            updateUIForBoardState(false);
            // boardModal.style.display is already handled by updateUIForBoardState(false)
        }
    }

    // --- Board-Verwaltung ---
    createBoardBtn.addEventListener('click', async () => {
        console.log("Create New Board button clicked.");
        if (!userId) {
            showCustomModal("User is not logged in. Please wait until the login process is complete.", "Registration pending", 'alert');
            console.warn("Attempted to create board before user was authenticated.");
            return;
        }
        try {
            console.log("Attempting to create new board document in Firestore...");
            const newBoardRef = doc(collection(db, 'boards'));
            boardId = newBoardRef.id;
            await updateDoc(newBoardRef, { 
                createdAt: serverTimestamp(), 
                owner: userId 
            }, { merge: true }); // Use updateDoc for setting fields after doc()
            console.log("Board created with ID:", boardId);

            window.history.pushState({}, '', `?board=${boardId}`);
            boardIdText.textContent = boardId;
            boardModal.style.display = 'none';
            updateUIForBoardState(true);
            listenForTasks();
            showCustomModal(`New board created! ID: ${boardId}`, "Board created", 'alert');
        } catch (error) {
            console.error("Error creating board:", error);
            showCustomModal("Board could not be created. Please try again.", "Error", 'alert');
        }
    });

    joinBoardBtn.addEventListener('click', async () => {
        console.log("Join Board button clicked.");
        if (!userId) {
            showCustomModal("User is not logged in. Please wait until the login process is complete.", "Registration pending", 'alert');
            console.warn("Attempted to join board before user was authenticated.");
            return;
        }
        const inputBoardId = joinBoardIdInput.value.trim();
        if (!inputBoardId) {
            showCustomModal("Please enter a board ID.", "Input required", 'alert');
            return;
        }

        try {
            console.log("Attempting to check if board exists:", inputBoardId);
            const boardDoc = await getDoc(doc(db, 'boards', inputBoardId));
            if (boardDoc.exists()) {
                boardId = inputBoardId;
                window.history.pushState({}, '', `?board=${boardId}`);
                boardIdText.textContent = boardId;
                boardModal.style.display = 'none';
                updateUIForBoardState(true);
                listenForTasks();
                showCustomModal(`Board ${boardId} successfully joined!`, "Joined the board", 'alert');
            } else {
                console.warn("Board does not exist:", inputBoardId);
                showCustomModal("Board not found. Please check the ID.", "Board not found", 'alert');
            }
        } catch (error) {
            console.error("Error joining the board:", error);
            showCustomModal("Unable to join board. Please try again.", "Error", 'alert');
        }
    });

    // --- Echtzeit-Datensynchronisation mit Firestore ---
    function listenForTasks() {
        console.log("Setting up Firestore listener for board:", boardId);
        if (unsubscribe) {
            console.log("Unsubscribing from previous listener.");
            unsubscribe(); // Alten Listener trennen, falls Boards gewechselt werden
        }
        if (!boardId) {
            console.warn("listenForTasks called without a boardId. Skipping listener setup.");
            return;
        }

        const tasksCollectionRef = collection(db, 'boards', boardId, 'tasks');

        unsubscribe = onSnapshot(tasksCollectionRef, (snapshot) => {
            console.log("Firestore snapshot received. Number of tasks:", snapshot.docs.length);
            tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTasks();
        }, (error) => {
            console.error("Error while listening to tasks:", error);
            showCustomModal("Error loading tasks. Please try again.", "Data Error", 'alert');
        });
    }

    // --- UI-Funktionen (Sidebar, Ansichten, Modale) ---
    function toggleSidebar(forceClose = false) {
        if (forceClose || sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            body.classList.remove('no-scroll');
        } else {
            sidebar.classList.add('open');
            overlay.classList.add('active');
            body.classList.add('no-scroll');
        }
    }

    menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSidebar();
    });

    overlay.addEventListener('click', () => toggleSidebar(true));

    function switchView(viewId, title) {
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(viewId).classList.add('active');

        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(viewId + 'Btn').classList.add('active');

        pageTitle.textContent = title;
        toggleSidebar(true);
    }

    dashboardViewBtn.addEventListener('click', () => switchView('dashboardView', 'Dashboard overview'));
    kanbanViewBtn.addEventListener('click', () => switchView('kanbanView', 'Kanban Board'));

    // --- Task-Modal ---
    function clearModalInputs() {
        taskNameInput.value = '';
        taskDescriptionInput.value = '';
        taskPriorityValue = 'low';
        selectedPriorityText.textContent = 'Low';
        taskPriorityMenu.style.display = 'none';
        taskDueDateInput.value = '';
    }

    function openTaskModal() {
        if (!boardId) {
            showCustomModal("Please create a board or join one first!", "Board required", 'alert');
            return;
        }
        modalTitle.textContent = 'Create new task';
        saveTaskBtn.textContent = 'Save task';
        currentTaskToEditId = null;
        clearModalInputs();
        taskModal.style.display = 'flex';
        body.classList.add('no-scroll');
        console.log("Task modal opened.");
    }

    function closeTaskModal() {
        taskModal.style.display = 'none';
        clearModalInputs();
        body.classList.remove('no-scroll');
        console.log("Task modal closed.");
    }

    openModalBtn.addEventListener('click', openTaskModal);
    taskModal.querySelector('.close-btn').addEventListener('click', closeTaskModal);

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) closeTaskModal();
        if (event.target === shareModal) closeShareModal();
        if (event.target === customModal) { // Allow closing custom modal by clicking outside
            customModal.style.display = 'none';
            body.classList.remove('no-scroll');
        }
        if (!priorityDropdownContainer.contains(event.target)) {
            taskPriorityMenu.style.display = 'none';
        }
    });

    taskPriorityDisplay.addEventListener('click', (event) => {
        event.stopPropagation();
        taskPriorityMenu.style.display = taskPriorityMenu.style.display === 'block' ? 'none' : 'block';
    });

    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            taskPriorityValue = option.dataset.value;
            selectedPriorityText.textContent = option.textContent;
            taskPriorityMenu.style.display = 'none';
        });
    });

    // --- CRUD-Operationen ---
    saveTaskBtn.addEventListener('click', async () => {
        const name = taskNameInput.value.trim();
        if (name === '') {
            showCustomModal('Task name cannot be empty!', "Error", 'alert');
            return;
        }

        const taskData = {
            name: name,
            description: taskDescriptionInput.value.trim(),
            priority: taskPriorityValue,
            dueDate: taskDueDateInput.value,
            updatedAt: serverTimestamp()
        };

        try {
            if (currentTaskToEditId) {
                // Bestehende Aufgabe aktualisieren
                console.log("Updating task:", currentTaskToEditId, taskData);
                await updateDoc(doc(db, 'boards', boardId, 'tasks', currentTaskToEditId), taskData);
            } else {
                // Neue Aufgabe erstellen
                taskData.status = 'todo';
                taskData.createdAt = serverTimestamp();
                taskData.owner = userId;
                console.log("Adding new task:", taskData);
                await addDoc(collection(db, 'boards', boardId, 'tasks'), taskData);
            }
            closeTaskModal();
            showCustomModal("Task successfully saved!", "Success", 'alert');
        } catch (error) {
            console.error("Error saving task: ", error);
            showCustomModal("Task could not be saved. Please try again.", "Error", 'alert');
        }
    });

    function openEditModal(event) {
        const taskId = event.target.closest('.card-action-btn').dataset.id;
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            currentTaskToEditId = taskId;
            modalTitle.textContent = 'Edit task';
            saveTaskBtn.textContent = 'Save changes';

            taskNameInput.value = task.name;
            taskDescriptionInput.value = task.description;
            taskPriorityValue = task.priority;
            selectedPriorityText.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            taskDueDateInput.value = task.dueDate || '';

            taskModal.style.display = 'flex';
            body.classList.add('no-scroll');
            console.log("Edit task modal opened for task ID:", taskId);
        }
    }

    async function deleteTask(event) {
        const taskId = event.target.closest('.card-action-btn').dataset.id;
        console.log("Delete task button clicked for ID:", taskId);
        showCustomModal('Are you sure you want to delete this task?', "Delete task", 'confirm', async (confirmed) => {
            if (confirmed) {
                try {
                    console.log("Confirmed delete for task ID:", taskId);
                    await deleteDoc(doc(db, 'boards', boardId, 'tasks', taskId));
                    showCustomModal("Task successfully deleted!", "Success", 'alert');
                } catch (error) {
                    console.error("Error deleting the task: ", error);
                    showCustomModal("Task could not be deleted. Please try again.", "Error", 'alert');
                }
            } else {
                console.log("Delete cancelled for task ID:", taskId);
            }
        });
    }

    // --- Rendering ---
    function renderTasks() {
        console.log("Rendering tasks. Total tasks:", tasks.length);
        // Spalten vor dem Neuzeichnen leeren
        Object.values(kanbanColumns).forEach(col => col.innerHTML = '');

        tasks.forEach(task => {
            const kanbanCard = document.createElement('div');
            kanbanCard.className = `kanban-card priority-${task.priority}`;
            kanbanCard.setAttribute('draggable', true);
            kanbanCard.setAttribute('data-id', task.id);
            kanbanCard.innerHTML = `
                <h4>${task.name}</h4>
                <p>${task.description ? task.description.substring(0, 100) : ''}${task.description && task.description.length > 100 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" data-id="${task.id}">
                        <img src="https://img.icons8.com/material-outlined/24/000000/edit--v1.png" alt="Bearbeiten">
                    </button>
                    <button class="card-action-btn delete-btn" data-id="${task.id}">
                        <img src="https://img.icons8.com/material-outlined/24/000000/trash--v1.png" alt="Löschen">
                    </button>
                </div>
            `;

            kanbanCard.addEventListener('dragstart', dragStart);
            kanbanCard.addEventListener('dragend', dragEnd);

            if (kanbanColumns[task.status]) {
                kanbanColumns[task.status].appendChild(kanbanCard);
            }
        });

        // Event-Listener zu neuen Schaltflächen hinzufügen
        document.querySelectorAll('.edit-btn').forEach(button => button.addEventListener('click', openEditModal));
        document.querySelectorAll('.delete-btn').forEach(button => button.addEventListener('click', deleteTask));

        renderDashboardSummary();
    }

    function renderDashboardSummary() {
        const today = new Date().toISOString().split('T')[0];
        const totalCount = tasks.length;
        const todoCount = tasks.filter(task => task.status === 'todo').length;
        const inProgressCount = tasks.filter(task => task.status === 'inprogress').length;
        const doneCount = tasks.filter(task => task.status === 'done').length;
        const highPriorityCount = tasks.filter(task => task.priority === 'high').length;
        const overdueCount = tasks.filter(task => task.status !== 'done' && task.dueDate && task.dueDate < today).length;

        totalCountElement.textContent = totalCount;
        todoCountElement.textContent = todoCount;
        inProgressCountElement.textContent = inProgressCount;
        doneCountElement.textContent = doneCount;
        highPriorityCountElement.textContent = highPriorityCount;
        overdueCountElement.textContent = overdueCount;

        const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        completionBar.style.width = `${completionRate}%`;
        completionText.textContent = `${completionRate}% Completed`;

        const highPriorityPercentage = totalCount > 0 ? (highPriorityCount / totalCount) * 100 : 0;
        const mediumPriorityPercentage = totalCount > 0 ? (tasks.filter(task => task.priority === 'medium').length / totalCount) * 100 : 0;
        const lowPriorityPercentage = totalCount > 0 ? (tasks.filter(task => task.priority === 'low').length / totalCount) * 100 : 0;

        highPriorityBar.style.width = `${highPriorityPercentage}%`;
        mediumPriorityBar.style.width = `${mediumPriorityPercentage}%`;
        lowPriorityBar.style.width = `${lowPriorityPercentage}%`;
    }

    // --- Drag & Drop ---
    let draggedTaskKanban = null;

    function dragStart(event) {
        draggedTaskKanban = event.target;
        setTimeout(() => draggedTaskKanban.classList.add('dragging'), 0);
        event.dataTransfer.setData('text/plain', draggedTaskKanban.dataset.id);
        console.log("Drag started for task ID:", draggedTaskKanban.dataset.id);
    }

    function dragEnd() {
        if (draggedTaskKanban) {
            draggedTaskKanban.classList.remove('dragging');
        }
        draggedTaskKanban = null;
        console.log("Drag ended.");
    }

    window.dragOver = function (event) {
        event.preventDefault();
    };

    window.drop = async function (event, newStatus) {
        event.preventDefault();
        const taskId = event.dataTransfer.getData('text/plain');
        console.log(`Drop event: Task ID ${taskId} to new status ${newStatus}`);
        const taskRef = doc(db, 'boards', boardId, 'tasks', taskId);

        const updateData = { status: newStatus };

        if (newStatus === 'done') {
            updateData.completionDate = new Date().toISOString().split('T')[0];
            console.log("Setting completionDate for 'done' status.");
        } else {
            // Vervollständigungsdatum explizit nullsetzen, falls nicht 'done'
            updateData.completionDate = deleteField();
            console.log("Removing completionDate as status is not 'done'.");
        }

        try {
            await updateDoc(taskRef, updateData);
            console.log("Task status updated successfully in Firestore.");
        } catch (error) {
            console.error("Error updating task status:", error);
            showCustomModal("Task could not be postponed. Please try again.", "Error", 'alert');
        }
    };

    // --- Share-Funktionalität ---
    function openShareModal() {
        console.log("Share button clicked. Current board ID:", boardId);
        if (!boardId) {
            showCustomModal("Create a board or join one to share it.", "Board not active", 'alert');
            return;
        }
        const link = `${window.location.origin}${window.location.pathname}?board=${boardId}`;
        shareableLinkInput.value = link;
        shareableBoardIdInput.value = boardId;
        shareModal.style.display = 'flex';
        console.log("Share modal opened. Link:", link);
    }

    function closeShareModal() {
        shareModal.style.display = 'none';
        console.log("Share modal closed.");
    }

    shareBoardBtn.addEventListener('click', openShareModal);
    closeShareModalBtn.addEventListener('click', closeShareModal);

    copyLinkBtn.addEventListener('click', () => {
        shareableLinkInput.select();
        document.execCommand('copy');
        copyLinkBtn.textContent = 'Kopiert!';
        console.log("Share link copied to clipboard.");
        setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
    });

});
