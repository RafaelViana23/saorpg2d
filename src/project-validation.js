const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const invalid = (message) => {
  throw new Error(`Projeto incompatível: ${message}`);
};

export function validateImportedProject(project) {
  if (!isObject(project)) invalid("o arquivo deve conter um objeto JSON.");
  if (!isObject(project.maps) || !Object.keys(project.maps).length)
    invalid("nenhum mapa foi encontrado.");
  if (!Array.isArray(project.assets)) invalid("a lista de assets está ausente.");
  if (!isObject(project.folders)) invalid("a estrutura de pastas está ausente.");

  for (const [id, map] of Object.entries(project.maps)) {
    if (!id || !isObject(map)) invalid("existe um mapa inválido.");
    if (!Number.isInteger(map.w) || !Number.isInteger(map.h) || map.w < 1 || map.h < 1)
      invalid(`o mapa "${id}" tem dimensões inválidas.`);
    if (map.w > 500 || map.h > 500)
      invalid(`o mapa "${id}" excede o limite seguro de 500×500.`);
    if (!Array.isArray(map.objects)) invalid(`os objetos do mapa "${id}" são inválidos.`);
    if (!isObject(map.portals)) invalid(`os portais do mapa "${id}" são inválidos.`);
  }

  const assetIds = new Set();
  for (const asset of project.assets) {
    if (!isObject(asset) || typeof asset.id !== "string" || !asset.id.trim())
      invalid("existe um asset sem identificador.");
    if (assetIds.has(asset.id)) invalid(`o asset "${asset.id}" está duplicado.`);
    assetIds.add(asset.id);
  }

  if (project.current && !project.maps[project.current])
    invalid("o mapa atual não existe.");

  return project;
}
