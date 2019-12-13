<h1 align="center">Jellyfin ApiClient.js</h1>
<h3 align="center">Part of the <a href="https://jellyfin.media">Jellyfin Project</a></h3>

<p align="center">
Jellyfin ApiClient.js is a JavaScript library for interacting with Jellyfin's REST API.
</p>


## Notes

- This library depends on the native fetch and Promise APIs. These will be expected to be polyfilled if used in a browser that doesn't support them.

## Building the ApiClient

```sh
yarn install
yarn build
```

This will build the library in production mode. To build the library in development mode instead, run `yarn dev`.


## Building documentation

This library is documented using [JSDoc](https://jsdoc.app/) style comments. Documentation can be generated in HTML format by running `yarn docs`. The resulting documentation will be saved in the `docs/` directory.
