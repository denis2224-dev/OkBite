import { createContext,useContext,useState,useRef,useEffect,type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Body } from './Typography';
import { useTheme } from '../theme/useTheme';
const Context=createContext((message:string)=>{});
export function ToastProvider({children}:PropsWithChildren){const [message,setMessage]=useState('');const timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);const {colors}=useTheme();useEffect(()=>()=>clearTimeout(timer.current),[]);const show=(value:string)=>{clearTimeout(timer.current);setMessage(value);timer.current=setTimeout(()=>setMessage(''),4000);};return <Context.Provider value={show}>{children}{!!message&&<View accessibilityLiveRegion="polite" style={{position:'absolute',bottom:90,alignSelf:'center',maxWidth:440,margin:20,borderRadius:16,padding:16,backgroundColor:colors.primary}}><Body style={{color:colors.onPrimary}}>{message}</Body></View>}</Context.Provider>;}
export function useToast(){return useContext(Context);}
