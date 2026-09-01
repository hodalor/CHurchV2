const { AsyncLocalStorage } = require("async_hooks");

const requestContextStorage = new AsyncLocalStorage();

function runWithRequestContext(store, callback) {
  return requestContextStorage.run(store, callback);
}

function getRequestContext() {
  return requestContextStorage.getStore() || null;
}

function setRequestContext(updates = {}) {
  const currentStore = getRequestContext();
  if (!currentStore) {
    return null;
  }

  Object.assign(currentStore, updates);
  return currentStore;
}

module.exports = {
  getRequestContext,
  runWithRequestContext,
  setRequestContext,
};
