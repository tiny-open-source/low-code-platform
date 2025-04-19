export function isCustomModel(model: string) {
  const customModelRegex
    = /_model-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{3,4}-[a-f0-9]{4}/;
  return customModelRegex.test(model);
}
