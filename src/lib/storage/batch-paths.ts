export type StoragePath = { bucket: string; path: string };

export function groupStoragePaths(items: StoragePath[]) {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const paths = groups.get(item.bucket) ?? [];
    if (!paths.includes(item.path)) paths.push(item.path);
    groups.set(item.bucket, paths);
  }
  return groups;
}
