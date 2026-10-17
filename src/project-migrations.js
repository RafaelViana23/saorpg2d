const clone = (value) => structuredClone(value);

export function captureProjectContent(project) {
  return clone({
    maps: project.maps || {},
    assets: project.assets || [],
    folders: project.folders || {},
    floors: project.floors || [],
    current: project.current,
    currentFloor: project.currentFloor,
  });
}

function mergeAssets(migrated = [], preserved = []) {
  const byId = new Map(migrated.map((asset) => [asset.id, asset]));
  for (const asset of preserved) {
    const migratedAsset = byId.get(asset.id);
    byId.set(asset.id, migratedAsset ? { ...migratedAsset, ...asset } : asset);
  }
  return [...byId.values()];
}

function mergeFolders(migrated = {}, preserved = {}) {
  const result = clone(migrated);
  for (const [folderName, subfolders] of Object.entries(preserved)) {
    result[folderName] ||= {};
    for (const [subfolderName, assetIds] of Object.entries(subfolders || {})) {
      const migratedIds = result[folderName][subfolderName] || [];
      result[folderName][subfolderName] = [...new Set([...assetIds, ...migratedIds])];
    }
  }
  return result;
}

function mergeFloors(migrated = [], preserved = []) {
  const byId = new Map(migrated.map((floor) => [floor.id, floor]));
  for (const floor of preserved) {
    const migratedFloor = byId.get(floor.id);
    byId.set(
      floor.id,
      migratedFloor
        ? {
            ...migratedFloor,
            ...floor,
            maps: [...new Set([...(floor.maps || []), ...(migratedFloor.maps || [])])],
          }
        : floor,
    );
  }
  return [...byId.values()];
}

export function restoreProjectContent(migratedProject, preserved) {
  migratedProject.maps = {
    ...(migratedProject.maps || {}),
    ...clone(preserved.maps),
  };
  migratedProject.assets = mergeAssets(migratedProject.assets, preserved.assets);
  migratedProject.folders = mergeFolders(migratedProject.folders, preserved.folders);
  migratedProject.floors = mergeFloors(migratedProject.floors, preserved.floors);

  if (preserved.current && migratedProject.maps[preserved.current])
    migratedProject.current = preserved.current;
  if (
    preserved.currentFloor &&
    migratedProject.floors.some((floor) => floor.id === preserved.currentFloor)
  )
    migratedProject.currentFloor = preserved.currentFloor;

  return migratedProject;
}
