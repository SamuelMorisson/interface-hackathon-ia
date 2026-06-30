#!/usr/bin/env python3
"""Test rapide du serveur Triton TechCorp."""

import json
import sys
import urllib.error
import urllib.request

TRITON_URL = "http://localhost:8000"
MODEL_NAME = "phi35_financial"


def http_get(path: str, timeout: int = 10) -> tuple[int, str]:
    request = urllib.request.Request(f"{TRITON_URL}{path}")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.status, response.read().decode("utf-8")


def http_post(path: str, payload: dict, timeout: int = 180) -> dict:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        f"{TRITON_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def wait_until_ready(max_attempts: int = 60, delay_seconds: int = 5) -> bool:
    import time

    for attempt in range(1, max_attempts + 1):
        try:
            status, _ = http_get("/v2/health/ready", timeout=5)
            if status == 200:
                print("Serveur Triton pret.")
                return True
        except (urllib.error.URLError, TimeoutError):
            pass

        print(f"Attente du serveur... ({attempt}/{max_attempts})")
        time.sleep(delay_seconds)

    return False


def infer(prompt: str) -> str:
    payload = {
        "inputs": [
            {
                "name": "text_input",
                "shape": [1],
                "datatype": "BYTES",
                "data": [prompt],
            }
        ]
    }
    result = http_post(f"/v2/models/{MODEL_NAME}/infer", payload)
    return result["outputs"][0]["data"][0]


def main() -> int:
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Qu'est-ce qu'un ETF ?"

    print(f"URL: {TRITON_URL}")
    print(f"Modele: {MODEL_NAME}")
    print(f"Question: {prompt}")
    print("-" * 50)

    if not wait_until_ready():
        print("ERREUR: Triton ne repond pas. Verifiez docker compose logs.")
        return 1

    try:
        answer = infer(prompt)
    except urllib.error.HTTPError as error:
        print(f"ERREUR HTTP {error.code}: {error.read().decode('utf-8')}")
        return 1
    except urllib.error.URLError as error:
        print(f"ERREUR reseau: {error}")
        return 1

    print(f"Reponse: {answer}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
