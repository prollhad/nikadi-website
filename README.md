## Website pages (read this before editing the website)

The website is built from **one master file: `site/src.html`**. Do not edit `index.html`, `temple.html`, `travel.html`,
`things-to-do.html`, `membership.html`, `css/site.css` or `js/site.js` by hand; they are generated.

1. Edit `site/src.html` (sections, styles and scripts are all in it).
2. Run `python3 tools/build-pages.py`.
3. Commit everything and push.

Which section goes on which page is set in `PAGES` at the top of `tools/build-pages.py`. Links between pages
(`href="#temple"` and so on) are fixed by the script, and old links like `/#temple` redirect to the new page.

# nikadi-website
## Languages (বাংলা, हिन्दी, Русский, 中文, Español)

The site is written in English in `site/src.html`; a small script swaps the text for the visitor's language
using `data/i18n/<lang>.json` (chosen from the globe button, remembered, and kept in links as `?lang=`).

- Page text: `data/i18n/work/items.json` lists every English text; `work/tNN.json` holds the translations by number.
- Text the scripts write (live temple status, trains, prices, calendar, weather): `work/extra.json`,
  where `{0}` stands for a number and `{D}` for a duration like "2 h 5 min".
- After editing translations run `python3 tools/i18n-build.py`, then `python3 tools/build-pages.py`,
  and raise the `?v=` number on the `/data/i18n/` fetch in `site/src.html` so visitors get the new file.
- New or changed English text shows in English until it is translated. Add it to `extra.json`
  (simplest), or re-run `tools/i18n-extract.py` and translate the new items. Re-extracting renumbers
  `items.json`, so check that the `tNN.json` numbers still match before building.
- Addresses, bank details and brand names stay in English on purpose.
