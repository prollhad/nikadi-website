# Membership card print files

`python3 build.py OUTDIR` makes:
- `Nikadi-Platinum-Card-Print.pdf`: personalised PVC card, CMYK with 3 mm bleed, optional SILVER_FOIL layer.
- `Nikadi-Platinum-Plus-Metal-Card.pdf`: black stainless-steel card, with separate spot-colour layers (ENGRAVE, GOLD_24K, PERSONALISE, DIELINE) and colour proofs.

To make a card for a member, change the name, number and year in the `__main__` block of build.py.
All text is converted to outlines. Fonts: Italiana, Work Sans and Instrument Serif (OFL), from the canvas-fonts folder.
