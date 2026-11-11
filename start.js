module.exports = {
  daemon: true,
  run: [
    {
      method: "shell.run",
      params: {
        venv: "env",
        // Force UTF-8 stdout/stderr on Windows consoles (legacy cp1252 codec)
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8",
          // the "[server] web page: http://..." line must reach the terminal at once
          PYTHONUNBUFFERED: "1"
        },
        path: "app",
        // The port is picked by Pinokio to avoid clashing with a crispz-motion
        // started by hand (default 7870). Pinokio opens the page itself.
        message: [
          "python cm_server.py --port {{port}} --no-browser"
        ],
        on: [{
          // Capture the local URL printed by the server
          // ("[server] web page: http://127.0.0.1:<port>/")
          "event": "/(http:\\/\\/[0-9.:]+)/",
          "done": true
        }]
      }
    },
    {
      // Expose the captured URL to pinokio.js (Open Web UI menu item)
      method: "local.set",
      params: {
        url: "{{input.event[1]}}"
      }
    }
  ]
}
