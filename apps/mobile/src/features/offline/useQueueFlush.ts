import { useEffect } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { flushQueue } from './queue';
import { useToast } from '../../ui/Toast';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
export function useQueueFlush(){const toast=useToast();useEffect(()=>{if(isPreview)return;const flush=()=>{void flushQueue().then(({resolved})=>{if(resolved)toast(ro.offline.resolved(resolved));}).catch(()=>toast(ro.offline.queueError));};const unsubscribe=NetInfo.addEventListener(state=>{if(state.isConnected&&state.isInternetReachable!==false)flush();});const foreground=AppState.addEventListener('change',state=>{if(state==='active')flush();});return()=>{unsubscribe();foreground.remove();};},[toast]);}
