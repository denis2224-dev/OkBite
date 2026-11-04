import { useEffect,useState } from 'react';
import type { Product,ScoreResult } from '@okbite/shared';
import { api,ApiError } from '../../lib/api';
import { isPreview } from '../../lib/preview';
import { previewEntries } from '../../test/fixtures';
import { saveToHistory,getFromHistory } from '../history/store';
export function useProduct(id:string){const [state,setState]=useState<{data?:{product:Product;score:ScoreResult};error?:ApiError;id?:string;loading:boolean;storageError?:boolean}>({loading:true});useEffect(()=>{let active=true;async function load(){try{const result=isPreview?previewEntries.find(entry=>entry.product.id===id):await api.lookup({id});if(!result||result.status!=='found')throw new ApiError('not_found');let storageError=false;try{await saveToHistory(result);}catch{storageError=true;}if(active)setState({id,data:result,loading:false,storageError});}catch(error){if(error instanceof ApiError&&error.code==='offline'){try{const cached=await getFromHistory(id);if(cached){if(active)setState({id,data:cached,loading:false});return;}}catch{}}if(active)setState({id,error:error instanceof ApiError?error:new ApiError('upstream_failed'),loading:false});}}void load();return()=>{active=false;};},[id]);return state.id===id?state:{loading:true};}
