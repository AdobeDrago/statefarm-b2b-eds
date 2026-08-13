# Universal Editor (UE) — AEM Cloud / XWalk

This project uses Adobe Universal Editor with the **XWalk** plugin (`plugins.xwalk`), not the DA Live plugin used by some other EDS projects.

## Layout

Source models live under `ue/models/` (excluded from delivery via `.hlxignore`).
`npm run build:json` merges them into the root files AEM serves:

- `component-definition.json`
- `component-models.json`
- `component-filters.json`

```
ue/
├── models/
│   ├── _component-definition.json  # merge entry
│   ├── _component-models.json
│   ├── _component-filters.json
│   ├── page.json / section.json / text.json / title.json / image.json / button.json
│   └── blocks/{blockname}.json
└── scripts/
    ├── ue-utils.js                 # moveInstrumentation helpers
    └── ue.js                       # observers for DOM-mutating blocks
```

## Workflow

1. Edit a source file under `ue/models/` (or `ue/models/blocks/`).
2. Run `npm run build:json` (Husky also runs this when those files are staged).
3. Commit both the source partial and the three generated root files.

## Runtime

- `scripts/editor-support.js` — XWalk live patch / richtext support (loaded by AEM UE).
- `ue/scripts/ue.js` — observers that re-attach `data-aue-*` when cards mutate DOM.
- Block JS calls `moveInstrumentation` when replacing authored nodes.
