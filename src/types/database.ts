export type ProfileStatus="pending"|"active"|"suspended"|"banned"|"deleted";
export type ScopeType="global"|"station"|"both";
export type Station={id:string;city:string;name:string;slug:string;is_active:boolean};
export type EffectiveAccess={isOp:boolean;globalPermissions:Set<string>;stationPermissions:Map<string,Set<string>>;deniedGlobal:Set<string>;deniedByStation:Map<string,Set<string>>};
