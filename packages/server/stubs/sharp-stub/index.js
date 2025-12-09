// Stub implementation of sharp - does nothing
// This is used to replace sharp in airgapped installations where we don't need image processing

module.exports = function sharp() {
  throw new Error('sharp stub: Image processing is not supported in this airgapped build. We only use text embeddings.');
};

// Export common sharp methods as stubs
module.exports.cache = () => {};
module.exports.concurrency = () => {};
module.exports.counters = () => ({ queue: 0, process: 0 });
module.exports.simd = () => false;
module.exports.versions = {
  vips: '8.14.5',
  sharp: '0.32.6'
};
