const stateKey="caloriecraftState";
const defaultState={goal:"Muscle Gain",targetWeight:67,weight:62,calories:2650,protein:165,carbs:330,fat:75,gender:"male",age:22,height:165,activity:1.55,logs:[
{date:"2026-09-07",weight:61.4,waist:76,chest:95.2,biceps:33.4,forearms:28.7,thighs:53.5},
{date:"2026-09-14",weight:61.8,waist:75.7,chest:95.5,biceps:33.6,forearms:28.8,thighs:53.7},
{date:"2026-09-21",weight:62.0,waist:75.5,chest:95.8,biceps:33.7,forearms:28.9,thighs:53.8},
{date:"2026-09-28",weight:62.4,waist:75,chest:96,biceps:34,forearms:29,thighs:54}]};
let state=JSON.parse(localStorage.getItem(stateKey)||"null")||defaultState;
let selectedGender=state.gender, selectedGoal=state.goal;
let dashboardChart, progressChart;

function save(){localStorage.setItem(stateKey,JSON.stringify(state))}
function money(n){return "₹"+Math.round(n)}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function showPage(id){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
 document.getElementById("sidebar").classList.remove("open");
 if(id==="progress") renderProgressChart();
 if(id==="dashboard") renderDashboardChart();
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-page-jump]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.pageJump)));
document.getElementById("menuBtn").addEventListener("click",()=>document.getElementById("sidebar").classList.toggle("open"));

