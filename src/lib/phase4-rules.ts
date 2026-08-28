export type Scope={kind:"global"|"region"|"station";regionId?:string;stationId?:string};
export function canSeeOperation(viewerStations:string[],postStation:string,published:boolean,isOwner:boolean){return published?viewerStations.includes(postStation):isOwner}
export function canEditOperation(createdAt:number,now:number,isOwner:boolean,canEditOwn:boolean,canOverride:boolean){return canOverride||(isOwner&&canEditOwn&&now<=createdAt+60*60*1000)}
export function announcementScopeMatches(scope:Scope,userStations:string[],userRegions:string[]){if(scope.kind==="global")return true;if(scope.kind==="region")return Boolean(scope.regionId&&userRegions.includes(scope.regionId));return Boolean(scope.stationId&&userStations.includes(scope.stationId))}
export function markRead(ids:Set<string>,id:string){return new Set([...ids,id])}
export function markAllRead(ids:string[]){return new Set(ids)}
export function deduplicateNotifications(keys:string[]){return [...new Set(keys)]}
export function identityLabel(input:{name:string;roles:string[];stations:string[];email?:string}){return`${input.name} — ${input.roles.join(" + ")||"Rol yok"} — ${input.stations[0]??"İstasyon yok"}${input.stations.length>1?` +${input.stations.length-1} istasyon`:""}${input.email?` — ${input.email}`:""}`}
export function removeException<T extends{id:string}>(items:T[],id:string,authorized:boolean){if(!authorized)throw new Error("forbidden");return items.filter(x=>x.id!==id)}

