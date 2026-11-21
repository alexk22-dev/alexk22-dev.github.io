# Alexander Kim — personal site

Source for my personal website: an interactive homepage that presents my research, abstracts and posters, ventures and projects as a gel electrophoresis. Each entry is a lane, each topic a row, and band strength shows how central that topic was to the work.

The homepage has three views (Gel, Timeline, Skills), category filters, three gel styles (agarose, SDS-PAGE, Western blot) and light/dark themes.

## Editing content

All homepage content lives in `_cool/`:

| File                 | What it holds                                                        |
| -------------------- | -------------------------------------------------------------------- |
| `_cool/site.json`    | Name, tagline and header links                                       |
| `_cool/items/*.json` | One file per entry: dates, panel text, links and topic weights (0–1) |
| `_cool/axes.json`    | The topic rows and their order                                       |
| `_cool/skills.json`  | The Skills view: stages, skills and which entries used them          |
| `_cool/logos.json`   | Logos shown beside lane names                                        |

`scripts/build_cool.py` validates these files and compiles them into `assets/cool/data/work.json` (generated, not committed).

## Local preview

The homepage can be previewed without Ruby or Jekyll:

```bash
python3 scripts/build_cool.py                          # validate and compile _cool/
python3 -m unittest discover -s _cool/tests            # tests for the build
python3 scripts/preview_home.py                        # writes .preview/index.html
python3 scripts/preview_home.py --standalone out.html  # a single self-contained file
```

`scripts/shoot_home.mjs` takes screenshots of the preview; it needs `playwright-core`, found through `PW_MODULES` (see the comment at the top of the script).

The other pages (CV, publications, projects) need a full Jekyll build; see the al-folio [install guide](INSTALL.md).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the site with Jekyll and publishes it to the `gh-pages` branch.

## Credits

Built on [al-folio](https://github.com/alshedivat/al-folio), a Jekyll theme for academics (MIT, see [LICENSE](LICENSE)). The interactive homepage is adapted from [RyanKim17920.github.io](https://github.com/RyanKim17920/RyanKim17920.github.io).
