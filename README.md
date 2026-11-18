## Website pages (read this before editing the website)

The website is built from **one master file: `site/src.html`**. Do not edit `index.html`, `temple.html`, `travel.html`,
`things-to-do.html`, `membership.html`, `css/site.css` or `js/site.js` by hand; they are generated.

1. Edit `site/src.html` (sections, styles and scripts are all in it).
2. Run `python3 tools/build-pages.py`.
3. Commit everything and push.

Which section goes on which page is set in `PAGES` at the top of `tools/build-pages.py`. Links between pages
(`href="#temple"` and so on) are fixed by the script, and old links like `/#temple` redirect to the new page.

# nikadi-website