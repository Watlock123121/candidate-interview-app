const scores = {};

function groupQuestionsByCategory() {
  return QUESTIONS.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item);
    return groups;
  }, {});
}

function renderQuestions() {
  const container = document.getElementById("questionsContainer");
  const groupedQuestions = groupQuestionsByCategory();

  container.innerHTML = "";

  Object.keys(groupedQuestions).forEach(category => {
    const block = document.createElement("div");
    block.className = "category-block";

    block.innerHTML = `
      <div class="category-header">
        ${category}
        <span>${groupedQuestions[category].length} question(s)</span>
      </div>
    `;

    groupedQuestions[category].forEach(item => {
      scores[item.id] = {
        id: item.id,
        category: item.category,
        question: item.question,
        score: 0,
        notes: "",
        isNa: false
      };

      const card = document.createElement("div");
      card.className = "question-card";
      card.id = `card-${item.id}`;

      card.innerHTML = `
        <button class="na-btn" onclick="toggleNa('${item.id}')">N/A</button>

        <div class="question-id">${item.id}</div>

        <div class="question-text">
          ${item.question}
        </div>

        <div class="rating-row">
          <div class="stars" id="stars-${item.id}">
            ${[1, 2, 3, 4, 5].map(num => `
              <span class="star" onclick="setScore('${item.id}', ${num})">☆</span>
            `).join("")}
          </div>

          <span class="score-label" id="score-label-${item.id}">
            Score: 0 / 5
          </span>
        </div>

        <div class="field">
          <label>Notes</label>
          <textarea 
            placeholder="Add notes for this answer..."
            oninput="setNotes('${item.id}', this.value)"
          ></textarea>
        </div>
      `;

      block.appendChild(card);
    });

    container.appendChild(block);
  });

  updateSummary();
}

function setScore(questionId, score) {
  if (scores[questionId].isNa) {
    return;
  }

  scores[questionId].score = score;

  const stars = document.querySelectorAll(`#stars-${questionId} .star`);
  stars.forEach((star, index) => {
    star.textContent = index < score ? "★" : "☆";
  });

  document.getElementById(`score-label-${questionId}`).textContent = `Score: ${score} / 5`;

  updateSummary();
}

function setNotes(questionId, notes) {
  scores[questionId].notes = notes;
}

function toggleNa(questionId) {
  const item = scores[questionId];
  item.isNa = !item.isNa;

  const card = document.getElementById(`card-${questionId}`);
  const button = card.querySelector(".na-btn");
  const stars = document.querySelectorAll(`#stars-${questionId} .star`);

  if (item.isNa) {
    item.score = 0;
    button.classList.add("active");
    document.getElementById(`score-label-${questionId}`).textContent = "Marked N/A";
    stars.forEach(star => {
      star.textContent = "☆";
      star.style.opacity = "0.35";
    });
  } else {
    button.classList.remove("active");
    document.getElementById(`score-label-${questionId}`).textContent = "Score: 0 / 5";
    stars.forEach(star => {
      star.style.opacity = "1";
    });
  }

  updateSummary();
}

function updateSummary() {
  const allScores = Object.values(scores);

  const scoredItems = allScores.filter(item => item.score > 0 && !item.isNa);
  const naItems = allScores.filter(item => item.isNa);

  const totalScore = scoredItems.reduce((sum, item) => sum + item.score, 0);
  const average = scoredItems.length > 0 ? totalScore / scoredItems.length : 0;

  document.getElementById("questionsScored").textContent = `${scoredItems.length} / ${allScores.length}`;
  document.getElementById("markedNa").textContent = naItems.length;
  document.getElementById("averageScore").textContent = scoredItems.length > 0 ? average.toFixed(2) : "—";

  const result = getFinalResult(average, scoredItems.length);
  document.getElementById("finalResult").textContent = result.finalResult;
  document.getElementById("recommendation").textContent = result.recommendation;
}

function getFinalResult(average, scoredCount) {
  if (scoredCount === 0) {
    return {
      finalResult: "—",
      recommendation: "—"
    };
  }

  if (average >= 4.5) {
    return {
      finalResult: "Passed",
      recommendation: "Highly Recommended"
    };
  }

  if (average >= 3.5) {
    return {
      finalResult: "Passed",
      recommendation: "Recommended"
    };
  }

  if (average >= 3.0) {
    return {
      finalResult: "For Review",
      recommendation: "Needs Review"
    };
  }

  return {
    finalResult: "Failed",
    recommendation: "Not Recommended"
  };
}

function getPayload() {
  const scoredItems = Object.values(scores);
  const validScoredItems = scoredItems.filter(item => item.score > 0 && !item.isNa);

  const totalScore = validScoredItems.reduce((sum, item) => sum + item.score, 0);
  const average = validScoredItems.length > 0 ? totalScore / validScoredItems.length : 0;
  const result = getFinalResult(average, validScoredItems.length);

  return {
    candidate: {
      title: document.getElementById("candidateName").value,
      position: document.getElementById("position").value,
      accountProgram: document.getElementById("accountProgram").value,
      interviewDate: document.getElementById("interviewDate").value,
      trainingStartDate: document.getElementById("trainingStartDate").value,
      interviewer: document.getElementById("interviewer").value,
      finalScore: average.toFixed(2),
      finalResult: result.finalResult,
      scoreDefinition: result.recommendation,
      recruiterNotes: document.getElementById("recruiterNotes").value,
      referralMade: document.getElementById("referralMade").checked ? "Yes" : "No"
    },
    scores: scoredItems.map(item => ({
      title: `${document.getElementById("candidateName").value} - ${item.id}`,
      candidate: document.getElementById("candidateName").value,
      category: item.category,
      question: item.question,
      score: item.isNa ? "N/A" : item.score.toString(),
      notes: item.notes
    }))
  };
}

function validateForm() {
  const candidateName = document.getElementById("candidateName").value.trim();

  if (!candidateName) {
    alert("Please enter Candidate Name.");
    return false;
  }

  return true;
}

async function submitInterview() {
  if (!validateForm()) {
    return;
  }

  const payload = getPayload();

  const positionForSave =
  payload.candidate.position === "Customer Service Representative (CSR)"
    ? "CSR"
    : payload.candidate.position === "Technical Support Representative (TSR)"
    ? "TSR"
    : payload.candidate.position;

  const dataToSend = {
  candidateName: payload.candidate.title,
  position: positionForSave,
  account: payload.candidate.accountProgram,
  interviewDate: payload.candidate.interviewDate,
  trainingStartDate: payload.candidate.trainingStartDate,
  interviewer: payload.candidate.interviewer,
  averageScore: Number(payload.candidate.finalScore),
  finalResult: payload.candidate.finalResult,
  recruiterNotes: payload.candidate.recruiterNotes,
  recommendation: payload.candidate.scoreDefinition,
  referralMade: payload.candidate.referralMade,
  scores: payload.scores

};

  try {
    const response = await fetch("https://default4a10795dedc04a878f98324334032c.e2.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1d957d4fad0e4c1ebf48cedea316b44f/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=GwjldOmueD26jDpI4A_16PiFYXl2dXCsb4P60CGlmeg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dataToSend)
    });

    if (!response.ok) {
      throw new Error("Failed to submit");
    }

    alert("Interview submitted successfully!");
    location.reload();
  } catch (error) {
    console.error(error);
    alert("Submission failed.");
  }
}

document.addEventListener("DOMContentLoaded", renderQuestions);
