from flask import Flask, render_template, redirect, url_for, session, request, jsonify
from flask_session import Session
import requests
import uuid
import os
import sys

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

try:
    import cf_d1
    DB = cf_d1.connect(os.environ.get('DATABASE_ID'))
except ImportError:
    DB = None

DATA_FILE = 'data/users.json'

def get_db():
    if DB:
        return DB
    return None

def init_db():
    db = get_db()
    if db:
        try:
            with open('schema.sql', 'r') as f:
                schema = f.read()
            statements = schema.split(';')
            for stmt in statements:
                stmt = stmt.strip()
                if stmt:
                    db.execute(stmt)
        except Exception as e:
            print(f"DB init error: {e}")

def load_users():
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT * FROM users")
            users = {}
            for row in result:
                users[row['id']] = {
                    'id': row['id'],
                    'github_id': row['github_id'],
                    'username': row['username'],
                    'display_name': row['display_name'],
                    'avatar_url': row['avatar_url']
                }
            return users
        except Exception as e:
            print(f"Load users error: {e}")
            return {}
    
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_users(users):
    db = get_db()
    if db:
        try:
            for user_id, user_data in users.items():
                result = db.execute("SELECT id FROM users WHERE id = ?", (user_id,))
                if result:
                    db.execute("UPDATE users SET github_id = ?, username = ?, display_name = ?, avatar_url = ? WHERE id = ?",
                              (user_data['github_id'], user_data['username'], user_data['display_name'], user_data['avatar_url'], user_id))
                else:
                    db.execute("INSERT INTO users (id, github_id, username, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)",
                              (user_id, user_data['github_id'], user_data['username'], user_data['display_name'], user_data['avatar_url']))
            return
        except Exception as e:
            print(f"Save users error: {e}")
    
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def get_user_timelines(user_id):
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT * FROM timelines WHERE user_id = ?", (user_id,))
            timelines = []
            for row in result:
                events = get_timeline_events(row['id'])
                timelines.append({
                    'id': row['id'],
                    'name': row['name'],
                    'events': events
                })
            return timelines
        except Exception as e:
            print(f"Get timelines error: {e}")
            return []
    
    users = load_users()
    user = users.get(user_id)
    return user.get('timelines', []) if user else []

def get_timeline_events(timeline_id):
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT * FROM events WHERE timeline_id = ? ORDER BY date", (timeline_id,))
            events = []
            for row in result:
                event_type = None
                if row['type_id']:
                    type_result = db.execute("SELECT * FROM event_types WHERE id = ?", (row['type_id'],))
                    if type_result:
                        event_type = {
                            'id': type_result[0]['id'],
                            'name': type_result[0]['name'],
                            'color': type_result[0]['color']
                        }
                events.append({
                    'id': row['id'],
                    'date': row['date'],
                    'time': row['time'],
                    'title': row['title'],
                    'description': row['description'],
                    'type': event_type or {'name': '未分类', 'color': '#666'}
                })
            return events
        except Exception as e:
            print(f"Get events error: {e}")
            return []
    
    return []

