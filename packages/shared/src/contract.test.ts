import { it, expect } from 'vitest';
import { Nutrients, LookupResponse } from './contract';
it('rejects a found response without a product', () => expect(LookupResponse.safeParse({status:'found'}).success).toBe(false));
it('rejects negative nutrient amounts', () => expect(Nutrients.safeParse({kcal:-1,fat:0,sat:0,sugar:0,salt:0,protein:0,fiber:0,fruitVegPct:null}).success).toBe(false));
