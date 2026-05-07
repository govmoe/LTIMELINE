class TimelineApp {
    constructor() {
        this.currentUser = null;
        this.currentTimeline = null;
        this.timelines = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.initMockUsers();
        this.checkAuthStatus();
    }

    initMockUsers() {
        const mockData = {
            'user1': {
                id: 'user1',
                username: 'developer',
                displayName: 'Developer',
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
                timelines: [
                    {
                        id: 'timeline1',
                        name: '项目里程碑',
                        events: [
                            { id: 'event1', date: '2024-01-15', time: '09:00', title: '项目启动', description: '正式开始新项目的开发工作', color: '#4CAF50' },
                            { id: 'event2', date: '2024-03-20', time: '14:30', title: '中期评审', description: '项目中期进度评审会议', color: '#2196F3' },
                            { id: 'event3', date: '2024-06-10', time: '10:00', title: 'Beta发布', description: '发布第一个Beta版本', color: '#FF9800' }
                        ]
                    }
                ]
            },
            'user2': {
                id: 'user2',
                username: 'designer',
                displayName: 'Designer',
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
                timelines: [
                    {
                        id: 'timeline2',
                        name: '个人计划',
                        events: [
                            { id: 'event4', date: '2024-02-01', time: '08:00', title: '学习React', description: '开始学习React框架', color: '#9C27B0' },
                            { id: 'event5', date: '2024-05-15', time: '10:00', title: '完成作品集', description: '完成个人作品集网站', color: '#00BCD4' }
                        ]
                    }
                ]
            }
        };
        
        const existingData = localStorage.getItem('timelineUsers');
        if (!existingData) {
            localStorage.setItem('timelineUsers', JSON.stringify(mockData));
        }
    }

    bindEvents() {
        document.getElementById('loginBtn').addEventListener('click', () => this.openLoginModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('newTimelineBtn').addEventListener('click', () => this.openTimelineModal());
        document.getElementById('timelineSelect').addEventListener('change', (e) => this.selectTimeline(e.target.value));
        document.getElementById('copyEmbedBtn').addEventListener('click', () => this.copyEmbedCode());
        
        document.getElementById('timelineForm').addEventListener('submit', (e) => this.handleTimelineSubmit(e));
        document.getElementById('cancelTimelineBtn').addEventListener('click', () => this.closeTimelineModal());
        
        document.getElementById('eventForm').addEventListener('submit', (e) => this.handleEventSubmit(e));
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteEvent());
        
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModals());
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    checkAuthStatus() {
        const loggedInUserId = localStorage.getItem('loggedInUserId');
        
        if (loggedInUserId) {
            const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
            this.currentUser = users[loggedInUserId];
            if (this.currentUser) {
                this.showUserSection();
                this.loadTimelines();
                return;
            }
        }
        
        this.showAuthSection();
        this.showLoginPrompt();
    }

    openLoginModal() {
        const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
        const userList = Object.values(users);
        
        const modalContent = `
            <div id="loginModal" class="modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('loginModal').style.display='none';">&times;</span>
                    <h2>选择用户登录</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.95rem;">这是演示模式，选择一个用户体验完整功能</p>
                    <div class="login-options">
                        ${userList.map(user => `
                            <div class="login-option" data-user-id="${user.id}">
                                <img src="${user.avatarUrl}" alt="${user.displayName}" class="avatar">
                                <div class="login-info">
                                    <div class="login-name">${user.displayName}</div>
                                    <div class="login-username">@${user.username}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="login-actions">
                        <button id="createUserBtn" class="create-user-btn">+ 创建新用户</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalContent);
        
        userList.forEach(user => {
            document.querySelector(`[data-user-id="${user.id}"]`).addEventListener('click', () => this.login(user.id));
        });
        
        document.getElementById('createUserBtn').addEventListener('click', () => this.createNewUser());
    }

    login(userId) {
        localStorage.setItem('loggedInUserId', userId);
        const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
        this.currentUser = users[userId];
        
        document.getElementById('loginModal').remove();
        this.showUserSection();
        this.loadTimelines();
    }

    logout() {
        localStorage.removeItem('loggedInUserId');
        this.currentUser = null;
        this.currentTimeline = null;
        this.timelines = [];
        this.showAuthSection();
        this.showLoginPrompt();
    }

    createNewUser() {
        const username = prompt('请输入用户名：');
        if (!username || username.trim() === '') return;
        
        const userId = 'user_' + Date.now();
        const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
        
        if (Object.values(users).some(u => u.username === username.trim())) {
            alert('该用户名已存在');
            return;
        }
        
        const newUser = {
            id: userId,
            username: username.trim(),
            displayName: username.trim(),
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
            timelines: []
        };
        
        users[userId] = newUser;
        localStorage.setItem('timelineUsers', JSON.stringify(users));
        
        this.login(userId);
    }

    showAuthSection() {
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('userSection').style.display = 'none';
        document.getElementById('embedSection').style.display = 'none';
    }

    showUserSection() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('userSection').style.display = 'flex';
        document.getElementById('embedSection').style.display = 'block';
        
        document.getElementById('userAvatar').src = this.currentUser.avatarUrl;
        document.getElementById('userName').textContent = this.currentUser.displayName;
    }

    showLoginPrompt() {
        const timelineContainer = document.getElementById('timeline');
        timelineContainer.innerHTML = `
            <div class="timeline-line"></div>
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 20px;">🔐</div>
                <h3>请先登录</h3>
                <p>点击右上角按钮登录后才能创建和管理时间线</p>
            </div>
        `;
    }

    loadTimelines() {
        const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
        this.currentUser = users[this.currentUser.id];
        this.timelines = this.currentUser.timelines || [];
        this.updateTimelineSelect();
        
        if (this.timelines.length > 0) {
            this.selectTimeline(this.timelines[0].id);
        } else {
            this.showEmptyTimelineState();
        }
    }

    saveUser() {
        const users = JSON.parse(localStorage.getItem('timelineUsers') || '{}');
        users[this.currentUser.id] = this.currentUser;
        localStorage.setItem('timelineUsers', JSON.stringify(users));
    }

    updateTimelineSelect() {
        const select = document.getElementById('timelineSelect');
        select.innerHTML = '<option value="">选择时间线</option>';
        
        this.timelines.forEach(timeline => {
            const option = document.createElement('option');
            option.value = timeline.id;
            option.textContent = timeline.name;
            select.appendChild(option);
        });
    }

    selectTimeline(timelineId) {
        if (!timelineId) {
            this.currentTimeline = null;
            this.showEmptyTimelineState();
            return;
        }
        
        this.currentTimeline = this.timelines.find(t => t.id === timelineId);
        document.getElementById('timelineSelect').value = timelineId;
        this.renderTimeline();
        this.updateEmbedCode();
    }

    openTimelineModal() {
        document.getElementById('timelineModalTitle').textContent = '新建时间线';
        document.getElementById('timelineName').value = '';
        document.getElementById('timelineModal').style.display = 'block';
    }

    closeTimelineModal() {
        document.getElementById('timelineModal').style.display = 'none';
    }

    handleTimelineSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('timelineName').value.trim();
        if (!name) return;
        
        const timeline = {
            id: 'timeline_' + Date.now(),
            name,
            events: []
        };
        
        this.timelines.push(timeline);
        this.currentUser.timelines = this.timelines;
        this.saveUser();
        
        this.updateTimelineSelect();
        this.selectTimeline(timeline.id);
        this.closeTimelineModal();
    }

    showEmptyTimelineState() {
        const timelineContainer = document.getElementById('timeline');
        timelineContainer.innerHTML = `
            <div class="timeline-line"></div>
            <div class="empty-state">
                <div style="font-size: 4rem; margin-bottom: 20px;">📋</div>
                <h3>${this.currentUser ? '暂无时间线' : '请先登录'}</h3>
                <p>${this.currentUser ? '点击上方「新建」按钮创建你的第一个时间线' : ''}</p>
            </div>
        `;
    }

    renderTimeline() {
        if (!this.currentTimeline) {
            this.showEmptyTimelineState();
            return;
        }
        
        const timelineContainer = document.getElementById('timeline');
        timelineContainer.innerHTML = `
            <div class="timeline-line"></div>
            <div class="timeline-header">
                <h2>${this.currentTimeline.name}</h2>
                <button id="addEventBtn" class="add-btn">添加事件</button>
            </div>
        `;
        
        document.getElementById('addEventBtn').addEventListener('click', () => this.openEventModal());
        
        if (this.currentTimeline.events.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="font-size: 3rem; margin-bottom: 15px;">⏳</div>
                <h3>暂无事件</h3>
                <p>点击上方按钮添加第一个事件</p>
            `;
            timelineContainer.appendChild(emptyState);
            return;
        }
        
        this.currentTimeline.events.forEach(event => {
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="dot-color" style="background-color: ${event.color}"></div>
                <div class="date">${this.formatDate(event.date)} ${event.time ? event.time : ''}</div>
                <div class="title">
                    <span>${event.title}</span>
                    <span class="color-indicator" style="background-color: ${event.color}"></span>
                </div>
                ${event.description ? `<div class="description">${event.description}</div>` : ''}
                <div class="actions">
                    <button class="edit-btn" data-id="${event.id}">编辑</button>
                    <button class="delete-btn" data-id="${event.id}">删除</button>
                </div>
            `;
            
            item.querySelector('.edit-btn').addEventListener('click', () => this.openEventModal(event));
            item.querySelector('.delete-btn').addEventListener('click', () => this.deleteEventById(event.id));
            
            timelineContainer.appendChild(item);
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    openEventModal(event = null) {
        document.getElementById('modalTitle').textContent = event ? '修改事件' : '添加事件';
        document.getElementById('deleteBtn').style.display = event ? 'block' : 'none';
        
        if (event) {
            document.getElementById('eventId').value = event.id;
            document.getElementById('timelineId').value = this.currentTimeline.id;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description || '';
            document.getElementById('eventColor').value = event.color;
        } else {
            document.getElementById('eventForm').reset();
            document.getElementById('eventId').value = '';
            document.getElementById('timelineId').value = this.currentTimeline.id;
        }
        
        document.getElementById('modal').style.display = 'block';
    }

    closeModals() {
        document.getElementById('modal').style.display = 'none';
        document.getElementById('timelineModal').style.display = 'none';
        const loginModal = document.getElementById('loginModal');
        if (loginModal) loginModal.remove();
    }

    handleEventSubmit(e) {
        e.preventDefault();
        
        const eventId = document.getElementById('eventId').value;
        const eventData = {
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            color: document.getElementById('eventColor').value
        };
        
        if (eventId) {
            const eventIndex = this.currentTimeline.events.findIndex(e => e.id === eventId);
            if (eventIndex !== -1) {
                Object.assign(this.currentTimeline.events[eventIndex], eventData);
            }
        } else {
            this.currentTimeline.events.push({
                id: 'event_' + Date.now(),
                ...eventData
            });
        }
        
        this.currentTimeline.events.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.saveUser();
        this.renderTimeline();
        this.closeModals();
    }

    deleteEvent() {
        const eventId = document.getElementById('eventId').value;
        if (!eventId || !confirm('确定要删除这个事件吗？')) return;
        
        this.currentTimeline.events = this.currentTimeline.events.filter(e => e.id !== eventId);
        this.saveUser();
        this.renderTimeline();
        this.closeModals();
    }

    deleteEventById(eventId) {
        if (!confirm('确定要删除这个事件吗？')) return;
        
        this.currentTimeline.events = this.currentTimeline.events.filter(e => e.id !== eventId);
        this.saveUser();
        this.renderTimeline();
    }

    updateEmbedCode() {
        if (!this.currentTimeline) {
            document.getElementById('embedCode').value = '请先选择一个时间线';
            return;
        }
        
        const embedCode = `<iframe src="${window.location.href}?timeline=${this.currentTimeline.id}" width="100%" height="600" frameborder="0"></iframe>`;
        document.getElementById('embedCode').value = embedCode;
    }

    copyEmbedCode() {
        const embedCode = document.getElementById('embedCode');
        if (!embedCode.value || embedCode.value === '请先选择一个时间线') {
            alert('请先选择一个时间线');
            return;
        }
        
        embedCode.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyEmbedBtn');
        const originalText = btn.textContent;
        btn.textContent = '已复制！';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TimelineApp();
});