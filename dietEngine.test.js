const { generatePlan } = require('./dietEngine');
const foods = [
  {name:'Oats',cuisine:'Indian',diet_type:'vegetarian',calories:195,protein_g:6.5,carbs_g:33,fat_g:3.5,estimated_cost:12,allergens:'Gluten'},
  {name:'Paneer',cuisine:'Indian',diet_type:'vegetarian',calories:265,protein_g:18,carbs_g:6,fat_g:20,estimated_cost:45,allergens:'Milk'},
  {name:'Rice',cuisine:'Indian',diet_type:'vegan',calories:260,protein_g:5,carbs_g:56,fat_g:.6,estimated_cost:18,allergens:''},
  {name:'Dal',cuisine:'Indian',diet_type:'vegan',calories:230,protein_g:14,carbs_g:36,fat_g:2,estimated_cost:25,allergens:''}
];
const plan=generatePlan({foods,target:{calories:2200,protein:140,carbs:280,fat:65},dietType:'vegetarian',cuisine:'Indian',likes:['paneer'],allergies:[],budget:250,mealsPerDay:4});
if(!plan.meals.length || plan.totals.calories<=0) throw new Error('Diet engine failed');
console.log('Diet engine test passed:', JSON.stringify({aligned:plan.aligned,totals:plan.totals},null,2));
