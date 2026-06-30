# Triton Inference Server — TechCorp

Deploiement leger : **Phi-3-mini-4k-instruct + LoRA finance** en **4-bit** (~2-3 Go VRAM).

## Demarrage

Depuis la racine du projet :

```powershell
cd tritton_server
docker compose up --build
```

Premier lancement : comptez **5 a 15 min** (telechargement du modele base HuggingFace + chargement GPU).

## Endpoints pour l'equipe DEV WEB

| Usage | Methode | URL |
|-------|---------|-----|
| Health check | GET | `http://localhost:8000/v2/health/ready` |
| Inférence | POST | `http://localhost:8000/v2/models/phi35_financial/infer` |

### Corps de requete (JSON)

```json
{
  "inputs": [{
    "name": "text_input",
    "shape": [1],
    "datatype": "BYTES",
    "data": ["Qu'est-ce qu'un ETF ?"]
  }]
}
```

Reponse : `outputs[0].data[0]` contient le texte genere.

## Test rapide

```powershell
python scripts/test_triton.py "Qu'est-ce qu'un fonds indexe ?"
```

## Logs

```powershell
docker compose logs -f triton
```

## Arret

```powershell
docker compose down
```
