from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from flask_session import Session
import requests
import uuid
import json
import os
import random
import string

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'timeline-app-secret-key')
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = 'flask_session'
app.config['SESSION_FILE_THRESHOLD'] = 500

Session(app)

GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', 'test-client-id')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', 'test-client-secret')
GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', 'http://localhost:5000/auth/github/callback')

DATA_FILE = 'data/users.json'

def load_users():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def init_sample_data():
    users = load_users()
    if not users:
        sample_users = {
            'user1': {
                'id': 'user1',
                'github_id': '123456',
                'username': 'developer',
                'display_name': 'Developer',
                'avatar_url': 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
                'event_types': [
                    {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'},
                    {'id': 'meeting', 'name': '会议', 'color': '#10b981'},
                    {'id': 'deadline', 'name': '截止日期', 'color': '#ef4444'},
                    {'id': 'event', 'name': '活动', 'color': '#f59e0b'},
                    {'id': 'note', 'name': '备注', 'color': '#8b5cf6'}
                ],
                'timelines': [
                    {
                        'id': 'timeline1',
                        'name': '项目里程碑',
                        'events': [
                            {'id': 'event1', 'date': '2024-01-15', 'time': '09:00', 'title': '项目启动', 'description': '正式开始新项目的开发工作', 'type': {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'}},
                            {'id': 'event2', 'date': '2024-03-20', 'time': '14:30', 'title': '中期评审', 'description': '项目中期进度评审会议', 'type': {'id': 'meeting', 'name': '会议', 'color': '#10b981'}},
                            {'id': 'event3', 'date': '2024-06-10', 'time': '10:00', 'title': 'Beta发布', 'description': '发布第一个Beta版本', 'type': {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'}}
                        ]
                    }
                ]
            },
            'user2': {
                'id': 'user2',
                'github_id': '789012',
                'username': 'designer',
                'display_name': 'Designer',
                'avatar_url': 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
                'event_types': [
                    {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'},
                    {'id': 'meeting', 'name': '会议', 'color': '#10b981'},
                    {'id': 'deadline', 'name': '截止日期', 'color': '#ef4444'},
                    {'id': 'event', 'name': '活动', 'color': '#f59e0b'},
                    {'id': 'note', 'name': '备注', 'color': '#8b5cf6'}
                ],
                'timelines': [
                    {
                        'id': 'timeline2',
                        'name': '个人计划',
                        'events': [
                            {'id': 'event4', 'date': '2024-02-01', 'time': '08:00', 'title': '学习React', 'description': '开始学习React框架', 'type': {'id': 'event', 'name': '活动', 'color': '#f59e0b'}},
                            {'id': 'event5', 'date': '2024-05-15', 'time': '10:00', 'title': '完成作品集', 'description': '完成个人作品集网站', 'type': {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'}}
                        ]
                    }
                ]
            }
        }
        save_users(sample_users)

init_sample_data()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/auth/github')
def github_login():
    auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&redirect_uri={GITHUB_REDIRECT_URI}&scope=user:email"
    return redirect(auth_url)

@app.route('/auth/github/callback')
def github_callback():
    code = request.args.get('code')
    
    try:
        token_response = requests.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': GITHUB_CLIENT_ID,
                'client_secret': GITHUB_CLIENT_SECRET,
                'code': code,
                'redirect_uri': GITHUB_REDIRECT_URI
            },
            headers={'Accept': 'application/json'},
            verify=False
        )
        
        token_data = token_response.json()
        access_token = token_data.get('access_token')
        
        if not access_token:
            return redirect(url_for('index'))
        
        user_response = requests.get(
            'https://api.github.com/user',
            headers={'Authorization': f'token {access_token}'},
            verify=False
        )
        
        user_data = user_response.json()
        github_id = str(user_data.get('id'))
        username = user_data.get('login')
        display_name = user_data.get('name') or username
        avatar_url = user_data.get('avatar_url') or f'https://api.dicebear.com/7.x/avataaars/svg?seed={username}'
        
        users = load_users()
        user = None
        
        for uid, udata in users.items():
            if udata.get('github_id') == github_id:
                user = udata
                break
        
        if not user:
            user = {
                'id': 'user_' + str(uuid.uuid4())[:8],
                'github_id': github_id,
                'username': username,
                'display_name': display_name,
                'avatar_url': avatar_url,
                'timelines': []
            }
            users[user['id']] = user
            save_users(users)
        
        session['user_id'] = user['id']
        return redirect(url_for('index'))
    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        return redirect(url_for('index'))

@app.route('/auth/status')
def auth_status():
    user_id = session.get('user_id')
    if user_id:
        users = load_users()
        user = users.get(user_id)
        if user:
            return jsonify({
                'authenticated': True,
                'user': {
                    'id': user['id'],
                    'username': user['username'],
                    'display_name': user['display_name'],
                    'avatar_url': user['avatar_url']
                }
            })
    return jsonify({'authenticated': False, 'user': None})

@app.route('/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    return jsonify({'success': True, 'message': 'Logged out successfully'})

def require_auth(f):
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(user_id, *args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@app.route('/api/event_types', methods=['GET'])
@require_auth
def get_event_types(user_id):
    users = load_users()
    user = users.get(user_id)
    if user:
        event_types = user.get('event_types', [])
        if not event_types:
            event_types = [
                {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'},
                {'id': 'meeting', 'name': '会议', 'color': '#10b981'},
                {'id': 'deadline', 'name': '截止日期', 'color': '#ef4444'},
                {'id': 'event', 'name': '活动', 'color': '#f59e0b'},
                {'id': 'note', 'name': '备注', 'color': '#8b5cf6'}
            ]
            user['event_types'] = event_types
            save_users(users)
        return jsonify({'event_types': event_types})
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/event_types', methods=['POST'])
@require_auth
def add_event_type(user_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    name = data.get('name')
    color = data.get('color', '#667eea')
    
    if not name:
        return jsonify({'error': 'Type name is required'}), 400
    
    event_types = user.get('event_types', [])
    if not event_types:
        event_types = [
            {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'},
            {'id': 'meeting', 'name': '会议', 'color': '#10b981'},
            {'id': 'deadline', 'name': '截止日期', 'color': '#ef4444'},
            {'id': 'event', 'name': '活动', 'color': '#f59e0b'},
            {'id': 'note', 'name': '备注', 'color': '#8b5cf6'}
        ]
    
    new_type = {
        'id': 'type_' + str(uuid.uuid4())[:8],
        'name': name,
        'color': color
    }
    
    event_types.append(new_type)
    user['event_types'] = event_types
    save_users(users)
    
    return jsonify({'success': True, 'event_type': new_type})

@app.route('/api/event_types/<type_id>', methods=['DELETE'])
@require_auth
def delete_event_type(user_id, type_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    event_types = user.get('event_types', [])
    event_types = [t for t in event_types if t['id'] != type_id]
    user['event_types'] = event_types
    save_users(users)
    
    return jsonify({'success': True})

@app.route('/api/timelines', methods=['GET'])
@require_auth
def get_timelines(user_id):
    users = load_users()
    user = users.get(user_id)
    if user:
        return jsonify({'timelines': user.get('timelines', [])})
    return jsonify({'error': 'User not found'}), 404

@app.route('/api/timelines', methods=['POST'])
@require_auth
def create_timeline(user_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Timeline name is required'}), 400
    
    timeline = {
        'id': ''.join(random.choices(string.ascii_letters + string.digits, k=8)),
        'name': name,
        'events': []
    }
    user['timelines'].append(timeline)
    save_users(users)
    
    return jsonify({'success': True, 'timeline': timeline})

@app.route('/api/timelines/<timeline_id>', methods=['GET'])
@require_auth
def get_timeline(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if timeline:
        return jsonify({'timeline': timeline})
    return jsonify({'error': 'Timeline not found'}), 404

@app.route('/api/timelines/<timeline_id>', methods=['PUT'])
@require_auth
def update_timeline(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Timeline name is required'}), 400
    
    timeline['name'] = name
    save_users(users)
    
    return jsonify({'success': True, 'timeline': timeline})

@app.route('/api/timelines/<timeline_id>', methods=['DELETE'])
@require_auth
def delete_timeline(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timelines = user.get('timelines', [])
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    user['timelines'] = [t for t in timelines if t['id'] != timeline_id]
    save_users(users)
    
    return jsonify({'success': True})

@app.route('/api/timelines/<timeline_id>/events', methods=['POST'])
@require_auth
def add_event(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    data = request.get_json()
    date = data.get('date')
    title = data.get('title')
    if not date or not title:
        return jsonify({'error': 'Date and title are required'}), 400
    
    event = {
        'id': 'event_' + str(uuid.uuid4())[:8],
        'date': date,
        'time': data.get('time', ''),
        'title': title,
        'description': data.get('description', ''),
        'type': data.get('type', {'name': '未分类', 'color': '#666'})
    }
    timeline['events'].append(event)
    timeline['events'].sort(key=lambda e: e['date'])
    save_users(users)
    
    return jsonify({'success': True, 'event': event})

@app.route('/api/timelines/<timeline_id>/events/<event_id>', methods=['PUT'])
@require_auth
def update_event(user_id, timeline_id, event_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    event = next((e for e in timeline.get('events', []) if e['id'] == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    data = request.get_json()
    event['date'] = data.get('date', event['date'])
    event['time'] = data.get('time', event['time'])
    event['title'] = data.get('title', event['title'])
    event['description'] = data.get('description', event['description'])
    if 'type' in data:
        event['type'] = data['type']
    
    timeline['events'].sort(key=lambda e: e['date'])
    save_users(users)
    
    return jsonify({'success': True, 'event': event})

@app.route('/api/timelines/<timeline_id>/events/<event_id>', methods=['DELETE'])
@require_auth
def delete_event(user_id, timeline_id, event_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    events = timeline.get('events', [])
    event = next((e for e in events if e['id'] == event_id), None)
    if not event:
        return jsonify({'error': 'Event not found'}), 404
    
    timeline['events'] = [e for e in events if e['id'] != event_id]
    save_users(users)
    
    return jsonify({'success': True})

@app.route('/share/<user_id>/<timeline_id>')
def share_timeline(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    
    if not user:
        user = next((u for u in users.values() if u.get('username') == user_id or u.get('display_name') == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timeline = next((t for t in user.get('timelines', []) if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    return render_template('share.html', user=user, timeline=timeline)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)