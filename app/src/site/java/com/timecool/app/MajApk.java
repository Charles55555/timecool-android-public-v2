package com.timecool.app;

import android.content.Intent;

/**
 * Mise a jour integree de l'APK du site (variante « site » seulement).
 *
 * Mission 79 : ce code vivait dans MainActivity. Il est propre a la variante
 * site, pour que la version Google Play ne contienne ni telechargement ni
 * installation d'APK (Google Play interdit qu'une appli se mette a jour
 * elle-meme). La variante play a son propre MajApk, qui ne fait rien.
 *
 * Le telechargement se fait hors du fil principal : sur reseau lent il
 * bloquerait l'interface plusieurs secondes. La page est informee de
 * l'avancement, puis du resultat, car un echec silencieux laisserait
 * l'utilisateur devant un bouton sans effet.
 */
final class MajApk {

    private MajApk() { }

    static void lancer(final MainActivity activite, final String url) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                java.io.File apk = null;
                try {
                    java.io.File dossier = new java.io.File(activite.getCacheDir(), "maj");
                    if (!dossier.exists() && !dossier.mkdirs()) {
                        throw new java.io.IOException("dossier de mise a jour impossible a creer");
                    }
                    // Un telechargement precedent interrompu laisserait un
                    // fichier tronque, que l'installateur rejetterait.
                    apk = new java.io.File(dossier, "timecool-maj.apk");
                    if (apk.exists() && !apk.delete()) {
                        throw new java.io.IOException("ancien fichier impossible a supprimer");
                    }

                    java.net.HttpURLConnection co =
                        (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                    co.setInstanceFollowRedirects(true);  // GitHub redirige vers son CDN
                    co.setConnectTimeout(20000);
                    co.setReadTimeout(60000);
                    co.connect();
                    if (co.getResponseCode() / 100 != 2) {
                        throw new java.io.IOException("HTTP " + co.getResponseCode());
                    }

                    final int total = co.getContentLength();
                    java.io.InputStream entree = co.getInputStream();
                    java.io.FileOutputStream sortie = new java.io.FileOutputStream(apk);
                    byte[] tampon = new byte[16384];
                    int lu, cumul = 0, dernierPourcent = -1;
                    while ((lu = entree.read(tampon)) != -1) {
                        sortie.write(tampon, 0, lu);
                        cumul += lu;
                        if (total > 0) {
                            final int pct = (int) ((cumul * 100L) / total);
                            // Un appel par pour-cent : sans ce filtre on
                            // saturerait la WebView de messages.
                            if (pct != dernierPourcent) {
                                dernierPourcent = pct;
                                activite.appelerJs("tcMajProgression", String.valueOf(pct));
                            }
                        }
                    }
                    sortie.close();
                    entree.close();
                    co.disconnect();

                    if (apk.length() == 0) {
                        throw new java.io.IOException("fichier vide");
                    }

                    android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(
                        activite, activite.getPackageName() + ".fileprovider", apk);
                    Intent i = new Intent(Intent.ACTION_VIEW);
                    i.setDataAndType(uri, "application/vnd.android.package-archive");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    activite.startActivity(i);
                    activite.appelerJs("tcMajPrete", "");
                } catch (Exception e) {
                    if (apk != null && apk.exists()) {
                        apk.delete();
                    }
                    activite.appelerJs("tcMajEchec", e.getClass().getSimpleName());
                }
            }
        }).start();
    }
}
