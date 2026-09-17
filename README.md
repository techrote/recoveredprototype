# Recovered Prototype

A reconstructed, self-contained glitch-art generator recovered from the repository's corrupted single-file artifact.

The original `artifact` file is retained untouched as recovery evidence. The rebuild recovers the coherent design ideas visible in the surviving fragments: deterministic seeds, displacement, channel faults, reduced bit depth, temporal feedback, partial refresh and typed mutation.

This is a behavioral reconstruction, not a claim of byte-for-byte restoration of an unknowable original tree.

## Run

Open `index.html` in a modern browser. No install, build step, server, account or network connection is required.

On Windows, double-click `0Play.cmd`. On Linux/macOS, run `./0Play.sh`.

## Use

1. Open an image, or use the generated test card.
2. Enable/disable fault operators and adjust parameters.
3. Press **MUTATE** to explore deterministic nearby parameter sets.
4. Use frame controls for temporal effects.
5. Copy/paste genome JSON to preserve a setup.
6. Export PNG.

## Tests

Node.js is only needed for development tests:

    npm test

There are no npm dependencies.
