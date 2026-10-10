// Vercel serverless function — delegates to the compiled NestJS handler.
// NOTE: apps/api/package.json has "type": "module", so this file is ESM:
// use import/export, NOT module.exports/require (those crash here).
import handler from '../dist/vercel-handler.js';

export default handler;
