const { v4: uuidv4 } = require('uuid');

let users = [];

const sampleUsers = [
  {
    id: 'user1',
    githubId: '123456',
    username: 'developer',
    displayName: 'Developer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    timelines: [
      {
        id: 'timeline1',
        name: '项目里程碑',
        events: [
          {
            id: 'event1',
            date: '2024-01-15',
            time: '09:00',
            title: '项目启动',
            description: '正式开始新项目的开发工作',
            color: '#4CAF50'
          },
          {
            id: 'event2',
            date: '2024-03-20',
            time: '14:30',
            title: '中期评审',
            description: '项目中期进度评审会议',
            color: '#2196F3'
          },
          {
            id: 'event3',
            date: '2024-06-10',
            time: '10:00',
            title: 'Beta发布',
            description: '发布第一个Beta版本',
            color: '#FF9800'
          }
        ]
      }
    ]
  },
  {
    id: 'user2',
    githubId: '789012',
    username: 'designer',
    displayName: 'Designer',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    timelines: [
      {
        id: 'timeline2',
        name: '个人计划',
        events: [
          {
            id: 'event4',
            date: '2024-02-01',
            time: '08:00',
            title: '学习React',
            description: '开始学习React框架',
            color: '#9C27B0'
          },
          {
            id: 'event5',
            date: '2024-05-15',
            time: '10:00',
            title: '完成作品集',
            description: '完成个人作品集网站',
            color: '#00BCD4'
          }
        ]
      }
    ]
  }
];

users = [...sampleUsers];

const getUserByGithubId = (githubId) => {
  return users.find(u => u.githubId === githubId);
};

const getUserById = (id) => {
  return users.find(u => u.id === id);
};

const createUser = (data) => {
  const user = {
    id: uuidv4(),
    githubId: data.githubId,
    username: data.username,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.username}`,
    timelines: []
  };
  users.push(user);
  return user;
};

const getUserTimelines = (userId) => {
  const user = getUserById(userId);
  return user ? user.timelines : [];
};

const createTimeline = (userId, name) => {
  const user = getUserById(userId);
  if (!user) return null;
  
  const timeline = {
    id: uuidv4(),
    name,
    events: []
  };
  user.timelines.push(timeline);
  return timeline;
};

const getTimelineById = (userId, timelineId) => {
  const user = getUserById(userId);
  if (!user) return null;
  return user.timelines.find(t => t.id === timelineId);
};

const updateTimeline = (userId, timelineId, name) => {
  const timeline = getTimelineById(userId, timelineId);
  if (!timeline) return null;
  timeline.name = name;
  return timeline;
};

const deleteTimeline = (userId, timelineId) => {
  const user = getUserById(userId);
  if (!user) return false;
  const index = user.timelines.findIndex(t => t.id === timelineId);
  if (index === -1) return false;
  user.timelines.splice(index, 1);
  return true;
};

const addEvent = (userId, timelineId, eventData) => {
  const timeline = getTimelineById(userId, timelineId);
  if (!timeline) return null;
  
  const event = {
    id: uuidv4(),
    ...eventData
  };
  timeline.events.push(event);
  timeline.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return event;
};

const updateEvent = (userId, timelineId, eventId, eventData) => {
  const timeline = getTimelineById(userId, timelineId);
  if (!timeline) return null;
  
  const event = timeline.events.find(e => e.id === eventId);
  if (!event) return null;
  
  Object.assign(event, eventData);
  timeline.events.sort((a, b) => new Date(a.date) - new Date(b.date));
  return event;
};

const deleteEvent = (userId, timelineId, eventId) => {
  const timeline = getTimelineById(userId, timelineId);
  if (!timeline) return false;
  
  const index = timeline.events.findIndex(e => e.id === eventId);
  if (index === -1) return false;
  timeline.events.splice(index, 1);
  return true;
};

module.exports = {
  getUserByGithubId,
  getUserById,
  createUser,
  getUserTimelines,
  createTimeline,
  getTimelineById,
  updateTimeline,
  deleteTimeline,
  addEvent,
  updateEvent,
  deleteEvent
};