def save_timeline(user_id, timeline):
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT id FROM timelines WHERE id = ?", (timeline['id'],))
            if result:
                db.execute("UPDATE timelines SET name = ? WHERE id = ?", (timeline['name'], timeline['id']))
            else:
                db.execute("INSERT INTO timelines (id, user_id, name) VALUES (?, ?, ?)",
                          (timeline['id'], user_id, timeline['name']))
            
            for event in timeline['events']:
                event_result = db.execute("SELECT id FROM events WHERE id = ?", (event['id'],))
                type_id = event['type']['id'] if isinstance(event['type'], dict) and 'id' in event['type'] else None
                if event_result:
                    db.execute("UPDATE events SET date = ?, time = ?, title = ?, description = ?, type_id = ? WHERE id = ?",
                              (event['date'], event['time'], event['title'], event['description'], type_id, event['id']))
                else:
                    db.execute("INSERT INTO events (id, timeline_id, date, time, title, description, type_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                              (event['id'], timeline['id'], event['date'], event['time'], event['title'], event['description'], type_id))
            return
        except Exception as e:
            print(f"Save timeline error: {e}")
    
    users = load_users()
    user = users.get(user_id)
    if user:
        timelines = user.get('timelines', [])
        timelines = [t for t in timelines if t['id'] != timeline['id']]
        timelines.append(timeline)
        user['timelines'] = timelines
        save_users(users)

def get_user_event_types(user_id):
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT * FROM event_types WHERE user_id = ?", (user_id,))
            event_types = []
            for row in result:
                event_types.append({
                    'id': row['id'],
                    'name': row['name'],
                    'color': row['color']
                })
            return event_types
        except Exception as e:
            print(f"Get event types error: {e}")
            return []
    
    users = load_users()
    user = users.get(user_id)
    return user.get('event_types', []) if user else []

def save_event_type(user_id, event_type):
    db = get_db()
    if db:
        try:
            result = db.execute("SELECT id FROM event_types WHERE id = ?", (event_type['id'],))
            if result:
                db.execute("UPDATE event_types SET name = ?, color = ? WHERE id = ?",
                          (event_type['name'], event_type['color'], event_type['id']))
            else:
                db.execute("INSERT INTO event_types (id, user_id, name, color) VALUES (?, ?, ?, ?)",
                          (event_type['id'], user_id, event_type['name'], event_type['color']))
            return
        except Exception as e:
            print(f"Save event type error: {e}")
    
    users = load_users()
    user = users.get(user_id)
    if user:
        event_types = user.get('event_types', [])
        event_types = [t for t in event_types if t['id'] != event_type['id']]
        event_types.append(event_type)
        user['event_types'] = event_types
        save_users(users)

def delete_event_type(user_id, type_id):
    db = get_db()
    if db:
        try:
            db.execute("DELETE FROM event_types WHERE id = ? AND user_id = ?", (type_id, user_id))
            db.execute("UPDATE events SET type_id = NULL WHERE type_id = ?", (type_id,))
            return
        except Exception as e:
            print(f"Delete event type error: {e}")
    
    users = load_users()
    user = users.get(user_id)
    if user:
        event_types = user.get('event_types', [])
        user['event_types'] = [t for t in event_types if t['id'] != type_id]
        save_users(users)

def delete_timeline(user_id, timeline_id):
    db = get_db()
    if db:
        try:
            db.execute("DELETE FROM events WHERE timeline_id = ?", (timeline_id,))
            db.execute("DELETE FROM timelines WHERE id = ? AND user_id = ?", (timeline_id, user_id))
            return
        except Exception as e:
            print(f"Delete timeline error: {e}")
    
    users = load_users()
    user = users.get(user_id)
    if user:
        user['timelines'] = [t for t in user.get('timelines', []) if t['id'] != timeline_id]
        save_users(users)

def delete_event(timeline_id, event_id):
    db = get_db()
    if db:
        try:
            db.execute("DELETE FROM events WHERE id = ? AND timeline_id = ?", (event_id, timeline_id))
            return
        except Exception as e:
            print(f"Delete event error: {e}")

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
        
        for user_id, user_data in sample_users.items():
            for event_type in user_data.get('event_types', []):
                save_event_type(user_id, event_type)
            for timeline in user_data.get('timelines', []):
                save_timeline(user_id, timeline)

init_db()
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
    event_types = get_user_event_types(user_id)
    if not event_types:
        event_types = [
            {'id': 'milestone', 'name': '里程碑', 'color': '#667eea'},
            {'id': 'meeting', 'name': '会议', 'color': '#10b981'},
            {'id': 'deadline', 'name': '截止日期', 'color': '#ef4444'},
            {'id': 'event', 'name': '活动', 'color': '#f59e0b'},
            {'id': 'note', 'name': '备注', 'color': '#8b5cf6'}
        ]
        for et in event_types:
            save_event_type(user_id, et)
    return jsonify({'event_types': event_types})

@app.route('/api/event_types', methods=['POST'])
@require_auth
def add_event_type(user_id):
    data = request.get_json()
    name = data.get('name')
    color = data.get('color', '#667eea')
    
    if not name:
        return jsonify({'error': 'Type name is required'}), 400
    
    new_type = {
        'id': 'type_' + str(uuid.uuid4())[:8],
        'name': name,
        'color': color
    }
    
    save_event_type(user_id, new_type)
    
    return jsonify({'success': True, 'event_type': new_type})

@app.route('/api/event_types/<type_id>', methods=['DELETE'])
@require_auth
def delete_event_type_route(user_id, type_id):
    delete_event_type(user_id, type_id)
    return jsonify({'success': True})

@app.route('/api/timelines', methods=['GET'])
@require_auth
def get_timelines(user_id):
    timelines = get_user_timelines(user_id)
    return jsonify({'timelines': timelines})

@app.route('/api/timelines', methods=['POST'])
@require_auth
def create_timeline(user_id):
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Timeline name is required'}), 400
    
    timeline = {
        'id': 'timeline_' + str(uuid.uuid4())[:8],
        'name': name,
        'events': []
    }
    save_timeline(user_id, timeline)
    
    return jsonify({'success': True, 'timeline': timeline})

@app.route('/api/timelines/<timeline_id>', methods=['GET'])
@require_auth
def get_timeline(user_id, timeline_id):
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
    if timeline:
        return jsonify({'timeline': timeline})
    return jsonify({'error': 'Timeline not found'}), 404

@app.route('/api/timelines/<timeline_id>', methods=['PUT'])
@require_auth
def update_timeline(user_id, timeline_id):
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    data = request.get_json()
    name = data.get('name')
    if not name:
        return jsonify({'error': 'Timeline name is required'}), 400
    
    timeline['name'] = name
    save_timeline(user_id, timeline)
    
    return jsonify({'success': True, 'timeline': timeline})

@app.route('/api/timelines/<timeline_id>', methods=['DELETE'])
@require_auth
def delete_timeline_route(user_id, timeline_id):
    delete_timeline(user_id, timeline_id)
    return jsonify({'success': True})

@app.route('/api/timelines/<timeline_id>/events', methods=['POST'])
@require_auth
def add_event(user_id, timeline_id):
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
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
    save_timeline(user_id, timeline)
    
    return jsonify({'success': True, 'event': event})

@app.route('/api/timelines/<timeline_id>/events/<event_id>', methods=['PUT'])
@require_auth
def update_event(user_id, timeline_id, event_id):
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
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
    save_timeline(user_id, timeline)
    
    return jsonify({'success': True, 'event': event})

@app.route('/api/timelines/<timeline_id>/events/<event_id>', methods=['DELETE'])
@require_auth
def delete_event_route(user_id, timeline_id, event_id):
    delete_event(timeline_id, event_id)
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
    if timeline:
        timeline['events'] = [e for e in timeline.get('events', []) if e['id'] != event_id]
        save_timeline(user_id, timeline)
    return jsonify({'success': True})

@app.route('/share/<user_id>/<timeline_id>')
def share_timeline(user_id, timeline_id):
    users = load_users()
    user = users.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    timelines = get_user_timelines(user_id)
    timeline = next((t for t in timelines if t['id'] == timeline_id), None)
    if not timeline:
        return jsonify({'error': 'Timeline not found'}), 404
    
    return render_template('share.html', user=user, timeline=timeline)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
