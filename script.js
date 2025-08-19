import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
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
    deleteField,
    query,
    where,
    getDocs,
    setDoc
} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded. Initializing app...");

    // --- Firebase Configuration ---
    let firebaseConfig = {};
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        // Use environment variable for Firebase config if available (for Canvas)
        try {
            firebaseConfig = JSON.parse(__firebase_config);
            console.log("Using Firebase config from environment variables.");
        } catch (e) {
            console.error("Error parsing __firebase_config:", e);
            // Fallback to default if parsing fails
            firebaseConfig = {
                apiKey: "AIzaSyDNY51Jui8EOiCGQMdpLsn2kW4yTPYkk2w",
                authDomain: "taskflow-841c1.firebaseapp.com",
                projectId: "taskflow-841c1",
                storageBucket: "taskflow-841c1.firebasestorage.app",
                messagingSenderId: "109204779254",
                appId: "1:109204779254:web:ed340a07677a37fa827cd7"
            };
            showCustomModal("Failed to load Firebase configuration. Please check the environment setup.", "Configuration Error", 'alert');
        }
    } else {
        // Fallback to default if environment variable is not defined (for local development)
        firebaseConfig = {
            apiKey: "AIzaSyDNY51Jui8EOiCGQMdpLsn2kW4yTPYkk2w",
            authDomain: "taskflow-841c1.firebaseapp.com",
            projectId: "taskflow-841c1",
            storageBucket: "taskflow-841c1.firebasestorage.app",
            messagingSenderId: "109204779254",
            appId: "1:109204779254:web:ed340a07677a37fa827cd7"
        };
        console.warn("Firebase config not found in environment variables. Using default placeholders.");
    }


    // --- Initialize Firebase ---
    console.log("Initializing Firebase app with projectId:", firebaseConfig.projectId);
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);
    console.log("Firebase initialized. DB and Auth instances created.");

    // --- DOM Elements ---
    const body = document.body;
    const dashboardViewBtn = document.getElementById('dashboardViewBtn');
    const kanbanViewBtn = document.getElementById('kanbanViewBtn');
    const pageTitle = document.getElementById('pageTitle');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    // Modals
    const openModalBtn = document.getElementById('openModalBtn');
    openModalBtn.disabled = true; // Button initially disabled
    const taskModal = document.getElementById('taskModal');
    const boardModal = document.getElementById('boardModal');
    const shareModal = document.getElementById('shareModal');
    const modalTitle = document.getElementById('modalTitle');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    const taskLockedMessage = document.getElementById('taskLockedMessage'); // New element for locked message

    // Task Form Inputs
    const taskNameInput = document.getElementById('taskName');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const priorityDropdownContainer = document.querySelector('.priority-dropdown-container');
    const taskPriorityDisplay = document.getElementById('priorityDropdownDisplay');
    const taskPriorityMenu = document.getElementById('priorityDropdownMenu');
    const selectedPriorityText = document.getElementById('selectedPriorityText');
    const taskDueDateInput = document.getElementById('taskDueDate');
    let taskPriorityValue = 'low';

    // Dashboard Elements
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

    // Kanban Columns
    const kanbanColumns = {
        todo: document.getElementById('column-todo').querySelector('.task-list-kanban'),
        inprogress: document.getElementById('column-inprogress').querySelector('.task-list-kanban'),
        done: document.getElementById('column-done').querySelector('.task-list-kanban')
    };

    // Board Management Elements
    const createSoloBoardBtn = document.getElementById('createSoloBoardBtn'); // New button
    const createCollaborativeBoardBtn = document.getElementById('createCollaborativeBoardBtn'); // New button
    const joinBoardBtn = document.getElementById('joinBoardBtn');
    const joinBoardIdInput = document.getElementById('joinBoardId');
    const shareBoardBtn = document.getElementById('shareBoardBtn');
    const closeShareModalBtn = document.getElementById('closeShareModal');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareableLinkInput = document.getElementById('shareableLink');
    const shareableBoardIdInput = document.getElementById('shareableBoardId');
    const openBoardSelectionBtn = document.getElementById('openBoardSelectionBtn');

    // User Info Display
    const userIdText = document.getElementById('userIdText');
    const boardIdText = document.getElementById('boardIdText');
    const activeUsersLabel = document.getElementById('activeUsersLabel'); // New
    const activeUsersCountElement = document.getElementById('activeUsersCount'); // New

    // --- App State ---
    let tasks = [];
    let currentTaskToEditId = null;
    let userId = null;
    let boardId = null;
    let unsubscribeTasks = null; // For Firestore tasks listener
    let unsubscribePresence = null; // For Firestore presence listener
    let isOwnerBoard = false;
    let currentBoardCollaborative = false; // New flag: is the current board collaborative?
    let activeUsers = []; // Array of active user IDs
    let heartbeatInterval = null; // Interval for presence updates

    // --- Custom Modal for Notifications and Confirmations ---
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
            customModalConfirmBtn.textContent = 'Confirm'; // Reset text for confirm

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

    // Function to update UI based on board activity and type
    function updateUIForBoardState(isBoardActive, isBoardCollaborative = false) {
        console.log("Updating UI for board state. Is active:", isBoardActive, "Is collaborative:", isBoardCollaborative);
        if (isBoardActive) {
            openModalBtn.disabled = false;
            boardModal.style.display = 'none';
            // Show/hide share button based on board type
            shareBoardBtn.style.display = isBoardCollaborative ? 'inline-block' : 'none';
            activeUsersLabel.style.display = isBoardCollaborative ? 'block' : 'none';
            activeUsersCountElement.style.display = isBoardCollaborative ? 'block' : 'none';

        } else {
            openModalBtn.disabled = true;
            boardModal.style.display = 'flex'; // This ensures the modal is shown when no board is active
            shareBoardBtn.style.display = 'none';
            activeUsersLabel.style.display = 'none';
            activeUsersCountElement.style.display = 'none';
        }
    }


    // --- Authentication ---
    console.log("Setting up onAuthStateChanged listener.");
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User object:", user);
        if (user) {
            userId = user.uid;
            userIdText.textContent = userId;
            console.log("User ID set:", userId);
            initApp();
        } else {
            console.log("No user signed in. Attempting custom token sign-in or anonymous.");
            try {
                // Use __initial_auth_token if available (Canvas environment)
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Signed in with custom token.");
                } else {
                    // Fallback to anonymous sign-in if no custom token (local development)
                    await signInAnonymously(auth);
                    console.log("Signed in anonymously.");
                }
            } catch (error) {
                console.error("Error during authentication:", error);
                showCustomModal("There was an error during login. Please try again later.", "Login Error", 'alert');
            }
        }
    });

    // --- App Initialization ---
    async function initApp() {
        console.log("initApp called. User ID:", userId);
        const urlParams = new URLSearchParams(window.location.search);
        const urlBoardId = urlParams.get('board');
        const storedOwnedBoardId = localStorage.getItem('myOwnedBoardId'); // Last owned board

        let targetBoardId = null;
        let isFromURL = false;

        if (urlBoardId) {
            targetBoardId = urlBoardId;
            isFromURL = true;
            console.log("Board ID from URL:", targetBoardId);
        } else if (storedOwnedBoardId) {
            targetBoardId = storedOwnedBoardId;
            console.log("Board ID from LocalStorage (owned):", targetBoardId);
        }

        if (targetBoardId) {
            try {
                const boardDocRef = doc(db, 'boards', targetBoardId);
                const boardDoc = await getDoc(boardDocRef);

                if (boardDoc.exists()) {
                    const boardData = boardDoc.data();
                    // Check if user is owner or if it's a shared board via URL
                    if (boardData.owner === userId || (isFromURL && boardData.isCollaborative)) {
                        boardId = targetBoardId;
                        boardIdText.textContent = boardId;
                        isOwnerBoard = (boardData.owner === userId);
                        currentBoardCollaborative = boardData.isCollaborative || false; // Default to false if not set
                        updateUIForBoardState(true, currentBoardCollaborative);
                        listenForTasks();
                        console.log("Successfully loaded board:", boardId, "Is owner:", isOwnerBoard, "Is collaborative:", currentBoardCollaborative);

                        if (isOwnerBoard && !isFromURL) {
                            localStorage.setItem('myOwnedBoardId', boardId); // Persist owned board
                        } else if (!isOwnerBoard && isFromURL) {
                            // If joining a shared board, don't save it as owned in localStorage
                            localStorage.removeItem('myOwnedBoardId');
                        }
                        // Start presence tracking if collaborative
                        if (currentBoardCollaborative) {
                            setupUserPresence();
                        } else {
                            // If solo board, clear any old presence info
                            removeUserPresence();
                            activeUsersCountElement.textContent = '0'; // No active users on solo board
                        }

                    } else if (boardData.owner !== userId && !isFromURL) {
                        // Board exists but not owned by user and not shared via URL, don't allow access directly
                        console.warn("Board exists but not owned by user and not from URL. Showing board creation modal.");
                        localStorage.removeItem('myOwnedBoardId');
                        window.history.pushState({}, '', window.location.pathname);
                        updateUIForBoardState(false);
                    } else if (boardData.owner !== userId && isFromURL && !boardData.isCollaborative) {
                        // Trying to join a solo board via URL that isn't owned by current user
                        console.warn("Attempted to join a solo board not owned by user via URL. Access denied.");
                        showCustomModal("This is a solo board and cannot be shared. Please create your own or join a collaborative board.", "Access Denied", 'alert');
                        localStorage.removeItem('myOwnedBoardId');
                        window.history.pushState({}, '', window.location.pathname);
                        updateUIForBoardState(false);
                    }
                } else {
                    // Board from URL/LocalStorage does not exist (e.g., deleted)
                    console.warn("Board from URL/LocalStorage does not exist. Showing board creation modal.");
                    localStorage.removeItem('myOwnedBoardId');
                    window.history.pushState({}, '', window.location.pathname);
                    updateUIForBoardState(false);
                }
            } catch (error) {
                console.error("Error checking board existence:", error);
                showCustomModal("Error loading board. Please check your connection.", "Error", 'alert');
                localStorage.removeItem('myOwnedBoardId');
                window.history.pushState({}, '', window.location.pathname);
                updateUIForBoardState(false);
            }
        } else {
            console.log("No Board ID in URL or LocalStorage. Showing board creation modal.");
            updateUIForBoardState(false);
        }
    }

    // --- Board Management ---
    async function createNewBoard(isCollaborative) {
        console.log(`Create ${isCollaborative ? 'Collaborative' : 'Solo'} Board button clicked.`);
        if (!userId) {
            showCustomModal("User is not logged in. Please wait until the login process is complete.", "Registration pending", 'alert');
            console.warn("Attempted to create board before user was authenticated.");
            return;
        }
        try {
            // Check if the user already has an owned board and wants to switch its type
            const myBoardsQuery = query(collection(db, 'boards'), where('owner', '==', userId));
            const myBoardsSnapshot = await getDocs(myBoardsQuery);

            if (!myBoardsSnapshot.empty) {
                const existingBoardDoc = myBoardsSnapshot.docs[0];
                const existingBoardData = existingBoardDoc.data();
                if (existingBoardData.isCollaborative === isCollaborative) {
                    // Board type already matches, just load it
                    boardId = existingBoardDoc.id;
                    showCustomModal(`You are already on a ${isCollaborative ? 'collaborative' : 'solo'} board.`, "Board already available", 'alert');
                } else {
                    // Type mismatch, update existing board type
                    showCustomModal(`You have an existing board. Do you want to convert it to a ${isCollaborative ? 'collaborative' : 'solo'} board?`, "Convert Board", 'confirm', async (confirmed) => {
                        if (confirmed) {
                            boardId = existingBoardDoc.id;
                            await updateDoc(doc(db, 'boards', boardId), { isCollaborative: isCollaborative });
                            showCustomModal("Board type updated!", "Success", 'alert');
                            // Continue with loading the board
                            localStorage.setItem('myOwnedBoardId', boardId);
                            isOwnerBoard = true;
                            currentBoardCollaborative = isCollaborative;
                            window.history.pushState({}, '', `?board=${boardId}`);
                            boardIdText.textContent = boardId;
                            boardModal.style.display = 'none';
                            updateUIForBoardState(true, currentBoardCollaborative);
                            listenForTasks();
                            if (currentBoardCollaborative) {
                                setupUserPresence();
                            } else {
                                removeUserPresence();
                                activeUsersCountElement.textContent = '0';
                            }
                            // --- NEW: Close sidebar on board type switch ---
                            toggleSidebar(true);
                        } else {
                            console.log("Board type conversion cancelled.");
                            return; // Stop function if cancelled
                        }
                    });
                    return; // Exit after handling the conversion prompt
                }
            } else {
                // No existing board, create a new one
                const newBoardRef = doc(collection(db, 'boards'));
                boardId = newBoardRef.id;
                await setDoc(newBoardRef, {
                    createdAt: serverTimestamp(),
                    owner: userId,
                    isCollaborative: isCollaborative // Set board type
                });
                showCustomModal(`New ${isCollaborative ? 'collaborative' : 'solo'} board created! ID: ${boardId}`, "Board created", 'alert');
            }

            localStorage.setItem('myOwnedBoardId', boardId);
            isOwnerBoard = true;
            currentBoardCollaborative = isCollaborative; // Set this flag

            window.history.pushState({}, '', `?board=${boardId}`);
            boardIdText.textContent = boardId;
            boardModal.style.display = 'none';
            updateUIForBoardState(true, currentBoardCollaborative);
            listenForTasks();
            if (currentBoardCollaborative) {
                setupUserPresence();
            } else {
                removeUserPresence(); // Ensure presence is cleaned up if it was a collaborative board before
                activeUsersCountElement.textContent = '0';
            }
            // --- NEW: Close sidebar after creating a new board ---
            toggleSidebar(true);

        } catch (error) {
            console.error("Error creating board:", error);
            showCustomModal("Board could not be created. Please try again.", "Error", 'alert');
        }
    }

    createSoloBoardBtn.addEventListener('click', () => createNewBoard(false));
    createCollaborativeBoardBtn.addEventListener('click', () => createNewBoard(true));


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
            const boardDocRef = doc(db, 'boards', inputBoardId);
            const boardDoc = await getDoc(boardDocRef);
            if (boardDoc.exists()) {
                const boardData = boardDoc.data();
                if (!boardData.isCollaborative && boardData.owner !== userId) {
                    showCustomModal("This is a solo board and cannot be joined by others.", "Access Denied", 'alert');
                    return;
                }

                boardId = inputBoardId;
                isOwnerBoard = (boardData.owner === userId);
                currentBoardCollaborative = boardData.isCollaborative || false;

                window.history.pushState({}, '', `?board=${boardId}`);
                boardIdText.textContent = boardId;
                boardModal.style.display = 'none';
                updateUIForBoardState(true, currentBoardCollaborative);
                listenForTasks();
                showCustomModal(`Board ${boardId} successfully joined!`, "Joined the board", 'alert');

                // If joining a collaborative board, set up presence. If solo, remove presence.
                if (currentBoardCollaborative) {
                    setupUserPresence();
                } else {
                    removeUserPresence();
                    activeUsersCountElement.textContent = '0';
                }

                // If joining a board that happens to be owned by the user (e.g., via share link to their own board)
                if (isOwnerBoard) {
                    localStorage.setItem('myOwnedBoardId', boardId);
                } else {
                    localStorage.removeItem('myOwnedBoardId'); // Don't save non-owned boards as "my owned board"
                }
                // --- NEW: Close sidebar after joining a board ---
                toggleSidebar(true);

            } else {
                console.warn("Board does not exist:", inputBoardId);
                showCustomModal("Board not found. Please check the ID.", "Board not found", 'alert');
            }
        } catch (error) {
            console.error("Error joining the board:", error);
            showCustomModal("Unable to join board. Please try again.", "Error", 'alert');
        }
    });

    // --- Additional button for Board Selection Modal ---
    openBoardSelectionBtn.addEventListener('click', () => {
        console.log("Open Board Selection button clicked.");
        boardModal.style.display = 'flex';
        body.classList.add('no-scroll');
        document.getElementById('boardModalTitle').textContent = 'Manage Boards';
        joinBoardIdInput.value = '';
    });

    // --- Real-time Data Synchronization with Firestore ---
    function listenForTasks() {
        console.log("Setting up Firestore listener for board:", boardId);
        if (unsubscribeTasks) {
            console.log("Unsubscribing from previous tasks listener.");
            unsubscribeTasks(); // Disconnect old listener if boards are switched
        }
        if (!boardId) {
            console.warn("listenForTasks called without a boardId. Skipping listener setup.");
            return;
        }

        const tasksCollectionRef = collection(db, 'boards', boardId, 'tasks');

        unsubscribeTasks = onSnapshot(tasksCollectionRef, (snapshot) => {
            console.log("Firestore task snapshot received. Number of tasks:", snapshot.docs.length);
            tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTasks();
        }, (error) => {
            console.error("Error while listening to tasks:", error);
            showCustomModal("Error loading tasks. Please try again.", "Data Error", 'alert');
        });
    }

    // --- User Presence Tracking (for Collaborative Boards) ---
    async function setupUserPresence() {
        console.log("Setting up user presence for board:", boardId);
        if (unsubscribePresence) {
            unsubscribePresence(); // Clean up previous listener
        }
        if (!boardId || !userId) {
            console.warn("Cannot set up user presence without boardId or userId.");
            return;
        }

        const userPresenceDocRef = doc(db, 'boardPresence', boardId, 'users', userId);

        // Set initial presence and update periodically (heartbeat)
        const updatePresence = async () => {
            try {
                await setDoc(userPresenceDocRef, {
                    userId: userId,
                    lastActive: serverTimestamp(),
                }, { merge: true }); // Use merge to avoid overwriting existing fields
            } catch (error) {
                console.error("Error updating user presence:", error);
            }
        };

        // Update presence immediately
        updatePresence();

        // Set up heartbeat interval
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
        heartbeatInterval = setInterval(updatePresence, 10000); // Update every 10 seconds

        // Listen for all users on this board
        const presenceCollectionRef = collection(db, 'boardPresence', boardId, 'users');
        unsubscribePresence = onSnapshot(presenceCollectionRef, (snapshot) => {
            const now = Date.now();
            // Filter out users who haven't updated their presence in the last 15 seconds
            activeUsers = snapshot.docs.filter(doc => {
                const data = doc.data();
                if (data.lastActive && data.lastActive.toMillis) { // Check if it's a Firestore Timestamp
                    return (now - data.lastActive.toMillis()) < 15000; // 15 seconds grace period
                }
                return false; // Invalid timestamp, filter out
            }).map(doc => doc.data().userId);
            activeUsersCountElement.textContent = activeUsers.length;
            console.log("Active users:", activeUsers.length);
            renderTasks(); // Re-render tasks to reflect any new locks
        }, (error) => {
            console.error("Error listening to user presence:", error);
        });

        // Remove user presence when they close the tab/browser
        window.addEventListener('beforeunload', async () => {
            if (userPresenceDocRef) {
                try {
                    await deleteDoc(userPresenceDocRef);
                    console.log("User presence removed on unload.");
                } catch (e) {
                    console.warn("Failed to remove user presence on unload:", e);
                }
            }
        });
    }

    // Function to remove user presence (e.g., when switching to a solo board)
    async function removeUserPresence() {
        if (unsubscribePresence) {
            console.log("Unsubscribing from presence listener.");
            unsubscribePresence();
            unsubscribePresence = null;
        }
        if (heartbeatInterval) {
            console.log("Clearing heartbeat interval.");
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        // Only attempt to delete if boardId and userId are set (i.e., we were actively tracking presence)
        if (boardId && userId) {
            try {
                const userPresenceDocRef = doc(db, 'boardPresence', boardId, 'users', userId);
                await deleteDoc(userPresenceDocRef);
                console.log("Current user presence removed from Firestore.");
            } catch (error) {
                console.warn("Error removing user presence:", error);
            }
        }
    }


    // --- UI Functions (Sidebar, Views, Modals) ---
    function toggleSidebar(forceClose = false) {
        // Check if the screen width is considered "small" (e.g., less than 1024px for mobile/tablet)
        const isSmallScreen = window.innerWidth <= 1024;

        if (isSmallScreen) {
            if (forceClose || sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                body.classList.remove('no-scroll');
            } else {
                sidebar.classList.add('open');
                overlay.classList.add('active');
                body.classList.add('no-scroll');
            }
        } else {
            // For larger screens, sidebar should remain open and not be affected by toggleSidebar(true)
            // unless explicitly toggled (which doesn't happen with the current calls for board switch)
            // However, ensuring overlay and no-scroll are managed in case they were set by small screen interaction
            if (forceClose) { // If forceClose is true, it means we want to ensure it's closed (even if large screen logic usually keeps it open)
                sidebar.classList.remove('open'); // Ensure it's closed
                overlay.classList.remove('active');
                body.classList.remove('no-scroll');
            }
            // If it's a large screen and not forced close, leave it as is (likely open)
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
        toggleSidebar(true); // Close sidebar after switching views
    }

    dashboardViewBtn.addEventListener('click', () => switchView('dashboardView', 'Dashboard overview'));
    kanbanViewBtn.addEventListener('click', () => switchView('kanbanView', 'Kanban Board'));

    // --- Task Modal ---
    function clearModalInputs() {
        taskNameInput.value = '';
        taskDescriptionInput.value = '';
        taskPriorityValue = 'low';
        selectedPriorityText.textContent = 'Low';
        taskPriorityMenu.style.display = 'none';
        taskDueDateInput.value = '';
        taskLockedMessage.style.display = 'none'; // Hide lock message
        // Re-enable inputs
        taskNameInput.disabled = false;
        taskDescriptionInput.disabled = false;
        taskPriorityDisplay.style.pointerEvents = 'auto';
        taskDueDateInput.disabled = false;
        saveTaskBtn.disabled = false;
    }

    function openTaskModal() {
        if (!boardId) {
            showCustomModal("Please create a board or join one first!", "Board required", 'alert');
            return;
        }
        modalTitle.textContent = 'Create new task';
        saveTaskBtn.textContent = 'Save task';
        currentTaskToEditId = null; // Clear task for editing
        clearModalInputs();
        taskModal.style.display = 'flex';
        body.classList.add('no-scroll');
        console.log("Task modal opened for creation.");
    }

    async function closeTaskModal() {
        // If a task was being edited, unlock it
        if (currentTaskToEditId && currentBoardCollaborative) {
            try {
                // Check if the task is still locked by the current user before unlocking
                const taskRef = doc(db, 'boards', boardId, 'tasks', currentTaskToEditId);
                const taskDoc = await getDoc(taskRef);
                if (taskDoc.exists() && taskDoc.data().lockedBy === userId) {
                    await updateDoc(taskRef, { lockedBy: deleteField() });
                    console.log("Task unlocked:", currentTaskToEditId);
                } else {
                    console.log("Task was already unlocked or locked by another user. No action taken.");
                }
            } catch (error) {
                console.error("Error unlocking task:", error);
            }
        }
        currentTaskToEditId = null;
        taskModal.style.display = 'none';
        clearModalInputs();
        body.classList.remove('no-scroll');
        console.log("Task modal closed.");
    }

    openModalBtn.addEventListener('click', openTaskModal);
    taskModal.querySelector('.close-btn').addEventListener('click', closeTaskModal);

    window.addEventListener('click', async (event) => {
        if (event.target === taskModal) {
            await closeTaskModal(); // Ensure task is unlocked if modal is closed by clicking outside
        }
        if (event.target === shareModal) closeShareModal();
        if (event.target === customModal) {
            customModal.style.display = 'none';
            body.classList.remove('no-scroll');
        }
        if (!priorityDropdownContainer.contains(event.target)) {
            taskPriorityMenu.style.display = 'none';
        }
    });

    taskPriorityDisplay.addEventListener('click', (event) => {
        event.stopPropagation();
        // Only allow dropdown if inputs are not disabled (i.e., task is not locked by others)
        if (!taskNameInput.disabled) {
            taskPriorityMenu.style.display = taskPriorityMenu.style.display === 'block' ? 'none' : 'block';
        }
    });

    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            taskPriorityValue = option.dataset.value;
            selectedPriorityText.textContent = option.textContent;
            taskPriorityMenu.style.display = 'none';
        });
    });

    // --- CRUD Operations ---
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
                // Update existing task
                console.log("Updating task:", currentTaskToEditId, taskData);
                await updateDoc(doc(db, 'boards', boardId, 'tasks', currentTaskToEditId), taskData);
            } else {
                // Create new task
                taskData.status = 'todo';
                taskData.createdAt = serverTimestamp();
                taskData.owner = userId; // Owner is the creator of the task
                console.log("Adding new task:", taskData);
                await addDoc(collection(db, 'boards', boardId, 'tasks'), taskData);
            }
            await closeTaskModal(); // Ensure task is unlocked after saving
            showCustomModal("Task successfully saved!", "Success", 'alert');
        } catch (error) {
            console.error("Error saving task: ", error);
            showCustomModal("Task could not be saved. Please try again.", "Error", 'alert');
        }
    });

    async function openEditModal(event) {
        const taskId = event.target.closest('.card-action-btn').dataset.id;
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            clearModalInputs(); // Clear first to reset UI state

            // Check if board is collaborative and if task is locked by someone else
            if (currentBoardCollaborative && task.lockedBy && task.lockedBy !== userId) {
                taskLockedMessage.textContent = `This task is currently being edited by another user (ID: ${task.lockedBy}).`;
                taskLockedMessage.style.display = 'block';
                // Disable all inputs and save button
                taskNameInput.disabled = true;
                taskDescriptionInput.disabled = true;
                taskPriorityDisplay.style.pointerEvents = 'none'; // Disable dropdown click
                taskDueDateInput.disabled = true;
                saveTaskBtn.disabled = true;
                modalTitle.textContent = 'View Task'; // Change title to indicate read-only view
                saveTaskBtn.textContent = 'Locked'; // Change button text
            } else {
                // If not locked by others, or if solo board, proceed with editing/locking
                currentTaskToEditId = taskId;
                modalTitle.textContent = 'Edit Task';
                saveTaskBtn.textContent = 'Save Changes';
                taskLockedMessage.style.display = 'none'; // Ensure hidden

                // Lock the task for current user if collaborative
                if (currentBoardCollaborative) {
                    try {
                        // Check if the task is already locked by *this* user (e.g., refreshing page)
                        // Or if it's explicitly not locked by anyone
                        if (!task.lockedBy || task.lockedBy === userId) {
                            await updateDoc(doc(db, 'boards', boardId, 'tasks', taskId), { lockedBy: userId });
                            console.log("Task locked by current user:", taskId);
                        } else {
                            // This case shouldn't be reached if the initial check worked, but as a safeguard:
                            showCustomModal("This task is currently being edited by another user and cannot be edited by you.", "Task Locked", 'alert');
                            return;
                        }
                    } catch (error) {
                        console.error("Error locking task:", error);
                        showCustomModal("Could not lock task for editing. Please try again.", "Error", 'alert');
                        return; // Prevent opening modal if lock fails
                    }
                }
            }

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
        const task = tasks.find(t => t.id === taskId);

        if (currentBoardCollaborative && task.lockedBy && task.lockedBy !== userId) {
            showCustomModal("This task is currently locked by another user and cannot be deleted.", "Task Locked", 'alert');
            return;
        }

        console.log("Delete task button clicked for ID:", taskId);
        showCustomModal('Are you sure you want to delete this task?', "Delete Task", 'confirm', async (confirmed) => {
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
        // Clear columns before re-drawing
        Object.values(kanbanColumns).forEach(col => col.innerHTML = '');

        tasks.forEach(task => {
            const kanbanCard = document.createElement('div');
            let cardClasses = `kanban-card priority-${task.priority}`;
            // Add 'locked' class if the task is locked by another user
            const isTaskLockedByOther = currentBoardCollaborative && task.lockedBy && task.lockedBy !== userId;

            if (isTaskLockedByOther) {
                cardClasses += ' locked';
            }

            kanbanCard.className = cardClasses;
            kanbanCard.setAttribute('draggable', isTaskLockedByOther ? false : true); // Make not draggable if locked by others
            kanbanCard.setAttribute('data-id', task.id);

            let lockIconHtml = '';
            if (isTaskLockedByOther) {
                lockIconHtml = `<span class="lock-icon">&#128274;</span>`; // Unicode lock icon
            }

            kanbanCard.innerHTML = `
                ${lockIconHtml}
                <h4>${task.name}</h4>
                <p>${task.description ? task.description.substring(0, 100) : ''}${task.description && task.description.length > 100 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" data-id="${task.id}" ${isTaskLockedByOther ? 'disabled' : ''}>
                        <img src="https://img.icons8.com/material-outlined/24/000000/edit--v1.png" alt="Edit">
                    </button>
                    <button class="card-action-btn delete-btn" data-id="${task.id}" ${isTaskLockedByOther ? 'disabled' : ''}>
                        <img src="https://img.icons8.com/material-outlined/24/000000/trash--v1.png" alt="Delete">
                    </button>
                </div>
            `;

            kanbanCard.addEventListener('dragstart', dragStart);
            kanbanCard.addEventListener('dragend', dragEnd);

            if (kanbanColumns[task.status]) {
                kanbanColumns[task.status].appendChild(kanbanCard);
            }
        });

        // Add event listeners to new buttons (ensure existing ones are removed by innerHTML clearing)
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
        const taskId = event.target.dataset.id;
        const task = tasks.find(t => t.id === taskId);

        // Prevent dragging if task is locked by another user on a collaborative board
        if (currentBoardCollaborative && task.lockedBy && task.lockedBy !== userId) {
            event.preventDefault();
            showCustomModal("This task is currently locked by another user and cannot be moved.", "Task Locked", 'alert');
            return;
        }

        draggedTaskKanban = event.target;
        setTimeout(() => draggedTaskKanban.classList.add('dragging'), 0);
        event.dataTransfer.setData('text/plain', taskId);
        console.log("Drag started for task ID:", taskId);
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

        const task = tasks.find(t => t.id === taskId);
        // Prevent dropping if task is locked by another user on a collaborative board
        if (currentBoardCollaborative && task.lockedBy && task.lockedBy !== userId) {
            showCustomModal("This task is currently locked by another user and cannot be moved.", "Task Locked", 'alert');
            return;
        }

        const updateData = { status: newStatus };

        if (newStatus === 'done') {
            updateData.completionDate = new Date().toISOString().split('T')[0];
            console.log("Setting completionDate for 'done' status.");
        } else {
            // Explicitly clear completion date if not 'done'
            updateData.completionDate = deleteField();
            console.log("Removing completionDate as status is not 'done'.");
        }

        try {
            await updateDoc(taskRef, updateData);
            console.log("Task status updated successfully in Firestore.");
        } catch (error) {
            console.error("Error updating task status:", error);
            showCustomModal("Task could not be moved. Please try again.", "Error", 'alert');
        }
    };

    // --- Share Functionality ---
    function openShareModal() {
        console.log("Share button clicked. Current board ID:", boardId);
        if (!boardId) {
            showCustomModal("Create a board or join one to share it.", "Board not active", 'alert');
            return;
        }
        if (!currentBoardCollaborative) {
            showCustomModal("This is a solo board and cannot be shared. Please create a collaborative board if you wish to share.", "Sharing Not Allowed", 'alert');
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
        copyLinkBtn.textContent = 'Copied!';
        console.log("Share link copied to clipboard.");
        setTimeout(() => { copyLinkBtn.textContent = 'Copy Link'; }, 2000);
    });

});
