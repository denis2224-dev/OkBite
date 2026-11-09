const lightCore = {
 ground:'#F6F3EB',surface:'#FFFDF8',soft:'#E8EEE4',hero:'#1E4033',
 ink:'#20372C',muted:'#647168',border:'#E6E3D8',controlBorder:'#7D8B7E',
 primary:'#1E4033',onPrimary:'#FFFDF8',accent:'#D1E58A',onAccent:'#1E4033',
 heroText:'#FFFDF8',heroMuted:'#D6E1D7',focus:'#1E4033',
 good:'#356247',goodBg:'#E5EEDF',medium:'#87621F',mediumBg:'#F8EED4',low:'#9B503A',lowBg:'#F6E4DA',
 // Supplied secondary-on-raised is only 4.33:1; use the supplied primary text there.
 neutral:'#20372C',neutralBg:'#E8EEE4',error:'#9C302C',errorBg:'#FBE5E2',info:'#285772',infoBg:'#E5EFF6',
 primaryHover:'#20372C',primaryPressed:'#254638',
 scrim:'rgba(0,0,0,0.5)',transparent:'transparent',
 cameraBackground:'#000000',cameraPanel:'#111111',cameraInk:'#FFFFFF',cameraSuccess:'#B5D5B3',
 cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
};
const darkCore = {
 ...lightCore,ground:'#11241D',surface:'#1B3027',soft:'#2A4236',hero:'#254638',
 ink:'#F4F4E9',muted:'#B8C6BB',border:'#354C40',controlBorder:'#7E9585',
 primary:'#D1E58A',onPrimary:'#1E4033',focus:'#D1E58A',
 good:'#B5D5B3',goodBg:'#2D4837',medium:'#E9CE91',mediumBg:'#493F29',low:'#EDBAA4',lowBg:'#4D332B',
 neutral:'#B8C6BB',neutralBg:'#2A4236',error:'#FFB4AB',errorBg:'#492724',info:'#B5D9F0',infoBg:'#203B4A',
 primaryHover:'#FFFDF8',primaryPressed:'#D6E1D7',
};
// Compatibility aliases keep existing consumers on the same app-wide semantic roles.
const semantic = (c: typeof lightCore) => ({
 ...c,divider:c.border,link:c.primary,mint:c.soft,offline:c.infoBg,
 warning:c.medium,warningBg:c.mediumBg,warningBorder:c.border,success:c.good,successBg:c.goodBg,
 favorable:c.good,favorableBg:c.goodBg,disabledBg:c.soft,disabledText:c.ink,
 hoverSurface:c.ground,pressedSurface:c.surface,loading:c.muted,
 themeButton:c.soft,themeIcon:c.ink,themeSelected:c.primary,themeSelectedIcon:c.onPrimary,
});
export const light = semantic(lightCore);
export type Palette = typeof light;
export const dark: Palette = semantic(darkCore);
export const radii = {small:12,card:20,hero:24,pill:999};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48};
export const fonts = {body:'Manrope_500Medium',medium:'Manrope_600SemiBold',bold:'Manrope_700Bold',heading:'BricolageGrotesque_700Bold'};
