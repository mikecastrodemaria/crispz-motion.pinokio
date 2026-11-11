module.exports = {
  run: [
    // Force-update the launcher repo to exactly match its origin (main)
    {
      method: "shell.run",
      params: {
        message: [
          "git fetch origin",
          "git reset --hard origin/main"
        ]
      }
    },
    // Force-update crispz-motion (app) to exactly match its origin (main).
    // config.json, the venvs and the FILM weights are gitignored there and
    // survive the reset; the projects live in ../projects.
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          "git fetch origin",
          "git reset --hard origin/main"
        ]
      }
    },
    // Refresh dependencies (in case requirements changed)
    {
      method: "shell.run",
      params: {
        venv: "env",
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install -r requirements.txt"
        ]
      }
    },
    {
      method: "shell.run",
      params: {
        venv: "film/.venv",
        env: {
          PYTHONUTF8: "1",
          PYTHONIOENCODING: "utf-8"
        },
        path: "app",
        message: [
          "uv pip install -r film/requirements.txt"
        ]
      }
    },
    // Reassert the correct torch build after the refresh (spandrel's torchvision
    // from PyPI would otherwise leave a CPU torch)
    {
      method: "script.start",
      params: {
        uri: "torch.js",
        params: {
          venv: "film/.venv",
          path: "app"
        }
      }
    },
    // Same check as Install (and it lists the config keys new in the sample)
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "python cm_setup.py check"
        ]
      }
    }
  ]
}
