/* CalorieCraft API integration layer.
   Set API_BASE to your Express server. The current UI still works offline with localStorage.
*/
const API_BASE = window.CALORIECRAFT_API || "/api";

function getAuthToken(){ return localStorage.getItem("caloriecraftToken"); }
async function apiRequest(path, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  const token=getAuthToken();
  if(token) headers.Authorization=`Bearer ${token}`;
  const res=await fetch(API_BASE+path,{...options,headers});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message||"API request failed");
  return data;
}
async function saveProfileToApi(){
  try{
    await apiRequest("/me",{method:"PUT",body:JSON.stringify({
      fullName:"Deepanshu",gender:state.gender,age:state.age,heightCm:state.height,
      weightKg:state.weight,activityLevel:state.activity
    })});
  }catch(e){ console.warn("API profile sync skipped:",e.message); }
}
async function saveMeasurementToApi(log){
  try{
    await apiRequest("/measurements",{method:"POST",body:JSON.stringify({
      loggedDate:log.date,weightKg:log.weight,waistCm:log.waist,chestCm:log.chest,
      bicepsCm:log.biceps,forearmsCm:log.forearms,thighsCm:log.thighs,notes:log.notes||""
    })});
  }catch(e){ console.warn("API measurement sync skipped:",e.message); }
}
async function saveGoalToApi(){
  try{
    await apiRequest("/goals",{method:"POST",body:JSON.stringify({
      goalType:({ "Weight Loss":"weight_loss","Weight Gain":"weight_gain","Muscle Gain":"muscle_gain","Fat Loss / Recomp":"fat_loss_recomp"})[state.goal],
      targetWeightKg:state.targetWeight,age:state.age,gender:state.gender,
      heightCm:state.height,weightKg:state.weight,activityLevel:state.activity
    })});
  }catch(e){ console.warn("API goal sync skipped:",e.message); }
}


async function generateAIMealPlan(payload){
  return apiRequest("/ai/meal-plan", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
