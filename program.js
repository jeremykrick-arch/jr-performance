// Age-appropriate, technique-first baseball strength plan. Weeks 4, 8, 12 reduce volume.
const exercises={
Monday:[
['Dynamic warm-up','Warm-up',1,10,'minutes','Movement prep, mobility, and progressive sprint build-ups.'],
['10-yard acceleration sprint','Speed',4,1,'reps','Four high-quality accelerations; full recovery. Stop if fatigued.'],
['Broad jump','Power',3,3,'reps','Controlled landing; prioritize quality over distance.'],
['Trap bar deadlift','Strength',3,6,'reps','Primary lower-body lift. Supervised, controlled reps; 2–3 reps in reserve.'],
['Dumbbell reverse lunge','Strength',3,8,'per leg','Control knee alignment and balance.'],
['Glute bridge','Strength',3,10,'reps','Pause at the top; avoid arching back.'],
['Leg curl','Strength',2,12,'reps','Smooth eccentric; no swinging.'],
['Standing calf raise','Strength',2,15,'reps','Full controlled range.'],
['Pallof press','Core',2,10,'per side','Resist trunk rotation.']],
Thursday:[
['Dynamic warm-up','Warm-up',1,10,'minutes','Shoulder and thoracic mobility, light band work.'],
['Assisted pull-up','Strength',3,8,'reps','Full controlled range; leave reps in reserve.'],
['Dumbbell bench press','Strength',3,10,'reps','Moderate effort; avoid failure before evening hitting.'],
['Single-arm cable row','Strength',3,10,'per side','Stable torso, smooth movement.'],
['Landmine press','Strength',2,8,'per side','Light to moderate; pain-free shoulder motion only.'],
['Face pull','Shoulder',2,12,'reps','Light, controlled upper-back work.'],
['Band external rotation','Shoulder',2,12,'per side','Keep elbow stable; low resistance.'],
['Hammer curl','Strength',2,12,'reps','Optional accessory; no grinding.'],
['Triceps pressdown','Strength',2,12,'reps','Optional accessory; no grinding.'],
['Dead bug','Core',2,10,'per side','Maintain neutral spine.']],
Saturday:[
['Dynamic warm-up','Warm-up',1,10,'minutes','Jog, skips, lunges, mobility and throwing-appropriate preparation.'],
['Low box jump','Power',3,3,'reps','Low box; land softly and step down.'],
['Medicine ball rotational throw','Power',3,4,'per side','Explosive hip rotation; low total throwing volume.'],
['Barbell front squat','Strength',3,8,'reps','Supervised technique; goblet squat is a suitable alternative.'],
['Dumbbell Romanian deadlift','Strength',3,10,'reps','Controlled hinge; leave 2–3 reps in reserve.'],
['Dumbbell bench press','Strength',3,10,'reps','Moderate load; shoulder-friendly range.'],
['Seated cable row','Strength',3,12,'reps','Squeeze shoulder blades; control return.'],
['Farmer carry','Strength',3,25,'yards','Walk tall with stable trunk.'],
['Side plank','Core',2,30,'seconds per side','Maintain stacked hips and alignment.']]};

const tests=[['10-yard sprint','sec','lower'],['20-yard sprint','sec','lower'],['5-10-5 shuttle','sec','lower'],['Vertical jump','in','higher'],['Broad jump','in','higher'],['Push-ups','reps','higher'],['Body weight','lb','neutral']];

