const { getConnectionForScope, getMasterConnection } = require("../config/db");
const { getRequestContext } = require("../lib/requestContext");

function createScopedModel(modelName, schema, options = {}) {
  const scope = options.scope || "request";

  function resolveConnection() {
    if (scope === "master") {
      return getMasterConnection();
    }

    const context = getRequestContext();
    if (context?.tenantDbName) {
      return getConnectionForScope({ scope: "tenant", tenantDbName: context.tenantDbName });
    }

    if (context?.scope === "master") {
      return getMasterConnection();
    }

    return getMasterConnection();
  }

  function resolveModel() {
    const connection = resolveConnection();
    if (!connection) {
      throw new Error(`Database connection is not ready for model ${modelName}.`);
    }

    return connection.models[modelName] || connection.model(modelName, schema);
  }

  const proxyTarget = function scopedModelProxy() {
    return resolveModel();
  };

  return new Proxy(proxyTarget, {
    apply(_target, thisArg, argumentsList) {
      const Model = resolveModel();
      return Model.apply(thisArg, argumentsList);
    },
    construct(_target, argumentsList) {
      const Model = resolveModel();
      return new Model(...argumentsList);
    },
    get(_target, property) {
      if (property === "schema") {
        return schema;
      }

      if (property === "getModel") {
        return resolveModel;
      }

      const Model = resolveModel();
      const value = Model[property];
      return typeof value === "function" ? value.bind(Model) : value;
    },
  });
}

module.exports = createScopedModel;
