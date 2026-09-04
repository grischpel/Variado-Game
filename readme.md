# SynergyQuest 3D

## Voraussetzungen

- [Node.js](https://nodejs.org/) 18 oder neuer
- npm, wird zusammen mit Node.js installiert

## Installation

Im Projektverzeichnis ausführen:

```bash
npm install
```

Damit werden die Server- und Testabhängigkeiten aus `package.json` installiert.

## OpenSpec

OpenSpec wird global installiert und ist für den spec-driven Entwicklungsworkflow mit GitHub Copilot eingerichtet:

```bash
npm install -g @fission-ai/openspec@latest
openspec init --tools github-copilot --no-copilot-cloud --no-animation .
```

Die OpenSpec-Dateien liegen in `openspec/`. Copilot-spezifische Skills und Befehle werden unter `.github/` abgelegt. Für neue Änderungen kann anschließend beispielsweise folgender Workflow verwendet werden:

```text
/opsx-propose "Beschreibung der Änderung"
```

OpenSpec prüfen:

```bash
openspec doctor
openspec validate
```

## Spiel starten

```bash
npm start
```

Anschließend im Browser öffnen:

```text
http://localhost:4173
```

Der Server liefert das Spiel aus und stellt den Endpunkt für die Teilnahme bereit. Mit `Ctrl + C` wird er beendet.

## Spiel hosten

Das Spiel benötigt zum Hosten einen Server mit Node.js 18 oder neuer. Ein reines Webhosting ohne Node.js reicht nicht aus, weil auch der Teilnahme-Endpunkt benötigt wird.

1. Projekt auf den Server übertragen oder aus dem Repository klonen:

```bash
git clone <repository-url> synergyquest
cd synergyquest
```

2. Abhängigkeiten installieren:

```bash
npm ci
```

3. Einen freien Port festlegen und den Server starten. Unter Linux/macOS:

```bash
PORT=8080 npm start
```

Unter Windows PowerShell:

```powershell
$env:PORT=8080
npm start
```

4. Die Domain oder IP-Adresse des Servers auf den gewählten Port weiterleiten. Für eine öffentliche Domain sollte ein Reverse Proxy wie Nginx oder Caddy vorgeschaltet und HTTPS aktiviert werden. Der Proxy leitet Anfragen an `http://127.0.0.1:8080` weiter.

5. Der Prozess muss dauerhaft laufen, zum Beispiel mit einem Dienstmanager wie `systemd` oder PM2. Der Server benötigt Schreibrechte für den Ordner `data`, da dort `participants.xml` angelegt und aktualisiert wird.

Teilnahmedaten enthalten personenbezogene Informationen wie Name, E-Mail-Adresse und IP-Adresse. Der Server sollte deshalb nur über HTTPS öffentlich erreichbar sein und die Datei `data/participants.xml` nicht direkt ausliefern.

### Linux-Server mit systemd und Nginx

Beispiel für Ubuntu oder Debian. Die Befehle benötigen sudo-Rechte.

1. Node.js, npm und Nginx installieren:

```bash
sudo apt update
sudo apt install -y nodejs npm nginx
node --version
npm --version
```

Für Node.js 18 oder neuer gegebenenfalls die aktuelle Node.js-Version über den offiziellen NodeSource-Installer oder einen Node-Version-Manager installieren.

2. Projekt nach `/opt` kopieren und Abhängigkeiten installieren:

```bash
sudo mkdir -p /opt/synergyquest
sudo chown -R "$USER":"$USER" /opt/synergyquest
git clone <repository-url> /opt/synergyquest
cd /opt/synergyquest
npm ci --omit=dev
mkdir -p data
```

3. Systemd-Service anlegen:

```bash
sudo nano /etc/systemd/system/synergyquest@.service
```

Inhalt:

```ini
[Unit]
Description=SynergyQuest 3D
After=network.target

[Service]
Type=simple
User=%i
WorkingDirectory=/opt/synergyquest
Environment=NODE_ENV=production
Environment=PORT=8080
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Den Platzhalter `%i` beim Aktivieren durch den Linux-Benutzernamen ersetzen, zum Beispiel:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now "synergyquest@$USER"
sudo systemctl status "synergyquest@$USER"
```

4. Nginx als Reverse Proxy konfigurieren:

```bash
sudo nano /etc/nginx/sites-available/synergyquest
```

```nginx
server {
	listen 80;
	server_name example.org;

	location / {
		proxy_pass http://127.0.0.1:8080;
		proxy_http_version 1.1;
		proxy_set_header Host $host;
		proxy_set_header X-Real-IP $remote_addr;
		proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	}
}
```

Aktivieren und prüfen:

```bash
sudo ln -s /etc/nginx/sites-available/synergyquest /etc/nginx/sites-enabled/synergyquest
sudo nginx -t
sudo systemctl reload nginx
```

Danach HTTPS für die Domain einrichten, zum Beispiel mit Certbot, und in der Firewall nur SSH sowie HTTP/HTTPS freigeben:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Teilnahme speichern

Nach dem Gewinn kann eine Teilnahme mit Name und E-Mail-Adresse gesendet werden. Der Server speichert die Daten in:

```text
data/participants.xml
```

Zusätzlich werden die Verbindungs-IP-Adresse und der Zeitpunkt gespeichert. Namen werden normalisiert und E-Mail-Adressen vereinheitlicht. Eine Teilnahme wird nur abgewiesen, wenn Name, E-Mail-Adresse und IP-Adresse gemeinsam bereits vorhanden sind.

## API-Spezifikation

Die aktuelle OpenAPI-3.1-Spezifikation des Teilnahme-Endpunkts liegt in:

```text
openapi.yaml
```

Sie kann in Swagger UI, Redoc oder einem anderen OpenAPI-kompatiblen Werkzeug geöffnet werden. Der dokumentierte Endpunkt ist `POST /api/participants`.

## Tests

Unit- und Funktionstests mit Jest ausführen:

```bash
npm test
```

Für den interaktiven Watch-Modus:

```bash
npm run test:watch
```