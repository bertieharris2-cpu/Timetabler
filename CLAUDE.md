# Lifehouse Timetabler

`lifehouse-timetabler.html` is the whole app: one offline HTML file. Test with `NODE_PATH="$(npm root -g)" node tests/app.test.js`.

## Design system

The look is defined in the **Lifehouse Timetabler** design system: https://claude.ai/artifact/TawDCssK7c6xQ3K6Rc124c (read its `project/README.md` first). Change the design system first, then apply it here. Key rules:

- Square corners everywhere (`radius-0`). No rounded borders.
- Colour has one job each: `accent` navy for "here", main actions and the main building, `pupil` blue and `staff` green for people only, `ppa` purple for PPA, Cover on `accent-soft`, `off` orange for off-site, `out` green for outdoor places, `hall` grey for the Village Hall, `top` navy and `save` gold for the top bar, and `ok` / `warn` / `bad` for status only.
- Never colour alone: staff chips have a solid left edge, and the period strip shows ✓, a number or !.
- One family, Segoe UI then the system face, with the design system's named type styles.
- Plain British English, sentence case, the school's own words (pupils, staff, P1–P4, PPA, Cover). No emoji.
- The map style is **Navy plan** (design system → Map styles): rooms touch like a floor plan with hairline walls and no shadows, buildings have 2px walls and a name tab, outlines in one `group` are one building, rooms have line icons, and open-plan rooms (Learning Spaces 1–3) share dashed walls.

## Privacy

This repository is public. Never commit pupils' or real staff names, people lists, backups, the school's floor plan picture, or place names that identify the school. Examples use made-up names.
