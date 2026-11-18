/** Light only. "Moss" soft depth: forest primary, sage fills, ivory page and cards, ink text. Depth lives in `theme/depth.ts`. */
export const light = {
 ground:'#F6F5F0',surface:'#F3F2EC',ink:'#2A2B29',muted:'#5C605B',border:'#E3E0D6',divider:'#E3E0D6',
 primary:'#1E5B3E',primaryPressed:'#174A32',primaryLight:'#2C7350',onPrimary:'#FFFFFF',accent:'#BBDCC7',onAccent:'#1E5B3E',sage:'#BBDCC7',sageSoft:'#D3E8DA',
 soft:'#D3E8DA',mint:'#D3E8DA',highlightBg:'#EEF3EC',
 good:'#1E5B3E',goodTier:'#4A7343',goodBg:'#E3EFE6',medium:'#7D5410',mediumBg:'#F5EAD3',low:'#9A4A2C',badTier:'#7E3322',lowBg:'#F5E1D6',
 neutral:'#4A4F49',neutralBg:'#D3E8DA',hero:'#1E5B3E',heroText:'#FFFFFF',heroMuted:'#D5E6DA',
 scrim:'rgba(0,0,0,0.5)',transparent:'transparent',focus:'#1E5B3E',offline:'#2A2C27',
 warning:'#6B4A0E',warningBg:'#F6ECD6',warningBorder:'#E3CF9F',favorable:'#1E5B3E',favorableBg:'#E3EFE6',
 themeButton:'#D3E8DA',themeIcon:'#5C605B',themeSelected:'#1E5B3E',themeSelectedIcon:'#D3E8DA',
 cameraBackground:'#000000',cameraPanel:'#0E1A14',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
};
export type Palette = typeof light;
export const radii = {small:14,card:22,hero:28,pill:999};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48};
export const fonts = {body:'DMSans_400Regular',medium:'DMSans_500Medium',bold:'DMSans_600SemiBold',heading:'CormorantGaramond_600SemiBold',headingExtra:'CormorantGaramond_700Bold'};
/** One ladder, about 1.2x per step from caption to display; `score` is reserved for the score tag. */
export const typeScale = {
 score:{fontSize:40,lineHeight:44}, display:{fontSize:34,lineHeight:40}, title:{fontSize:30,lineHeight:36},
 section:{fontSize:22,lineHeight:28}, body:{fontSize:15,lineHeight:23}, caption:{fontSize:13,lineHeight:19},
};
/** A faint single shadow for places that must stay quiet. Raised and pressed surfaces use `depth` (theme/depth.ts). */
export const softShadow = {
 shadowColor: light.ink, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
} as const;
