# mashlib-di

Solid data browser with **data island** support. Forked from [SolidOS/mashlib](https://github.com/SolidOS/mashlib).

Data islands let you embed RDF data directly in HTML. The browser reads from the page first, then falls back to fetching remote URIs.

## Data Islands

Embed Turtle, N3, JSON-LD, or RDF/XML in your HTML:

```html
<script type="text/turtle">
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<#me> a foaf:Person ;
  foaf:name "Alice" .
</script>
```

Supported types: `text/turtle`, `text/n3`, `application/ld+json`, `application/rdf+xml`

Use `data-base` to set the base URI for a data island:

```html
<script type="text/turtle" data-base="https://alice.example/profile/card">
@prefix foaf: <http://xmlns.com/foaf/0.1/> .
<#me> a foaf:Person ;
  foaf:name "Alice" .
</script>
```

Multiple data islands on a single page are supported.

## Why

- Static HTML sites can serve Solid-compatible data with zero server
- Works offline — data is in the page
- GitHub Pages, IPFS, anywhere — just HTML files
- Progressive enhancement — data is present whether JS loads or not

## Development

```bash
npm ci
npm run build
npm start
```

## License

MIT
