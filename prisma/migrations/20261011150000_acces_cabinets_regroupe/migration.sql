-- Accès aux cabinets : une ligne par moyen de transport (l'arrêt le plus proche)
-- plutôt qu'un arrêt par ligne. Ne remplace que le texte d'origine : si
-- Amandine l'a déjà modifié dans les réglages, on n'y touche pas.
UPDATE "cabinets" SET "acces" = E'Bus 48, 74 — Victor Allard, 1 min à pied\nBus 74 et train — gare d’Uccle-Stalle, 5 min à pied\nTram 4 — Wagon, 6 min à pied\nTram 18 — Globe ou Xavier de Bue, 8 min à pied\nTram 82 — Merlo, 9 min à pied'
WHERE "nom" = 'Uccle' AND "acces" = E'Victor Allard · 1 min — bus 48, 74\nAulne · 4 min — bus 48, 74\nUccle-Stalle · 5 min — bus 74, et la gare\nDecroly · 6 min — bus 48, 74\nWagon · 6 min — tram 4\nÉgide Van Ophem · 8 min — tram 4\nGlobe · 8 min — tram 4, 18\nXavier de Bue · 8 min — tram 18\nRittweger · 8 min — tram 18\nMerlo · 9 min — tram 82\nCarrefour Stalle · 9 min — tram 82';

UPDATE "cabinets" SET "acces" = E'Tram 8 et bus 34 — Rond-point du Souverain, 3 min à pied\nMétro 5 — Herrmann-Debroux ou Demey, 13 min à pied'
WHERE "nom" = 'Auderghem' AND "acces" = E'Rond-point du Souverain · 3 min — tram 8, bus 34\nEmpain · 5 min — tram 8\nAuderghem-Shopping · 7 min — tram 8, bus 34\nBergoje · 7 min — bus 34\nValduc · 9 min — bus 34\nSainte-Anne · 9 min — bus 34\nDeux Chaussées · 9 min — bus 34\nHerrmann-Debroux ou Demey · 13 min — métro 5';
