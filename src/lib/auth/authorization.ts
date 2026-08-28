import type { EffectiveAccess } from "@/types/database";
export function can(access:EffectiveAccess,permission:string,stationId?:string){if(access.isOp)return true;if(stationId&&access.deniedByStation.get(stationId)?.has(permission))return false;if(access.deniedGlobal.has(permission))return false;if(access.globalPermissions.has(permission))return true;return Boolean(stationId&&access.stationPermissions.get(stationId)?.has(permission))}
export type PermissionDecision={isOp:boolean;explicitDeny:boolean;userAllow:boolean;roleAllow:boolean};
export function resolvePermission(decision:PermissionDecision){if(decision.isOp)return true;if(decision.explicitDeny)return false;if(decision.userAllow)return true;if(decision.roleAllow)return true;return false}
