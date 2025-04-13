document.addEventListener('DOMContentLoaded', () => {
  const totalSteps = 6;
  let currentStep = 1;

  // Cache DOM elements
  const progressBar = document.getElementById('progressBar');
  const sections = document.querySelectorAll('.section');

  // Initialize tool
  updateProgress();
  showCurrentStep();
  initEventListeners();

  // Hide BMI fields by default (select Use Waist)
  document.getElementById('useWaistOption')?.click();

  // Initialize PEST questions in English on load
  setPESTLanguage('en');
  document.getElementById('waistField').style.display = 'block';

  function initEventListeners() {
    // Navigation events
    document.querySelectorAll('[id^="nextBtn"]').forEach((btn) => {
      btn.addEventListener('click', nextStep);
    });
    document.querySelectorAll('[id^="prevBtn"]').forEach((btn) => {
      btn.addEventListener('click', prevStep);
    });

    // Gender change to toggle pregnancy field
    document.getElementById('gender').addEventListener('change', (e) => {
      document.getElementById('pregnancyField').style.display = e.target.value === 'Female' ? 'block' : 'none';
    });

    // Optional fields toggle
    document.getElementById('optionalToggle')?.addEventListener('click', () => {
      const fields = document.getElementById('optionalFields');
      const isVisible = fields.style.display === 'block';
      fields.style.display = isVisible ? 'none' : 'block';
      document.getElementById('optionalToggle').innerHTML = isVisible
        ? '<span>+ Show Additional Information</span>'
        : '<span>- Hide Additional Information</span>';
    });

    // Recalculate age at onset when age or onset value/unit changes
    ['age', 'onsetValue'].forEach((id) => {
      document.getElementById(id).addEventListener('input', calculateOnsetAge);
    });
    document.getElementById('onsetUnit').addEventListener('change', calculateOnsetAge);

    // BMI calculation
    ['weight', 'height'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', calculateBMI);
    });

    // PASI calculation trigger
    document.getElementById('calculatePasiBtn')?.addEventListener('click', calculatePASI);

    // PEST language toggle and initialization
    document.getElementById('pestEnglish').addEventListener('click', () => setPESTLanguage('en'));
    document.getElementById('pestArabic').addEventListener('click', () => setPESTLanguage('ar'));

    // PEST calculation
    document.getElementById('calculatePestBtn').addEventListener('click', calculatePEST);

    // Metabolic Syndrome calculation
    document.getElementById('calculateMetabolicBtn').addEventListener('click', calculateMetabolicSyndrome);

    // Measurement toggle with BMI fields visibility control
    document.getElementById('useWaistOption')?.addEventListener('click', () => {
      document.getElementById('useWaistOption').classList.add('selected');
      document.getElementById('useBMIOption').classList.remove('selected');
      // Hide BMI fields (Weight, Height, BMI)
      document.getElementById('weight').closest('.form-group').style.display = 'none';
      document.getElementById('height').closest('.form-group').style.display = 'none';
      document.getElementById('bmi').closest('.form-group').style.display = 'none';
    });
    document.getElementById('useBMIOption')?.addEventListener('click', () => {
      document.getElementById('useBMIOption').classList.add('selected');
      document.getElementById('useWaistOption').classList.remove('selected');
      // Show BMI fields (Weight, Height, BMI)
      document.getElementById('weight').closest('.form-group').style.display = 'block';
      document.getElementById('height').closest('.form-group').style.display = 'block';
      document.getElementById('bmi').closest('.form-group').style.display = 'block';
    });

    document.getElementById('onsetValue').addEventListener('input', validateOnset);
    document.getElementById('onsetUnit').addEventListener('change', validateOnset);
    document.getElementById('age').addEventListener('input', validateOnset);
  }

  // Navigation functions
  function nextStep() {
    if (validateCurrentStep() && currentStep < totalSteps) {
      currentStep++;
      showCurrentStep();
      if (currentStep === 6) buildSummary();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      showCurrentStep();
    }
  }

  function showCurrentStep() {
    sections.forEach((section) => section.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
  }

  function updateProgress() {
    progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;
  }

  // Validation for current step fields
  function validateCurrentStep() {
    if (currentStep === 2) {
      const regions = ['head', 'upper', 'trunk', 'lower'];
      let valid = true;
      regions.forEach((region) => {
        const areaScore = parseInt(document.getElementById(`${region}_area_category`).value);
        if (areaScore > 0) {
          ['erythema', 'induration', 'scaling'].forEach((metric) => {
            const field = document.getElementById(`${region}_${metric}`);
            if (!field.value) {
              alert(`Please select ${metric.charAt(0).toUpperCase() + metric.slice(1)} (0–4) for ${region} region`);
              field.focus();
              valid = false;
              return;
            }
          });
        } else {
          // If area is 0, auto-set severity fields to 0
          ['erythema', 'induration', 'scaling'].forEach((metric) => {
            document.getElementById(`${region}_${metric}`).value = 0;
          });
        }
      });
      if (valid && document.getElementById('pasiResult').textContent.includes('Not calculated')) {
        calculatePASI();
      }
      return valid;
    }
    const currentSection = document.getElementById(`step${currentStep}`);
    const requiredInputs = currentSection.querySelectorAll('[required]');
    for (const input of requiredInputs) {
      if (!input.value) {
        alert(`Please fill in ${input.labels[0].textContent}`);
        input.focus();
        return false;
      }
      if (input.type === 'number' && input.min && input.max) {
        const value = parseFloat(input.value);
        if (value < parseFloat(input.min) || value > parseFloat(input.max)) {
          alert(`${input.labels[0].textContent} must be between ${input.min} and ${input.max}`);
          input.focus();
          return false;
        }
      }
    }
    return true;
  }

  // Calculation functions
  function calculateOnsetAge() {
    const age = parseFloat(document.getElementById('age').value);
    const onset = parseFloat(document.getElementById('onsetValue').value);
    const unit = document.getElementById('onsetUnit').value;
    if (!isNaN(age) && !isNaN(onset)) {
      const onsetYears = unit === 'years' ? onset : onset / 12;
      document.getElementById('onsetAge').value = `${(age - onsetYears).toFixed(1)} years`;
    } else {
      document.getElementById('onsetAge').value = "";
    }
  }

  function calculateBMI() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    if (!isNaN(weight) && !isNaN(height) && height > 0) {
      document.getElementById('bmi').value = (weight / ((height / 100) ** 2)).toFixed(1);
    }
  }

  function calculatePASI() {
    const regions = [
      { prefix: 'head', weight: 0.1 },
      { prefix: 'upper', weight: 0.2 },
      { prefix: 'trunk', weight: 0.3 },
      { prefix: 'lower', weight: 0.4 }
    ];

    const bsaWeights = {
      head: 0.09,
      upper: 0.18,
      trunk: 0.37,
      lower: 0.36
    };

    const midpointMap = {
      0: 0, 1: 5, 2: 19.5, 3: 39.5,
      4: 59.5, 5: 79.5, 6: 95
    };

    let totalPASI = 0;
    let totalBSA = 0;
    let valid = true;

    regions.forEach((region) => {
      const areaScore = parseInt(document.getElementById(`${region.prefix}_area_category`).value);
      if (areaScore === 0) return;

      const erythema = parseInt(document.getElementById(`${region.prefix}_erythema`).value);
      const induration = parseInt(document.getElementById(`${region.prefix}_induration`).value);
      const scaling = parseInt(document.getElementById(`${region.prefix}_scaling`).value);

      if ([erythema, induration, scaling].some((score) => isNaN(score) || score < 0 || score > 4)) {
        alert(`Please select valid scores for ${region.prefix} region`);
        valid = false;
        return;
      }

      const severity = erythema + induration + scaling;
      const bsaPercent = midpointMap[areaScore];

      totalPASI += region.weight * severity * areaScore;
      totalBSA += bsaWeights[region.prefix] * (bsaPercent / 100);
    });

    if (valid) {
      document.getElementById('pasiResult').textContent = `PASI: ${totalPASI.toFixed(2)}`;
      document.getElementById('bsaResult').textContent = `BSA: ${(totalBSA * 100).toFixed(1)}`;
    }
  }

  function setPESTLanguage(lang) {
    document.getElementById('pestEnglish').classList.toggle('active', lang === 'en');
    document.getElementById('pestArabic').classList.toggle('active', lang === 'ar');
    const questions = lang === 'ar'
      ? [
          "عمرك حسّيت إن مفاصلك مورّمة او منتفخة؟",
          "هل في ألم في كعب الرجل؟",
          "في دكتور قالّك قبل كده إن عندك التهاب في المفاصل؟",
          "هل حصل اي تورم أو ألم في أصابع اليدين أو القدمين دون سبب واضح؟",
          "هل تغير شكل أظافرك أو ظهرت عليها اي حفر؟"
        ]
      : [
          "Have you ever had joint swelling?",
          "Have you ever had heel pain?",
          "Has any doctor ever told you that you have joint inflammation?",
          "Have your fingers or toes ever been swollen or painful without any apparent reason?",
          "Have your nails ever become pitted or changed shape?"
        ];
    const pestQuestionsContainer = document.getElementById('pestQuestions');
    pestQuestionsContainer.innerHTML = questions
      .map((q, i) => `
        <div class="form-group" style="text-align: ${lang === 'ar' ? 'right' : 'left'}; direction: ${lang === 'ar' ? 'rtl' : 'ltr'};">
          <label>${q}</label>
          <select id="pest_q${i + 1}" required style="float: ${lang === 'ar' ? 'left' : 'right'};">
            <option value="No">${lang === 'ar' ? 'لا' : 'No'}</option>
            <option value="Yes">${lang === 'ar' ? 'نعم' : 'Yes'}</option>
          </select>
          <div style="clear: both;"></div>
        </div>
      `)
      .join('');
  }

  function calculatePEST() {
    let score = 0;
    let allAnswered = true;
    for (let i = 1; i <= 5; i++) {
      const select = document.getElementById(`pest_q${i}`);
      if (!select || !select.value) {
        allAnswered = false;
        break;
      }
      if (select.value === "Yes") score++;
    }
    if (allAnswered) {
      document.getElementById('pestResult').textContent = `PEST Score: ${score}/5`;
    } else {
      alert("Please answer all PEST questions");
    }
  }

  function calculateMetabolicSyndrome() {
    const gender = document.getElementById('gender').value;
    if (!gender) {
      alert("Please select gender first");
      return;
    }
    let criteriaMet = 0;

    // Waist or BMI logic
    const useWaist = document.getElementById('useWaistOption').classList.contains('selected');
    if (useWaist) {
      const waist = parseFloat(document.getElementById('waist').value);
      if (!isNaN(waist)) {
        if ((gender === "Male" && waist >= 102) || (gender === "Female" && waist >= 88)) {
          criteriaMet++;
        }
      }
    } else {
      const bmi = parseFloat(document.getElementById('bmi').value);
      if (!isNaN(bmi) && bmi >= 30) {
        criteriaMet++;
      }
    }

    // Triglycerides
    const triglycerides = parseFloat(document.getElementById('triglycerides_ms').value);
    if (!isNaN(triglycerides) && triglycerides >= 150) {
      criteriaMet++;
    }

    // HDL
    const hdl = parseFloat(document.getElementById('hdl_ms').value);
    if (!isNaN(hdl)) {
      if ((gender === "Male" && hdl < 40) || (gender === "Female" && hdl < 50)) {
        criteriaMet++;
      }
    }

    // Blood Pressure
    const systolic = parseInt(document.getElementById('systolic').value);
    const diastolic = parseInt(document.getElementById('diastolic').value);
    if (!isNaN(systolic) && !isNaN(diastolic)) {
      if (systolic >= 130 || diastolic >= 85) {
        criteriaMet++;
      }
    }

    // Fasting Glucose
    const glucose = parseFloat(document.getElementById('glucose').value);
    if (!isNaN(glucose) && glucose >= 100) {
      criteriaMet++;
    }

    const resultText = criteriaMet >= 3 
      ? `Yes (${criteriaMet}/5 criteria)` 
      : `No (${criteriaMet}/5 criteria)`;

    document.getElementById('metabolicResult').textContent = `Metabolic Syndrome: ${resultText}`;
  }

  function buildSummary() {
  // Get basic patient information
  const patientID = document.getElementById('patientNumber').value || 'Not entered';
  const gender = document.getElementById('gender').value || 'Not entered';
  const age = document.getElementById('age').value || 'Not entered';
  let pregnancyStatus = '';
  if (gender === 'Female') {
    pregnancyStatus = document.getElementById('pregnancy').value || 'Not entered';
  }

  // Get PASI and BSA values
  const pasiValue = document.getElementById('pasiResult').textContent.replace('PASI: ', '') || 'Not calculated';
  const bsaValue = document.getElementById('bsaResult').textContent.replace('BSA: ', '') || 'Not calculated';

  // Get DLQI value
  const dlqiValue = document.getElementById('dlqi').value || 'Not entered';

  // Get PEST score
  let pestScore = 'Not entered';
  if (document.getElementById('pest_q1')) {
    let score = 0;
    let answered = true;
    for (let i = 1; i <= 5; i++) {
      const el = document.getElementById(`pest_q${i}`);
      if (!el || !el.value) {
        answered = false;
        break;
      }
      if (el.value === "Yes") score++;
    }
    pestScore = answered ? `${score}/5` : 'Not entered';
  }

  // Build Comorbidities string
  let comorbidities = [];
  const dm = document.getElementById('dm').value;
  const htn = document.getElementById('htn').value;
  const cvd = document.getElementById('cvd').value;
  const otherComorb = document.getElementById('otherComorbidities').value;

  if (dm === "Yes") comorbidities.push("Diabetes Mellitus");
  if (htn === "Yes") comorbidities.push("Hypertension");
  if (cvd === "Yes") comorbidities.push("Cardiovascular Disease");
  if (otherComorb.trim() !== "") comorbidities.push(otherComorb.trim());
  const comorbidityStr = comorbidities.length > 0 ? comorbidities.join(", ") : "None";

  // Metabolic Syndrome result
  const metabolicResult = document.getElementById('metabolicResult').textContent.replace('Metabolic Syndrome: ', '') || 'Not assessed';

  // Compose the detailed conclusion summary
  // Notice how PASI, BSA, and DLQI are grouped in a single highlight-block
  document.getElementById('summary').innerHTML = `
    <div class="summary-item">
      <strong>Patient:</strong> ${patientID} (${gender}${gender === 'Female' ? ", Pregnancy: " + pregnancyStatus : ""}, 
      ${age !== 'Not entered' ? age + "y" : age})
    </div>
    
    <!-- Highlight block with PASI, BSA, and DLQI together -->
    <div class="highlight-block">
      <div><strong>PASI:</strong> ${pasiValue}</div>
      <div><strong>BSA:</strong> ${bsaValue}</div>
      <div><strong>DLQI:</strong> ${dlqiValue}</div>
    </div>
    
    <div class="summary-item"><strong>PEST Score:</strong> ${pestScore}</div>
    <div class="summary-item"><strong>Comorbidities:</strong> ${comorbidityStr}</div>
    <div class="summary-item"><strong>Metabolic Syndrome:</strong> ${metabolicResult}</div>
  `;
}

  window.togglePasiImage = function () {
    const content = document.getElementById("pasiImageContainer");
    content.style.display = content.style.display === "none" || content.style.display === "" ? "block" : "none";
  };

  function nextStep() {
    if (validateCurrentStep() && currentStep < totalSteps) {
      currentStep++;
      showCurrentStep();
      if (currentStep === 6) buildSummary();
    }
  }

  function prevStep() {
    if (currentStep > 1) {
      currentStep--;
      showCurrentStep();
    }
  }

  function showCurrentStep() {
    sections.forEach((section) => section.classList.remove('active'));
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgress();
  }

  function updateProgress() {
    progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;
  }

  function validateCurrentStep() {
    if (currentStep === 2) {
      const regions = ['head', 'upper', 'trunk', 'lower'];
      let valid = true;
      regions.forEach((region) => {
        const areaScore = parseInt(document.getElementById(`${region}_area_category`).value);
        if (areaScore > 0) {
          ['erythema', 'induration', 'scaling'].forEach((metric) => {
            const field = document.getElementById(`${region}_${metric}`);
            if (!field.value) {
              alert(`Please select ${metric.charAt(0).toUpperCase() + metric.slice(1)} (0–4) for ${region} region`);
              field.focus();
              valid = false;
              return;
            }
          });
        } else {
          ['erythema', 'induration', 'scaling'].forEach((metric) => {
            document.getElementById(`${region}_${metric}`).value = 0;
          });
        }
      });
      if (valid && document.getElementById('pasiResult').textContent.includes('Not calculated')) {
        calculatePASI();
      }
      return valid;
    }
    const currentSection = document.getElementById(`step${currentStep}`);
    const requiredInputs = currentSection.querySelectorAll('[required]');
    for (const input of requiredInputs) {
      if (!input.value) {
        alert(`Please fill in ${input.labels[0].textContent}`);
        input.focus();
        return false;
      }
      if (input.type === 'number' && input.min && input.max) {
        const value = parseFloat(input.value);
        if (value < parseFloat(input.min) || value > parseFloat(input.max)) {
          alert(`${input.labels[0].textContent} must be between ${input.min} and ${input.max}`);
          input.focus();
          return false;
        }
      }
    }
    return true;
  }

  function validateOnset() {
    const age = parseInt(document.getElementById('age').value) || 0;
    const onsetValue = parseInt(document.getElementById('onsetValue').value) || 0;
    const onsetUnit = document.getElementById('onsetUnit').value;
    const onsetAgeField = document.getElementById('onsetAge');
    
    let onsetInYears = onsetValue;
    if (onsetUnit === 'months') {
        onsetInYears = onsetValue / 12;
    }

    if (onsetInYears > age) {
        onsetAgeField.value = 'Error: Onset cannot be greater than age';
        onsetAgeField.classList.add('error');
        return false;
    } else {
        onsetAgeField.classList.remove('error');
        onsetAgeField.value = age - onsetInYears;
        return true;
    }
}

document.getElementById('onsetValue').addEventListener('input', validateOnset);
document.getElementById('onsetUnit').addEventListener('change', validateOnset);
document.getElementById('age').addEventListener('input', validateOnset);

function togglePasiImage() {
  const content = document.getElementById('pasiImageContainer');
  content.classList.toggle('active');
}

// Close image when clicking outside
document.addEventListener('click', (e) => {
  const content = document.getElementById('pasiImageContainer');
  const btn = document.querySelector('.collapsible-btn');
  if (!content.contains(e.target) && !btn.contains(e.target)) {
    content.classList.remove('active');
  }
});
});