function calc(){
 const age=+document.getElementById("age").value, h=+document.getElementById("height").value, w=+document.getElementById("weight").value, act=+document.getElementById("activity").value;
 if(!age||!h||!w)return toast("Enter valid age, height and weight.");
 const bmr=selectedGender==="male"?10*w+6.25*h-5*age+5:10*w+6.25*h-5*age-161;
 const tdee=Math.round(bmr*act), loss=Math.round(tdee*.8/10)*10, gain=Math.round(tdee*1.1/10)*10;
 document.getElementById("bmrResult").textContent=Math.round(bmr).toLocaleString();
 document.getElementById("tdeeResult").textContent=tdee.toLocaleString();
 document.getElementById("lossCal").textContent=loss.toLocaleString();
 document.getElementById("maintCal").textContent=tdee.toLocaleString();
 document.getElementById("gainCal").textContent=gain.toLocaleString();
 state={...state,age,height:h,weight:w,gender:selectedGender,activity:act};save();
 updateUI(); toast("Calories calculated.");
}
document.getElementById("calculateBtn").addEventListener("click",calc);
document.querySelectorAll(".seg-btn").forEach(b=>b.addEventListener("click",()=>{selectedGender=b.dataset.gender;document.querySelectorAll(".seg-btn").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")}));

function targetFor(goal){
 const tdee=+document.getElementById("tdeeResult").textContent.replace(/,/g,"")||2420;
 let calories, p;
 if(goal==="Weight Loss"){calories=Math.round(tdee*.8/10)*10;p=Math.round(state.weight*2)}
 else if(goal==="Weight Gain"){calories=Math.round(tdee*1.1/10)*10;p=Math.round(state.weight*1.8)}
 else if(goal==="Fat Loss / Recomp"){calories=Math.round(tdee*.9/10)*10;p=Math.round(state.weight*2)}
 else {calories=Math.round(tdee*1.1/10)*10;p=Math.round(state.weight*2)}
 const fat=Math.round((calories*.25)/9), carbs=Math.round((calories-p*4-fat*9)/4);
 return {calories,protein:p,fat,carbs};
}
document.querySelectorAll(".goal-card").forEach(b=>b.addEventListener("click",()=>{
 selectedGoal=b.dataset.goal;document.querySelectorAll(".goal-card").forEach(x=>x.classList.toggle("selected",x===b));renderTargetPreview();
}));
document.getElementById("createTarget").addEventListener("click",()=>{
 state.goal=selectedGoal;state.targetWeight=+document.getElementById("targetWeight").value||67;
 const t=targetFor(selectedGoal);Object.assign(state,t);save();updateUI();renderTargetPreview();toast("Your target has been saved.");
});
function renderTargetPreview(){
 const t=targetFor(selectedGoal);
 document.getElementById("targetPreview").innerHTML=`<h2>${selectedGoal} <span class="pill green">Starting target</span></h2><p class="muted">Estimated target based on your current TDEE and body weight.</p><div class="macro-target-grid"><div><b>${t.calories.toLocaleString()}</b><small>kcal/day</small></div><div><b>${t.protein}g</b><small>Protein</small></div><div><b>${t.carbs}g</b><small>Carbs</small></div><div><b>${t.fat}g</b><small>Fat</small></div></div><p class="muted">Use weekly progress to adjust this starting target rather than treating the estimate as exact.</p>`;
}

const meals=[
["🌅","Breakfast","Oats + Milk + Banana + Whey",620,38,88,15,55],
["🍱","Lunch","Rice + Dal + Paneer + Salad + Curd",780,48,105,20,75],
["☕","Snack","Banana + Roasted Chana + Curd",350,18,55,7,40],
["🌙","Dinner","Roti + Paneer + Mixed Vegetables",700,50,82,24,50]
];
function renderMeals(){
 const list=document.getElementById("mealList"); list.innerHTML="";
 meals.forEach((m,i)=>{list.innerHTML+=`<div class="meal-item"><div class="meal-photo">${m[0]}</div><div><h3>${m[1]} · ${["7:00 AM","1:00 PM","4:00 PM","8:00 PM"][i]}</h3><p>${m[2]}</p><p>${m[3]} kcal · P ${m[4]}g · C ${m[5]}g · F ${m[6]}g · Est. Cost ${money(m[7])}</p></div><div class="meal-macros">P ${m[4]}g<br>C ${m[5]}g<br>F ${m[6]}g</div></div>`});
 const cost=meals.reduce((a,m)=>a+m[7],0), budget=+document.getElementById("budget").value||250;
 document.getElementById("dietCal").textContent=state.calories.toLocaleString();document.getElementById("dietP").textContent=state.protein;document.getElementById("dietC").textContent=state.carbs;document.getElementById("dietF").textContent=state.fat;document.getElementById("dietCost").textContent=`Estimated Cost: ${money(cost)}/day`;
 document.getElementById("budgetAlert").innerHTML=cost>budget?`<div class="budget-warning">⚠ Your budget is ${money(budget)}/day. This sample plan is ${money(cost)}/day. A production generator should substitute lower-cost foods while preserving the macro target.</div>`:"";
}
function renderApiPlan(plan){
 const list=document.getElementById("mealList"); list.innerHTML="";
 const icons={breakfast:"🌅",lunch:"🍱",snack:"☕",dinner:"🌙"};
 (plan.meals||[]).forEach((meal,i)=>{
   const names=(meal.items||[]).map(x=>`${x.food.name} × ${x.servings}`).join(" + ");
   const t=meal.totals||{};
   list.innerHTML+=`<div class="meal-item"><div class="meal-photo">${icons[meal.mealType]||"🍽️"}</div><div><h3>${meal.mealType[0].toUpperCase()+meal.mealType.slice(1)} · ${["7:00 AM","1:00 PM","4:00 PM","8:00 PM","6:00 PM","9:00 PM"][i]||"Meal"}</h3><p>${names}</p><p>${Math.round(t.calories)} kcal · P ${t.protein.toFixed(1)}g · C ${t.carbs.toFixed(1)}g · F ${t.fat.toFixed(1)}g · Cost ${money(t.cost)}</p></div><div class="meal-macros">P ${t.protein.toFixed(0)}g<br>C ${t.carbs.toFixed(0)}g<br>F ${t.fat.toFixed(0)}g</div></div>`;
 });
 document.getElementById("dietCal").textContent=Math.round(plan.totals.calories).toLocaleString();
 document.getElementById("dietP").textContent=Math.round(plan.totals.protein);
 document.getElementById("dietC").textContent=Math.round(plan.totals.carbs);
 document.getElementById("dietF").textContent=Math.round(plan.totals.fat);
 document.getElementById("dietCost").textContent=`Estimated Cost: ${money(plan.totals.cost)}/day`;
 document.getElementById("budgetAlert").innerHTML=(plan.budgetOK?"":`<div class="budget-warning">⚠ Budget target is ${money(plan.budget)}/day, but this optimized plan costs about ${money(plan.totals.cost)}/day. The engine prioritizes nutrition matching and reports the budget conflict instead of silently changing the target.</div>`)+(plan.aligned?`<div class="budget-warning" style="background:#e9f5ed;color:#17633e">✓ Calories and macros are within the engine tolerance.</div>`:`<div class="budget-warning">ℹ No combination in the current food database can exactly hit every target. Expand the database or adjust the target.</div>`);
}
async function generateDietFromEngine(){
 const payload={targetCalories:state.calories,targetProtein:state.protein,targetCarbs:state.carbs,targetFat:state.fat,
 dietType:document.getElementById("dietType").value,cuisine:document.getElementById("cuisine").value,
 likedFoods:document.getElementById("likes").value,allergies:document.getElementById("avoid").value,
 dailyBudget:+document.getElementById("budget").value||250,mealsPerDay:+document.getElementById("mealCount").value||4};
 const button=document.getElementById("generateDiet");
 button.disabled=true; button.textContent="Generating…";
 try{
   const response=await generateAIMealPlan(payload);
   renderAIPlan(response.plan||response);
   toast("AI meal plan generated.");
 }catch(aiError){
   try{
     const fallback=await apiRequest("/diet/generate",{method:"POST",body:JSON.stringify({...payload,likes:payload.likedFoods,budget:payload.dailyBudget})});
     renderApiPlan(fallback);
     toast("AI unavailable — used the verified food database engine.");
   }catch(e){
     renderMeals();
     toast("Server unavailable — showing demo plan.");
   }
 }finally{ button.disabled=false; button.textContent="Generate Plan"; }
}
function renderAIPlan(plan){
 const list=document.getElementById("mealList"); list.innerHTML="";
 const icons={breakfast:"🌅",lunch:"🍱",snack:"☕",dinner:"🌙",other:"🍽️"};
 (plan.meals||[]).forEach((meal,i)=>{
   const foods=(meal.foods||[]).map(x=>`${x.name} (${x.quantity})`).join(" + ");
   list.innerHTML+=`<div class="meal-item"><div class="meal-photo">${icons[meal.meal_type]||"🍽️"}</div><div><h3>${meal.meal_name} · ${["7:00 AM","1:00 PM","4:00 PM","8:00 PM","6:00 PM","9:00 PM"][i]||"Meal"}</h3><p>${foods}</p><p>${Math.round(meal.meal_calories)} kcal · P ${Number(meal.meal_protein_g).toFixed(1)}g · C ${Number(meal.meal_carbs_g).toFixed(1)}g · F ${Number(meal.meal_fat_g).toFixed(1)}g · Est. Cost ${money(meal.estimated_cost_inr)}</p></div><div class="meal-macros">P ${Number(meal.meal_protein_g).toFixed(0)}g<br>C ${Number(meal.meal_carbs_g).toFixed(0)}g<br>F ${Number(meal.meal_fat_g).toFixed(0)}g</div></div>`;
 });
 const t=plan.totals||{};
 document.getElementById("dietCal").textContent=Math.round(t.calories||0).toLocaleString();
 document.getElementById("dietP").textContent=Math.round(t.protein_g||0);
 document.getElementById("dietC").textContent=Math.round(t.carbs_g||0);
 document.getElementById("dietF").textContent=Math.round(t.fat_g||0);
 document.getElementById("dietCost").textContent=`Estimated Cost: ${money(t.estimated_cost_inr||0)}/day`;
 document.getElementById("budgetAlert").innerHTML=plan.summary?`<div class="budget-warning" style="background:#e9f5ed;color:#17633e">🤖 ${plan.summary}</div>`:"";
}
document.getElementById("generateDiet").addEventListener("click",generateDietFromEngine);
document.getElementById("regenerate").addEventListener("click",()=>{renderMeals();toast("Meal plan regenerated.");});
document.getElementById("swapMeal").addEventListener("click",()=>{meals[1]=["🍛","Lunch","Roti + Rajma + Curd + Salad",760,42,108,17,55];renderMeals();toast("Lunch swapped.");});

function labels(){return state.logs.map(x=>new Date(x.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short"}))}
function makeChart(canvas,labels,data,label){
 return new Chart(canvas,{type:"line",data:{labels,datasets:[{label,data,borderColor:"#137a4b",backgroundColor:"rgba(19,122,75,.08)",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#137a4b"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false}},y:{grid:{color:"#edf1ee"},ticks:{font:{size:10}}}}}});
}
function renderDashboardChart(){if(dashboardChart)dashboardChart.destroy();dashboardChart=makeChart(document.getElementById("dashboardChart"),labels(),state.logs.map(x=>x.weight),"Weight")}
function renderProgressChart(){
 if(progressChart)progressChart.destroy();
 const active=document.querySelector(".chart-tabs button.selected")?.dataset.metric||"weight";
 if(active==="measurements"){
  progressChart=new Chart(document.getElementById("progressChart"),{type:"line",data:{labels:labels(),datasets:[
   {label:"Waist",data:state.logs.map(x=>x.waist),borderColor:"#f2a31a",tension:.35},
   {label:"Chest",data:state.logs.map(x=>x.chest),borderColor:"#3c91e8",tension:.35},
   {label:"Biceps",data:state.logs.map(x=>x.biceps),borderColor:"#137a4b",tension:.35}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
 }else progressChart=makeChart(document.getElementById("progressChart"),labels(),state.logs.map(x=>x.weight),"Weight");
}
document.querySelectorAll(".chart-tabs>button[data-metric]").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".chart-tabs>button[data-metric]").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");renderProgressChart()}));

function updateUI(){
 document.getElementById("dashCalories").textContent=state.calories.toLocaleString()+" kcal";document.getElementById("dashProtein").textContent=state.protein+" g";document.getElementById("dashWeight").textContent=state.weight+" kg";
 document.getElementById("dashGoal").textContent=state.goal;document.getElementById("goalName").textContent=state.goal;document.getElementById("goalTarget").textContent=state.targetWeight+" kg";document.getElementById("goalCurrent").textContent=state.weight+" kg";
 const pct=Math.max(0,Math.min(100,Math.round((state.weight/state.targetWeight)*100)));document.getElementById("goalProgress").style.width=pct+"%";document.getElementById("goalPercent").textContent=pct+"% complete";
 document.getElementById("macroProteinTarget").textContent=state.protein;document.getElementById("macroCarbTarget").textContent=state.carbs;document.getElementById("macroFatTarget").textContent=state.fat;
 document.getElementById("dietCal").textContent=state.calories.toLocaleString();document.getElementById("dietP").textContent=state.protein;document.getElementById("dietC").textContent=state.carbs;document.getElementById("dietF").textContent=state.fat;
 document.getElementById("profileAge").textContent=state.age+" years";document.getElementById("profileHeight").textContent=state.height+" cm";document.getElementById("profileWeight").textContent=state.weight+" kg";document.getElementById("profileGoal").textContent=state.goal;document.getElementById("profileTarget").textContent=state.targetWeight+" kg";
 const latest=state.logs[state.logs.length-1]; if(latest){["Weight","Waist","Chest","Biceps"].forEach(k=>{const el=document.getElementById("metric"+k);if(el)el.textContent=latest[k.toLowerCase()]+" cm".replace("kg","kg")});document.getElementById("metricWeight").textContent=latest.weight+" kg";document.getElementById("metricWaist").textContent=latest.waist+" cm";document.getElementById("metricChest").textContent=latest.chest+" cm";document.getElementById("metricBiceps").textContent=latest.biceps+" cm"}
}
document.getElementById("openLog").addEventListener("click",()=>document.getElementById("logModal").classList.add("open"));
document.getElementById("closeLog").addEventListener("click",()=>document.getElementById("logModal").classList.remove("open"));
document.getElementById("saveLog").addEventListener("click",()=>{
 const log={date:document.getElementById("logDate").value,weight:+document.getElementById("logWeight").value,waist:+document.getElementById("logWaist").value,chest:+document.getElementById("logChest").value,biceps:+document.getElementById("logBiceps").value,forearms:+document.getElementById("logForearms").value,thighs:+document.getElementById("logThighs").value};
 if(!log.date||!log.weight)return toast("Enter at least date and weight.");
 state.logs=state.logs.filter(x=>x.date!==log.date);state.logs.push(log);state.logs.sort((a,b)=>a.date.localeCompare(b.date));state.weight=log.weight;save();updateUI();document.getElementById("logModal").classList.remove("open");renderProgressChart();renderDashboardChart();toast("Progress saved.");
});
window.addEventListener("click",e=>{if(e.target===document.getElementById("logModal"))document.getElementById("logModal").classList.remove("open")});

updateUI();renderTargetPreview();renderMeals();renderDashboardChart();renderProgressChart();
