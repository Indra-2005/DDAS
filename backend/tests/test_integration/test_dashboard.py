"""
Integration tests for dashboard stats and analytics.
"""
from fastapi.testclient import TestClient

def test_dashboard_stats(client: TestClient, auth_tokens):
    headers_a = auth_tokens["admin_a"]["headers"]
    res = client.get("/dashboard/stats", headers=headers_a)
    assert res.status_code == 200
    data = res.json()
    assert "total_files" in data
    assert "duplicates_blocked" in data
    assert "storage_saved" in data
    assert "activity_chart" in data
    assert "top_hoarders" in data
