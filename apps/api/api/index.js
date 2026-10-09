// Vercel serverless function — delegates to the compiled NestJS handler.
// (Plain JS on purpose: it requires the tsc-compiled output, so there are
// no TS path-resolution surprises at deploy time.)
module.exports = require('../dist/vercel-handler.js').default;
