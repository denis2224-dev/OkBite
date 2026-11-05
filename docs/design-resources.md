# Design resources

These upstream skills are installed in `.agents/skills/` for this project.
They provide guidance to the coding agent; they are not application dependencies.
They are available to the editor on the next turn after skill discovery refreshes.

## Sources and purpose

- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): searchable design, typography, color, UX, and stack guidance.
- [Hallmark](https://github.com/Nutlope/hallmark): visual direction and avoiding generic generated layouts.
- [Emil Kowalski](https://github.com/emilkowalski/skills): design engineering, purposeful animation, and animation performance.
- [shadcn/ui](https://github.com/shadcn-ui/ui): official skill for finding, composing, and styling components. The component library itself is not installed.
- [Vercel agent skills](https://github.com/vercel-labs/agent-skills): web interface review, React performance, and composition patterns. Deployment skills are not installed.

## Usage

Ask for the desired work normally, or name a skill explicitly, for example:

- “Use UI/UX Pro Max and Hallmark to design the barcode scan results screen.”
- “Use Emil's design engineering guidance to polish this interaction.”
- “Review this screen with web-design-guidelines.”
- “Use the shadcn skill to choose accessible form components.”

The agent reads `AGENTS.md` to select relevant skills. React and shadcn guidance
is conditional on the chosen application stack. Existing product requirements
and an approved design remain authoritative.

## Reproducibility

`design-skills-lock.json` records the upstream commit and path for each skill.
The installer copied each complete skill directory, including its references,
rules, scripts, and data where provided. Review updates before replacing these
copies. Use the the editor skill installer's `--dest .agents/skills --ref <commit>`
options when installing future versions into this project; it will refuse to
overwrite an existing skill directory.

UI/UX Pro Max's upstream examples reference Claude plugin paths. Use
`python3 .agents/skills/ui-ux-pro-max/scripts/search.py` here instead.
The web-design-guidelines skill fetches its current review checklist online;
that checklist is not pinned by the installed skill commit.
