import { render,screen,fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WorkflowPreview } from './WorkflowPreview';
import { ro } from '../../copy/ro';
jest.mock('expo-router',()=>({router:{push:jest.fn(),replace:jest.fn(),canGoBack:()=>false}}));
it('offers the gallery when camera access is refused and reaches product confirmation',async()=>{await render(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:390,height:844},insets:{top:0,left:0,right:0,bottom:0}}}><WorkflowPreview/></SafeAreaProvider>);await fireEvent.press(screen.getByRole('button',{name:ro.capture.preview.cameraDenied}));expect(screen.getByText(ro.capture.denied)).toBeTruthy();await fireEvent.press(screen.getByRole('button',{name:ro.capture.gallery}));expect(screen.getByRole('header',{name:ro.identify.confirm})).toBeTruthy();await fireEvent.press(screen.getByRole('button',{name:ro.identify.none}));expect(screen.getByRole('header',{name:ro.identify.notFound})).toBeTruthy();});
