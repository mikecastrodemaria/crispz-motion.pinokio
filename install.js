module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [
    // Clone crispz-motion into the local app/ folder
    {
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/mikecastrodemaria/crispz-motion app"
        ]
      }
    },
    // The app itself: stdlib + Pillow, in its own venv (app/env). It draws no image
    // itself: the keys come from the crispz family engines (crispz-moss by default)
    // over the CLI protocol, FILM and ESRGAN run in the second venv below.
    {
      method: "shell.run",
      params: {
        venv: "env",
        // UTF-8 env: packages built from source read UTF-8 files in their
        // setup; the legacy cp1252 codec on Windows fails the build.
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
    // FILM and ESRGAN venv (app/film/.venv: the path the app looks for).
    // spandrel pulls a torchvision from PyPI that replaces the CUDA torch with a
    // CPU one, so its requirements go FIRST and torch.js runs LAST.
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
    // PyTorch (CUDA cu128 on NVIDIA / ROCm / MPS / CPU) cross-platform
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
    // FILM weights: film_net_fp32.pt v1.0.2, 138 MB, Apache 2.0
    // (dajes/frame-interpolation-pytorch). Kept on re-install.
    {
      when: "{{!exists('app/film/models/film_net_fp32.pt')}}",
      method: "fs.download",
      params: {
        url: "https://github.com/dajes/frame-interpolation-pytorch/releases/download/v1.0.2/film_net_fp32.pt",
        dir: "app/film/models"
      }
    },
    // ESRGAN model for 4K: 4x-ClearRealityV1 by Kim2091, 4.5 MB, pinned to the
    // revision of 2026-02-11 that states Apache 2.0 (earlier releases were CC BY-NC-SA).
    // The check step below verifies its SHA-256.
    {
      when: "{{!exists('app/models/esrgan/4x-ClearRealityV1.safetensors')}}",
      method: "fs.download",
      params: {
        url: "https://huggingface.co/Kim2091/ClearRealityV1/resolve/6bfd32e08342ad5d8ae5ac2fd6629a72d525c76e/4x-ClearRealityV1.safetensors",
        dir: "app/models/esrgan"
      }
    },
    // Local config (gitignored in the app); keep the user's file on re-install
    {
      when: "{{!exists('app/config.json')}}",
      method: "fs.copy",
      params: {
        src: "app/config-sample.json",
        dest: "app/config.json"
      }
    },
    // Projects next to app/, not inside it: Reset removes app/ and must not take
    // the user's videos with it. Only on a first install (no projects yet).
    {
      when: "{{!exists('projects')}}",
      method: "json.set",
      params: {
        "app/config.json": {
          "projects_dir": "../projects"
        }
      }
    },
    // Checks the result: torch build and GPU, FILM weights size, ffmpeg.
    // A failure here names the missing piece instead of waiting for the first render.
    {
      method: "shell.run",
      params: {
        venv: "env",
        path: "app",
        message: [
          "python cm_setup.py check"
        ]
      }
    },
    // Deduplicate the venvs to save disk space
    {
      method: "fs.link",
      params: {
        venv: "app/env"
      }
    },
    {
      method: "fs.link",
      params: {
        venv: "app/film/.venv"
      }
    }
  ]
}
