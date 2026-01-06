document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const emailInput = document.getElementById("email");
  const messageDiv = document.getElementById("message");

  let activities = {};

  const showMessage = (text, type = "info") => {
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
    messageDiv.classList.remove("hidden");
    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch("/activities");
      activities = await res.json();
      renderActivities();
      populateSelect();
    } catch (err) {
      activitiesList.innerHTML = '<p class="error">Failed to load activities.</p>';
    }
  };

  const renderActivities = () => {
    activitiesList.innerHTML = "";
    Object.entries(activities).forEach(([name, act]) => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `
        <h4>${name}</h4>
        <p>${act.description}</p>
        <p><strong>Schedule:</strong> ${act.schedule}</p>
        <div class="participants-section">
          <div class="participants-header">Participants (${act.participants.length}/${act.max_participants})</div>
          ${act.participants.length ? `
            <ul class="participants-list">
              ${act.participants.map(p => `<li><span class="participant-email">${p}</span></li>`).join('')}
            </ul>
          ` : `<p class="info">No participants yet.</p>`}
        </div>
      `;
      activitiesList.appendChild(card);
    });
  };

  const populateSelect = () => {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    Object.keys(activities).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = `${name} (${activities[name].participants.length}/${activities[name].max_participants})`;
      activitySelect.appendChild(opt);
    });
  };

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const activityName = activitySelect.value;
    if (!email || !activityName) {
      showMessage("Please provide your email and select an activity.", "error");
      return;
    }
    const activity = activities[activityName];
    if (activity.participants.includes(email)) {
      showMessage("You are already signed up for this activity.", "info");
      return;
    }
    if (activity.participants.length >= activity.max_participants) {
      showMessage("Sorry, this activity is full.", "error");
      return;
    }
    try {
      const res = await fetch(
        `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showMessage(err.detail || "Failed to sign up.", "error");
        return;
      }
      activities[activityName].participants.push(email);
      renderActivities();
      populateSelect();
      showMessage(`Signed up ${email} for ${activityName}.`, "success");
      signupForm.reset();
    } catch (err) {
      showMessage("Network error signing up.", "error");
    }
  });

  fetchActivities();
});
