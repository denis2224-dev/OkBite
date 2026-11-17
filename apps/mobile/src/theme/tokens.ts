/** Light only. "Moss": Forest primary, Sage soft fills, Ivory page and cards, Ink text. Flat, no gradients. */
export const light = {
 ground:'#F2EFE8',surface:'#F8F6F1',ink:'#2A2B29',muted:'#5E645E',border:'#E2DED4',divider:'#E9E6DE',
 primary:'#2F5136',primaryPressed:'#25412B',onPrimary:'#FFFFFF',accent:'#A9BEA0',onAccent:'#25412B',sage:'#A9BEA0',sageSoft:'#DDE5D6',
 soft:'#DDE5D6',mint:'#DDE5D6',highlightBg:'#EEF2EA',
 good:'#2F5136',goodTier:'#4A7343',goodBg:'#E6EDE1',medium:'#7D5410',mediumBg:'#F5EAD3',low:'#9A4A2C',badTier:'#7E3322',lowBg:'#F5E1D6',
 neutral:'#4A4F49',neutralBg:'#DDE5D6',hero:'#2F5136',heroText:'#FFFFFF',heroMuted:'#D5E0D0',
 scrim:'rgba(0,0,0,0.5)',transparent:'transparent',focus:'#2F5136',offline:'#2A2C27',
 warning:'#6B4A0E',warningBg:'#F6ECD6',warningBorder:'#E3CF9F',favorable:'#2F5136',favorableBg:'#E6EDE1',
 themeButton:'#DDE5D6',themeIcon:'#5E645E',themeSelected:'#2F5136',themeSelectedIcon:'#DDE5D6',
 cameraBackground:'#000000',cameraPanel:'#0E1A14',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
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
/** The only shadow allowed in the app (cards that need it, bottom nav, sheets). Buttons and chips stay flat. */
export const softShadow = {
 shadowColor: light.ink, shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
} as const;
