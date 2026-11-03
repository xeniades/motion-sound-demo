# Motion Sound – modulare Webdemo

## GitHub Pages
Alle Inhalte dieses Ordners gemeinsam ins Veröffentlichungsverzeichnis hochladen:
index.html, styles.css und den kompletten Ordner js/.
Nicht nur index.html hochladen. HTTPS-Link direkt im Browser öffnen.
Keine Installation, keine npm-Abhängigkeiten und kein Build erforderlich.
Ein lokaler Test muss wegen ES-Modulen ebenfalls über einen HTTP-Server erfolgen.

## Struktur
- index.html: semantische Oberfläche
- styles.css: Gestaltung
- js/app.js: UI, Lebenszyklus und Verknüpfung der Module
- js/sensors.js: Sensor-API, Fallback, Simulation
- js/estimator.js: Bias-Kalibrierung, Tiefpass, Trapezintegration
- js/audio.js: Web-Audio-Stimmen und normierte Klangzuordnung
- js/plot.js: zeitbasierte Visualisierung

## Anwendung mit echten Sensoren
1. Lautstärke niedrig einstellen, Sensor starten.
2. Telefon ruhig ablegen und „2 s Ruhe kalibrieren“ wählen.
3. Aus bekannter Ruhe starten; Orientierung über den gesamten Versuch unverändert lassen.
4. Geschwindigkeit, relative Position oder Strecke auswählen.
5. Kurze Bewegungsabschnitte testen. Kalibrierung startet die Integration sofort.
6. Nur bei tatsächlich bekanntem Stillstand die Taste v=0 betätigen.
7. Vor neuem Versuch in Ruhe nullsetzen oder neu kalibrieren.

## Physik und Definitionen
Beschleunigungsvektoren werden einzeln integriert, niemals ihr Betrag.
Geschwindigkeit: v = Integral(a dt), Startwert v(0)=0.
Position: p = Integral(v dt), Startwert p(0)=0.
Strecke: s = Integral(|v| dt). Nicht gleich |p|.
Audio-Betragsmodus verwendet |a|, |v| oder |p| erst nach der Verarbeitung.
Die Strecke ist ein Skalar; der XYZ-Mapper ist dafür deaktiviert.

Die lineare Beschleunigung enthält API-seitig keinen Schwerkraftanteil;
es wird daher keine weitere feste Erdbeschleunigung subtrahiert.
Die Kalibrierung entfernt lediglich einen geschätzten konstanten Restbias.
Ein exponentieller, zeitbasierter Tiefpass glättet die Beschleunigung;
anschließend Trapezregel mit Sensorzeitstempeln bzw. Empfangszeiten beim Fallback.
Keine künstliche Geschwindigkeitsdämpfung, kein automatisches ZUPT.
Die Audio-Ruhezone beeinflusst nicht die Integration.

## Kritische Grenzen
Dies ist kein validiertes Messgerät und keine 3D-Ortung.
Die Beschleunigung wird in Geräteachsen integriert. Bei Rotation ändern sich die
Achsen; die Integration ist dann physikalisch nicht als Raumtrajektorie gültig.
Auch nach Ruhekalibrierung bleiben Bias, Rauschen und Fehler der Gravitationstrennung.
Ein Restbias b erzeugt ungefähr dv=b*t und dp=0.5*b*t².
Niedrige Beschleunigung beweist keinen Stillstand: konstante Geschwindigkeit hat
auch Beschleunigung 0. Deshalb keine automatische Stillstandserkennung.
Positionsfehler werden durch v=0 nicht rückwirkend korrigiert.
Eine Datenlücke >0.25 s pausiert die Schätzung. Nach maximal 30 s pausiert sie ebenfalls.
Die 30 s sind eine UI-Sicherheitsgrenze, keine Genauigkeitsgarantie.
Beim Stoppen werden Schätzungen verworfen. Kein Export, keine Speicherung.

## Für freie 3D-Bewegungen zusätzlich erforderlich
Orientierungsschätzung/Sensorfusion und Transformation in ein festes Bezugssystem,
synchronisierte Zeitstempel sowie meist externe Referenzen oder belastbare
Bewegungsrestriktionen (z.B. bekannte Ruhephasen, Kamera, GNSS je nach Anwendung).
Ein Gyroskop allein beseitigt Positionsdrift nicht.

## Teststatus
Quellcode erzeugt und Integrator mit synthetischen Daten geprüft.
Kein realer Browser-/Smartphone- oder Audio-End-to-End-Test in dieser Umgebung.
