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
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants-section";

      const header = document.createElement("div");
      header.className = "participants-header";
      header.textContent = `Participants (${act.participants.length}/${act.max_participants})`;
      participantsSection.appendChild(header);

      if (act.participants.length) {
        const ul = document.createElement("ul");
        ul.className = "participants-list";
        act.participants.forEach(p => {
          const li = document.createElement("li");
          const span = document.createElement("span");
          span.className = "participant-email";
          span.textContent = p;

          const btn = document.createElement("button");
          btn.className = "delete-btn";
          btn.type = "button";
          btn.title = "Unregister participant";
          btn.dataset.activity = name;
          btn.dataset.email = p;
          btn.textContent = "✖";

          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        participantsSection.appendChild(ul);
      } else {
        const p = document.createElement("p");
        p.className = "info";
        p.textContent = "No participants yet.";
        participantsSection.appendChild(p);
      }

      card.innerHTML = `
        <h4>${name}</h4>
        <p>${act.description}</p>
        <p><strong>Schedule:</strong> ${act.schedule}</p>
      `;
      card.appendChild(participantsSection);
      activitiesList.appendChild(card);
    });
  };

  // Delegate delete button clicks to unregister participants
  activitiesList.addEventListener("click", async (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;
    const activityName = btn.dataset.activity;
    const email = btn.dataset.email;
    if (!activityName || !email) return;
    try {
      const res = await fetch(`/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showMessage(err.detail || "Failed to unregister.", "error");
        return;
      }
      // update local model and UI
      const idx = activities[activityName].participants.indexOf(email);
      if (idx !== -1) activities[activityName].participants.splice(idx, 1);
      renderActivities();
      populateSelect();
      showMessage(`Unregistered ${email} from ${activityName}.`, "success");
    } catch (err) {
      showMessage("Network error unregistering.", "error");
    }
  });

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
