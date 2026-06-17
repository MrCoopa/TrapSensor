import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up to 50 users
    { duration: '1m', target: 50 },  // stay at 50 users
    { duration: '30s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
  },
};

const BASE_URL = 'https://catchsensor.de';

export default function () {

  sleep(Math.random() * 4);
  // 1. Login
  const loginPayload = JSON.stringify({
    email: 'loadtest@test.de',
    password: '1213456',
  });

  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test',
    },
  };

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, loginParams);

  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has auth token': (r) => {
      if (r.status !== 200) return false;
      try {
        const data = r.json();
        return data && data.token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    console.error(`Login failed for user: ${loginRes.status} | Body: ${loginRes.body}`);
    sleep(1);
    return;
  }

  const token = loginRes.json().token;
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  // 2. Fetch Catches (Dashboard data)
  const catchesRes = http.get(`${BASE_URL}/api/catches`, authHeaders);
  check(catchesRes, {
    'catches status is 200': (r) => r.status === 200,
    'is array': (r) => Array.isArray(r.json()),
  });

  // 3. Fetch User Profile
  const meRes = http.get(`${BASE_URL}/api/auth/me`, authHeaders);
  check(meRes, {
    'me status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 3 + 2); // random wait between 2-5 seconds (simulate user think time)
}
