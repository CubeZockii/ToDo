document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dashboardViewBtn = document.getElementById('dashboardViewBtn');
    const kanbanViewBtn = document.getElementById('kanbanViewBtn');
    const dashboardView = document.getElementById('dashboardView');
    const kanbanView = document.getElementById('kanbanView');
    const pageTitle = document.getElementById('pageTitle');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');

    const openModalBtn = document.getElementById('openModalBtn');
    const taskModal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.querySelector('.close-btn');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    
    const taskNameInput = document.getElementById('taskName');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const taskPriorityDisplay = document.getElementById('priorityDropdownDisplay');
    const taskPriorityMenu = document.getElementById('priorityDropdownMenu');
    const selectedPriorityText = document.getElementById('selectedPriorityText');
    const taskDueDateInput = document.getElementById('taskDueDate');
    let taskPriorityValue = 'low';

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

    const kanbanColumns = {
        todo: document.getElementById('column-todo').querySelector('.task-list-kanban'),
        inprogress: document.getElementById('column-inprogress').querySelector('.task-list-kanban'),
        done: document.getElementById('column-done').querySelector('.task-list-kanban')
    };

    const confirmModal = document.getElementById('confirmModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    let taskIdToDelete = null;

    // State
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentTaskToEditId = null;

    // --- Sidebar Toggle for Mobile ---
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // --- View Navigation Logic ---
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
        sidebar.classList.remove('open'); // Close sidebar on navigation
    }

    dashboardViewBtn.addEventListener('click', () => switchView('dashboardView', 'Dashboard Overview'));
    kanbanViewBtn.addEventListener('click', () => switchView('kanbanView', 'Kanban Board'));

    // --- Modal Logic ---
    openModalBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Create New Task';
        saveTaskBtn.textContent = 'Save Task';
        currentTaskToEditId = null;
        clearModalInputs();
        taskModal.style.display = 'flex';
    });

    closeBtn.addEventListener('click', () => {
        taskModal.style.display = 'none';
        clearModalInputs();
    });

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            taskModal.style.display = 'none';
            clearModalInputs();
        }
    });

    function clearModalInputs() {
        taskNameInput.value = '';
        taskDescriptionInput.value = '';
        taskPriorityValue = 'low';
        selectedPriorityText.textContent = 'Low';
        taskPriorityMenu.style.display = 'none';
        taskDueDateInput.value = '';
    }
    
    // Custom Dropdown Logic
    taskPriorityDisplay.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = taskPriorityMenu.style.display === 'block';
        taskPriorityMenu.style.display = isOpen ? 'none' : 'block';
    });
    
    document.querySelectorAll('.priority-option').forEach(option => {
        option.addEventListener('click', () => {
            taskPriorityValue = option.dataset.value;
            selectedPriorityText.textContent = option.textContent;
            taskPriorityMenu.style.display = 'none';
        });
    });

    saveTaskBtn.addEventListener('click', () => {
        const name = taskNameInput.value.trim();
        const description = taskDescriptionInput.value.trim();
        const priority = taskPriorityValue;
        const dueDate = taskDueDateInput.value;

        if (name === '') {
            alert('Task name cannot be empty!');
            return;
        }

        if (currentTaskToEditId !== null) {
            // Edit existing task
            const taskIndex = tasks.findIndex(task => task.id === currentTaskToEditId);
            if (taskIndex > -1) {
                tasks[taskIndex].name = name;
                tasks[taskIndex].description = description;
                tasks[taskIndex].priority = priority;
                tasks[taskIndex].dueDate = dueDate;
            }
        } else {
            // Create new task
            const newTask = {
                id: Date.now(),
                name,
                description,
                priority,
                status: 'todo',
                dueDate: dueDate,
                completionDate: null,
            };
            tasks.push(newTask);
        }

        saveTasks();
        renderTasks();
        taskModal.style.display = 'none';
        clearModalInputs();
    });

    // --- Task Management & Rendering Logic ---
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        // Clear Kanban columns before re-rendering
        kanbanColumns.todo.innerHTML = '';
        kanbanColumns.inprogress.innerHTML = '';
        kanbanColumns.done.innerHTML = '';

        tasks.forEach(task => {
            const kanbanCard = document.createElement('div');
            kanbanCard.className = `kanban-card priority-${task.priority}`;
            kanbanCard.setAttribute('draggable', true);
            kanbanCard.setAttribute('data-id', task.id);
            kanbanCard.innerHTML = `
                <h4>${task.name}</h4>
                <p>${task.description.substring(0, 100)}${task.description.length > 100 ? '...' : ''}</p>
                <div class="card-actions">
                    <button class="card-action-btn edit-btn" data-id="${task.id}">
                        <img src="edit-3.svg" alt="Edit">
                    </button>
                    <button class="card-action-btn delete-btn" data-id="${task.id}">
                        <img src="trash-2.svg" alt="Delete">
                    </button>
                </div>
            `;

            kanbanCard.addEventListener('dragstart', dragStart);
            kanbanCard.addEventListener('dragend', dragEnd);
            
            kanbanColumns[task.status].appendChild(kanbanCard);
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', openEditModal);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', deleteTask);
        });

        renderDashboardSummary();
    }

    function openEditModal(event) {
        const taskId = parseInt(event.target.closest('.card-action-btn').dataset.id);
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            modalTitle.textContent = 'Edit Task';
            saveTaskBtn.textContent = 'Save Changes';
            currentTaskToEditId = taskId;
            
            taskNameInput.value = task.name;
            taskDescriptionInput.value = task.description;
            taskPriorityValue = task.priority;
            selectedPriorityText.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            taskDueDateInput.value = task.dueDate || '';
            
            taskModal.style.display = 'flex';
        }
    }

    function deleteTask(event) {
        const taskId = parseInt(event.target.closest('.card-action-btn').dataset.id);
        if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
        }
    }

    function renderDashboardSummary() {
        const today = new Date().toISOString().split('T')[0];
        const totalCount = tasks.length;
        const todoCount = tasks.filter(task => task.status === 'todo').length;
        const inProgressCount = tasks.filter(task => task.status === 'inprogress').length;
        const doneCount = tasks.filter(task => task.status === 'done').length;
        const highPriorityCount = tasks.filter(task => task.priority === 'high').length;
        const overdueCount = tasks.filter(task => task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date(today)).length;
       

        totalCountElement.textContent = totalCount;
        todoCountElement.textContent = todoCount;
        inProgressCountElement.textContent = inProgressCount;
        doneCountElement.textContent = doneCount;
        highPriorityCountElement.textContent = highPriorityCount;
        overdueCountElement.textContent = overdueCount;

        // Fix for the completion bar
        const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        completionBar.style.width = `${completionRate}%`;
        completionText.textContent = `${completionRate}% Completed`;
        
        // Priority Chart
        const highPriorityPercentage = totalCount > 0 ? (highPriorityCount / totalCount) * 100 : 0;
        const mediumPriorityPercentage = totalCount > 0 ? (tasks.filter(task => task.priority === 'medium').length / totalCount) * 100 : 0;
        const lowPriorityPercentage = totalCount > 0 ? (tasks.filter(task => task.priority === 'low').length / totalCount) * 100 : 0;

        highPriorityBar.style.width = `${highPriorityPercentage}%`;
        mediumPriorityBar.style.width = `${mediumPriorityPercentage}%`;
        lowPriorityBar.style.width = `${lowPriorityPercentage}%`;
    }

    // --- Kanban Drag and Drop Logic ---
    let draggedTaskKanban = null;

    function dragStart(event) {
        draggedTaskKanban = event.target;
        setTimeout(() => {
            draggedTaskKanban.classList.add('dragging');
        }, 0);
        event.dataTransfer.setData('text/plain', draggedTaskKanban.dataset.id);
    }

    function dragEnd(event) {
        if (draggedTaskKanban) {
            draggedTaskKanban.classList.remove('dragging');
        }
        draggedTaskKanban = null;
    }
    
    window.dragOver = function(event) {
        event.preventDefault();
    };

    window.drop = function(event, newStatus) {
        event.preventDefault();
        const taskId = parseInt(event.dataTransfer.getData('text/plain'));
        
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        if (taskIndex > -1) {
            tasks[taskIndex].status = newStatus;
            if (newStatus === 'done') {
                tasks[taskIndex].completionDate = new Date().toISOString().split('T')[0];
            } else {
                tasks[taskIndex].completionDate = null;
            }
            saveTasks();
            renderTasks();
        }
    };
    
    // Initial render when the page loads
    renderTasks();
});
