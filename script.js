document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const dashboardViewBtn = document.getElementById('dashboardViewBtn');
    const kanbanViewBtn = document.getElementById('kanbanViewBtn');
    const dashboardView = document.getElementById('dashboardView');
    const kanbanView = document.getElementById('kanbanView');
    const pageTitle = document.getElementById('pageTitle');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    const openModalBtn = document.getElementById('openModalBtn');
    const taskModal = document.getElementById('taskModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = taskModal.querySelector('.close-btn');
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    
    const taskNameInput = document.getElementById('taskName');
    const taskDescriptionInput = document.getElementById('taskDescription');
    const priorityDropdownContainer = document.querySelector('.priority-dropdown-container');
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

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentTaskToEditId = null;

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

    dashboardViewBtn.addEventListener('click', () => switchView('dashboardView', 'Dashboard Overview'));
    kanbanViewBtn.addEventListener('click', () => switchView('kanbanView', 'Kanban Board'));

    function clearModalInputs() {
        taskNameInput.value = '';
        taskDescriptionInput.value = '';
        taskPriorityValue = 'low';
        selectedPriorityText.textContent = 'Low';
        taskPriorityMenu.style.display = 'none';
        taskDueDateInput.value = '';
    }
    
    function openModal() {
        modalTitle.textContent = 'Create New Task';
        saveTaskBtn.textContent = 'Save Task';
        currentTaskToEditId = null;
        clearModalInputs();
        taskModal.style.display = 'flex';
        body.classList.add('no-scroll');
    }

    function closeModal() {
        taskModal.style.display = 'none';
        clearModalInputs();
        body.classList.remove('no-scroll');
    }
    
    openModalBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', (event) => {
        if (event.target === taskModal) {
            closeModal();
        }
        if (!priorityDropdownContainer.contains(event.target)) {
            taskPriorityMenu.style.display = 'none';
        }
    });
    
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
            const taskIndex = tasks.findIndex(task => task.id === currentTaskToEditId);
            if (taskIndex > -1) {
                tasks[taskIndex].name = name;
                tasks[taskIndex].description = description;
                tasks[taskIndex].priority = priority;
                tasks[taskIndex].dueDate = dueDate;
            }
        } else {
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
        closeModal();
    });

    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    function renderTasks() {
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
            currentTaskToEditId = taskId;
            modalTitle.textContent = 'Edit Task';
            saveTaskBtn.textContent = 'Save Changes';
            
            taskNameInput.value = task.name;
            taskDescriptionInput.value = task.description;
            taskPriorityValue = task.priority;
            selectedPriorityText.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
            taskDueDateInput.value = task.dueDate || '';
            
            taskModal.style.display = 'flex';
            body.classList.add('no-scroll');
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

    let draggedTaskKanban = null;

    function dragStart(event) {
        draggedTaskKanban = event.target;
        setTimeout(() => {
            draggedTaskKanban.classList.add('dragging');
        }, 0);
        event.dataTransfer.setData('text/plain', draggedTaskKanban.dataset.id);
    }

    function dragEnd() {
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
    
    renderTasks();

});
