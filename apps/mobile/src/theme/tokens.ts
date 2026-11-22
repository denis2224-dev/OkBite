/** CALM / KIT palette. Light only. Old key names stay so imports keep working; new keys follow the spec. */
export const light = {
 // base
 ground:'#F4EFE8',surface:'#F7F3EE',ink:'#2B2B28',textSecondary:'#55524C',muted:'#6F6A63',border:'#E6DFD5',divider:'#E6DFD5',
 // brand
 primary:'#4A7055',primaryDark:'#355C40',onPrimary:'#FFFFFF',accent:'#5E8C68',onAccent:'#FFFFFF',
 greenLight:'#A3C4A4',mist:'#D3E6D4',successBg:'#DFEDE0',chipSelectedBg:'#E6F0E6',sand:'#D4BFA6',
 track:'#E3DCD2',switchOff:'#DDD6CC',checkboxBorder:'#8F877C',dangerBg:'#F5DFCF',dangerText:'#8A4E3A',cameraBg:'#2F3E33',
 // older roles, mapped onto the palette
 soft:'#E3DCD2',mint:'#D3E6D4',good:'#355C40',goodBg:'#DFEDE0',medium:'#2B2B28',mediumBg:'#D4BFA6',low:'#8A4E3A',lowBg:'#F5DFCF',
 neutral:'#55524C',neutralBg:'#E3DCD2',hero:'#4A7055',heroText:'#FFFFFF',heroMuted:'#D3E6D4',scrim:'rgba(0,0,0,0.5)',transparent:'transparent',
 focus:'#355C40',offline:'#2F3E33',warning:'#5A3D00',warningBg:'#FFF5D9',warningBorder:'#E8D29A',favorable:'#4A7055',favorableBg:'#DFEDE0',
 themeButton:'#E3DCD2',themeIcon:'#6F6A63',themeSelected:'#4A7055',themeSelectedIcon:'#FFFFFF',
 cameraBackground:'#2F3E33',cameraPanel:'#2F3E33',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
};
export type Palette = typeof light;
/** Soft raised UI: a dark shadow bottom-right and a light one top-left (RN 0.88 `boxShadow`, iOS/Android/web). */
export const shadows = {
 raised:'6px 6px 16px rgba(120,105,85,0.14)',
 raisedSm:'3px 3px 8px rgba(120,105,85,0.14)',
 nav:'6px 6px 18px rgba(120,105,85,0.20)',
 primaryGlow:'0px 8px 16px rgba(74,112,85,0.30)',
 inset:'inset 2px 2px 4px rgba(120,105,85,0.18)',
};
export const radii = {small:14,card:24,cardSm:22,hero:24,pill:999,badge:20,listBadge:14,tile:14,image:20,nav:30,segment:18,segmentTab:14};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48,screenX:22,screenTop:32,section:20,cardPad:20,navClearance:130};
export const fonts = {body:'Inter_400Regular',medium:'Inter_500Medium',bold:'Inter_600SemiBold',heading:'Inter_500Medium',headingExtra:'Inter_600SemiBold',light:'Inter_300Light'};
/** Inter only. `score` is reserved for the score badge. */
export const typeScale = {
 score:{fontSize:38,lineHeight:44}, display:{fontSize:30,lineHeight:36}, title:{fontSize:20,lineHeight:26},
 section:{fontSize:19,lineHeight:25}, body:{fontSize:16,lineHeight:24}, caption:{fontSize:13,lineHeight:18},
};
