# DEPLOYMENT — soli pa solim

Šis apraksts paskaidro, kā uzlikt **AI Tutors** platformu uz tava Hetzner servera
(tā paša, kur Evolution API), izmantojot **Coolify**. Coolify pats parūpējas par
portiem, domēnu un SSL — tāpēc tev **vairs nav jācīnās ar portiem**.

Ir divi ceļi:
- **A ceļš (ieteicams):** caur Coolify → dabū domēnu + HTTPS + viena klikšķa noņemšanu
- **B ceļš (ātrākais):** tieši ar Docker Compose → strādā pēc 2 minūtēm uz `http://IP:5050`

---

## Pirms sākt: paņem OpenRouter atslēgu

1. Ej uz https://openrouter.ai/keys
2. Izveido jaunu atslēgu (sākas ar `sk-or-...`)
3. Pieliec dažus eiro kontam (Claude modelis maksā ~centi par sarunu)
4. Saglabā atslēgu — vajadzēs zemāk

---

# A ceļš — Coolify (ieteicams)

## 1. solis — ieliec kodu GitHub repozitorijā

Coolify visērtāk strādā no Git. Visvieglāk caur GitHub mājaslapu (bez komandrindas):

1. Ej uz https://github.com/new
2. Repozitorija nosaukums: `ai-tutor`, izvēlies **Private** (vai Public — vienalga)
3. Nospied **Create repository**
4. Nākamajā lapā: **uploading an existing file**
5. Ievelc **visus failus no `ai-tutor` mapes** (arī `templates/` un `static/` mapes)
6. **Commit changes**

> Alternatīva ar komandrindu (ja patīk git):
> ```bash
> cd ai-tutor
> git init && git add . && git commit -m "AI Tutors"
> git branch -M main
> git remote add origin https://github.com/TAVS_VARDS/ai-tutor.git
> git push -u origin main
> ```

## 2. solis — atver Coolify

1. Pārlūkā: `http://77.42.67.122:8000` (Coolify UI ports ir **8000**, ne 8080)
2. Pieslēdzies savā Coolify kontā

## 3. solis — izveido jaunu resursu

1. Izvēlies savu **Project** (vai izveido jaunu: "AI Tutor")
2. Nospied **+ New** → **Resource**
3. Izvēlies **Public Repository** (vai **Private Repository**, ja repo privāts — tad jāpieslēdz GitHub)
4. Ielīmē repo URL: `https://github.com/TAVS_VARDS/ai-tutor`
5. **Branch:** `main`
6. Coolify pats atpazīs `Dockerfile` → **Build Pack: Dockerfile**
7. Nospied **Continue**

## 4. solis — iestati portu un domēnu

Resursa konfigurācijā:

