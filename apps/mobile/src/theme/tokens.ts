/** Light only. Cream page; borders and soft fills lean toward the brand green; cards are pure white. */
export const light = {
 ground:'#F7F4EC',surface:'#FFFFFF',ink:'#1C2420',muted:'#56615A',border:'#DFE5DC',divider:'#EBEFE8',primary:'#173A2A',onPrimary:'#FFFFFF',accent:'#C8E07A',onAccent:'#173A2A',soft:'#E8EDE4',mint:'#E3EEDF',good:'#1F4A35',goodTier:'#4F7A1F',goodBg:'#E1EEDC',medium:'#6B4600',mediumBg:'#FCEFD2',low:'#8E3417',lowBg:'#FBE3D8',neutral:'#3F4842',neutralBg:'#E8EDE4',hero:'#173A2A',heroText:'#FFFFFF',heroMuted:'#D3E1D6',scrim:'rgba(0,0,0,0.5)',transparent:'transparent',focus:'#4F7A1F',offline:'#2A2C27',warning:'#5A3D00',warningBg:'#FFF5D9',warningBorder:'#E8D29A',favorable:'#173A2A',favorableBg:'#D5E8CE',themeButton:'#E8EDE4',themeIcon:'#56615A',themeSelected:'#173A2A',themeSelectedIcon:'#C8E07A',cameraBackground:'#000000',cameraPanel:'#0E1A14',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
 // CALM kit colours (kept for the CALM components merged in; Option A values above win)
 textSecondary:'#55524C',primaryDark:'#355C40',greenLight:'#A3C4A4',mist:'#D3E6D4',successBg:'#DFEDE0',chipSelectedBg:'#E6F0E6',sand:'#D4BFA6',
 track:'#E3DCD2',switchOff:'#DDD6CC',checkboxBorder:'#8F877C',dangerBg:'#F5DFCF',dangerText:'#8A4E3A',cameraBg:'#2F3E33',
};
export type Palette = typeof light;
/** Soft raised shadows used by the CALM kit components (RN 0.88 `boxShadow`). */
export const shadows = {
 raised:'6px 6px 16px rgba(120,105,85,0.14)',
 raisedSm:'3px 3px 8px rgba(120,105,85,0.14)',
 nav:'6px 6px 18px rgba(120,105,85,0.20)',
 primaryGlow:'0px 8px 16px rgba(74,112,85,0.30)',
 inset:'inset 2px 2px 4px rgba(120,105,85,0.18)',
};
export const radii = {small:12,card:20,hero:24,pill:999,cardSm:22,badge:20,listBadge:14,tile:14,image:20,nav:30,segment:18,segmentTab:14};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48,screenX:22,screenTop:32,section:20,cardPad:20,navClearance:130};
export const fonts = {body:'Manrope_500Medium',medium:'Manrope_600SemiBold',bold:'Manrope_700Bold',heading:'BricolageGrotesque_700Bold',headingExtra:'BricolageGrotesque_800ExtraBold',light:'Manrope_400Regular'};
/** One ladder, about 1.2x per step from caption to display; `score` is reserved for the score tag. */
export const typeScale = {
 score:{fontSize:40,lineHeight:44}, display:{fontSize:26,lineHeight:32}, title:{fontSize:22,lineHeight:28},
 section:{fontSize:18,lineHeight:24}, body:{fontSize:15,lineHeight:23}, caption:{fontSize:12,lineHeight:17}, detail:{fontSize:11,lineHeight:15},
};
