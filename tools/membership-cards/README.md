# Nikadi membership cards

Four designs, the same in print and in the member app:
- Silver "Pearl": pearl silver with an embossed line drawing of the Nikadi building.
- Gold "Lotus": temple maroon with a gold lotus mandala and a double gold frame (gold hot-foil).
- Platinum "Chandra": sister of the Gold card. Midnight blue, double platinum frame, a moon mandala (the 28 phases of the moon around a fine-line lotus and a full moon) and a few stars (silver hot-foil).
- Platinum Plus "Noir": smooth matte black metal with a soft sheen, the Nikadi Guest House lockup in 24k gold, PLATINUM PLUS engraved; no lines or patterns.

Files:
- engine.py: a small vector engine (PDF CMYK/spot colours + SVG), with text drawn as outlines.
- designs.py: the four designs, front and back.
- mark-raw.svg: the logo mark, vectorised.
- build2.py: `python3 build2.py OUTDIR "Member Name" "NK 0001 2026" 2026` makes:
  - Nikadi-Membership-Cards-Silver-Gold-Platinum.pdf (PVC, CMYK, 3 mm bleed, foil pages)
  - Nikadi-Platinum-Plus-Metal-Card.pdf (proofs + ENGRAVE / GOLD_24K / PERSONALISE / DIELINE layers)
  - Nikadi-Membership-Cards-1200dpi-PNG.zip (every side as a 1200 dpi PNG)

App artwork: run `python3 export_app.py` after design changes (writes app/icons/card-<tier>.svg) and raise the ?v= on those images in app/app.css and site/src.html.
