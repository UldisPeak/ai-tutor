# AI Tutors — Mācību platforma ar AI asistentu

Skolas noslēguma projekts: **"AI serveris ar DB ar vēsturi. Ar savu Web UI."**

Platforma, kurā studenti pieslēdzas, izvēlas/augšupielādē mācību materiālu (PDF) un
sarunājas ar AI asistentu, kas **palīdz saprast tēmu** (Sokrāta metode) — nevis iedod
gatavas atbildes.

## Galvenās funkcijas

- 🔐 **Login / reģistrācija** — studenta un pasniedzēja lomas
- 📄 **PDF materiāli** — students augšupielādē savu PDF; pasniedzējs ievieto materiālus visiem
- 🧠 **AI tutors** — māca ar jautājumiem un mājieniem, neatklāj gatavas atbildes
- 💾 **DB ar vēsturi** — visas sarunas un ziņas saglabājas (SQLite)
- 🎨 **Web UI** — pārskatāms, viegli salasāms interfeiss

## Tehnoloģijas

| Slānis | Tehnoloģija |
|--------|-------------|
| Web serveris | Flask (Python) + Gunicorn |
| Datubāze | SQLite (lietotāji, materiāli, sarunas, ziņas) |
| PDF apstrāde | PyMuPDF |
| AI | OpenRouter API (Claude modelis) |
| Konteinerizācija | Docker + Docker Compose |

## Ātrā palaišana (lokāli, testēšanai)

```bash
pip install -r requirements.txt
export OPENROUTER_API_KEY=sk-or-tava-atslega
python app.py
# atver http://localhost:5000
```

## Palaišana ar Docker

```bash
cp .env.example .env      # ieliec savu OPENROUTER_API_KEY
docker compose up -d --build
# atver http://localhost:5050
```

Pilna deployment instrukcija (Hetzner serveris + Coolify) — skat. `DEPLOYMENT.md`.

## Datubāzes struktūra

- **users** — lietotāji (id, lietotājvārds, paroles hash, loma)
- **materials** — mācību materiāli (nosaukums, priekšmets, PDF teksts, īpašnieks, publisks/privāts)
- **conversations** — sarunas (lietotājs, materiāls, nosaukums, datums) ← *vēsture*
- **messages** — ziņas (saruna, loma user/assistant, saturs, datums) ← *vēsture*

## Vērtēšanai svarīgi faili

- `app.py` — viss backend (serveris, DB, auth, AI loģika)
- `templates/` — HTML lapas (login, register, galvenā app)
- `static/` — dizains (CSS) un frontend loģika (JS)
- `Dockerfile`, `docker-compose.yml` — servera palaišana
