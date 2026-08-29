export async function mapWithConcurrency<T>(items:T[],limit:number,worker:(item:T)=>Promise<void>){
  const queue=[...items];
  const count=Math.max(1,Math.min(limit,queue.length));
  await Promise.all(Array.from({length:count},async()=>{while(queue.length){const item=queue.shift();if(item!==undefined)await worker(item)}}));
}
