import { render,screen } from '@testing-library/react-native';
import { ResultView } from './ResultView';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
jest.mock('expo-router',()=>({router:{push:jest.fn()}}));
it('shows missing data rather than a false zero',async()=>{await render(<ResultView product={foundYogurt.product} score={{score:null,grade:'unavailable',letter:null,reasons:[],missing:['sugar']}}/>);expect(screen.getAllByText(ro.result.scoreUnavailable).length).toBeGreaterThan(0);expect(screen.queryByText('0 din 100')).toBeNull();expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();});
it('shows allergens and the unverified notice',async()=>{await render(<ResultView {...foundYogurt} product={{...foundYogurt.product,status:'unverified'}}/>);expect(screen.getByText('Lapte')).toBeTruthy();expect(screen.getByText(ro.result.unverifiedNote)).toBeTruthy();});
