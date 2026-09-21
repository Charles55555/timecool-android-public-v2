# -*- coding: utf-8 -*-
"""La nouvelle icone TimeCool : des etoiles sur fond blanc.

L'ancienne etait un carre rouge portant quatre points colores. Charles
l'a remplacee par un semis d'etoiles a quatre branches, dans les
couleurs de la maison, sur blanc.

Le dessin est decrit une seule fois, en geometrie, et sert aux deux
plates-formes : Android le recoit en vecteur -- donc net a toutes les
tailles, du petit badge de notification a l'ecran d'accueil -- et
l'iPhone en image de 1024 pixels, la seule forme qu'Apple accepte.

Le serveur n'a ni ImageMagick ni PIL. Le PNG est donc ecrit a la main,
comme le fait deja dessiner-logos.py : une entete, des lignes brutes
compressees, une somme de controle.
"""
import math
import os
import struct
import zlib

RACINE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

BLEU  = (66, 133, 244)
ROUGE = (234, 67, 53)
JAUNE = (251, 188, 4)
VERT  = (52, 168, 83)
BLANC = (255, 255, 255)


def etoile(cx, cy, r, branches, creux, rotation=0.0):
    """Le contour d'une etoile, en coordonnees 0..1.

    `creux` dit a quelle profondeur le contour revient vers le centre
    entre deux pointes : plus il est petit, plus les branches sont
    effilees. C'est lui qui donne son caractere au dessin.
    """
    pts = []
    for i in range(branches * 2):
        angle = rotation + i * math.pi / branches
        rayon = r if i % 2 == 0 else r * creux
        pts.append((cx + rayon * math.cos(angle),
                    cy + rayon * math.sin(angle)))
    return pts


# Les positions relevees sur le dessin de Charles. Le centre porte la
# grande etoile a quatre couleurs ; les six autres l'entourent sans
# symetrie, ce qui fait tout le mouvement de l'image.
CENTRE = (0.50, 0.545, 0.365)
SATELLITES = [
    (0.655, 0.225, 0.135, ROUGE, 4, 0.155),
    (0.225, 0.245, 0.120, BLEU,  4, 0.155),
    (0.845, 0.395, 0.078, JAUNE, 4, 0.155),
    (0.140, 0.660, 0.075, VERT,  4, 0.155),
    (0.672, 0.830, 0.125, BLEU,  4, 0.155),
]

# La grande etoile est partagee en quatre quartiers colores : une
# branche et ses deux demi-creux pour chacun. L'ordre suit le dessin --
# rouge en haut, bleu a droite, vert en bas, jaune a gauche.
QUARTIERS = [ROUGE, BLEU, VERT, JAUNE]


def quartiers_du_centre():
    """Les quatre morceaux colores de l'etoile centrale."""
    cx, cy, r = CENTRE
    creux = 0.105
    morceaux = []
    for i, couleur in enumerate(QUARTIERS):
        # Pointe vers le haut, la droite, le bas, la gauche.
        angle = -math.pi / 2 + i * math.pi / 2
        avant = angle - math.pi / 4
        apres = angle + math.pi / 4
        morceaux.append((couleur, [
            (cx, cy),
            (cx + r * creux * math.cos(avant), cy + r * creux * math.sin(avant)),
            (cx + r * math.cos(angle), cy + r * math.sin(angle)),
            (cx + r * creux * math.cos(apres), cy + r * creux * math.sin(apres)),
        ]))
    return morceaux


def formes():
    """Toutes les formes du dessin, couleur et contour, dans l'ordre."""
    f = list(quartiers_du_centre())
    for cx, cy, r, couleur, branches, creux in SATELLITES:
        f.append((couleur, etoile(cx, cy, r, branches, creux, -math.pi / 2)))
    return f


# ── Android : un vecteur, net a toutes les tailles ───────────────

