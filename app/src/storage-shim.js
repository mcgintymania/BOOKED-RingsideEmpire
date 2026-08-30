window.storage = {
  get: async (key, shared) => {
    const v = localStorage.getItem((shared ? "shared:" : "priv:") + key);
    return v !== null ? { key, value: v, shared: !!shared } : null;
  },
  set: async (key, value, shared) => {
    localStorage.setItem((shared ? "shared:" : "priv:") + key, value);
    return { key, value, shared: !!shared };
  },
  delete: async (key, shared) => {
    localStorage.removeItem((shared ? "shared:" : "priv:") + key);
    return { key, deleted: true, shared: !!shared };
  },
  list: async (prefix, shared) => {
    const p = (shared ? "shared:" : "priv:") + (prefix || "");
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(p)) keys.push(k.slice((shared ? "shared:" : "priv:").length));
    }
    return { keys, prefix: prefix || undefined, shared: !!shared };
  },
};
