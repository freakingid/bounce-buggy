# Bounce Buggy

A browser-based vehicular-combat racer, built with vanilla JavaScript (ES
modules) and Canvas 2D. No runtime dependencies, no bundler — served as
static files.

This is a modern take on a 1982 arcade design: the coordinate space, physics
rules, and scoring are implemented faithfully, while obsolete hardware limits
(low refresh rate, sprite counts, colour depth) are not reproduced.

## Running it

Serve the repository root with any static file server and open `index.html`
in a browser. For example:

```
npx serve .
```

or

```
python3 -m http.server
```

## Running tests

```
node --test test/
```

Uses Node's built-in test runner — no test framework dependency.
