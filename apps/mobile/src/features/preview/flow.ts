export type Step='capture'|'scan'|'confirm'|'result'|'notFound'|'ingredientsPhoto'|'nutritionPhoto'|'review';
export type Flow={step:Step};
export function start():Flow{return {step:'capture'};}
export function next(flow:Flow,event:'photo'|'confirm'|'unknown'|'add'):Flow{if(event==='unknown')return {step:'notFound'};if(event==='add')return {step:'ingredientsPhoto'};if(event==='confirm')return {step:'result'};return {step:flow.step==='ingredientsPhoto'?'nutritionPhoto':flow.step==='nutritionPhoto'?'review':'confirm'};}
export type Review={ingredients:string;kcal:string;fat:string;sugar:string;sat:string;salt:string};
export function validateReview(value:Review){if(!value.ingredients.trim()||value.ingredients.includes('[?]'))return false;for(const key of ['kcal','fat','sugar','sat','salt'] as const){const raw=value[key].trim(),n=Number(raw.replace(',','.'));if(!raw||!Number.isFinite(n)||n<0||n>(key==='kcal'?900:100))return false;}return Number(value.sat.replace(',','.'))<=Number(value.fat.replace(',','.'));}
