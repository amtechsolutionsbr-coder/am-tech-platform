const catalogPaths=new Set(['/api/clients','/api/products','/api/plans','/api/subscriptions','/api/quotes','/api/client-apps','/api/support']);
// Existing selectors and lists receive every page, instead of silently losing older records.
export async function fetchCatalog(input,options){
 const url=new URL(input,globalThis.location?.origin||'http://localhost');
 if(!catalogPaths.has(url.pathname)||(options?.method&&options.method!=='GET'))return fetch(input,options);
 const items=[];let page=1;
 while(true){
  url.searchParams.set('page',String(page));url.searchParams.set('page_size','200');
  const response=await fetch(url.href,options);
  if(!response.ok)return response;
  const body=await response.json();if(!Array.isArray(body.items))throw Error('Resposta de cadastro inválida');
  items.push(...body.items);
  const pagination=body.pagination;
  if(!pagination||page*pagination.page_size>=pagination.total)return new Response(JSON.stringify({items}),{status:200,headers:{'content-type':'application/json'}});
  if(!body.items.length||page>=1000000)throw Error('Não foi possível concluir a consulta de todos os registros');
  page++;
 }
}
