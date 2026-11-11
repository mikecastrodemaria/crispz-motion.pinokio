module.exports = {
  run: [{
    // Remove the cloned app, its two venvs and the FILM weights (re-run Install to
    // rebuild from scratch). The projects are in ../projects and are kept.
    method: "fs.rm",
    params: {
      path: "app"
    }
  }]
}
