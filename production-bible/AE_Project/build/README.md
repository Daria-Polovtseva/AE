# build/

`manifest.json` is the authoritative, ordered list of source modules. Each stage appends its modules.
`tools/build.js` reads it to assemble `dist/FINAL_PROJECT.jsx`. Nothing here is executed inside AE —
this directory holds build configuration only.