def vecteur_android(chemin):
    """Le dessin en XML, dans le repere 108 d'Android.

    Le systeme rogne les bords d'une icone adaptative : le dessin est
    donc ramene a 72 unites centrees, la zone toujours visible.
    """
    marge, cote = 18.0, 72.0
    lignes = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<!--',
        '  Icone TimeCool : des etoiles sur fond blanc.',
        '',
        '  Dessinee par scripts/dessiner-icone.py, a partir de la',
        '  geometrie qui sert aussi a l icone de l iPhone. Ne pas la',
        '  retoucher a la main : la prochaine execution du script',
        '  effacerait la retouche.',
        '-->',
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
        '    android:width="108dp"',
        '    android:height="108dp"',
        '    android:viewportWidth="108"',
        '    android:viewportHeight="108">',
        '',
    ]
    for couleur, points in formes():
        d = []
        for j, (x, y) in enumerate(points):
            X = marge + x * cote
            Y = marge + y * cote
            d.append(('M' if j == 0 else 'L') + '%.2f,%.2f' % (X, Y))
        lignes.append('    <path android:fillColor="#%02X%02X%02X"' % couleur)
        lignes.append('        android:pathData="%sZ"/>' % ' '.join(d))
    lignes.append('')
    lignes.append('</vector>')
    with open(chemin, 'wb') as f:
        f.write(('\n'.join(lignes) + '\n').encode('utf-8'))
    return chemin


# ── iPhone : une image de 1024, sans transparence ────────────────

def dans_le_polygone(x, y, points):
    """Le point est-il a l'interieur du contour ? (lancer de rayon)"""
    dedans = False
    n = len(points)
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        if (y1 > y) != (y2 > y):
            xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xi:
                dedans = not dedans
    return dedans


def png(chemin, cote=1024, echantillons=3):
    """Le dessin en PNG opaque.

    Apple refuse une icone transparente : le fond est donc peint en
    blanc avant toute chose, et aucun canal alpha n'est ecrit.

    Chaque pixel est teste plusieurs fois, en sous-position, puis
    moyenne : sans cela les branches obliques seraient en escalier.
    """
    dessins = formes()
    # Une marge pour que les etoiles ne touchent pas le bord : iOS
    # arrondit les coins de l icone et rognerait les pointes.
    marge = 0.08
    util = 1.0 - 2 * marge

    lignes = bytearray()
    pas = 1.0 / (cote * echantillons)
    for py in range(cote):
        lignes.append(0)  # filtre « aucun », une fois par ligne
        for px in range(cote):
            r = v = b = 0
            for sy in range(echantillons):
                for sx in range(echantillons):
                    x = (px * echantillons + sx + 0.5) * pas
                    y = (py * echantillons + sy + 0.5) * pas
                    x = (x - marge) / util
                    y = (y - marge) / util
                    couleur = BLANC
                    for c, pts in dessins:
                        if dans_le_polygone(x, y, pts):
                            couleur = c
                            break
                    r += couleur[0]; v += couleur[1]; b += couleur[2]
            n = echantillons * echantillons
            lignes.append(r // n); lignes.append(v // n); lignes.append(b // n)

    def bloc(nom, donnees):
        c = nom + donnees
        return struct.pack('>I', len(donnees)) + c + struct.pack('>I', zlib.crc32(c))

    entete = struct.pack('>IIBBBBB', cote, cote, 8, 2, 0, 0, 0)  # 2 = RVB, sans alpha
    with open(chemin, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(bloc(b'IHDR', entete))
        f.write(bloc(b'IDAT', zlib.compress(bytes(lignes), 9)))
        f.write(bloc(b'IEND', b''))
    return chemin


if __name__ == '__main__':
    a = vecteur_android(os.path.join(
        RACINE, 'app', 'src', 'main', 'res', 'drawable', 'ic_launcher_foreground.xml'))
    print('Android  :', os.path.relpath(a, RACINE))

    i = png(os.path.join(
        RACINE, 'ios', 'TimeCool', 'Assets.xcassets', 'AppIcon.appiconset', 'icone-1024.png'))
    print('iPhone   :', os.path.relpath(i, RACINE), '-', os.path.getsize(i), 'octets')
