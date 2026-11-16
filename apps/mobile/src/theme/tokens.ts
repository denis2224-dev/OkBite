/** Light only. Neutrals lean toward the brand green so every grey belongs to the palette; cards are pure white. */
export const light = {
 ground:'#F3F5F0',surface:'#FFFFFF',ink:'#1C2420',muted:'#56615A',border:'#DFE5DC',divider:'#EBEFE8',primary:'#173A2A',onPrimary:'#FFFFFF',accent:'#C8E07A',onAccent:'#173A2A',soft:'#E8EDE4',mint:'#E3EEDF',good:'#1F4A35',goodBg:'#E1EEDC',medium:'#6B4600',mediumBg:'#FCEFD2',low:'#8E3417',lowBg:'#FBE3D8',neutral:'#3F4842',neutralBg:'#E8EDE4',hero:'#173A2A',heroText:'#FFFFFF',heroMuted:'#D3E1D6',scrim:'rgba(0,0,0,0.5)',transparent:'transparent',focus:'#4F7A1F',offline:'#2A2C27',warning:'#5A3D00',warningBg:'#FFF5D9',warningBorder:'#E8D29A',favorable:'#173A2A',favorableBg:'#D5E8CE',themeButton:'#E8EDE4',themeIcon:'#56615A',themeSelected:'#173A2A',themeSelectedIcon:'#C8E07A',cameraBackground:'#000000',cameraPanel:'#0E1A14',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
};
export type Palette = typeof light;
export const radii = {small:12,card:20,hero:24,pill:999};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48};
export const fonts = {body:'Manrope_500Medium',medium:'Manrope_600SemiBold',bold:'Manrope_700Bold',heading:'BricolageGrotesque_700Bold',headingExtra:'BricolageGrotesque_800ExtraBold'};
/** One ladder, about 1.2x per step from caption to display; `score` is reserved for the score tag. */
export const typeScale = {
 score:{fontSize:40,lineHeight:44}, display:{fontSize:26,lineHeight:32}, title:{fontSize:22,lineHeight:28},
 section:{fontSize:18,lineHeight:24}, body:{fontSize:15,lineHeight:23}, caption:{fontSize:13,lineHeight:19},
};
