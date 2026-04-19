"""Strip the white background from the brand icon and emit build/icon.png.

The source asset is exported from a generator that fills the canvas with solid
white instead of leaving it transparent. We compute alpha per pixel based on
proximity to white so anti-aliased edges fade smoothly instead of leaving a
hard halo.
"""
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "public" / "icons" / "juandeng-icon-v2.png"
OUT_DIR = Path(__file__).resolve().parents[1] / "build"
OUT = OUT_DIR / "icon.png"


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    pixels = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, _ = pixels[x, y]
            # Distance from pure white in [0, 765]; 0 means fully white.
            dist = (255 - r) + (255 - g) + (255 - b)
            if dist <= 6:
                pixels[x, y] = (r, g, b, 0)
            elif dist <= 60:
                # Gentle ramp so anti-aliased edges fade out instead of clipping.
                alpha = int(255 * (dist - 6) / (60 - 6))
                pixels[x, y] = (r, g, b, alpha)
            # Else keep original opaque pixel.
    src.save(OUT, format="PNG")
    print(f"wrote {OUT} ({w}x{h})")


if __name__ == "__main__":
    main()