1. **Ports Exposes:** ieraksti `5000` (tas ir ports, ko klausās aplikācija konteinerā)
2. **Domains:** ieraksti savu subdomēnu, piem. `tutor.peakai.lv`
   - Coolify automātiski uztaisīs HTTPS sertifikātu (Let's Encrypt)
   - DNS: Cloudflare jābūt A ierakstam `tutor` → `77.42.67.122`
   - (Ja negribi domēnu — atstāj tukšu, piekļūsi caur Coolify piešķirto saiti)

## 5. solis — pievieno environment mainīgos

Sadaļā **Environment Variables** pievieno:

| Nosaukums | Vērtība |
|-----------|---------|
| `OPENROUTER_API_KEY` | `sk-or-tava-atslega` |
| `MODEL` | `anthropic/claude-3.5-sonnet` |
| `SECRET_KEY` | *(jebkura gara nejauša virkne, piem. izveido ar `openssl rand -hex 32`)* |
| `DB_PATH` | `/app/data/tutor.db` |

## 6. solis — pievieno pastāvīgo glabātuvi (lai DB nepazūd)

Lai datubāze izdzīvotu pēc restartiem:

1. Sadaļa **Persistent Storage** (vai **Storages**)
2. **+ Add**
3. **Name:** `tutor-data`
4. **Mount Path:** `/app/data`
5. Saglabā

> ⚠️ Šis ir svarīgi! Bez tā katrs restarts izdzēstu visus lietotājus un sarunas.

## 7. solis — deploy

1. Nospied **Deploy**
2. Skaties **Logs** — pirmais build aizņem ~1–2 min
3. Kad redzi `Booting worker` un statuss kļūst zaļš — gatavs!
4. Atver savu domēnu: `https://tutor.peakai.lv`

✅ **Gatavs!** Tagad tev ir publiska saite ar HTTPS un bez portu cīņas.

### Kā vēlāk noņemt (tīri, neko neatstājot)
Coolify → resurss → **Settings** → **Delete** → apstiprini. Viss pazūd: konteiners,
volume, domēna konfigurācija. Serveris paliek tīrs.

---

# B ceļš — tieši ar Docker Compose (ātrākais)

Ja gribi vienkārši palaist tagad un netaisīt GitHub repo:

## 1. solis — aizsūti failus uz serveri

No sava datora, tajā mapē, kur ir `ai-tutor`:

```bash
scp -r ai-tutor root@77.42.67.122:/root/
```

(Ja SSH ir uz cita porta, piem. 22: `scp -P 22 -r ai-tutor root@77.42.67.122:/root/`)

## 2. solis — pieslēdzies serverim un palaid

```bash
ssh root@77.42.67.122
cd /root/ai-tutor

# izveido .env ar savu atslēgu
cp .env.example .env
nano .env        # ieliec OPENROUTER_API_KEY un SECRET_KEY, saglabā ar Ctrl+O, Enter, Ctrl+X

# palaid
docker compose up -d --build
```

## 3. solis — atver

```
http://77.42.67.122:5050
```

> Ja ports 5050 aizņemts, nomaini `docker-compose.yml` rindā `"5050:5000"` pirmo skaitli
> (piem. `"5055:5000"`) un palaid `docker compose up -d` vēlreiz.

### Noņemšana
```bash
cd /root/ai-tutor
docker compose down -v     # -v izdzēš arī datubāzi
cd .. && rm -rf ai-tutor
```

---

# Pirmā lietošana (demonstrācijai)

1. Atver platformu → **Izveidot kontu**
2. Izveido **pasniedzēja** kontu (piem. `skolotajs` / parole)
   - Kā pasniedzējs vari augšupielādēt PDF, kas būs redzams **visiem**
3. Iziet → izveido **studenta** kontu (piem. `students` / parole)
   - Students redz pasniedzēja materiālus + var augšupielādēt savus
4. Nospied **Jauna saruna** → izvēlies materiālu vai augšupielādē PDF
5. Uzdod jautājumu, piem. *"Paskaidro man šo tēmu"* vai *"Kā atrisināt šo uzdevumu?"*
6. Pamēģini lūgt *"vienkārši pasaki atbildi"* — redzēsi, ka AI atsakās un vada ar jautājumiem

---

# Biežākās problēmas

| Problēma | Risinājums |
|----------|-----------|
| `AI kļūda` čatā | Pārbaudi `OPENROUTER_API_KEY` (vai ir kredīts kontā) |
| Lietotāji pazūd pēc restarta | Nav pievienots Persistent Storage uz `/app/data` (A ceļš, 6. solis) |
| Domēns nestrādā | Pārbaudi Cloudflare A ierakstu → servera IP; pagaidi DNS |
| Ports aizņemts (B ceļš) | Nomaini `5050` uz citu skaitli `docker-compose.yml` |
| PDF nenolasās | PDF ir skenēts attēls bez teksta slāņa — vajag PDF ar tekstu |

# Kā nomainīt AI modeli

`MODEL` environment mainīgajā vari likt jebkuru OpenRouter modeli, piem.:
- `anthropic/claude-3.5-sonnet` (labs, ātrs)
- `anthropic/claude-3.5-haiku` (lētāks)
- citus skat. https://openrouter.ai/models
