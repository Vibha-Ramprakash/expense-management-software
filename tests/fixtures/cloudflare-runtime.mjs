export const bindingReads = [];
export const env = new Proxy({}, {
  get(_target, name) {
    bindingReads.push(String(name));
    throw new Error("A blocked production route must not access Worker bindings.");
  },
});
