# crispz-motion.pinokio

1-click [Pinokio](https://pinokio.computer) launcher for
**[crispz-motion](https://github.com/mikecastrodemaria/crispz-motion)**: short videos,
up to 4K, from a handful of key images made by the crispz family engines, with FILM
(Frame Interpolation for Large Motion) computing every frame in between. No video model.

## What it does

- **Install**: clones `mikecastrodemaria/crispz-motion` into `app/`, creates two venvs
  (`app/env` for the app, Pillow only; `app/film/.venv` for FILM and ESRGAN with
  spandrel and PyTorch: CUDA cu128 on NVIDIA, ROCm, MPS or CPU), downloads the FILM
  weights (`film_net_fp32.pt` v1.0.2, 138 MB, Apache 2.0) and the ESRGAN model for 4K
  (`4x-ClearRealityV1`, 4.5 MB, Apache 2.0, see Licences), writes `app/config.json`,
  puts the projects in `projects/` next to `app/`, then checks the install (torch build
  and GPU, weights size, ffmpeg).
- **Start**: runs the web page (`cm_server.py`) on a free port and opens it.
- **Update**: force-updates the launcher and the app to their `origin/main`, refreshes
  the dependencies, reasserts the torch build, checks again. `config.json`, the FILM
  weights and the projects are kept.
- **Reset**: removes `app/` (both venvs and the weights). The projects stay in
  `projects/`.

## Before the first video: the image engine

crispz-motion makes no image itself: it asks a crispz family engine through the CLI
protocol v1, **crispz-moss** by default (MOSS-Image with the Turbo LoRA, Apache 2.0).
Either:

- start crispz-moss yourself (it answers at `http://127.0.0.1:7860`), or
- give crispz-motion its folder, so it can start it and stop it before FILM: set
  `engines.moss.dir` in `app/config.json` (an absolute path, or relative to `app/`).

Importing your own images needs no engine: only FILM and ffmpeg (Pinokio has ffmpeg).

## Using it

The page has the projects, the keys strip (drag to reorder, distance guard between two
keys, `+ mid` for a middle key), a key's settings and recipe, the next key by img2img
chain, edit or inpaint, the output settings (resolution up to 4K, fps, loop, formats) and
the render with its progress, preview, player and log. **Import Animator settings** turns
the `settings.txt` / `keyframes.csv` of the A1111 Animator extension into a plan of keys.
The app's own README describes every part.

Requirements: an NVIDIA GPU is recommended (FILM in fp16 and ESRGAN on CUDA; measured on
an RTX 5090: 11 img2img keys and 10 s at 2160 x 3840 in about 6 minutes). The engine
needs its own VRAM (crispz-moss: 10 GB at rest, up to 24 GB); crispz-motion stops the
engine it started before FILM runs.

## API

The page talks to a small JSON API on the same port (Pinokio shows it in the terminal:
`[server] web page: http://127.0.0.1:<port>/`). Bound to 127.0.0.1. One job runs at a
time; `GET /api/job` follows it.

| Call | What |
|---|---|
| `GET /api/status` | FILM, ESRGAN and engines status |
| `GET /api/projects` | the projects |
| `POST /api/projects` `{"name"}` | a new project, returns `{"id"}` |
| `GET /api/p/<id>` | a project: keys, guard, output, plan, last render |
| `POST /api/p/<id>/upload?name=a.png` (raw image body) | imports a key |
| `POST /api/p/<id>/output` `{"res", "fps", "loop", "formats", "seg" or "total", ...}` | output settings |
| `POST /api/animator` `{"settings", "keyframes", "name", "seg"}` | a project from Animator files |
| `POST /api/job` `{"project", "kind", ...}` | starts a job: `gen` (`prompt`), `chain` (`from`, `count`, `denoise`), `edit` (`instruction`), `inpaint` (`mask` PNG data URL, `prompt`), `mid` (`a`, `b`), `regen` (`key`), `build` (the planned keys), `render` |
| `GET /api/job?since=N` | the current job: state, steps, log lines from N |
| `POST /api/job/cancel` | cancels it |
| `GET /p/<id>/video.mp4` | the video (Range requests work) |

### curl

```bash
URL=http://127.0.0.1:7870
ID=$(curl -s -X POST $URL/api/projects -d '{"name":"pair"}' | python -c "import sys,json;print(json.load(sys.stdin)['id'])")
curl -s -X POST "$URL/api/p/$ID/upload?name=a.png" --data-binary @a.png
curl -s -X POST "$URL/api/p/$ID/upload?name=b.png" --data-binary @b.png
curl -s -X POST $URL/api/p/$ID/output -d '{"res":"1080p","loop":"pingpong","formats":["mp4"],"seg":2}'
curl -s -X POST $URL/api/job -d "{\"project\":\"$ID\",\"kind\":\"render\"}"
curl -s "$URL/api/job?since=0"
curl -s -o video.mp4 $URL/p/$ID/video.mp4
```

### Python

```python
import json, time, urllib.request

URL = "http://127.0.0.1:7870"

def call(path, body=None, raw=None):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    with urllib.request.urlopen(urllib.request.Request(URL + path, data=data)) as r:
        return json.load(r)

pid = call("/api/projects", {"name": "pair"})["id"]
for f in ("a.png", "b.png"):
    call(f"/api/p/{pid}/upload?name={f}", raw=open(f, "rb").read())
call(f"/api/p/{pid}/output", {"res": "4k", "loop": "pingpong", "formats": ["mp4"], "seg": 2})
call("/api/job", {"project": pid, "kind": "render"})
while (job := call("/api/job"))["state"] == "running":
    time.sleep(2)
print(job["state"], job["result"])
urllib.request.urlretrieve(f"{URL}/p/{pid}/video.mp4", "video.mp4")
```

### JavaScript

```javascript
const URL = "http://127.0.0.1:7870"
const call = async (path, body) => (await fetch(URL + path, body === undefined ? {} :
  { method: "POST", body: body instanceof Blob ? body : JSON.stringify(body) })).json()

const { id } = await call("/api/projects", { name: "from js" })
await call(`/api/animator`, { settings: settingsText, keyframes: keyframesText, name: "example 1" })
await call("/api/job", { project: id, kind: "gen", prompt: "a pencil drawing of a man with a beard" })
let job
do { await new Promise(r => setTimeout(r, 2000)); job = await call("/api/job") } while (job.state === "running")
console.log(job.state, job.result)
```

The command line of the app (`app/cm_cli.py`: `new`, `add`, `gen`, `chain`, `edit`,
`inpaint`, `mid`, `regen`, `render`, `quick`...) does the same without the page; run it
with the `app/env` Python.

## Licences

The launcher: same as crispz-motion. FILM weights and model: Apache 2.0. ESRGAN model:
[4x-ClearRealityV1](https://huggingface.co/Kim2091/ClearRealityV1) by Kim2091, downloaded
from revision `6bfd32e` (2026-02-11), whose card states Apache 2.0; the releases before
it (and OpenModelDB) state CC BY-NC-SA 4.0, non-commercial. Default engine:
crispz-moss (MOSS-Image, Apache 2.0) with the Turbo LoRA (Apache 2.0). The edit keys use
the Moss-Image-Edit LoRA, whose weights state no licence: the app marks them not for
client work.
