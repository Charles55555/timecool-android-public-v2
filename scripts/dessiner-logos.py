# -*- coding: utf-8 -*-
"""Deux logos : l'application en bleu, le site en jaune.

Charles a deux onglets TimeCool ouverts en permanence — le site et
l'application — et les distinguait mal. Meme dessin, couleurs
interverties : le fond passe au jaune, et les aiguilles prennent le bleu
et le rouge.

Le serveur n'a ni ImageMagick ni PIL : les images sont dessinees ici,
pixel par pixel, et encodees a la main. Un PNG n'est qu'une entete, des
lignes brutes compressees et une somme de controle ; un ICO n'est qu'un
PNG dans une enveloppe de vingt-deux octets.
"""
import math
import os
import struct
import zlib

import os.path
# Chemin deduit de l emplacement du script : il marche depuis n importe
# quel dossier, et suit le depot s il est deplace.
RACINE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      'backend', 'web')

BLEU  = (26, 115, 232)
ROUGE = (234, 67, 53)
JAUNE = (251, 188, 4)
BLANC = (255, 255, 255)

# fond, cadran, aiguille des heures, aiguille des minutes
PALETTES = {
    'logo':      (BLEU,  BLANC, ROUGE, JAUNE),   # l'application
    'logo-site': (JAUNE, BLANC, BLEU,  ROUGE),   # le site
}


def dans_carre_arrondi(x, y, taille, rayon):
    r = rayon
    cx = min(max(x, r), taille - r)
    cy = min(max(y, r), taille - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def sur_segment(x, y, x0, y0, x1, y1, demi):
    dx, dy = x1 - x0, y1 - y0
    long2 = dx * dx + dy * dy
    t = 0.0 if long2 == 0 else max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / long2))
    px, py = x0 + t * dx, y0 + t * dy
    return (x - px) ** 2 + (y - py) ** 2 <= demi * demi


def dessiner(taille, palette):
    fond, cadran, heures, minutes = palette
    ss = 4                       # quatre points par pixel : bords lisses
    n = taille * ss
    r_ext = n * 0.34
    trait = n * 0.075
    cx = cy = n / 2.0
    rayon_carre = n * 0.22

    lignes = []
    for py in range(taille):
        ligne = bytearray()
        for px in range(taille):
            somme = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    x = px * ss + sx + 0.5
                    y = py * ss + sy + 0.5
                    if not dans_carre_arrondi(x, y, n, rayon_carre):
                        continue
                    couleur = fond
                    d = math.hypot(x - cx, y - cy)
                    if abs(d - r_ext) <= trait / 2:
                        couleur = cadran
                    elif sur_segment(x, y, cx, cy,
                                     cx - n * 0.15, cy - n * 0.09, n * 0.045):
                        couleur = heures
                    elif sur_segment(x, y, cx, cy,
                                     cx + n * 0.13, cy - n * 0.20, n * 0.038):
                        couleur = minutes
                    elif d <= n * 0.045:
                        couleur = cadran
                    somme[0] += couleur[0]
                    somme[1] += couleur[1]
                    somme[2] += couleur[2]
                    somme[3] += 255

            total = ss * ss
            a = somme[3] // total
            if a == 0:
                ligne += b'\x00\x00\x00\x00'
            else:
                opaques = somme[3] / 255.0
                ligne += bytes((round(somme[0] / opaques),
                                round(somme[1] / opaques),
                                round(somme[2] / opaques), a))
        lignes.append(bytes(ligne))
    return lignes


def png(lignes, taille):
    def bloc(nom, donnees):
        return (struct.pack('>I', len(donnees)) + nom + donnees
                + struct.pack('>I', zlib.crc32(nom + donnees) & 0xFFFFFFFF))
    brut = b''.join(b'\x00' + l for l in lignes)
    return (b'\x89PNG\r\n\x1a\n'
            + bloc(b'IHDR', struct.pack('>IIBBBBB', taille, taille, 8, 6, 0, 0, 0))
            + bloc(b'IDAT', zlib.compress(brut, 9))
            + bloc(b'IEND', b''))


def ico(donnees_png, taille):
    return (struct.pack('<HHH', 0, 1, 1)
            + struct.pack('<BBBBHHII', taille, taille, 0, 0, 1, 32,
                          len(donnees_png), 22)
            + donnees_png)


def hexa(c):
    return '#%02x%02x%02x' % c


def svg(palette):
    fond, cadran, heures, minutes = palette
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n'
            '  <title>TimeCool</title>\n'
            '  <rect x="0" y="0" width="64" height="64" rx="14" fill="%s"/>\n'
            '  <circle cx="32" cy="32" r="21.8" fill="none" stroke="%s" stroke-width="4.8"/>\n'
            '  <line x1="32" y1="32" x2="22.4" y2="26.2" stroke="%s"\n'
            '        stroke-width="5.8" stroke-linecap="round"/>\n'
            '  <line x1="32" y1="32" x2="40.3" y2="19.2" stroke="%s"\n'
            '        stroke-width="4.9" stroke-linecap="round"/>\n'
            '  <circle cx="32" cy="32" r="2.9" fill="%s"/>\n'
            '</svg>\n' % (hexa(fond), hexa(cadran), hexa(heures),
                          hexa(minutes), hexa(cadran)))


for nom, palette in PALETTES.items():
    dossier = os.path.join(RACINE, nom)
    os.makedirs(dossier, exist_ok=True)
    p32 = png(dessiner(32, palette), 32)
    open(os.path.join(dossier, 'favicon-32.png'), 'wb').write(p32)
    open(os.path.join(dossier, 'favicon.ico'), 'wb').write(ico(p32, 32))
    open(os.path.join(dossier, 'apple-touch-icon.png'), 'wb').write(
        png(dessiner(180, palette), 180))
    open(os.path.join(dossier, 'icon.svg'), 'w', encoding='utf-8').write(svg(palette))
    print('  %-12s fond %s, aiguilles %s et %s'
          % (nom, hexa(palette[0]), hexa(palette[2]), hexa(palette[3])))
