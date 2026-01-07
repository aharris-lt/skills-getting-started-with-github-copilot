from copy import deepcopy
from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)

# Keep an original copy of activities to restore between tests
_original_activities = deepcopy(activities)

@pytest.fixture(autouse=True)
def reset_activities():
    # restore deep copy before each test
    activities.clear()
    activities.update(deepcopy(_original_activities))
    yield


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "michael@mergington.edu" in data["Chess Club"]["participants"]


def test_signup_and_unregister_flow():
    activity = "Art Club"
    email = "tester@example.com"

    # ensure not present
    res = client.get("/activities")
    assert email not in res.json()[activity]["participants"]

    # sign up
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert "Signed up" in res.json()["message"]

    # now present
    res = client.get("/activities")
    assert email in res.json()[activity]["participants"]

    # unregister
    res = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert res.status_code == 200
    assert "Unregistered" in res.json()["message"]

    # gone
    res = client.get("/activities")
    assert email not in res.json()[activity]["participants"]


def test_signup_duplicate_fails():
    activity = "Programming Class"
    email = "emma@mergington.edu"  # already present in initial data

    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 400


def test_unregister_nonexistent_returns_404():
    activity = "Soccer Club"
    email = "nosuchstudent@example.com"

    res = client.delete(f"/activities/{activity}/unregister?email={email}")
    assert res.status_code == 404
