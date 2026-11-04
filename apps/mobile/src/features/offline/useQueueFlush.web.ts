import { useEffect } from 'react';
import { flushQueue } from './queue';
import { useToast } from '../../ui/Toast';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
export function useQueueFlush(){const toast=useToast();useEffect(()=>{if(isPreview)return;const flush=()=>{void flushQueue().then(({resolved})=>{if(resolved)toast(ro.offline.resolved(resolved));}).catch(()=>toast(ro.offline.queueError));};window.addEventListener('online',flush);const visible=()=>{if(document.visibilityState==='visible'&&navigator.onLine)flush();};document.addEventListener('visibilitychange',visible);if(navigator.onLine)flush();return()=>{window.removeEventListener('online',flush);document.removeEventListener('visibilitychange',visible);};},[toast]);}
