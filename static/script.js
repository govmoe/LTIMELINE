class TimelineApp {
    constructor() {
        this.currentUser = null;
        this.currentTimeline = null;
        this.timelines = [];
        this.eventTypes = [];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('newTimelineBtn').addEventListener('click', () => this.openTimelineModal());
        document.getElementById('timelineSelect').addEventListener('change', (e) => this.selectTimeline(e.target.value));
        document.getElementById('copyEmbedBtn').addEventListener('click', () => this.copyEmbedCode());
        document.getElementById('manageTimelineBtn').addEventListener('click', () => this.openManageModal());
        
        document.getElementById('timelineForm').addEventListener('submit', (e) => this.handleTimelineSubmit(e));
        document.getElementById('cancelTimelineBtn').addEventListener('click', () => this.closeTimelineModal());
        document.getElementById('closeManageBtn').addEventListener('click', () => this.closeManageModal());
        
        document.getElementById('eventForm').addEventListener('submit', (e) => this.handleEventSubmit(e));
        document.getElementById('deleteBtn').addEventListener('click', () => this.deleteEvent());
        
        document.getElementById('addTypeBtn').addEventListener('click', () => this.openTypeModal());
        document.getElementById('typeForm').addEventListener('submit', (e) => this.handleTypeSubmit(e));
        document.getElementById('cancelTypeBtn').addEventListener('click', () => this.closeTypeModal());
        
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModals());
        });
        
        document.getElementById('copyShareBtn').addEventListener('click', () => this.copyShareLink());
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/auth/status');
            const data = await response.json();
            
            if (data.authenticated && data.user) {
                this.currentUser = data.user;
                this.showUserSection();
                await this.loadEventTypes();
                await this.loadTimelines();
            } else {
                this.showAuthSection();
                this.showLoginPrompt();
            }
        } catch (error) {
            console.error('Failed to check auth status:', error);
            this.showAuthSection();
            this.showLoginPrompt();
        }
    }

    async logout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            this.currentUser = null;
            this.currentTimeline = null;
            this.timelines = [];
            this.showAuthSection();
            this.showLoginPrompt();
        } catch (error) {
            console.error('Logout failed:', error);
        }
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
        
        document.getElementById('userAvatar').src = this.currentUser.avatar_url;
        document.getElementById('userName').textContent = this.currentUser.display_name;
    }

    showLoginPrompt() {
        const timelineContainer = document.getElementById('timeline');
        timelineContainer.innerHTML = `
            <div class="timeline-line"></div>
            <div class="empty-state">
                <h3>请先登录</h3>
                <p>使用 GitHub 登录后才能创建和管理时间线</p>
            </div>
        `;
    }

    async loadEventTypes() {
        try {
            const response = await fetch('/api/event_types');
            const data = await response.json();
            
            if (response.ok) {
                this.eventTypes = data.event_types || [];
            } else {
                console.error('Failed to load event types:', data.error);
                this.eventTypes = [
                    { id: 'milestone', name: '里程碑', color: '#667eea' },
                    { id: 'meeting', name: '会议', color: '#10b981' },
                    { id: 'deadline', name: '截止日期', color: '#ef4444' },
                    { id: 'event', name: '活动', color: '#f59e0b' },
                    { id: 'note', name: '备注', color: '#8b5cf6' }
                ];
            }
        } catch (error) {
            console.error('Failed to load event types:', error);
            this.eventTypes = [
                { id: 'milestone', name: '里程碑', color: '#667eea' },
                { id: 'meeting', name: '会议', color: '#10b981' },
                { id: 'deadline', name: '截止日期', color: '#ef4444' },
                { id: 'event', name: '活动', color: '#f59e0b' },
                { id: 'note', name: '备注', color: '#8b5cf6' }
            ];
        }
    }

    async loadTimelines() {
        try {
            const response = await fetch('/api/timelines');
            const data = await response.json();
            
            if (response.ok) {
                this.timelines = data.timelines || [];
                this.updateTimelineSelect();
                
                if (this.timelines.length > 0) {
                    this.selectTimeline(this.timelines[0].id);
                } else {
                    this.showEmptyTimelineState();
                }
            } else {
                console.error('Failed to load timelines:', data.error);
            }
        } catch (error) {
            console.error('Failed to load timelines:', error);
        }
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
            document.getElementById('manageTimelineBtn').style.display = 'none';
            return;
        }
        
        this.currentTimeline = this.timelines.find(t => t.id === timelineId);
        document.getElementById('timelineSelect').value = timelineId;
        document.getElementById('manageTimelineBtn').style.display = 'inline-block';
        this.renderTimeline();
        this.updateEmbedCode();
    }

    openManageModal() {
        this.renderTimelineList();
        document.getElementById('timelineManageModal').style.display = 'block';
    }

    closeManageModal() {
        document.getElementById('timelineManageModal').style.display = 'none';
    }

    renderTimelineList() {
        const listContainer = document.getElementById('timelineList');
        
        if (this.timelines.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: #999;">暂无时间线</p>';
            return;
        }
        
        listContainer.innerHTML = this.timelines.map(timeline => `
            <div class="timeline-item-row">
                <div class="timeline-item-info">
                    <span class="${timeline.id === this.currentTimeline?.id ? 'active' : ''}">${timeline.name}</span>
                    <span class="event-count">${timeline.events.length} 个事件</span>
                </div>
                <div class="timeline-item-actions">
                    <button class="rename-btn" data-id="${timeline.id}" data-name="${timeline.name}">重命名</button>
                    <button class="delete-timeline-btn" data-id="${timeline.id}" data-name="${timeline.name}">删除</button>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const name = e.target.dataset.name;
                this.renameTimeline(id, name);
            });
        });
        
        document.querySelectorAll('.delete-timeline-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                const name = e.target.dataset.name;
                this.deleteTimeline(id, name);
            });
        });
    }

    async renameTimeline(timelineId, currentName) {
        const newName = prompt('请输入新的时间线名称:', currentName);
        if (!newName || newName.trim() === '') return;
        if (newName.trim() === currentName) return;
        
        try {
            const response = await fetch(`/api/timelines/${timelineId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            
            const data = await response.json();
            if (data.success) {
                const timeline = this.timelines.find(t => t.id === timelineId);
                if (timeline) {
                    timeline.name = newName.trim();
                }
                this.updateTimelineSelect();
                this.renderTimelineList();
                if (this.currentTimeline?.id === timelineId) {
                    this.renderTimeline();
                }
            }
        } catch (error) {
            console.error('Failed to rename timeline:', error);
        }
    }

    async deleteTimeline(timelineId, timelineName) {
        if (!confirm(`确定要删除时间线「${timelineName}」吗？所有事件将被永久删除！`)) {
            return;
        }
        
        try {
            const response = await fetch(`/api/timelines/${timelineId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.timelines = this.timelines.filter(t => t.id !== timelineId);
                this.updateTimelineSelect();
                
                if (this.currentTimeline?.id === timelineId) {
                    if (this.timelines.length > 0) {
                        this.selectTimeline(this.timelines[0].id);
                    } else {
                        this.currentTimeline = null;
                        this.showEmptyTimelineState();
                        document.getElementById('manageTimelineBtn').style.display = 'none';
                    }
                }
                this.closeManageModal();
            }
        } catch (error) {
            console.error('Failed to delete timeline:', error);
        }
    }

    openTimelineModal() {
        document.getElementById('timelineModalTitle').textContent = '新建时间线';
        document.getElementById('timelineName').value = '';
        document.getElementById('timelineModal').style.display = 'block';
    }

    closeTimelineModal() {
        document.getElementById('timelineModal').style.display = 'none';
    }

    async handleTimelineSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('timelineName').value.trim();
        if (!name) return;
        
        try {
            const response = await fetch('/api/timelines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            
            const data = await response.json();
            if (data.success) {
                this.timelines.push(data.timeline);
                this.updateTimelineSelect();
                this.selectTimeline(data.timeline.id);
                this.closeTimelineModal();
            }
        } catch (error) {
            console.error('Failed to create timeline:', error);
        }
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
                <h3>暂无事件</h3>
                <p>点击上方按钮添加第一个事件</p>
            `;
            timelineContainer.appendChild(emptyState);
            return;
        }
        
        this.currentTimeline.events.forEach(event => {
            const eventType = event.type || { name: '未分类', color: event.color || '#666' };
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.innerHTML = `
                <div class="dot-color" style="background-color: ${eventType.color}"></div>
                <div class="date">${this.formatDate(event.date)} ${event.time ? event.time : ''}</div>
                <div class="title">
                    <span>${event.title}</span>
                    <span class="type-label" style="background-color: ${eventType.color};">${eventType.name}</span>
                </div>
                ${event.description ? `<div class="description">${typeof marked !== 'undefined' ? marked.parse(event.description) : event.description}</div>` : ''}
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
        this.renderEventTypeSelect();
        
        document.getElementById('modalTitle').textContent = event ? '修改事件' : '添加事件';
        document.getElementById('deleteBtn').style.display = event ? 'block' : 'none';
        
        if (event) {
            document.getElementById('eventId').value = event.id;
            document.getElementById('timelineId').value = this.currentTimeline.id;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time || '';
            document.getElementById('eventTitle').value = event.title;
            document.getElementById('eventDescription').value = event.description || '';
            
            if (event.type && event.type.id) {
                document.getElementById('eventType').value = event.type.id;
            } else if (event.type && event.type.name) {
                const existingType = this.eventTypes.find(t => t.name === event.type.name);
                if (existingType) {
                    document.getElementById('eventType').value = existingType.id;
                }
            }
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
        document.getElementById('timelineManageModal').style.display = 'none';
        document.getElementById('typeModal').style.display = 'none';
    }

    openTypeModal() {
        document.getElementById('typeName').value = '';
        document.getElementById('typeColor').value = '#667eea';
        this.renderTypeList();
        document.getElementById('typeModal').style.display = 'block';
    }

    renderTypeList() {
        const listContainer = document.getElementById('typeList');
        
        listContainer.innerHTML = this.eventTypes.map((type, index) => {
            const isBuiltIn = !type.id.startsWith('type_');
            return `
                <div class="type-item">
                    <div class="type-color" style="background-color: ${type.color}"></div>
                    <span class="type-name">${type.name}</span>
                    ${isBuiltIn ? '<span class="built-in-badge">内置</span>' : ''}
                    ${!isBuiltIn ? `<button class="delete-type-btn" data-id="${type.id}">删除</button>` : ''}
                </div>
            `;
        }).join('');
        
        document.querySelectorAll('.delete-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const typeId = e.target.dataset.id;
                this.deleteEventType(typeId);
                this.renderTypeList();
            });
        });
    }

    closeTypeModal() {
        document.getElementById('typeModal').style.display = 'none';
    }

    async handleTypeSubmit(e) {
        e.preventDefault();
        
        const name = document.getElementById('typeName').value.trim();
        const color = document.getElementById('typeColor').value;
        
        if (!name) return;
        
        try {
            const response = await fetch('/api/event_types', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, color })
            });
            
            const data = await response.json();
            if (data.success) {
                this.eventTypes.push(data.event_type);
                this.renderEventTypeSelect();
                this.renderTypeList();
                
                document.getElementById('typeName').value = '';
                document.getElementById('typeColor').value = '#667eea';
            }
        } catch (error) {
            console.error('Failed to add event type:', error);
        }
    }

    renderEventTypeSelect() {
        const select = document.getElementById('eventType');
        select.innerHTML = '';
        
        this.eventTypes.forEach((type) => {
            const option = document.createElement('option');
            option.value = type.id;
            option.textContent = type.name;
            option.setAttribute('data-color', type.color);
            option.style.color = type.color;
            select.appendChild(option);
        });
    }

    async deleteEventType(typeId) {
        if (!confirm('确定要删除这个事件类型吗？使用此类型的事件将变为"未分类"。')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/event_types/${typeId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                this.eventTypes = this.eventTypes.filter(t => t.id !== typeId);
                this.renderEventTypeSelect();
            }
        } catch (error) {
            console.error('Failed to delete event type:', error);
        }
    }

    async handleEventSubmit(e) {
        e.preventDefault();
        
        const eventId = document.getElementById('eventId').value;
        const timelineId = document.getElementById('timelineId').value;
        const typeId = document.getElementById('eventType').value;
        const eventType = this.eventTypes.find(t => t.id === typeId) || { name: '未分类', color: '#666' };
        
        const eventData = {
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            title: document.getElementById('eventTitle').value,
            description: document.getElementById('eventDescription').value,
            type: eventType
        };
        
        try {
            let response;
            if (eventId) {
                response = await fetch(`/api/timelines/${timelineId}/events/${eventId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
            } else {
                response = await fetch(`/api/timelines/${timelineId}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(eventData)
                });
            }
            
            const data = await response.json();
            if (data.success) {
                await this.loadTimelines();
                this.closeModals();
            }
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    }

    async deleteEvent() {
        const eventId = document.getElementById('eventId').value;
        const timelineId = document.getElementById('timelineId').value;
        
        if (!eventId || !confirm('确定要删除这个事件吗？')) return;
        
        try {
            const response = await fetch(`/api/timelines/${timelineId}/events/${eventId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                await this.loadTimelines();
                this.closeModals();
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    }

    async deleteEventById(eventId) {
        if (!confirm('确定要删除这个事件吗？')) return;
        
        try {
            const response = await fetch(`/api/timelines/${this.currentTimeline.id}/events/${eventId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                await this.loadTimelines();
            }
        } catch (error) {
            console.error('Failed to delete event:', error);
        }
    }

    updateEmbedCode() {
        if (!this.currentTimeline) {
            document.getElementById('embedCode').value = '请先选择一个时间线';
            document.getElementById('shareLink').value = '请先选择一个时间线';
            return;
        }
        
        const embedCode = `<iframe src="${window.location.origin}/share/${this.currentUser.id}/${this.currentTimeline.id}" width="100%" height="600" frameborder="0"></iframe>`;
        document.getElementById('embedCode').value = embedCode;
        
        const shareLink = `${window.location.origin}/share/${this.currentUser.id}/${this.currentTimeline.id}`;
        document.getElementById('shareLink').value = shareLink;
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

    copyShareLink() {
        const shareLink = document.getElementById('shareLink');
        if (!shareLink.value || shareLink.value === '请先选择一个时间线') {
            alert('请先选择一个时间线');
            return;
        }
        
        shareLink.select();
        document.execCommand('copy');
        
        const btn = document.getElementById('copyShareBtn');
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