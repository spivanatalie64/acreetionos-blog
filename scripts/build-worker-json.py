import json
with open('workers/proxy-worker.js') as f:
    print(json.dumps({'script': f.read()}))
