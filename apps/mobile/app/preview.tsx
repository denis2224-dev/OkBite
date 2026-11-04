import { useLocalSearchParams,Redirect } from 'expo-router';
import { WorkflowPreview } from '../src/features/preview/WorkflowPreview';
import { DetailsPreview } from '../src/features/preview/DetailsPreview';
import { Screen } from '../src/ui/Screen';
import { isPreview } from '../src/lib/preview';
export default function Preview(){const {step,id}=useLocalSearchParams<{step:string;id:string}>();if(!isPreview)return <Redirect href="/"/>;return step==='ingredients'||step==='label'?<Screen back><DetailsPreview kind={step} id={id}/></Screen>:<WorkflowPreview initial={step==='scan'?'scan':'capture'}/>;}
