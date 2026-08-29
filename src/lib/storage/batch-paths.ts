export type StoragePath = { bucket: string; path: string };
export type SignedUrlResult = { path?: string|null; signedUrl?: string|null };
export type SignedUrlBatch = { data: SignedUrlResult[] | null; error: unknown };

export function groupStoragePaths(items: StoragePath[]) {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    const paths = groups.get(item.bucket) ?? [];
    if (!paths.includes(item.path)) paths.push(item.path);
    groups.set(item.bucket, paths);
  }
  return groups;
}

export async function createSignedUrlMap(items:StoragePath[],expiresIn:number,sign:(bucket:string,paths:string[],expiresIn:number)=>Promise<SignedUrlBatch>){
  const urls=new Map<string,string>();
  await Promise.all([...groupStoragePaths(items)].map(async([bucket,paths])=>{
    try{
      const{data,error}=await sign(bucket,paths,expiresIn);
      if(error)throw error;
      for(const item of data??[])if(item.path&&item.signedUrl)urls.set(`${bucket}:${item.path}`,item.signedUrl);
    }catch(error){
      const safe=error&&typeof error==="object"?(error as {code?:string}):{};
      console.error("[storage.signed-url]",{bucket,code:safe.code??"unknown"});
    }
  }));
  return urls;
}
