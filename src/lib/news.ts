import { failDataAccess } from "@/lib/observability";
import { createSignedUrlMap } from "@/lib/storage/batch-paths";
import { createClient } from "@/lib/supabase/server";

export type NewsPost = { id:string; title:string; summary:string; content:string; scope_type:string; publish_at:string; expires_at:string|null; creator_name:string; cover_bucket:string|null; cover_path:string|null; cover_url?:string };

async function attachCoverUrls(items: NewsPost[]) {
  const supabase = await createClient();
  let signedByPath: Map<string, string>;
  try {
    signedByPath = await createSignedUrlMap(items.flatMap((item) => item.cover_bucket && item.cover_path ? [{ bucket: item.cover_bucket, path: item.cover_path }] : []), 900, (bucket, paths, expires) => supabase.storage.from(bucket).createSignedUrls(paths, expires));
  } catch (error) {
    failDataAccess("news.cover-urls", error);
  }
  return items.map((item) => ({
    ...item,
    cover_url: item.cover_bucket && item.cover_path ? signedByPath.get(`${item.cover_bucket}:${item.cover_path}`) : undefined,
  }));
}

export async function listNews(stationId?: string, limit = 12) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_news", { target_station: stationId ?? null, page_size: limit });
  if (error) failDataAccess("news.list", error);
  return { items: await attachCoverUrls((data ?? []) as NewsPost[]), error: null };
}

export async function getNews(id: string) {
  const { items, error } = await listNews(undefined, 50);
  return { item: items.find((item) => item.id === id) ?? null, error };
}

export async function getNewsFormData() {
  const supabase = await createClient();
  const [permission, regions, stations] = await Promise.all([
    supabase.rpc("can_in_scope", { permission_slug: "news.create", check_station: null, check_region: null }),
    supabase.from("regions").select("id,name").eq("is_active", true),
    supabase.from("stations").select("id,name,city,region_id").eq("is_active", true).is("deleted_at", null),
  ]);
  if (permission.error) failDataAccess("news.permission.global", permission.error);
  if (regions.error) failDataAccess("news.regions", regions.error);
  if (stations.error) failDataAccess("news.stations", stations.error);
  const regionChecks = await Promise.all((regions.data ?? []).map(async (region) => {
    const result = await supabase.rpc("can_in_scope", { permission_slug: "news.create", check_station: null, check_region: region.id });
    if (result.error) failDataAccess("news.permission.region", result.error);
    return result.data === true;
  }));
  const stationChecks = await Promise.all((stations.data ?? []).map(async (station) => {
    const result = await supabase.rpc("can_in_scope", { permission_slug: "news.create", check_station: station.id, check_region: station.region_id });
    if (result.error) failDataAccess("news.permission.station", result.error);
    return result.data === true;
  }));
  const allowedRegions = (regions.data ?? []).filter((_, index) => regionChecks[index]);
  const allowedStations = (stations.data ?? []).filter((_, index) => stationChecks[index]);
  return { canCreate: permission.data === true || allowedRegions.length > 0 || allowedStations.length > 0, canCreateGlobal: permission.data === true, regions: allowedRegions, stations: allowedStations };
}

export async function getEditableNews(id: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase.from("news_posts").select("id,title,summary,content,status,publish_at,expires_at,station_id,region_id").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) failDataAccess("news.editable", error);
  if (!item) return { item: null, error: null };
  const permission = await supabase.rpc("can_in_scope", { permission_slug: "news.edit", check_station: item.station_id, check_region: item.region_id });
  if (permission.error) failDataAccess("news.permission.edit", permission.error);
  return { item: permission.data === true ? item : null, error: null };
}
