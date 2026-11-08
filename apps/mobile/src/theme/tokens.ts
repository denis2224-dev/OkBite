export const light = {
 ground:'#F7F4EC',surface:'#FFFDF8',ink:'#1C2420',muted:'#56615A',border:'#E6E0D2',divider:'#EFEADF',primary:'#173A2A',onPrimary:'#FFFFFF',accent:'#C8E07A',onAccent:'#173A2A',soft:'#ECE7DA',mint:'#E3EEDF',good:'#1F4A35',goodBg:'#E1EEDC',medium:'#6B4600',mediumBg:'#FCEFD2',low:'#8E3417',lowBg:'#FBE3D8',neutral:'#3F4842',neutralBg:'#ECE7DA',hero:'#173A2A',heroText:'#FFFFFF',heroMuted:'#D3E1D6',scrim:'rgba(0,0,0,0.5)',transparent:'transparent',focus:'#7FA83A',offline:'#2A2C27',warning:'#5A3D00',warningBg:'#FFF5D9',warningBorder:'#E8D29A',favorable:'#173A2A',favorableBg:'#D5E8CE',themeButton:'#ECE7DA',themeIcon:'#56615A',themeSelected:'#173A2A',themeSelectedIcon:'#C8E07A',cameraBackground:'#000000',cameraPanel:'#111111',cameraInk:'#FFFFFF',cameraOverlay:'rgba(0,0,0,0.6)',cameraOverlayStrong:'rgba(0,0,0,0.65)',
};
export type Palette = typeof light;
export const dark: Palette = {
 ...light,ground:'#0F1F17',surface:'#16281F',ink:'#EDEFE9',muted:'#A3AFA7',border:'#24382D',divider:'#1F3328',primary:'#C8E07A',onPrimary:'#173A2A',soft:'#1F3328',mint:'#1F3328',good:'#C8E6BB',goodBg:'#24412F',medium:'#FFE0A2',mediumBg:'#493A1C',low:'#FFCAB6',lowBg:'#4C2B20',neutral:'#D8DED8',neutralBg:'#1F3328',hero:'#173A2A',warning:'#FFE0A2',warningBg:'#493A1C',warningBorder:'#66512C',favorable:'#C8E6BB',favorableBg:'#24412F',themeButton:'#1F3328',themeIcon:'#A3AFA7',themeSelected:'#C8E07A',themeSelectedIcon:'#173A2A',
};
export const radii = {small:12,card:20,hero:24,pill:999};
export const spacing = {xs:4,sm:8,md:12,lg:16,xl:24,xxl:32,headerTop:12,phonePreviewTop:48};
export const fonts = {body:'Manrope_500Medium',medium:'Manrope_600SemiBold',bold:'Manrope_700Bold',heading:'BricolageGrotesque_700Bold'};
