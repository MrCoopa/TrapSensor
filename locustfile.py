from locust import HttpUser, task, between
import random

class CatchSensorUser(HttpUser):
    wait_time = between(2, 5)
    host = "https://catchsensor.de"

    def on_start(self):
        """Wird beim Start jedes simulierten Benutzers ausgeführt (Login)"""
        self.login()

    def login(self):
        response = self.client.post("/api/auth/login", json={
            "email": "vps@test.de",
            "password": "1213456"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            print(f"Login failed: {response.status_code}")

    @task(3)
    def view_dashboard(self):
        """Simuliert das Laden der Sensorliste"""
        self.client.get("/api/catches")

    @task(1)
    def view_profile(self):
        """Simuliert den Aufruf des Profils/Setup"""
        self.client.get("/api/auth/me")

    @task(1)
    def simulate_refresh(self):
        """Simuliert den Token-Refresh (falls implementiert)"""
        self.client.post("/api/auth/refresh")
